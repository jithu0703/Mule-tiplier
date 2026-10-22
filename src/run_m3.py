import os
import pandas as pd
from m3_experiments import gnn_run, RESULTS_CSV
from gnn_data import build_pyg_data
import torch
import time
from gnn_model import run_experiment


def build_data():
    df = pd.read_csv('./data/processed/processed_df.csv')
    features_df = pd.read_csv('./data/processed/account_features.csv')
    split_df = pd.read_csv('./data/processed/split_accounts.csv')
    data = build_pyg_data(df, features_df, split_df)
    return data

if __name__ == "__main__":
    data = build_data()
    # runs = [
    #     ("sage_L2_pw9_seed0", dict(seed=0, num_layers=2, pos_weight=9.0)),
    #     ("sage_L2_pw9_seed1", dict(seed=1, num_layers=2, pos_weight=9.0)),
    #     ("sage_L2_pw9_seed2", dict(seed=2, num_layers=2, pos_weight=9.0)),
    #     ("sage_L2_pw80",      dict(seed=0, num_layers=2, pos_weight=80.0)),
    #     ("sage_L3_pw9",       dict(seed=0, num_layers=3, pos_weight=9.0)),
    #     ("sage_L4_pw9",       dict(seed=0, num_layers=4, pos_weight=9.0)),
    # ]
    # done = set(pd.read_csv(RESULTS_CSV)["run"]) if os.path.exists(RESULTS_CSV) else set()
    # for name, kw in runs:
    #     if name not in done:
    #         gnn_run(name, data, num_workers=4, **kw)
    device = "cuda"
    print(torch.cuda.get_device_name(0))

    t = time.time()
    _, hist, res = run_experiment(data, seed=0, num_layers=2, pos_weight=9.0,
                                epochs=2, lr=3e-3, verbose=True)
    print("seconds for 2 epochs + eval:", round(time.time() - t))