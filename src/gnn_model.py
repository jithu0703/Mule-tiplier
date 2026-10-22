"""GraphSAGE node classifier for money-mule detection (Milestone 3).

Expects a PyG `Data` object from src/gnn_data.py with:
    x [N, 8], edge_index [2, E], y [N], train_mask / val_mask / test_mask [N]
"""
import copy
import numpy as np
import torch
import torch.nn as nn
import torch.nn.functional as F
from sklearn.metrics import average_precision_score, precision_recall_curve
from torch_geometric.loader import NeighborLoader
from torch_geometric.nn import SAGEConv


# --------------------------------------------------------------------------
# Model
# --------------------------------------------------------------------------
class GraphSAGEClassifier(nn.Module):
    """num_layers x SAGEConv -> ReLU -> dropout, then a linear head (raw logit).

    forward(x, edge_index) works on sampled mini-batches AND on full graphs /
    k-hop subgraphs, which GNNExplainer needs in Milestone 4.
    """

    def __init__(self, in_dim=8, hidden_dim=64, num_layers=2, dropout=0.3):
        super().__init__()
        self.convs = nn.ModuleList()
        self.convs.append(SAGEConv(in_dim, hidden_dim))
        for _ in range(num_layers - 1):
            self.convs.append(SAGEConv(hidden_dim, hidden_dim))
        self.head = nn.Linear(hidden_dim, 1)
        self.dropout = dropout
        self.num_layers = num_layers

    def embed(self, x, edge_index):
        for conv in self.convs:
            x = F.relu(conv(x, edge_index))
            x = F.dropout(x, p=self.dropout, training=self.training)
        return x

    def forward(self, x, edge_index):
        return self.head(self.embed(x, edge_index)).squeeze(-1)


# --------------------------------------------------------------------------
# Loaders
# --------------------------------------------------------------------------
def make_loaders(data, num_neighbors=(15, 10), batch_size=2048, num_workers=0):
    kw = dict(
        data=data,
        num_neighbors=list(num_neighbors),
        batch_size=batch_size,
        num_workers=num_workers,
        pin_memory=torch.cuda.is_available(),
    )
    if num_workers > 0:
        kw["persistent_workers"] = True
    train = NeighborLoader(input_nodes=data.train_mask, shuffle=True, **kw)
    val = NeighborLoader(input_nodes=data.val_mask, shuffle=False, **kw)
    test = NeighborLoader(input_nodes=data.test_mask, shuffle=False, **kw)
    return train, val, test

# --------------------------------------------------------------------------
# Train / eval
# --------------------------------------------------------------------------
def train_epoch(model, loader, optimizer, loss_fn, device):
    model.train()
    total_loss, total_n = 0.0, 0
    for batch in loader:
        batch = batch.to(device)
        optimizer.zero_grad()
        logits = model(batch.x, batch.edge_index)
        bs = batch.batch_size  # seed nodes are the first `bs` rows
        loss = loss_fn(logits[:bs], batch.y[:bs].float())
        loss.backward()
        optimizer.step()
        total_loss += loss.item() * bs
        total_n += bs
    return total_loss / total_n


@torch.no_grad()
def predict(model, loader, device):
    """Returns (y_true, y_prob) for the seed nodes of every batch."""
    model.eval()
    ys, ps = [], []
    for batch in loader:
        batch = batch.to(device)
        logits = model(batch.x, batch.edge_index)[: batch.batch_size]
        ps.append(torch.sigmoid(logits).cpu())
        ys.append(batch.y[: batch.batch_size].cpu())
    return torch.cat(ys).numpy(), torch.cat(ps).numpy()


def best_f1_threshold(y_true, y_prob):
    """Pick the threshold on VALIDATION data, then reuse it unchanged on test."""
    p, r, t = precision_recall_curve(y_true, y_prob)
    f1 = 2 * p[:-1] * r[:-1] / np.clip(p[:-1] + r[:-1], 1e-12, None)
    return float(t[int(np.argmax(f1))])


def metrics_at(y_true, y_prob, threshold):
    pred = (y_prob >= threshold).astype(int)
    tp = int(((pred == 1) & (y_true == 1)).sum())
    fp = int(((pred == 1) & (y_true == 0)).sum())
    fn = int(((pred == 0) & (y_true == 1)).sum())
    prec = tp / max(tp + fp, 1)
    rec = tp / max(tp + fn, 1)
    f1 = 2 * prec * rec / max(prec + rec, 1e-12)
    return dict(
        pr_auc=float(average_precision_score(y_true, y_prob)),
        precision=prec, recall=rec, f1=f1, threshold=threshold,
    )


def fit(
    model, data, num_neighbors=(15, 10), pos_weight=9.0, lr=1e-3,
    weight_decay=1e-5, epochs=40, patience=5, batch_size=2048,
    device=None, ckpt_path=None, verbose=True, num_workers=0
):
    """Train with early stopping on val PR-AUC. Returns (model, history, loaders)."""
    device = device or ("cuda" if torch.cuda.is_available() else "cpu")
    model = model.to(device)
    train_l, val_l, test_l = make_loaders(data, num_neighbors, batch_size, num_workers)

    loss_fn = nn.BCEWithLogitsLoss(pos_weight=torch.tensor(pos_weight, device=device))
    opt = torch.optim.Adam(model.parameters(), lr=lr, weight_decay=weight_decay)
    sched = torch.optim.lr_scheduler.ReduceLROnPlateau(
        opt, mode="max", factor=0.5, patience=2
    )

    best_ap, best_state, bad = -1.0, None, 0
    history = []
    for epoch in range(1, epochs + 1):
        loss = train_epoch(model, train_l, opt, loss_fn, device)
        y, p = predict(model, val_l, device)
        val_ap = float(average_precision_score(y, p))
        sched.step(val_ap)
        history.append(dict(epoch=epoch, loss=loss, val_pr_auc=val_ap))
        if verbose:
            print(f"epoch {epoch:02d}  loss {loss:.4f}  val PR-AUC {val_ap:.4f}")

        if val_ap > best_ap:
            best_ap, bad = val_ap, 0
            best_state = copy.deepcopy(model.state_dict())
            if ckpt_path:
                torch.save(best_state, ckpt_path)
        else:
            bad += 1
            if bad >= patience:
                if verbose:
                    print(f"early stop at epoch {epoch} (best val PR-AUC {best_ap:.4f})")
                break

    model.load_state_dict(best_state)
    return model, history, (train_l, val_l, test_l)


def evaluate_final(model, val_loader, test_loader, device=None):
    """Threshold from val (max F1), applied unchanged to the frozen test set."""
    device = device or next(model.parameters()).device
    yv, pv = predict(model, val_loader, device)
    thr = best_f1_threshold(yv, pv)
    yt, pt = predict(model, test_loader, device)
    return dict(val=metrics_at(yv, pv, thr), test=metrics_at(yt, pt, thr))


def run_experiment(data, seed=0, num_layers=2, hidden_dim=64, pos_weight=9.0,
                   num_neighbors=None, ckpt_path=None, **fit_kw):
    """One full run. num_neighbors defaults to a sensible list for num_layers."""
    torch.manual_seed(seed)
    np.random.seed(seed)
    if num_neighbors is None:
        num_neighbors = {1: (15,), 2: (15, 10), 3: (15, 10, 5), 4: (15, 10, 5, 5)}[num_layers]
    model = GraphSAGEClassifier(
        in_dim=data.x.size(1), hidden_dim=hidden_dim, num_layers=num_layers
    )
    model, hist, (_, val_l, test_l) = fit(
        model, data, num_neighbors=num_neighbors, pos_weight=pos_weight,
        ckpt_path=ckpt_path, **fit_kw
    )
    return model, hist, evaluate_final(model, val_l, test_l)
