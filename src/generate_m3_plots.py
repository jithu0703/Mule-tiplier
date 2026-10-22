import json
import re
import os
import matplotlib.pyplot as plt
import numpy as np
import pandas as pd

# 1. Parse epoch history from notebook
nb_path = "notebooks/03_graphsage.ipynb"
with open(nb_path, "r", encoding="utf-8") as f:
    nb = json.load(f)

history = []
for cell in nb.get("cells", []):
    if cell.get("cell_type") == "code":
        for out in cell.get("outputs", []):
            text = "".join(out.get("text", []))
            for line in text.splitlines():
                m = re.match(r"epoch (\d+)\s+loss ([\d\.]+)\s+val PR-AUC ([\d\.]+)", line)
                if m:
                    history.append({
                        "epoch": int(m.group(1)),
                        "loss": float(m.group(2)),
                        "val_pr_auc": float(m.group(3))
                    })

print(f"Extracted {len(history)} epochs from notebook.")

os.makedirs("outputs/figures", exist_ok=True)
os.makedirs("outputs/results", exist_ok=True)
os.makedirs("outputs/models/runs", exist_ok=True)

if history:
    hist_df = pd.DataFrame(history)
    hist_df.to_csv("outputs/models/runs/sage_L2_pw9_history.csv", index=False)
    
    # 2. Plot Training & Validation Curves
    fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(14, 5))
    
    ax1.plot(hist_df["epoch"], hist_df["loss"], color="#2563eb", lw=2, label="Train Loss (BCE w/ Pos Weight)")
    ax1.set_title("GraphSAGE Training Loss", fontsize=13, fontweight="bold", pad=10)
    ax1.set_xlabel("Epoch", fontsize=11)
    ax1.set_ylabel("Loss", fontsize=11)
    ax1.grid(True, linestyle="--", alpha=0.5)
    ax1.legend(frameon=True)
    
    ax2.plot(hist_df["epoch"], hist_df["val_pr_auc"], color="#16a34a", lw=2, label="Val PR-AUC")
    best_idx = hist_df["val_pr_auc"].idxmax()
    best_row = hist_df.iloc[best_idx]
    ax2.scatter(best_row["epoch"], best_row["val_pr_auc"], color="#dc2626", s=80, zorder=5,
                label=f"Best Val PR-AUC ({best_row['val_pr_auc']:.4f} @ Ep {int(best_row['epoch'])})")
    ax2.axhline(0.0855, color="#f59e0b", linestyle=":", label="Baseline XGBoost Val PR-AUC (0.0855)")
    ax2.set_title("Validation PR-AUC Progression", fontsize=13, fontweight="bold", pad=10)
    ax2.set_xlabel("Epoch", fontsize=11)
    ax2.set_ylabel("PR-AUC", fontsize=11)
    ax2.grid(True, linestyle="--", alpha=0.5)
    ax2.legend(frameon=True)
    
    plt.tight_layout()
    plt.savefig("outputs/figures/gnn_training_curves.png", dpi=300)
    plt.close()
    print("Saved outputs/figures/gnn_training_curves.png")
