import numpy as np
from sklearn.model_selection import train_test_split


def make_splits(features_df, seed=42):
    """
    Assign every account to 'train' (70%), 'val' (10%) or 'test' (20%).

    The test split reproduces the Milestone 2 baseline split exactly
    (test_size=0.2, stratified on is_laundering, random_state=42).
    Returns a DataFrame with columns ['account', 'split'].
    """
    y = features_df['is_laundering'].values
    positions = np.arange(len(features_df))

    # Same call as the baseline -> identical test accounts
    trainval_pos, test_pos = train_test_split(
        positions, test_size=0.2, stratify=y, random_state=seed
    )

    # 0.125 of the remaining 80% = 10% of the total
    train_pos, val_pos = train_test_split(
        trainval_pos, test_size=0.125, stratify=y[trainval_pos], random_state=seed
    )

    split = np.empty(len(features_df), dtype=object)
    split[train_pos] = 'train'
    split[val_pos] = 'val'
    split[test_pos] = 'test'

    out = features_df[['account']].copy()
    out['split'] = split
    return out
