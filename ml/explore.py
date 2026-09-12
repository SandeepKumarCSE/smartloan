"""Load the raw LendingClub CSV and print schema / sample rows."""

from pathlib import Path

import pandas as pd

DATA_PATH = Path(__file__).resolve().parent / "data" / "accepted_2007_to_2018Q4.csv"


def load_raw() -> pd.DataFrame:
    if not DATA_PATH.exists():
        raise FileNotFoundError(
            f"Dataset not found at {DATA_PATH}.\n"
            "Download the LendingClub accepted-loans file from Hugging Face:\n"
            "https://huggingface.co/datasets/codesignal/lending-club-loan-accepted\n"
            f"and save it as {DATA_PATH}"
        )
    return pd.read_csv(DATA_PATH, low_memory=False)


def main() -> None:
    df = load_raw()
    print(f"Loaded {DATA_PATH.name}")
    print(f"shape: {df.shape}")
    print("\n--- .info() ---")
    df.info()
    print("\n--- .head() ---")
    print(df.head())


if __name__ == "__main__":
    main()
