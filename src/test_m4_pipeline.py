import os
import sys

sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("src"))

import time
import torch
import pandas as pd
from gnn_data import build_pyg_data
from gnn_model import GraphSAGEClassifier
from chain_detector import TemporalChainDetector
from explainer import MuleExplainer
from risk_report import AccountRiskReporter

print("--- Initializing Milestone 4 Pipeline ---")
t0 = time.time()

# 1. Load data
print("Loading transaction data...")
df = pd.read_csv("./data/processed/processed_df.csv")
features_df = pd.read_csv("./data/processed/account_features.csv")
split_df = pd.read_csv("./data/processed/split_accounts.csv")
data = build_pyg_data(df, features_df, split_df)
print(f"Data ready in {time.time() - t0:.1f}s")

# 2. Load trained GraphSAGE
device = "cuda" if torch.cuda.is_available() else "cpu"
print(f"Loading GraphSAGE model on {device}...")
model = GraphSAGEClassifier(in_dim=8, hidden_dim=64, num_layers=2).to(device)
model.load_state_dict(torch.load("outputs/models/graphsage.pt", map_location=device))
model.eval()

# 3. Initialize components
print("Initializing TemporalChainDetector and MuleExplainer...")
detector = TemporalChainDetector(df, max_decay=0.25)
explainer = MuleExplainer(model, data, threshold=0.5254, epochs=50, device=device)
reporter = AccountRiskReporter(detector, explainer)

# 4. Analyze test case: confirmed laundering intermediary '811C2F680'
target_acc = "811C2F680"
print(f"\nAnalyzing target account {target_acc}...")
t_start = time.time()
report = reporter.analyze_account(target_acc)
card = reporter.format_risk_card(report)
print(f"Analysis completed in {time.time() - t_start:.2f}s")
print("\n" + card + "\n")

# 5. Generate risk subgraph plot
plot_path = reporter.plot_risk_subgraph(report)
print(f"Saved risk subgraph visualization to: {plot_path}")
