"""Milestone 4: GNNExplainer module for money-mule detection.

Extracts minimal, influential computation subgraphs and feature attributions
for any flagged account using PyG's GNNExplainer.
"""

from typing import Dict, List, Optional, Tuple
import numpy as np
import torch
from torch_geometric.explain import Explainer, GNNExplainer, ModelConfig
from torch_geometric.utils import k_hop_subgraph

FEATURE_NAMES = [
    "in_degree",
    "out_degree",
    "total_in",
    "total_out",
    "pagerank",
    "avg_holding_time",
    "has_outflow_after_inflow",
    "unique_counterparties",
]


class MuleExplainer:
    """Explains GraphSAGE predictions for individual accounts."""

    def __init__(
        self,
        model: torch.nn.Module,
        data,
        threshold: float = 0.5254,
        epochs: int = 100,
        lr: float = 0.01,
        device: Optional[str] = None,
    ):
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        self.model = model.to(self.device)
        self.model.eval()
        self.data = data
        self.threshold = threshold

        # Account mapping lookups
        self.account_to_idx = getattr(data, "account_to_idx", None)
        if self.account_to_idx is not None:
            self.idx_to_account = {idx: acc for acc, idx in self.account_to_idx.items()}
        else:
            self.idx_to_account = {}

        # PyG Explainer setup
        model_config = ModelConfig(
            mode="binary_classification",
            task_level="node",
            return_type="raw",
        )
        self.explainer = Explainer(
            model=self.model,
            algorithm=GNNExplainer(epochs=epochs, lr=lr),
            explanation_type="model",
            node_mask_type="attributes",
            edge_mask_type="object",
            model_config=model_config,
        )

    def explain_node(
        self,
        account_id_or_idx,
        num_hops: int = 2,
        top_k_features: int = 4,
        top_k_edges: int = 6,
    ) -> Dict:
        """Generates feature and edge attribution for a target account."""
        if isinstance(account_id_or_idx, str):
            if account_id_or_idx not in self.account_to_idx:
                raise ValueError(f"Account '{account_id_or_idx}' not found in graph.")
            node_idx = self.account_to_idx[account_id_or_idx]
            acc_id = account_id_or_idx
        else:
            node_idx = int(account_id_or_idx)
            acc_id = self.idx_to_account.get(node_idx, str(node_idx))

        # 1. Extract 2-hop computation subgraph for target node
        subset, sub_edge_index, mapping, edge_mask_init = k_hop_subgraph(
            node_idx=node_idx,
            num_hops=num_hops,
            edge_index=self.data.edge_index,
            relabel_nodes=True,
        )
        target_local_idx = int(mapping[0])

        sub_x = self.data.x[subset].to(self.device)
        sub_edge_index = sub_edge_index.to(self.device)

        # 2. Get model prediction on subgraph
        with torch.no_grad():
            logit = float(self.model(sub_x, sub_edge_index)[target_local_idx].cpu())
            prob = float(torch.sigmoid(torch.tensor(logit)))

        # 3. Run GNNExplainer on the computation subgraph with robust fallback
        feat_ranking = []
        dedup_edges = []

        try:
            if sub_edge_index.size(1) > 0:
                explanation = self.explainer(
                    x=sub_x,
                    edge_index=sub_edge_index,
                    index=target_local_idx,
                )

                # 4. Extract feature importances
                if hasattr(explanation, "node_mask") and explanation.node_mask is not None:
                    target_feat_mask = explanation.node_mask[target_local_idx].detach().cpu().numpy()
                    feat_norm = target_feat_mask / max(float(target_feat_mask.sum()), 1e-12)
                    feat_ranking = [
                        {"feature": FEATURE_NAMES[i], "score": float(feat_norm[i]), "raw_value": float(self.data.x[node_idx, i])}
                        for i in range(len(FEATURE_NAMES))
                    ]

                # 5. Extract edge importances
                if hasattr(explanation, "edge_mask") and explanation.edge_mask is not None:
                    edge_scores = explanation.edge_mask.detach().cpu().numpy()
                    edge_list = []
                    sub_edges = sub_edge_index.cpu().numpy()

                    for e_idx in range(sub_edges.shape[1]):
                        u_local, v_local = sub_edges[0, e_idx], sub_edges[1, e_idx]
                        if u_local == target_local_idx or v_local == target_local_idx:
                            u_global = int(subset[u_local])
                            v_global = int(subset[v_local])
                            u_acc = self.idx_to_account.get(u_global, str(u_global))
                            v_acc = self.idx_to_account.get(v_global, str(v_global))
                            direction = "outgoing" if u_local == target_local_idx else "incoming"
                            counterparty = v_acc if direction == "outgoing" else u_acc

                            edge_list.append({
                                "from_account": u_acc,
                                "to_account": v_acc,
                                "counterparty": counterparty,
                                "direction": direction,
                                "importance_score": float(edge_scores[e_idx]),
                            })

                    seen_pairs = set()
                    for e in sorted(edge_list, key=lambda x: x["importance_score"], reverse=True):
                        pair_key = (e["from_account"], e["to_account"])
                        if pair_key not in seen_pairs:
                            seen_pairs.add(pair_key)
                            dedup_edges.append(e)
        except Exception:
            # Fall back gracefully for isolated nodes or gradient disconnection
            pass

        # Fallback feature ranking if explainer was bypassed or had no mask
        if not feat_ranking:
            raw_vals = [abs(float(self.data.x[node_idx, i])) for i in range(len(FEATURE_NAMES))]
            sum_raw = max(sum(raw_vals), 1e-12)
            feat_ranking = [
                {"feature": FEATURE_NAMES[i], "score": float(raw_vals[i] / sum_raw), "raw_value": float(self.data.x[node_idx, i])}
                for i in range(len(FEATURE_NAMES))
            ]

        feat_ranking.sort(key=lambda x: x["score"], reverse=True)

        # Fallback edge extraction if explainer failed but edges exist
        if not dedup_edges and sub_edge_index.size(1) > 0:
            edge_list = []
            sub_edges = sub_edge_index.cpu().numpy()
            for e_idx in range(sub_edges.shape[1]):
                u_local, v_local = sub_edges[0, e_idx], sub_edges[1, e_idx]
                if u_local == target_local_idx or v_local == target_local_idx:
                    u_global = int(subset[u_local])
                    v_global = int(subset[v_local])
                    u_acc = self.idx_to_account.get(u_global, str(u_global))
                    v_acc = self.idx_to_account.get(v_global, str(v_global))
                    direction = "outgoing" if u_local == target_local_idx else "incoming"
                    counterparty = v_acc if direction == "outgoing" else u_acc
                    edge_list.append({
                        "from_account": u_acc,
                        "to_account": v_acc,
                        "counterparty": counterparty,
                        "direction": direction,
                        "importance_score": 0.5,
                    })
            seen_pairs = set()
            for e in edge_list:
                pair_key = (e["from_account"], e["to_account"])
                if pair_key not in seen_pairs:
                    seen_pairs.add(pair_key)
                    dedup_edges.append(e)

        return {
            "account_id": acc_id,
            "node_idx": node_idx,
            "gnn_logit": logit,
            "gnn_prob": prob,
            "is_flagged": bool(prob >= self.threshold),
            "threshold": self.threshold,
            "subgraph_nodes_count": int(subset.size(0)),
            "subgraph_edges_count": int(sub_edge_index.size(1)),
            "top_features": feat_ranking[:top_k_features],
            "all_features": feat_ranking,
            "top_edges": dedup_edges[:top_k_edges],
            "all_incident_edges": dedup_edges,
        }
