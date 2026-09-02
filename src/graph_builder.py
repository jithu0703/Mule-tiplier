import matplotlib.pyplot as plt
import networkx as nx
import pandas as pd
from data_loader import *

def build_graph(df: pd.DataFrame) -> nx.DiGraph:
    G = nx.DiGraph()
    for i, row in df.iterrows():
        G.add_edge(
            row['from_Account'], row['to_Account'],
            amount = row['Amount Paid'],
            timestamp = row['Timestamp'],
            is_laundering = row['Is Laundering']
        )
    return G

def plot_account_subgraphs(G, accounts, radius=1, output_path='./outputs/figures/subgraph_grup.png'):
    # Accept a single node or an iterable of nodes
    if isinstance(accounts, (str, int)):
        seed_accounts = {accounts}
    else:
        seed_accounts = set(accounts)

    # Collect union of nodes within the radius of all target accounts
    subgraph_nodes = set()
    for acc in seed_accounts:
        if acc in G:
            subgraph_nodes.update(nx.ego_graph(G, acc, radius=radius).nodes())
        else:
            print(f"Warning: Account '{acc}' not found in graph.")

    if not subgraph_nodes:
        print("No valid accounts to plot.")
        return

    # Extract the induced subgraph
    subG = G.subgraph(subgraph_nodes)

    pos = nx.spring_layout(subG, seed=42)

    # Highlight seed accounts in red, neighbors in lightblue
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
    G = build_graph(df)
    legit_accounts = df[df['Is Laundering'] == 0]['from_Account'].unique()
    plot_account_subgraphs(G, legit_accounts[len(legit_accounts)-10:], radius=1)

