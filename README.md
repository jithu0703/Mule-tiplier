# Chain Reaction — Money Mule Detection with Graph Neural Networks

A graph-based fraud detection system that models bank transactions as a graph to identify money mule accounts. Combines a GraphSAGE graph neural network for learned structural patterns, motif/chain search for multi-hop laundering detection, and GNNExplainer for interpretable, investigator-ready fraud flags.

---

## Why graphs, not row-level classification

Individual money mule transactions often look completely normal in isolation — a deposit, then a withdrawal, both under reporting thresholds. The fraud signal only becomes visible in the **pattern of connections**: many first-time senders converging into one account (fan-in), followed by a rapid, near-complete forwarding of funds to a different set of accounts (fan-out), all within a short time window. Standard row-by-row transaction classifiers miss this because they never see the surrounding structure. This project treats the transaction data as a graph instead of a table, so the model can learn from *who is connected to whom, how fast, and how much* — not just individual transaction features.

---

## Dataset

[IBM Transactions for Anti-Money Laundering (AML)](https://www.kaggle.com/datasets/ealtman2019/ibm-transactions-for-anti-money-laundering-aml) — a synthetic dataset modeling realistic banking transactions across multiple currencies, with ground-truth laundering labels covering eight distinct laundering patterns (fan-in, fan-out, cycle, scatter-gather, and others).

Starting scale: **HI-Small** (~5M transactions). Larger sizes (HI-Medium, HI-Large) used in the scaling milestone.

> Raw data files are not committed to this repository. Download `HI-Small_Trans.csv` and `HI-Small_Patterns.txt` from Kaggle and place them in `data/raw/`.

---

## Project Structure

```
chain-reaction/
│
├── data/
│   ├── raw/                  # Untouched downloaded dataset files
│   └── processed/            # Cleaned data, computed features, saved graphs
│
├── notebooks/
│   ├── 01_data_exploration.ipynb
│   ├── 02_baseline_model.ipynb
│   └── ...
│
├── src/
│   ├── data_loader.py        # Load + clean transactions, currency standardization
│   ├── graph_builder.py      # Build the transaction graph (networkx)
│   └── feature_engineering.py # Per-account graph feature computation
│
├── outputs/
│   └── figures/               # Saved plots and visualizations
|   └── cache/                 # Graphs and other data
|   └── models/                # Store baseline model
│
├── requirements.txt
└── README.md
```

---

## Setup

```bash
python -m venv chain-reaction-env
source chain-reaction-env/bin/activate      # Windows: chain-reaction-env\Scripts\activate

pip install -r requirements.txt
```

**Requirements**
```
pandas
numpy
networkx
matplotlib
seaborn
scikit-learn
xgboost
torch
torch_geometric
jupyterlab
```

---

## Data Preprocessing

Transaction amounts in the dataset span multiple currencies (USD, Euro, Bitcoin, and others). All amounts are converted to a standardized USD reference (`amount_paid_usd`, `amount_received_usd`) using static approximate exchange rates, since exact real-world historical rates aren't meaningful for this synthetic dataset — the goal is comparability across accounts, not financial precision. Original raw amount and currency columns are preserved alongside the converted ones.

---

## Milestones

### Milestone 1 — Data & Graph Foundation
Load transaction data, standardize currencies, and build a directed graph (nodes = accounts, edges = transactions). Visualize and contrast the local subgraph of a known laundering account against a legitimate one.

### Milestone 2 — Feature Engineering + Baseline Model
Compute per-account graph features (in/out-degree, total inflow/outflow, average holding time, has_outflow_after_inflow,  PageRank, unique counterparties) and train an XGBoost baseline classifier. Evaluated with precision-recall AUC due to severe class imbalance. This establishes the benchmark score for all later milestones.

### Milestone 3 — Graph Neural Network (GraphSAGE)
Train a GraphSAGE model using neighbor sampling to learn account embeddings directly from graph structure, rather than relying solely on hand-crafted features. Compared against the Milestone 2 baseline.

### Milestone 4 — Multi-Hop Chain Detection + Explainability
Search for layered laundering chains (A → B → C → D with amount decay and time proximity) that a single-node classifier can miss. Apply GNNExplainer to generate human-readable rationale for flagged accounts, combining GNN score, chain membership, and plain-language explanation.

### Milestone 5 — Scale + Demo
Reimplement feature engineering in PySpark + GraphFrames for larger dataset sizes, and build a Streamlit dashboard to search accounts, view their subgraph, and inspect their fraud score and explanation.

---

## Results

| Model | PR-AUC | Notes |
|---|---|---|
| XGBoost (baseline, graph features) | *0.0914* | Milestone 2 benchmark |
| GraphSAGE | *TBD* | Milestone 3 |


---

## Known Limitations

- **Multi-hop depth**: GNN performance degrades with very deep laundering chains due to over-smoothing; deep chains are partially addressed via separate motif search rather than relying on the GNN alone.
- **Time dilution**: Slow, patient laundering (funds held for weeks between hops) is harder to detect than fast pass-through, since the strongest structural signals rely on short holding times.
- **Single-institution visibility**: The model only sees transactions within its own dataset; real-world laundering chains that cross institutions would be partially invisible without cross-bank data sharing.
- **Adaptive adversary**: Unlike static classification problems, laundering patterns can adapt once detection thresholds become known, which this project does not attempt to model.
- This project is framed as a **risk prioritization tool** (surfacing the most suspicious accounts for human review), not a standalone fraud determination system.

---

## Tech Stack

`Python` · `pandas` · `networkx` · `scikit-learn` · `XGBoost` · `PyTorch Geometric` (GraphSAGE, GNNExplainer) · `PySpark` / `GraphFrames` · `Streamlit`
