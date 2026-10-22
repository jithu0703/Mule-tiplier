"""Chain Reaction: Money Mule Detection & AML Graph Intelligence Dashboard.

Milestone 5 Interactive Demo packaging:
- GraphSAGE GNN Predictions
- Multi-Hop Temporal Motif Chain Search
- GNNExplainer Behavioral Attributions
- SAR-Ready Compliance Risk Cards & Network Visualizations
"""

import os
import sys

# Ensure root and src are importable
sys.path.insert(0, os.path.abspath("."))
sys.path.insert(0, os.path.abspath("src"))

import streamlit as st
import pandas as pd
import numpy as np
import torch
import matplotlib.pyplot as plt
from PIL import Image

from src.gnn_data import build_pyg_data
from src.gnn_model import GraphSAGEClassifier
from src.chain_detector import TemporalChainDetector
from src.explainer import MuleExplainer
from src.risk_report import AccountRiskReporter

# --------------------------------------------------------------------------
# Streamlit Page Config & Custom Styling
# --------------------------------------------------------------------------
st.set_page_config(
    page_title="Chain Reaction | AML Money Mule Detection",
    page_icon="🛡️",
    layout="wide",
    initial_sidebar_state="expanded",
)

st.markdown("""
<style>
    .main-title {
        font-size: 2.2rem;
        font-weight: 700;
        color: #0f172a;
        margin-bottom: 0.2rem;
    }
    .sub-title {
        font-size: 1.05rem;
        color: #475569;
        margin-bottom: 1.5rem;
    }
    .metric-card {
        background: #f8fafc;
        border: 1px solid #e2e8f0;
        border-radius: 8px;
        padding: 16px;
        box-shadow: 0 1px 3px rgba(0,0,0,0.05);
    }
    .badge-critical {
        background-color: #fee2e2;
        color: #b91c1c;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 0.9rem;
    }
    .badge-high {
        background-color: #ffedd5;
        color: #c2410c;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 0.9rem;
    }
    .badge-low {
        background-color: #dcfce7;
        color: #15803d;
        padding: 4px 12px;
        border-radius: 9999px;
        font-weight: 700;
        font-size: 0.9rem;
    }
</style>
""", unsafe_allow_html=True)


# --------------------------------------------------------------------------
# Resource Caching
# --------------------------------------------------------------------------
@st.cache_resource(show_spinner="Loading Transaction Graph & GraphSAGE Model...")
def load_system_pipeline():
    df = pd.read_csv("./data/processed/processed_df.csv")
    features_df = pd.read_csv("./data/processed/account_features.csv")
    split_df = pd.read_csv("./data/processed/split_accounts.csv")
    data = build_pyg_data(df, features_df, split_df)

    device = "cuda" if torch.cuda.is_available() else "cpu"
    model = GraphSAGEClassifier(in_dim=8, hidden_dim=64, num_layers=2).to(device)
    model.load_state_dict(torch.load("outputs/models/graphsage.pt", map_location=device))
    model.eval()

    detector = TemporalChainDetector(df, max_decay=0.25)
    explainer = MuleExplainer(model, data, threshold=0.5254, epochs=50, device=device)
    reporter = AccountRiskReporter(detector, explainer)

    return df, data, reporter


df, data, reporter = load_system_pipeline()

# --------------------------------------------------------------------------
# Header & Global KPI Metrics
# --------------------------------------------------------------------------
st.markdown('<div class="main-title">🛡️ Chain Reaction — AML Graph Intelligence Platform</div>', unsafe_allow_html=True)
st.markdown('<div class="sub-title">Inductive Graph Neural Networks & Multi-Hop Temporal Motif Tracing for Money Mule Detection</div>', unsafe_allow_html=True)

col1, col2, col3, col4, col5 = st.columns(5)
with col1:
    st.metric(label="Monitored Accounts", value="515,080", delta="HI-Small AML")
with col2:
    st.metric(label="Monitored Transactions", value="5.08M", delta="Directed USD Edges")
with col3:
    st.metric(label="GraphSAGE Test PR-AUC", value="0.1884", delta="+128% vs XGBoost")
with col4:
    st.metric(label="Alert Purity (Precision)", value="28.3%", delta="2.4x vs Baseline")
with col5:
    st.metric(label="Detected Laundering Chains", value="1,003", delta="Intermediary Mules")

st.divider()

# --------------------------------------------------------------------------
# Sidebar: Account Selection & Investigation Controls
# --------------------------------------------------------------------------
st.sidebar.header("🔍 Compliance Investigation Panel")

PRESETS = {
    "🚨 Confirmed Multi-Hop Money Mule (811C2F680)": "811C2F680",
    "🚨 High-Volume Laundering Hub (100428660)": "100428660",
    "🚨 Upstream Chain Initiator (8096751E0)": "8096751E0",
    "🛡️ Clean Commercial Account (Normal Activity)": "800043210",
    "⚡ Other Account (Custom Search)": "custom",
}

selected_preset = st.sidebar.selectbox("Choose Case Study Account:", list(PRESETS.keys()))

if selected_preset == "⚡ Other Account (Custom Search)":
    account_input = st.sidebar.text_input("Enter Account ID:", value="811C2F680")
else:
    account_input = PRESETS[selected_preset]

st.sidebar.markdown("---")
st.sidebar.markdown("### ⚙️ Engine Configuration")
st.sidebar.info(
    "**GNN Model:** 2-Layer GraphSAGE (64-dim, NeighborLoader)\n\n"
    "**Inference Device:** CUDA (NVIDIA RTX 3050)\n\n"
    "**Calibrated Decision Threshold:** 0.5254\n\n"
    "**Chain Detection Window:** 72h max hop | 25% max decay"
)

# --------------------------------------------------------------------------
# Main Analysis Execution
# --------------------------------------------------------------------------
if not account_input or account_input not in data.account_to_idx:
    st.error(f"Account ID '{account_input}' not found in the transaction graph index.")
    st.stop()

with st.spinner(f"Analyzing Account {account_input} with GraphSAGE and Temporal Motif Search..."):
    report = reporter.analyze_account(account_input)
    gnn = report["gnn_explanation"]
    chain = report["chain_profile"]
    tier = report["risk_tier"]

# Top Risk Summary Banner
badge_class = "badge-critical" if "CRITICAL" in tier else ("badge-high" if "HIGH" in tier else "badge-low")

st.markdown(f"""
### Account Investigation: `{account_input}` 
**Risk Assessment:** <span class="{badge_class}">{tier}</span> &nbsp;&nbsp;|&nbsp;&nbsp; **Recommended Action:** {report['recommended_action']}
""", unsafe_allow_html=True)

# Metric Row
m_col1, m_col2, m_col3, m_col4 = st.columns(4)
with m_col1:
    st.metric("GNN Mule Probability", f"{gnn['gnn_prob'] * 100:.2f}%", 
              delta="High Risk" if gnn["is_flagged"] else "Normal",
              delta_color="inverse" if gnn["is_flagged"] else "normal")
with m_col2:
    st.metric("Decision Status", "FLAGGED AS MULE" if gnn["is_flagged"] else "NORMAL", delta=f"Threshold: {gnn['threshold'] * 100:.1f}%")
with m_col3:
    st.metric("Multi-Hop Chain Role", chain["role"].upper(), delta=f"{chain['num_chains_found']} Active Chains")
with m_col4:
    st.metric("Max Chain Depth", f"{chain['max_chain_hops']} Hops", delta=f"{gnn['subgraph_nodes_count']} Local Neighbors")

# --------------------------------------------------------------------------
# Multi-Tab Detailed Inspection
# --------------------------------------------------------------------------
tab_card, tab_chains, tab_explainer, tab_network, tab_benchmark = st.tabs([
    "📋 Analyst Risk Card (SAR)",
    "⛓️ Multi-Hop Chain Tracing",
    "🧠 GNNExplainer Attributions",
    "🕸️ Ego-Network Topology",
    "📊 Benchmark & PR Curves"
])

# TAB 1: Analyst Risk Card
with tab_card:
    st.subheader("Official AML Compliance Risk Card")
    st.caption("Auto-generated synthesis ready for direct inclusion into Suspicious Activity Reports (SAR).")
    
    card_text = reporter.format_risk_card(report)
    st.code(card_text, language="text")
    
    st.download_button(
        label="📥 Download SAR Risk Card (.txt)",
        data=card_text,
        file_name=f"SAR_Risk_Card_{account_input}.txt",
        mime="text/plain",
    )

# TAB 2: Multi-Hop Chain Tracing
with tab_chains:
    st.subheader("Sequential Laundering Motif Detection")
    if chain["is_in_chain"]:
        st.success(f"Confirmed participation as **{chain['role'].upper()}** across {chain['num_chains_found']} multi-hop transaction chain(s).")
        for i, c in enumerate(chain["sample_chains"], 1):
            with st.expander(f"Chain Path #{i}: {' ➔ '.join(c['accounts'])} ({c['hops']} Hops, {c['duration_hours']:.1f} hrs)", expanded=(i == 1)):
                st.write(f"- **Initial Inflow:** ${c['initial_amount']:,.2f}")
                st.write(f"- **Final Downstream Outflow:** ${c['final_amount']:,.2f}")
                st.write(f"- **Fund Preservation:** {c['amount_retention'] * 100:.1f}% (Total fee haircut: ${(c['initial_amount'] - c['final_amount']):,.2f})")
                st.write(f"- **Hop Elapsed Time:** {c['duration_hours']:.1f} hours ({c['start_time']} to {c['end_time']})")
                
                # Step table
                steps_df = pd.DataFrame(c["steps"])
                st.dataframe(steps_df[["from", "to", "timestamp", "amount"]].rename(
                    columns={"from": "Sender Account", "to": "Receiver Account", "timestamp": "Timestamp", "amount": "Amount (USD)"}
                ), use_container_width=True)
    else:
        st.info("No linear multi-hop laundering chain detected for this account within current temporal and decay thresholds.")

# TAB 3: GNNExplainer Attributions
with tab_explainer:
    st.subheader("Explainable Graph Neural Network Attributions")
    st.write("Identifies the key local topological features and counterparty flows that drove the GraphSAGE prediction.")

    e_col1, e_col2 = st.columns([1, 1])
    with e_col1:
        st.markdown("**Top Driving Behavioral Features:**")
        feat_df = pd.DataFrame(gnn["top_features"])
        feat_df["score_pct"] = feat_df["score"] * 100
        
        # Horizontal Bar Chart
        fig, ax = plt.subplots(figsize=(6, 4))
        y_pos = np.arange(len(feat_df))
        ax.barh(y_pos, feat_df["score_pct"], color="#2563eb", align="center")
        ax.set_yticks(y_pos)
        ax.set_yticklabels(feat_df["feature"])
        ax.invert_yaxis()
        ax.set_xlabel("Attribution Contribution (%)")
        ax.set_title("Primary Predictive Features", fontsize=11, fontweight="bold")
        st.pyplot(fig)
        plt.close()

    with e_col2:
        st.markdown("**Top Influential Counterparty Transactions:**")
        edges_df = pd.DataFrame(gnn["top_edges"])
        if not edges_df.empty:
            st.dataframe(edges_df[["direction", "counterparty", "importance_score"]].rename(
                columns={"direction": "Flow Direction", "counterparty": "Counterparty Account", "importance_score": "Attribution Weight"}
            ), use_container_width=True)
        else:
            st.write("No incident edges found.")

# TAB 4: Network Visualization
with tab_network:
    st.subheader("2-Hop Ego-Network Topology")
    st.caption("Visual representation of transaction flows: Target account (Red), Chain nodes (Orange), and Background counterparties (Blue).")
    
    plot_path = reporter.plot_risk_subgraph(report)
    if os.path.exists(plot_path):
        st.image(plot_path, use_container_width=True)

# TAB 5: Benchmarks
with tab_benchmark:
    st.subheader("Official Model Benchmarks (Frozen 20% Test Split)")
    if os.path.exists("outputs/results/m3_comparison.csv"):
        cmp_df = pd.read_csv("outputs/results/m3_comparison.csv")
        st.dataframe(cmp_df, use_container_width=True)
    
    b_col1, b_col2 = st.columns(2)
    with b_col1:
        if os.path.exists("outputs/figures/pr_curve_comparison.png"):
            st.image("outputs/figures/pr_curve_comparison.png", caption="Precision-Recall Curves Comparison", use_container_width=True)
    with b_col2:
        if os.path.exists("outputs/figures/gnn_training_curves.png"):
            st.image("outputs/figures/gnn_training_curves.png", caption="GraphSAGE 70-Epoch Training Progression", use_container_width=True)
