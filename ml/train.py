"""Train / evaluate the SmartLoan logistic regression model."""

from pathlib import Path

from sklearn.model_selection import train_test_split
from sklearn.preprocessing import StandardScaler

from preprocess import prepare_features

FEATURE_COLS = ["credit_score", "employment_years", "loan_to_income_ratio"]
RANDOM_STATE = 42
ML_DIR = Path(__file__).resolve().parent


def split_and_scale(df):
    """Hold out 20% for test. Fit StandardScaler on training rows only."""
    X = df[FEATURE_COLS]
    y = df["target"]
    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y,
    )
    scaler = StandardScaler()
    X_train_scaled = scaler.fit_transform(X_train)
    X_test_scaled = scaler.transform(X_test)
    return X_train_scaled, X_test_scaled, y_train, y_test, scaler


def main() -> None:
    df = prepare_features()
    X_train_scaled, X_test_scaled, y_train, y_test, scaler = split_and_scale(df)
    print(f"train rows: {len(y_train)}")
    print(f"test rows:  {len(y_test)}")
    print(f"scaler mean: {scaler.mean_}")
    print(f"scaler scale: {scaler.scale_}")


if __name__ == "__main__":
    main()
