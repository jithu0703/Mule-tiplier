import torch
import numpy as np
import pandas as pd
from torch_geometric.data import Data
from sklearn.preprocessing import StandardScaler

def build_pyg_data(df, features_df, split_df, add_reverse_edges=True, filter_invalid_edges=False):
    merge_df = pd.merge(features_df, split_df, on='account')
    merge_df['account'] = merge_df['account'].astype(str)

    account_to_idx = {account: i for i, account in enumerate(merge_df['account'])}
    src = df['from_Account'].astype(str).map(account_to_idx)
    dst = df['to_Account'].astype(str).map(account_to_idx)

    missing_mask = src.isna() | dst.isna()
    if missing_mask.any():
        num_src_missing = int(src.isna().sum())
        num_dst_missing = int(dst.isna().sum())
        sample_missing_src = df.loc[src.isna(), 'from_Account'].head(5).tolist()
        sample_missing_dst = df.loc[dst.isna(), 'to_Account'].head(5).tolist()
        err_msg = (
            f"build_pyg_data: Graph edge endpoints missing from node index. "
            f"Unmapped source endpoints: {num_src_missing} (samples: {sample_missing_src}), "
            f"unmapped destination endpoints: {num_dst_missing} (samples: {sample_missing_dst}). "
            f"Total indexed accounts in merge_df: {len(merge_df)}. "
            f"This usually occurs if account_features.csv or split_accounts.csv is corrupted, incomplete, "
            f"or was read while being generated."
        )
        if filter_invalid_edges:
            print(f"Warning: {err_msg} Filtering out {int(missing_mask.sum())} invalid transactions.")
            src = src[~missing_mask].astype(np.int64)
            dst = dst[~missing_mask].astype(np.int64)
        else:
            raise ValueError(err_msg)
    else:
        src = src.astype(np.int64)
        dst = dst.astype(np.int64)

    # Tensor edges
    edge_index = torch.tensor(np.stack([src.values, dst.values]), dtype=torch.long)
    
    if add_reverse_edges:
        edge_index = torch.cat([edge_index, edge_index.flip(0)], dim=1)
    # important features to log normalize(heavy tailed cols)
    log_cols = ['in_degree', 'out_degree', 'total_in', 'total_out',
            'unique_counterparties', 'avg_holding_time']
    
    feature_cols = log_cols + ['pagerank', 'has_outflow_after_inflow']

    feats = merge_df[feature_cols].copy()
    feats['avg_holding_time'] = feats['avg_holding_time'].fillna(0)
    #log normalization
    feats[log_cols] = np.log1p(feats[log_cols])
    # Normalize pagerank
    # PageRank values sum to 1 across about 515k nodes, so a typical value is around 2e-6. After standardising, 
    # that is fine numerically, but the distribution is still very skewed. 
    # The simple choice is to rescale by N and then log it
    feats['pagerank'] = np.log1p(feats['pagerank'] * len(feats))

    train_np = (merge_df['split'] == 'train').values
    scaler = StandardScaler().fit(feats[train_np]) # Only standard normalize train data
    x = torch.tensor(scaler.transform(feats), dtype=torch.float32) # train data tensor

    y = torch.tensor(merge_df['is_laundering'].values, dtype=torch.long)

    # All class masks
    train_mask = torch.tensor((merge_df['split'] == 'train').values, dtype=torch.bool)
    test_mask = torch.tensor((merge_df['split'] == 'test').values, dtype=torch.bool)
    val_mask = torch.tensor((merge_df['split'] == 'val').values, dtype=torch.bool)

    data = Data(x=x, edge_index=edge_index, y=y,
            train_mask=train_mask, val_mask=val_mask, test_mask=test_mask)
    data.account_to_idx = account_to_idx
    data.scaler = scaler
    return data
