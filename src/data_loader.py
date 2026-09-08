import pandas as pd

EXCHANGE_RATES_TO_USD = {
    'US Dollar': 1.0,
    'Euro': 1.08,
    'UK Pound': 1.27,
    'Yen': 0.0067,
    'Yuan': 0.14,
    'Rupee': 0.012,
    'Swiss Franc': 1.12,
    'Australian Dollar': 0.66,
    'Canadian Dollar': 0.73,
    'Mexican Peso': 0.058,
    'Brazil Real': 0.20,
    'Ruble': 0.011,
    'Saudi Riyal': 0.27,
    'Shekel': 0.27,
    'Bitcoin': 60000.0
}

def load_transactions(path: str) -> pd.DataFrame:
    df = pd.read_csv(path)
    df.rename(columns={'Account':'from_Account', 'Account.1':'to_Account'}, inplace=True)
    df['Timestamp'] = pd.to_datetime(df['Timestamp'])
    paid_rates = df['Payment Currency'].map(EXCHANGE_RATES_TO_USD)
    received_rates = df['Receiving Currency'].map(EXCHANGE_RATES_TO_USD)

    missing_paid = df.loc[paid_rates.isna(), 'Payment Currency'].unique()
    missing_received = df.loc[received_rates.isna(), 'Receiving Currency'].unique()
    if len(missing_paid) > 0 or len(missing_received) > 0:
        print(f"Missing exchange rates for: "
                f"{set(missing_paid) | set(missing_received)}")
        print("Add these to EXCHANGE_RATES_TO_USD before proceeding.")

    df['amount_paid_usd'] = df['Amount Paid'] * paid_rates
    df['amount_received_usd'] = df['Amount Received'] * received_rates
    df.drop(columns=["Amount Received", "Amount Paid"])

    return df