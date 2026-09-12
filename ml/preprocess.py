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


def drop_leakage_and_multicollinear(df: pd.DataFrame) -> pd.DataFrame:
    """Remove columns that would leak the outcome or destabilize coefficients."""
    out = df.copy()

    # int_rate / grade / sub_grade are assigned *after* LendingClub prices the
    # loan. Feeding them to a pre-origination model leaks the lender's own
    # decision into the features.
    leakage_pricing = ["int_rate", "grade", "sub_grade"]

    # Payment and recovery fields exist only after the loan is issued. They
    # describe the outcome, not the application, so they leak the label.
    leakage_post_payment = ["total_pymnt", "recoveries", "last_pymnt_d"]

    # dti is highly correlated with loan_to_income_ratio. Including both makes
    # logistic-regression coefficients unstable and breaks explainability.
    # Layer 1 of the product already gates on DTI, so the ML layer should not
    # reuse it.
    multicollinear = ["dti"]

    # open_acc is a weak signal here and adds form complexity without enough
    # predictive value to justify keeping it.
    extra_complexity = ["open_acc"]

    to_drop = [
        col
        for col in leakage_pricing + leakage_post_payment + multicollinear + extra_complexity
        if col in out.columns
    ]
    return out.drop(columns=to_drop)


def add_loan_to_income_ratio(df: pd.DataFrame) -> pd.DataFrame:
    """loan_amount / annual_income. Drop zero-income rows to avoid invalid ratios."""
    out = df.copy()
    out = out[out["annual_inc"] > 0].copy()
    out["loan_to_income_ratio"] = out["loan_amnt"] / out["annual_inc"]
    return out


def impute_missing_with_median(df: pd.DataFrame, columns: list[str]) -> pd.DataFrame:
    """Median-impute remaining numeric holes (fit on this frame, used later with care)."""
    out = df.copy()
    for col in columns:
        out[col] = out[col].fillna(out[col].median())
    return out


def add_target(df: pd.DataFrame) -> pd.DataFrame:
    """Fully Paid = 1 (repaid), Charged Off = 0 (default)."""
    out = df.copy()
    out["target"] = (out["loan_status"] == "Fully Paid").astype(int)
    return out


def prepare_features(df: pd.DataFrame | None = None) -> pd.DataFrame:
    if df is None:
        df = load_completed_loans()
    df = add_credit_score(df)
    df = add_employment_years(df)
    df = drop_leakage_and_multicollinear(df)
    df = add_loan_to_income_ratio(df)
    feature_cols = ["credit_score", "employment_years", "loan_to_income_ratio"]
    df = impute_missing_with_median(df, feature_cols)
    df = add_target(df)
    return df


def main() -> None:
    df = prepare_features()
    print(df[["credit_score", "employment_years", "loan_to_income_ratio", "target"]].head())
    print("\nmissing after impute:")
    print(df[["credit_score", "employment_years", "loan_to_income_ratio"]].isna().sum())
    print("\nlabel balance:")
    print(df["target"].value_counts(normalize=True))


if __name__ == "__main__":
    main()
