import matplotlib.pyplot as plt
import networkx as nx
import pandas as pd
import pickle
import os
from data_loader import *

def build_graph(
    df: pd.DataFrame,
    rebuild: int = 0,
    cache_path: str = r'C:\Projects\Mule-tiplier\outputs\cache\graph.pkl'
) -> nx.DiGraph:
    """
    Build (or load) the transaction graph.

    Parameters
    ----------
    df : pd.DataFrame
        Transaction data (only used if graph needs to be built).
    rebuild : int, default 0
        0 -> load graph from disk if it exists, else build and save it.
        1 -> always rebuild from df and overwrite the cached graph.
    cache_path : str
        Path to the pickle file used to store/load the graph.
    """
    # Case 1: rebuild not forced, and a cached graph exists -> load it
    if rebuild == 0 and os.path.exists(cache_path):
        print(f"Loading cached graph from '{cache_path}'...")
        with open(cache_path, 'rb') as f:
            G = pickle.load(f)
        return G

    # Case 2: either rebuild forced, or no cache exists -> build fresh
    print("Building graph from dataframe...")
    G = nx.DiGraph()
    for _, row in df.iterrows():
        G.add_edge(
            row['from_Account'], row['to_Account'],
            amount=row['amount_paid_usd'],
            timestamp=row['Timestamp'],
            is_laundering=row['Is Laundering']
        )

    # Ensure cache directory exists, then save
    os.makedirs(os.path.dirname(cache_path), exist_ok=True)
    with open(cache_path, 'wb') as f:
        pickle.dump(G, f)
    print(f"Graph saved to '{cache_path}'.")

    return G


def plot_account_subgraphs(G, accounts, radius=1, output_path='./outputs/figures/subgraph_grup.png'):
    if isinstance(accounts, (str, int)):
        seed_accounts = {accounts}
    else:
        seed_accounts = set(accounts)

    subgraph_nodes = set()
    for acc in seed_accounts:
        if acc in G:
            subgraph_nodes.update(nx.ego_graph(G, acc, radius=radius).nodes())
        else:
            print(f"Warning: Account '{acc}' not found in graph.")

    if not subgraph_nodes:
        print("No valid accounts to plot.")
        return

    subG = G.subgraph(subgraph_nodes)
    pos = nx.spring_layout(subG, seed=42)
    node_colors = ['red' if n in seed_accounts else 'yellow' for n in subG.nodes()]

    plt.figure(figsize=(10, 8))
    nx.draw(
        subG,
        pos,
        with_labels=True,
        node_color=node_colors,
        node_size=500,
        font_size=8,
        arrows=True,
        arrowsize=12
    )

    plt.title(f"Subgraph for {len(seed_accounts)} Target Account(s) (Radius={radius})")
    plt.savefig(output_path, dpi=150, bbox_inches='tight')
    plt.show()


if __name__ == '__main__':
    df = load_transactions(r'C:\Projects\Mule-tiplier\data\raw\HI-Small_Trans.csv')
    G = build_graph(df, rebuild=0)  # loads from disk if available
    legit_accounts = df[df['Is Laundering'] == 0]['from_Account'].unique()
    plot_account_subgraphs(G, legit_accounts[len(legit_accounts) - 10:], radius=1)