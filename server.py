"""FastAPI Backend Server for Mule-tiplier AML Platform.

Serves REST API endpoints for:
- Account risk investigation (GraphSAGE + Temporal Motif Search + GNNExplainer)
- 2-Hop ego-network graph topology
- Autocomplete search & telemetry
- Serves static frontend assets
"""

import os
import sys
from typing import Dict, List, Optional

sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("src"))

from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import pandas as pd
import numpy as np
import torch
import networkx as nx

from src.gnn_data import build_pyg_data
from src.gnn_model import GraphSAGEClassifier
from src.chain_detector import TemporalChainDetector
from src.explainer import MuleExplainer
from src.risk_report import AccountRiskReporter

app = FastAPI(
    title="Mule-tiplier AML Graph Intelligence API",
    description="Backend API powering the Mule-tiplier AML compliance platform",
    version="1.0.0"
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --------------------------------------------------------------------------
# Pipeline Initialization & Pre-Caching
# --------------------------------------------------------------------------
print("Initializing Mule-tiplier backend pipeline...")

df = pd.read_csv("./data/processed/processed_df.csv")
features_df = pd.read_csv("./data/processed/account_features.csv")
split_df = pd.read_csv("./data/processed/split_accounts.csv")
data = build_pyg_data(df, features_df, split_df)

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading GraphSAGE model on {device}...")
model = GraphSAGEClassifier(in_dim=8, hidden_dim=64, num_layers=2).to(device)
model.load_state_dict(torch.load("outputs/models/graphsage.pt", map_location=device))
model.eval()

detector = TemporalChainDetector(df, max_decay=0.25)
explainer = MuleExplainer(model, data, threshold=0.5254, epochs=50, device=device)
reporter = AccountRiskReporter(detector, explainer)

PRESET_ACCOUNTS = [
    {"id": "811C2F680", "label": "🚨 Confirmed Multi-Hop Money Mule (811C2F680)", "type": "critical"},
    {"id": "100428660", "label": "🚨 High-Volume Laundering Hub (100428660)", "type": "critical"},
    {"id": "8096751E0", "label": "🚨 Layering Chain Initiator (8096751E0)", "type": "high"},
    {"id": "80934B170", "label": "🚨 Layering Intermediary Mule (80934B170)", "type": "high"},
    {"id": "806AABF40", "label": "🚨 Layering Chain Hop 3 (806AABF40)", "type": "high"},
    {"id": "804DA4170", "label": "🚨 Laundering Cash-Out Sink (804DA4170)", "type": "high"},
    {"id": "800043210", "label": "🛡️ Clean Commercial Merchant (800043210)", "type": "standard"},
    {"id": "800042CB0", "label": "🛡️ Clean Individual Account (800042CB0)", "type": "standard"},
]

import threading

# Memory cache for fast sub-millisecond retrieval of investigated accounts
analysis_cache: Dict[str, Dict] = {}
analysis_lock = threading.Lock()


def get_cached_or_compute(account_id: str) -> Dict:
    acc = str(account_id).strip()
    if acc in analysis_cache:
        return analysis_cache[acc]

    if acc not in data.account_to_idx:
        raise HTTPException(status_code=404, detail=f"Account '{acc}' not found in the transaction graph index.")

    with analysis_lock:
        if acc in analysis_cache:
            return analysis_cache[acc]
        report = reporter.analyze_account(acc)
        analysis_cache[acc] = report
        return report


# Pre-warm cache in a background thread to allow instant port binding
import threading

def prewarm():
    print("Pre-warming cache for default account 811C2F680 in background...", flush=True)
    try:
        get_cached_or_compute("811C2F680")
        print("Default account 811C2F680 cached successfully.", flush=True)
    except Exception as e:
        print(f"Warning pre-warming 811C2F680: {e}", flush=True)

threading.Thread(target=prewarm, daemon=True).start()
print("Backend server initialized and ready.", flush=True)



# --------------------------------------------------------------------------
# API Endpoints
# --------------------------------------------------------------------------
@app.get("/api/v1/telemetry")
def get_telemetry():
    """Global system health & model performance telemetry."""
    return {
        "project_name": "Mule-tiplier",
        "system_status": "Live",
        "device": device.upper(),
        "device_name": torch.cuda.get_device_name(0) if torch.cuda.is_available() else "CPU",
        "monitored_accounts": 515080,
        "monitored_transactions": 5078345,
        "model_architecture": "GraphSAGE (2-layer, 64-dim, NeighborLoader)",
        "test_pr_auc": 0.1884,
        "baseline_pr_auc": 0.0834,
        "pr_auc_lift_pct": 128.0,
        "alert_purity_precision": 0.2827,
        "baseline_precision": 0.1178,
        "decision_threshold": 0.5254,
        "active_laundering_mules_detected": 1003,
        "presets": PRESET_ACCOUNTS,
    }


@app.get("/api/v1/accounts/search")
def search_accounts(q: str = Query(..., min_length=1)):
    """Autocomplete search across presets and account IDs."""
    query = q.strip().upper()
    results = []

    # Check presets first
    for p in PRESET_ACCOUNTS:
        if query in p["id"] or query in p["label"].upper():
            results.append({"id": p["id"], "label": p["label"], "is_preset": True, "type": p["type"]})

    # Match in dataset index
    matches = 0
    for acc in data.account_to_idx.keys():
        if query in acc and not any(r["id"] == acc for r in results):
            results.append({"id": acc, "label": f"Account {acc}", "is_preset": False, "type": "account"})
            matches += 1
            if matches >= 8:
                break

    return {"query": query, "results": results[:12]}


@app.get("/api/v1/accounts/{account_id}/investigation")
def get_account_investigation(account_id: str):
    """Full AML investigation report for an account."""
    report = get_cached_or_compute(account_id)
    card_text = reporter.format_risk_card(report)

    gnn = report["gnn_explanation"]
    chain = report["chain_profile"]

    # Format sample chains for JSON serialization
    serialized_chains = []
    for c in chain.get("sample_chains", []):
        serialized_chains.append({
            "hops": c["hops"],
            "accounts": c["accounts"],
            "start_time": str(c["start_time"]),
            "end_time": str(c["end_time"]),
            "duration_hours": round(c["duration_hours"], 2),
            "initial_amount": round(c["initial_amount"], 2),
            "final_amount": round(c["final_amount"], 2),
            "amount_retention": round(c["amount_retention"], 4),
            "fee_haircut": round(c["initial_amount"] - c["final_amount"], 2),
            "steps": [
                {
                    "from": s["from"],
                    "to": s["to"],
                    "timestamp": str(s["timestamp"]),
                    "amount": round(s["amount"], 2),
                    "is_laundering": s.get("is_laundering", 0),
                }
                for s in c["steps"]
            ]
        })

    return {
        "account_id": report["account_id"],
        "risk_tier": report["risk_tier"],
        "recommended_action": report["recommended_action"],
        "gnn_assessment": {
            "mule_probability": round(gnn["gnn_prob"], 4),
            "gnn_logit": round(gnn["gnn_logit"], 4),
            "is_flagged": gnn["is_flagged"],
            "threshold": gnn["threshold"],
            "subgraph_nodes_count": gnn["subgraph_nodes_count"],
            "subgraph_edges_count": gnn["subgraph_edges_count"],
            "top_features": gnn["top_features"],
            "all_features": gnn["all_features"],
            "top_counterparty_flows": gnn["top_edges"],
        },
        "chain_profile": {
            "is_in_chain": chain["is_in_chain"],
            "primary_role": chain["role"],
            "num_chains_found": chain["num_chains_found"],
            "max_chain_hops": chain["max_chain_hops"],
            "active_chains": serialized_chains,
        },
        "sar_card_text": card_text,
        "sar_narrative": reporter._generate_sar_narrative(report),
    }


@app.get("/api/v1/accounts/{account_id}/subgraph")
def get_account_subgraph(account_id: str, chain_idx: Optional[int] = Query(None)):
    """Returns subgraph nodes and directed edges filtered by mule threshold and active chain."""
    report = get_cached_or_compute(account_id)
    gnn = report["gnn_explanation"]
    chain_prof = report["chain_profile"]

    prob = gnn.get("gnn_prob", 0.0)
    thresh = gnn.get("threshold", 0.5254)
    in_chain = chain_prof.get("is_in_chain", False)
    tier = report.get("risk_tier", "")
    crosses_thresh = prob >= thresh or in_chain or "HIGH" in tier or "CRITICAL" in tier

    target_acc = report["account_id"]
    active_chains = chain_prof.get("active_chains") or chain_prof.get("sample_chains") or []

    # If account does NOT cross mule threshold, do not load neighborhood
    if not crosses_thresh:
        return {
            "target_account": target_acc,
            "nodes": [{
                "id": target_acc,
                "label": f"Target: {target_acc}",
                "role": "target",
                "is_target": True,
                "risk_tier": report.get("risk_tier", "STANDARD / LOW RISK"),
                "gnn_prob": round(prob, 4),
                "size": 24,
                "is_clean": True,
            }],
            "edges": [],
            "below_threshold": True,
            "is_chain": False,
        }

    # If account crosses threshold and has active chains, return the entire selected chain
    if active_chains:
        selected_idx = 0 if chain_idx is None else max(0, min(chain_idx, len(active_chains) - 1))
        target_chain = active_chains[selected_idx]
        chain_accounts = target_chain.get("accounts", [])
        chain_steps = target_chain.get("steps", [])

        nodes_list = []
        for i, acc in enumerate(chain_accounts):
            is_target = (acc == target_acc)
            role = "target" if is_target else ("source" if i == 0 else ("sink" if i == len(chain_accounts) - 1 else "chain"))
            nodes_list.append({
                "id": acc,
                "label": f"Target: {acc}" if is_target else acc,
                "role": role,
                "is_target": is_target,
                "chain_hop": i + 1,
                "size": 24 if is_target else (19 if role in ("source", "sink") else 16),
            })

        edges_list = []
        for step in chain_steps:
            edges_list.append({
                "source": step["from"],
                "target": step["to"],
                "amount": step.get("amount", 0.0),
                "timestamp": step.get("timestamp", ""),
                "importance": 1.0,
                "direction": "incoming" if step["to"] == target_acc else "outgoing",
                "in_chain": True,
                "width": 4.0,
            })

        return {
            "target_account": target_acc,
            "nodes": nodes_list,
            "edges": edges_list,
            "below_threshold": False,
            "is_chain": True,
            "chain_index": selected_idx,
            "total_chains": len(active_chains),
        }

    # Otherwise return target account + only high-attribution incident links (importance >= 0.5)
    nodes_dict = {
        target_acc: {
            "id": target_acc,
            "label": f"Target: {target_acc}",
            "role": "target",
            "is_target": True,
            "risk_tier": report["risk_tier"],
            "gnn_prob": round(prob, 4),
            "size": 24,
        }
    }
    edges_list = []
    for e in gnn.get("all_incident_edges", []):
        if e.get("importance_score", 0) >= 0.5:
            u, v = e["from_account"], e["to_account"]
            other = v if u == target_acc else u
            if other not in nodes_dict:
                nodes_dict[other] = {
                    "id": other,
                    "label": other,
                    "role": "counterparty",
                    "is_target": False,
                    "size": 15,
                }
            edges_list.append({
                "source": u,
                "target": v,
                "importance": round(e["importance_score"], 4),
                "direction": e["direction"],
                "in_chain": False,
                "width": 2.8,
            })

    return {
        "target_account": target_acc,
        "nodes": list(nodes_dict.values()),
        "edges": edges_list,
        "below_threshold": False,
        "is_chain": False,
    }


@app.get("/api/v1/benchmarks")
def get_benchmarks():
    """Returns benchmark comparison data across all model iterations."""
    if os.path.exists("outputs/results/m3_comparison.csv"):
        df_cmp = pd.read_csv("outputs/results/m3_comparison.csv")
        return df_cmp.replace({np.nan: None}).to_dict(orient="records")
    return []


# --------------------------------------------------------------------------
# Serve Frontend Single Page Application & Artifacts
# --------------------------------------------------------------------------
os.makedirs("frontend", exist_ok=True)
os.makedirs("outputs", exist_ok=True)
app.mount("/static", StaticFiles(directory="frontend"), name="static")
app.mount("/outputs", StaticFiles(directory="outputs"), name="outputs")


@app.get("/")
def serve_index():
    return FileResponse("frontend/index.html")


if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)

