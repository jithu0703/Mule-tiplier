import pandas as pd
import networkx as nx


def compute_avg_holding_time(df: pd.DataFrame) -> pd.Series:
    """
    Vectorized holding time: for every incoming transaction, find the
    nearest outgoing transaction at the same account that happened at
    or after it, using merge_asof instead of a per-row/per-account loop.
    """
    incoming = df[['to_Account', 'Timestamp']].rename(
        columns={'to_Account': 'account', 'Timestamp': 'in_time'}
    ).sort_values('in_time')

    outgoing = df[['from_Account', 'Timestamp']].rename(
        columns={'from_Account': 'account', 'Timestamp': 'out_time'}
    ).sort_values('out_time')

    matched = pd.merge_asof(
        incoming, outgoing,
        left_on='in_time', right_on='out_time',
        by='account', direction='forward'
    )

    matched['holding_time'] = (
        matched['out_time'] - matched['in_time']
    ).dt.total_seconds()

    return matched.groupby('account')['holding_time'].mean()


def compute_account_features(G: nx.DiGraph, df: pd.DataFrame) -> pd.DataFrame:
    pagerank = pd.Series(nx.pagerank(G, weight='amount_paid_usd'), name='pagerank')

    in_stats = df.groupby('to_Account').agg(
        in_degree=('from_Account', 'count'),
        total_in=('amount_received_usd', 'sum'),
        in_counterparties=('from_Account', lambda x: set(x)),
        laundering_in=('Is Laundering', 'max')
    )

    out_stats = df.groupby('from_Account').agg(
        out_degree=('to_Account', 'count'),
        total_out=('amount_paid_usd', 'sum'),
        out_counterparties=('to_Account', lambda x: set(x)),
        laundering_out=('Is Laundering', 'max')
    )

    features = in_stats.join(out_stats, how='outer')
    features = features.join(pagerank, how='left')

    holding_time = compute_avg_holding_time(df)
    features = features.join(holding_time.rename('avg_holding_time'), how='left')

    # fill structural NaNs (accounts with only inflow or only outflow)
    features[['in_degree', 'out_degree', 'total_in', 'total_out']] = \
        features[['in_degree', 'out_degree', 'total_in', 'total_out']].fillna(0)
    features['pagerank'] = features['pagerank'].fillna(0)

    features['unique_counterparties'] = features.apply(
        lambda row: len(
            (row['in_counterparties'] if isinstance(row['in_counterparties'], set) else set()) |
            (row['out_counterparties'] if isinstance(row['out_counterparties'], set) else set())
        ),
        axis=1
    )

    features['is_laundering'] = (
        features[['laundering_in', 'laundering_out']].max(axis=1).fillna(0).astype(int)
    )

    features = features.drop(
        columns=['in_counterparties', 'out_counterparties', 'laundering_in', 'laundering_out']
    ).reset_index().rename(columns={'index': 'account'})

    return features