"""Helpers to finish Milestone 3: fair XGBoost row, seeds, ablations, hybrid.

Every run is appended to outputs/results/m3_results.csv as soon as it finishes,
and each run gets its own checkpoint, so nothing is lost if the kernel restarts.
"""
import os
import numpy as np
import pandas as pd
import torch
import xgboost as xgb
from torch_geometric.loader import NeighborLoader

from gnn_model import (
    GraphSAGEClassifier, run_experiment, best_f1_threshold, metrics_at,
)

RESULTS_CSV = "outputs/results/m3_results.csv"


def _log(name, res_val, res_test):
    os.makedirs(os.path.dirname(RESULTS_CSV), exist_ok=True)
    row = {"run": name}
    row.update({f"val_{k}": v for k, v in res_val.items()})
    row.update({f"test_{k}": v for k, v in res_test.items()})
    pd.DataFrame([row]).to_csv(
        RESULTS_CSV, mode="a", header=not os.path.exists(RESULTS_CSV), index=False
    )
    return row


# 1) Fair XGBoost row: same threshold protocol as the GNN --------------------
def xgb_row(name, model, data, features=None):
    """Evaluate a fitted sklearn-style XGB model with val-chosen max-F1 threshold.
    `features` = optional [N, d] array to use instead of data.x."""
    X = data.x.numpy() if features is None else features
    y = data.y.numpy()
    va, te = data.val_mask.numpy(), data.test_mask.numpy()
    pv = model.predict_proba(X[va])[:, 1]
    thr = best_f1_threshold(y[va], pv)
    pt = model.predict_proba(X[te])[:, 1]
    return _log(name, metrics_at(y[va], pv, thr), metrics_at(y[te], pt, thr))


def train_xgb(data, features=None, seed=42):
    X = data.x.numpy() if features is None else features
    y = data.y.numpy()
    tr, va = data.train_mask.numpy(), data.val_mask.numpy()
    spw = (y[tr] == 0).sum() / (y[tr] == 1).sum()
    m = xgb.XGBClassifier(
        eval_metric="aucpr", random_state=seed, scale_pos_weight=spw,
        n_estimators=500, early_stopping_rounds=30,
    )
    m.fit(X[tr], y[tr], eval_set=[(X[va], y[va])], verbose=False)
    return m


# 2) GNN seeds / ablations ---------------------------------------------------
def gnn_run(name, data, seed=0, **kw):
    """One GNN run, logged. kw goes to run_experiment (num_layers, pos_weight...)."""
    os.makedirs("outputs/models/runs", exist_ok=True)
    ckpt = f"outputs/models/runs/{name}.pt"
    kw.setdefault("epochs", 150)
    kw.setdefault("patience", 10)
    kw.setdefault("lr", 3e-3)
    model, hist, res = run_experiment(
        data, seed=seed, ckpt_path=ckpt, verbose=False, **kw
    )
    pd.DataFrame(hist).to_csv(f"outputs/models/runs/{name}_history.csv", index=False)
    _log(name, res["val"], res["test"])
    print(name, "test PR-AUC", round(res["test"]["pr_auc"], 4),
          "| epochs", len(hist))
    return model, res


# 3) Hybrid: GNN embeddings -> XGBoost ---------------------------------------
@torch.no_grad()
def all_embeddings(model, data, num_neighbors=(15, 10), batch_size=4096, device=None):
    """64-d embedding for every node, in node-index order."""
    device = device or next(model.parameters()).device
    model.eval()
    loader = NeighborLoader(
        data, num_neighbors=list(num_neighbors), batch_size=batch_size,
        input_nodes=None, shuffle=False, num_workers=0,
    )
    out = []
    for b in loader:
        b = b.to(device)
        out.append(model.embed(b.x, b.edge_index)[: b.batch_size].cpu())
    return torch.cat(out).numpy()


def hybrid_features(model, data):
    emb = all_embeddings(model, data)
    return np.concatenate([data.x.numpy(), emb], axis=1)


# 4) Final summary table -----------------------------------------------------
def summary():
    df = pd.read_csv(RESULTS_CSV)
    cols = ["run", "val_pr_auc", "test_pr_auc", "test_precision",
            "test_recall", "test_f1"]
    return df[cols].round(4)
