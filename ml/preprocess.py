"""Clean LendingClub fields used by the eligibility model."""

from __future__ import annotations

import re
from pathlib import Path

import pandas as pd

from explore import DATA_PATH

# Keep leakage / multicollinear columns here so later steps can drop them
# with an explicit reason (see drop_leakage_and_multicollinear).
RAW_COLUMNS = [
    "loan_amnt",
    "annual_inc",
    "emp_length",
    "loan_status",
    "fico_range_low",
    "fico_range_high",
    "int_rate",
    "grade",
    "sub_grade",
    "dti",
    "open_acc",
    "total_pymnt",
    "recoveries",
    "last_pymnt_d",
]


def load_completed_loans(path: Path = DATA_PATH) -> pd.DataFrame:
    """Load originated loans whose outcome is known (Fully Paid or Charged Off)."""
    df = pd.read_csv(path, usecols=RAW_COLUMNS, low_memory=False)
    return df[df["loan_status"].isin(["Fully Paid", "Charged Off"])].copy()


def add_credit_score(df: pd.DataFrame) -> pd.DataFrame:
    """Average the origination FICO band into a single credit_score."""
    out = df.copy()
    out["credit_score"] = (out["fico_range_low"] + out["fico_range_high"]) / 2.0
    return out


def _emp_length_to_years(value: object) -> float | None:
    if pd.isna(value):
        return None
    text = str(value).strip().lower()
    if text in {"", "n/a", "na"}:
        return None
    if "<" in text:
        return 0.0
    if "+" in text:
        return 10.0
    match = re.search(r"(\d+)", text)
    return float(match.group(1)) if match else None


def add_employment_years(df: pd.DataFrame) -> pd.DataFrame:
    """Parse emp_length strings like '10+ years' / '< 1 year' into floats."""
    out = df.copy()
    out["employment_years"] = out["emp_length"].map(_emp_length_to_years)
    return out


def main() -> None:
    df = load_completed_loans()
    df = add_credit_score(df)
    df = add_employment_years(df)
    print(df[["fico_range_low", "fico_range_high", "credit_score", "emp_length", "employment_years"]].head())
    print("\nemployment_years missing:", df["employment_years"].isna().sum())


if __name__ == "__main__":
    main()
