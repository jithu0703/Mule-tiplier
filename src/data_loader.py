import pandas as pd

def load_transactions(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.rename(columns={'Account':'from_Account', 'Account.1':'to_Account'}, inplace=True)
    df['Timestamp'] = pd.to_datetime(df['Timestamp'])

    return df