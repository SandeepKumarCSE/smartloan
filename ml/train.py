"""Train / evaluate the SmartLoan logistic regression model."""

from pathlib import Path

import joblib
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import (
    classification_report,
    confusion_matrix,
    precision_score,
    recall_score,
    roc_auc_score,
)
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


def evaluate(model, X_test_scaled, y_test) -> dict:
    y_pred = model.predict(X_test_scaled)
    y_prob = model.predict_proba(X_test_scaled)[:, 1]
    metrics = {
        "precision": precision_score(y_test, y_pred),
        "recall": recall_score(y_test, y_pred),
        "roc_auc": roc_auc_score(y_test, y_prob),
        "confusion_matrix": confusion_matrix(y_test, y_pred),
        "classification_report": classification_report(y_test, y_pred, target_names=["Charged Off", "Fully Paid"]),
    }
    return metrics


def write_metrics(metrics: dict, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    cm = metrics["confusion_matrix"]
    path.write_text(
        "\n".join(
            [
                "# SmartLoan model metrics",
                "",
                "Test-set evaluation of `LogisticRegression(class_weight='balanced')`.",
                "Accuracy is omitted on purpose: the LendingClub label is imbalanced.",
                "",
                f"- Precision (Fully Paid): {metrics['precision']:.4f}",
                f"- Recall (Fully Paid): {metrics['recall']:.4f}",
                f"- AUC-ROC: {metrics['roc_auc']:.4f}",
                "",
                "Confusion matrix (rows = actual, cols = predicted):",
                "",
                "```",
                f"                Pred Charged Off    Pred Fully Paid",
                f"Actual Charged Off    {cm[0, 0]:>12}    {cm[0, 1]:>14}",
                f"Actual Fully Paid     {cm[1, 0]:>12}    {cm[1, 1]:>14}",
                "```",
                "",
                "Classification report:",
                "",
                "```",
                metrics["classification_report"].rstrip(),
                "```",
                "",
            ]
        )
    )


def export_artifacts(model, scaler, directory: Path) -> None:
    directory.mkdir(parents=True, exist_ok=True)
    joblib.dump(model, directory / "model.pkl")
    joblib.dump(scaler, directory / "scaler.pkl")


def main() -> None:
    df = prepare_features()
    X_train_scaled, X_test_scaled, y_train, y_test, scaler = split_and_scale(df)
    model = train_model(X_train_scaled, y_train)
    metrics = evaluate(model, X_test_scaled, y_test)
    results_path = ML_DIR / "results" / "metrics.md"
    artifacts_dir = ML_DIR / "artifacts"
    write_metrics(metrics, results_path)
    export_artifacts(model, scaler, artifacts_dir)
    print(f"train rows: {len(y_train)}")
    print(f"test rows:  {len(y_test)}")
    print(f"coefficients: {dict(zip(FEATURE_COLS, model.coef_[0]))}")
    print(f"wrote {results_path}")
    print(f"wrote {artifacts_dir / 'model.pkl'} and {artifacts_dir / 'scaler.pkl'}")


if __name__ == "__main__":
    main()
