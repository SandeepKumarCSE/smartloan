"""Train / evaluate the SmartLoan logistic regression model."""

from pathlib import Path

from sklearn.linear_model import LogisticRegression
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


def train_model(X_train_scaled, y_train) -> LogisticRegression:
    """class_weight='balanced' so Charged Off rows are not ignored."""
    model = LogisticRegression(class_weight="balanced", max_iter=1000, random_state=RANDOM_STATE)
    model.fit(X_train_scaled, y_train)
    return model


def main() -> None:
    df = prepare_features()
    X_train_scaled, X_test_scaled, y_train, y_test, scaler = split_and_scale(df)
    model = train_model(X_train_scaled, y_train)
    print(f"train rows: {len(y_train)}")
    print(f"test rows:  {len(y_test)}")
    print(f"coefficients: {dict(zip(FEATURE_COLS, model.coef_[0]))}")
    print(f"intercept: {model.intercept_[0]}")


if __name__ == "__main__":
    main()
