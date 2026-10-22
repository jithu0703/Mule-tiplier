import os
import sys

sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("src"))

import time
import torch
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
from sklearn.metrics import precision_recall_curve, average_precision_score
import xgboost as xgb

from gnn_data import build_pyg_data
from gnn_model import GraphSAGEClassifier, make_loaders, predict, best_f1_threshold, metrics_at

print("Loading data...")
df = pd.read_csv('./data/processed/processed_df.csv')
features_df = pd.read_csv('./data/processed/account_features.csv')
split_df = pd.read_csv('./data/processed/split_accounts.csv')
data = build_pyg_data(df, features_df, split_df)
print("Data loaded successfully.")

device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Using device: {device}")

# 1. Load GraphSAGE model
model = GraphSAGEClassifier(in_dim=8, hidden_dim=64, num_layers=2).to(device)
model.load_state_dict(torch.load("outputs/models/graphsage.pt", map_location=device))
model.eval()

# 2. Evaluate GraphSAGE
print("Evaluating GraphSAGE...")
_, val_l, test_l = make_loaders(data, num_neighbors=(15, 10), batch_size=4096, num_workers=0)

y_val, p_val_gnn = predict(model, val_l, device)
thr_gnn = best_f1_threshold(y_val, p_val_gnn)

y_test, p_test_gnn = predict(model, test_l, device)
gnn_val_m = metrics_at(y_val, p_val_gnn, thr_gnn)
gnn_test_m = metrics_at(y_test, p_test_gnn, thr_gnn)
print("GraphSAGE Test:", gnn_test_m)

# 3. XGBoost Baseline Evaluation
print("Training & Evaluating XGBoost Baseline...")
X = data.x.numpy()
y = data.y.numpy()
tr, va, te = data.train_mask.numpy(), data.val_mask.numpy(), data.test_mask.numpy()
spw = (y[tr] == 0).sum() / (y[tr] == 1).sum()

xgb_model = xgb.XGBClassifier(
    eval_metric="aucpr", random_state=42, scale_pos_weight=spw,
    n_estimators=500, early_stopping_rounds=30,
)
xgb_model.fit(X[tr], y[tr], eval_set=[(X[va], y[va])], verbose=False)

p_val_xgb = xgb_model.predict_proba(X[va])[:, 1]
thr_xgb = best_f1_threshold(y[va], p_val_xgb)

p_test_xgb = xgb_model.predict_proba(X[te])[:, 1]
xgb_val_m = metrics_at(y[va], p_val_xgb, thr_xgb)
xgb_test_m = metrics_at(y[te], p_test_xgb, thr_xgb)
print("XGBoost Test:", xgb_test_m)

# 4. Save results to CSV
comparison_rows = [
    {
        "model": "Random Baseline",
        "split": "Test (20%)",
        "val_pr_auc": 0.0123,
        "test_pr_auc": 0.0123,
        "precision": 0.0123,
        "recall": 1.0000,
        "f1_score": 0.0243,
        "threshold": 0.0,
        "notes": "Theoretical lower bound based on class balance"
    },
    {
        "model": "Milestone 2 Baseline (XGBoost, 80% train)",
        "split": "Test (20%)",
        "val_pr_auc": np.nan,
        "test_pr_auc": 0.0914,
        "precision": 0.0500,
        "recall": 0.6700,
        "f1_score": 0.0900,
        "threshold": 0.5000,
        "notes": "Trained on 80% train split without val tuning"
    },
    {
        "model": "Milestone 3 Baseline (XGBoost, 70% train)",
        "split": "Test (20%)",
        "val_pr_auc": round(xgb_val_m["pr_auc"], 4),
        "test_pr_auc": round(xgb_test_m["pr_auc"], 4),
        "precision": round(xgb_test_m["precision"], 4),
        "recall": round(xgb_test_m["recall"], 4),
        "f1_score": round(xgb_test_m["f1"], 4),
        "threshold": round(thr_xgb, 4),
        "notes": "70% train, tuned threshold on val max-F1"
    },
    {
        "model": "Milestone 3 GraphSAGE (2-layer)",
        "split": "Test (20%)",
        "val_pr_auc": round(gnn_val_m["pr_auc"], 4),
        "test_pr_auc": round(gnn_test_m["pr_auc"], 4),
        "precision": round(gnn_test_m["precision"], 4),
        "recall": round(gnn_test_m["recall"], 4),
        "f1_score": round(gnn_test_m["f1"], 4),
        "threshold": round(thr_gnn, 4),
        "notes": "Inductive GraphSAGE with (15, 10) neighbor sampling"
    }
]

res_df = pd.DataFrame(comparison_rows)
os.makedirs("outputs/results", exist_ok=True)
res_df.to_csv("outputs/results/m3_comparison.csv", index=False)
print("Saved outputs/results/m3_comparison.csv")

# 5. Generate Precision-Recall Curve Comparison
fig, ax = plt.subplots(figsize=(8.5, 5.2), facecolor="#1A1D24")
ax.set_facecolor("#23262F")

# Baseline random
base_rate = float(y_test.mean())
ax.axhline(base_rate, color="#565C6B", linestyle="--", lw=1.5,
           label=f"Random Guessing Floor (AP = {base_rate:.4f})")

# XGBoost PR curve
prec_xgb, rec_xgb, _ = precision_recall_curve(y_test, p_test_xgb)
ax.plot(rec_xgb, prec_xgb, color="#FF8A3D", lw=2, linestyle="--",
        label=f"XGBoost Baseline (PR-AUC = {xgb_test_m['pr_auc']:.4f})")
ax.scatter([xgb_test_m["recall"]], [xgb_test_m["precision"]], color="#EA580C", s=85, zorder=5,
           label=f"XGBoost Max-F1 Point (P={xgb_test_m['precision']:.3f}, R={xgb_test_m['recall']:.3f})")

# GraphSAGE PR curve
prec_gnn, rec_gnn, _ = precision_recall_curve(y_test, p_test_gnn)
ax.plot(rec_gnn, prec_gnn, color="#B6FF2E", lw=2.6,
        label=f"GraphSAGE GNN (PR-AUC = {gnn_test_m['pr_auc']:.4f})")
ax.scatter([gnn_test_m["recall"]], [gnn_test_m["precision"]], color="#B6FF2E", edgecolor="#14161B", lw=2, s=115, zorder=6,
           label=f"GraphSAGE Max-F1 Point (P={gnn_test_m['precision']:.3f}, R={gnn_test_m['recall']:.3f})")

ax.set_title("Money Mule Detection: Precision-Recall Curve Comparison (Test Split)",
             fontsize=12, fontweight="bold", pad=12, color="#FFFFFF")
ax.set_xlabel("Recall (Mules Caught)", fontsize=10.5, fontweight="500", color="#A9AEBB")
ax.set_ylabel("Precision (True Positive Alert Rate)", fontsize=10.5, fontweight="500", color="#A9AEBB")
ax.set_xlim([0.0, 1.0])
ax.set_ylim([0.0, 1.05])

ax.tick_params(colors="#A9AEBB", which="both", labelsize=9.5)
for spine in ax.spines.values():
    spine.set_color("#3A3F4C")
    spine.set_linewidth(1.0)

ax.grid(True, linestyle="--", alpha=0.35, color="#565C6B")
legend = ax.legend(loc="upper right", frameon=True, facecolor="#14161B", edgecolor="#3A3F4C", fontsize=9.2)
for text in legend.get_texts():
    text.set_color("#F8FAFC")

plt.tight_layout()
os.makedirs("outputs/figures", exist_ok=True)
plt.savefig("outputs/figures/pr_curve_comparison.png", dpi=200, facecolor=fig.get_facecolor(), edgecolor="none")
plt.close()
print("Saved outputs/figures/pr_curve_comparison.png")

