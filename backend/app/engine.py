from __future__ import annotations

import datetime
import math
from pathlib import Path
import uuid
from typing import Dict, List, Tuple
import joblib
import numpy as np
import pandas as pd

from app.encoder import FEATURE_COLUMNS, encode_application
from app.schemas import DecisionResponse, FeatureContribution, LoanApplicationRequest

# ASSUMED_RATE = 13.0 (flat, hardcoded, annual % placeholder rate for DTI pre-screening)
ASSUMED_RATE = 13.0

ARTIFACTS_DIR = Path(__file__).resolve().parent.parent.parent / "ml" / "artifacts"
MODEL_PATH = ARTIFACTS_DIR / "model.pkl"
SCALER_PATH = ARTIFACTS_DIR / "scaler.pkl"

FRIENDLY_FEATURE_NAMES: Dict[str, str] = {
    "loan_amnt": "Loan Amount Requested",
    "term": "Loan Term (36 vs 60 Mo)",
    "emp_length": "Employment History Length",
    "annual_inc": "Annual Household Income",
    "dti": "Debt-To-Income (DTI) Ratio",
    "fico_score": "FICO Credit Score",
    "revol_util": "Revolving Line Utilization %",
    "inq_last_6mths": "Credit Inquiries (Past 6M)",
    "delinq_2yrs": "Past Delinquencies (2 Years)",
    "pub_rec": "Derogatory Public Records",
    "open_acc": "Number of Open Credit Lines",
    "total_acc": "Total Credit Lines",
    "home_ownership_MORTGAGE": "Mortgage Home Ownership",
    "home_ownership_NONE": "No Home Ownership Status",
    "home_ownership_OTHER": "Other Home Ownership Status",
    "home_ownership_OWN": "Outright Home Ownership",
    "home_ownership_RENT": "Rental Home Ownership",
    "purpose_credit_card": "Credit Card Refinance Purpose",
    "purpose_debt_consolidation": "Debt Consolidation Purpose",
    "purpose_educational": "Educational Financing Purpose",
    "purpose_home_improvement": "Home Improvement Purpose",
    "purpose_house": "House Purchase Purpose",
    "purpose_major_purchase": "Major Purchase Purpose",
    "purpose_medical": "Medical Expense Purpose",
    "purpose_moving": "Moving Expense Purpose",
    "purpose_other": "General Other Purpose",
    "purpose_renewable_energy": "Renewable Energy Purpose",
    "purpose_small_business": "Small Business Purpose",
    "purpose_vacation": "Vacation Financing Purpose",
    "purpose_wedding": "Wedding Financing Purpose",
}

ADVERSE_FACTOR_DESCRIPTIONS: Dict[str, str] = {
    "fico_score": "FICO credit score does not meet prime risk benchmark",
    "dti": "Elevated debt-to-income ratio reduces repayment capacity",
    "annual_inc": "Stated annual income is relatively low for requested credit line",
    "loan_amnt": "Requested loan amount exceeds optimal leverage ratio",
    "revol_util": "High revolving credit line utilization detected",
    "inq_last_6mths": "Multiple recent hard credit inquiries in past 6 months",
    "delinq_2yrs": "Historical payment delinquencies within past 24 months",
    "pub_rec": "Presence of derogatory public records or tax liens",
    "term": "60-month long term presents higher cumulative default risk",
    "emp_length": "Limited employment tenure increases income volatility risk",
    "home_ownership_RENT": "Rental status presents higher unsecured credit risk profile",
    "purpose_small_business": "Commercial/small-business purpose exhibits higher volatility",
}


def calculate_amortized_emi(principal: float, term_months: int, annual_rate: float = ASSUMED_RATE) -> float:
    """Calculate monthly EMI using exact amortization formula:

    EMI = P * r * (1+r)^n / ((1+r)^n - 1)
    where r = annual_rate / 12 / 100.
    """
    if principal <= 0 or term_months <= 0:
        return 0.0
    r = (annual_rate / 12.0) / 100.0
    power = math.pow(1.0 + r, term_months)
    emi = principal * r * (power / (power - 1.0))
    return emi


class ModelEngine:
    def __init__(self):
        self.model = None
        self.scaler = None
        self.load_artifacts()

    def load_artifacts(self):
        if not MODEL_PATH.exists() or not SCALER_PATH.exists():
            raise FileNotFoundError(
                f"Missing ML model artifacts at {ARTIFACTS_DIR}. Ensure model.pkl and scaler.pkl exist."
            )
        self.model = joblib.load(MODEL_PATH)
        self.scaler = joblib.load(SCALER_PATH)

    def evaluate_layer1(self, req: LoanApplicationRequest) -> Tuple[bool, List[str], float, float, float, float]:
        """Layer 1 Rule Screening Gatekeeper.

        Returns (passed, reasons, estimated_new_emi, total_monthly_debt, monthly_income, calculated_dti).
        """
        reasons = []

        # 1. Age Validation (Must be 18+ years old)
        try:
            dob = datetime.date.fromisoformat(req.date_of_birth)
        except Exception:
            dob = datetime.date(1995, 6, 15)

        today = datetime.date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

        if age < 18:
            reasons.append("Applicant must be at least 18 years old to apply")

        # 2. Amortized New EMI Calculation
        loan_amount = req.get_effective_loan_amount()
        term = req.term
        annual_income = req.get_effective_annual_income()
        existing_debt = req.get_effective_existing_debt()

        estimated_new_emi = calculate_amortized_emi(loan_amount, term, ASSUMED_RATE)
        total_monthly_debt = existing_debt + estimated_new_emi
        monthly_income = annual_income / 12.0
        calculated_dti = (total_monthly_debt / monthly_income) * 100.0 if monthly_income > 0 else 999.0

        # 3. Hard-reject DTI Check (DTI > 43%)
        if calculated_dti > 43.0:
            reasons.append(f"Your debt-to-income ratio exceeds our lending threshold ({calculated_dti:.1f}% > 43.0%)")

        passed = len(reasons) == 0
        return (
            passed,
            reasons,
            round(estimated_new_emi, 2),
            round(total_monthly_debt, 2),
            round(monthly_income, 2),
            round(calculated_dti, 2),
        )

    def predict(self, req: LoanApplicationRequest) -> DecisionResponse:
        request_id = f"REQ-{uuid.uuid4().hex[:8].upper()}"
        timestamp = datetime.datetime.now(datetime.timezone.utc).isoformat()

        # Step 1: Layer 1 Rule Screening
        l1_passed, l1_reasons, new_emi, total_debt, m_income, dti_pct = self.evaluate_layer1(req)

        # Step 2: Layer 2 ML Model Prediction & Feature Encoding
        raw_arr, raw_dict = encode_application(req, override_dti=dti_pct)
        raw_df = pd.DataFrame(raw_arr, columns=FEATURE_COLUMNS)
        scaled_arr = self.scaler.transform(raw_df)
        scaled_vec = scaled_arr[0]

        # Predict default probability (class 1 = Charged Off in Colab model)
        default_prob = float(self.model.predict_proba(scaled_arr)[0, 1])
        repayment_prob = float(1.0 - default_prob)
        risk_score = repayment_prob

        # Model coefficients & intercept
        coefficients = self.model.coef_[0]

        contributions: List[FeatureContribution] = []
        for idx, feature_name in enumerate(FEATURE_COLUMNS):
            raw_val = raw_dict[feature_name]
            sc_val = float(scaled_vec[idx])
            coef = float(coefficients[idx])
            default_impact = coef * sc_val
            direction = "INCREASES_RISK" if default_impact >= 0 else "REDUCES_RISK"

            contributions.append(
                FeatureContribution(
                    feature=feature_name,
                    label=FRIENDLY_FEATURE_NAMES.get(feature_name, feature_name),
                    impact_score=round(default_impact, 4),
                    raw_value=raw_val,
                    scaled_value=round(sc_val, 4),
                    direction=direction,
                )
            )

        # Sort contributions by default impact
        sorted_contributions = sorted(contributions, key=lambda c: c.impact_score, reverse=True)

        # Status & Decision logic
        adverse_reasons: List[str] = []
        if not l1_passed:
            status = "REJECTED"
            decision = "REJECTED"
            adverse_reasons.extend(l1_reasons)
        elif risk_score >= 0.75:
            status = "PENDING_VERIFICATION"
            decision = "APPROVED"
        elif risk_score >= 0.65:
            status = "PENDING_VERIFICATION"
            decision = "MANUAL_REVIEW"
        else:
            status = "PENDING_VERIFICATION"
            decision = "REJECTED"

        if decision in ("REJECTED", "MANUAL_REVIEW") and l1_passed:
            risk_drivers = [c for c in sorted_contributions if c.impact_score > 0]
            for c in risk_drivers[:4]:
                msg = ADVERSE_FACTOR_DESCRIPTIONS.get(
                    c.feature, f"{c.label} ({c.raw_value}) contributed to elevated default risk"
                )
                if msg not in adverse_reasons:
                    adverse_reasons.append(msg)

        if risk_score >= 0.75:
            risk_band = "LOW"
        elif risk_score >= 0.65:
            risk_band = "MODERATE"
        else:
            risk_band = "HIGH"

        return DecisionResponse(
            request_id=request_id,
            applicant_id=req.applicant_id or "APP-1001",
            applicant_name=req.full_name or "John Doe",
            mock_pan=req.get_effective_mock_pan(),
            status=status,
            decision=decision,
            layer1_passed=l1_passed,
            layer1_rejection_reasons=l1_reasons,
            estimated_new_emi=new_emi,
            total_monthly_debt=total_debt,
            monthly_income=m_income,
            calculated_dti=dti_pct,
            risk_score=round(risk_score, 4),
            default_probability=round(default_prob, 4),
            risk_band=risk_band,
            adverse_reasons=adverse_reasons,
            top_feature_contributions=sorted_contributions[:6],
            raw_inputs=raw_dict,
            timestamp=timestamp,
        )


engine = ModelEngine()
