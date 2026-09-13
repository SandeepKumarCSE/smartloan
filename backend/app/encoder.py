from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, List, Tuple
import numpy as np

from app.schemas import LoanApplicationRequest

# Path to feature_columns.json
ARTIFACTS_DIR = Path(__file__).resolve().parent.parent.parent / "ml" / "artifacts"
FEATURE_COLUMNS_PATH = ARTIFACTS_DIR / "feature_columns.json"

DEFAULT_FEATURE_COLUMNS = [
    "loan_amnt",
    "term",
    "emp_length",
    "annual_inc",
    "dti",
    "fico_score",
    "revol_util",
    "inq_last_6mths",
    "delinq_2yrs",
    "pub_rec",
    "open_acc",
    "total_acc",
    "home_ownership_MORTGAGE",
    "home_ownership_NONE",
    "home_ownership_OTHER",
    "home_ownership_OWN",
    "home_ownership_RENT",
    "purpose_credit_card",
    "purpose_debt_consolidation",
    "purpose_educational",
    "purpose_home_improvement",
    "purpose_house",
    "purpose_major_purchase",
    "purpose_medical",
    "purpose_moving",
    "purpose_other",
    "purpose_renewable_energy",
    "purpose_small_business",
    "purpose_vacation",
    "purpose_wedding",
]


def load_feature_columns() -> List[str]:
    if FEATURE_COLUMNS_PATH.exists():
        with open(FEATURE_COLUMNS_PATH, "r") as f:
            return json.load(f)
    return DEFAULT_FEATURE_COLUMNS


FEATURE_COLUMNS = load_feature_columns()


def encode_application(req: LoanApplicationRequest) -> Tuple[np.ndarray, Dict[str, float]]:
    """Convert raw Pydantic LoanApplicationRequest into a 1x30 numpy array matching FEATURE_COLUMNS order.

    Returns (feature_vector_2d, raw_feature_dict).
    """
    effective_fico = req.get_effective_fico()
    home_up = (req.home_ownership or "RENT").strip().upper()
    purpose_low = (req.purpose or "debt_consolidation").strip().lower().replace(" ", "_")

    raw_dict: Dict[str, float] = {
        "loan_amnt": float(req.loan_amnt),
        "term": float(req.term),
        "emp_length": float(req.emp_length),
        "annual_inc": float(req.annual_inc),
        "dti": float(req.dti),
        "fico_score": float(effective_fico),
        "revol_util": float(req.revol_util),
        "inq_last_6mths": float(req.inq_last_6mths),
        "delinq_2yrs": float(req.delinq_2yrs),
        "pub_rec": float(req.pub_rec),
        "open_acc": float(req.open_acc),
        "total_acc": float(req.total_acc),
        # Home ownership dummies (baseline 'ANY' -> all 0)
        "home_ownership_MORTGAGE": 1.0 if home_up == "MORTGAGE" else 0.0,
        "home_ownership_NONE": 1.0 if home_up == "NONE" else 0.0,
        "home_ownership_OTHER": 1.0 if home_up == "OTHER" else 0.0,
        "home_ownership_OWN": 1.0 if home_up == "OWN" else 0.0,
        "home_ownership_RENT": 1.0 if home_up == "RENT" else 0.0,
        # Purpose dummies (baseline 'car' -> all 0)
        "purpose_credit_card": 1.0 if purpose_low == "credit_card" else 0.0,
        "purpose_debt_consolidation": 1.0 if purpose_low == "debt_consolidation" else 0.0,
        "purpose_educational": 1.0 if purpose_low == "educational" else 0.0,
        "purpose_home_improvement": 1.0 if purpose_low == "home_improvement" else 0.0,
        "purpose_house": 1.0 if purpose_low == "house" else 0.0,
        "purpose_major_purchase": 1.0 if purpose_low in ("major_purchase", "major_purchases") else 0.0,
        "purpose_medical": 1.0 if purpose_low == "medical" else 0.0,
        "purpose_moving": 1.0 if purpose_low == "moving" else 0.0,
        "purpose_other": 1.0 if purpose_low == "other" else 0.0,
        "purpose_renewable_energy": 1.0 if purpose_low in ("renewable_energy", "renewable") else 0.0,
        "purpose_small_business": 1.0 if purpose_low in ("small_business", "business") else 0.0,
        "purpose_vacation": 1.0 if purpose_low == "vacation" else 0.0,
        "purpose_wedding": 1.0 if purpose_low == "wedding" else 0.0,
    }

    # Construct vector in exact column order
    vector = [raw_dict[col] for col in FEATURE_COLUMNS]
    arr = np.array(vector, dtype=np.float64).reshape(1, -1)
    return arr, raw_dict
