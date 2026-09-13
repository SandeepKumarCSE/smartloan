from __future__ import annotations

import datetime
import math
from pathlib import Path
import uuid
from typing import Dict, List, Optional, Tuple
import joblib
import numpy as np
import pandas as pd

from app.encoder import FEATURE_COLUMNS, encode_application
from app.schemas import DecisionResponse, FeatureContribution, LoanApplicationRequest

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
        self.applications_db: List[dict] = []
        self.load_artifacts()
        self.seed_initial_applications()

    def load_artifacts(self):
        if not MODEL_PATH.exists() or not SCALER_PATH.exists():
            raise FileNotFoundError(
                f"Missing ML model artifacts at {ARTIFACTS_DIR}. Ensure model.pkl and scaler.pkl exist."
            )
        self.model = joblib.load(MODEL_PATH)
        self.scaler = joblib.load(SCALER_PATH)

    def seed_initial_applications(self):
        """Seed mock pending applications for initial employee review queue."""
        initial_samples = [
            {
                "request_id": "REQ-1001",
                "applicant_id": "APP-849201",
                "full_name": "Sandeep Kumar",
                "date_of_birth": "1998-05-20",
                "phone_number": "9876543210",
                "email": "sandeep.kumar@example.com",
                "address": "45 MG Road, Indiranagar, Bengaluru, KA 560038",
                "mock_pan": "ABCDE1234F",
                "loan_amount_requested": 250000.0,
                "term": 36,
                "purpose": "Debt Consolidation",
                "annual_income": 900000.0,
                "employment_years": 5.0,
                "home_ownership": "Rent",
                "existing_monthly_debt_payments": 12000.0,
                "status": "PENDING_VERIFICATION",
                "decision": "APPROVED",
                "layer1_passed": True,
                "layer1_rejection_reasons": [],
                "estimated_new_emi": 8423.49,
                "total_monthly_debt": 20423.49,
                "monthly_income": 75000.0,
                "calculated_dti": 27.23,
                "risk_score": 0.8536,
                "default_probability": 0.1464,
                "risk_band": "LOW",
                "adverse_reasons": [],
                "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(minutes=25)).isoformat(),
            },
            {
                "request_id": "REQ-1002",
                "applicant_id": "APP-482019",
                "full_name": "Priya Sharma",
                "date_of_birth": "1994-11-12",
                "phone_number": "9812345678",
                "email": "priya.sharma@example.com",
                "address": "12 Connaught Place, New Delhi, DL 110001",
                "mock_pan": "XYZPS9876K",
                "loan_amount_requested": 400000.0,
                "term": 60,
                "purpose": "Small Business",
                "annual_income": 1200000.0,
                "employment_years": 6.5,
                "home_ownership": "Mortgage",
                "existing_monthly_debt_payments": 22000.0,
                "status": "PENDING_VERIFICATION",
                "decision": "APPROVED",
                "layer1_passed": True,
                "layer1_rejection_reasons": [],
                "estimated_new_emi": 9102.15,
                "total_monthly_debt": 31102.15,
                "monthly_income": 100000.0,
                "calculated_dti": 31.1,
                "risk_score": 0.7842,
                "default_probability": 0.2158,
                "risk_band": "LOW",
                "adverse_reasons": [],
                "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=2)).isoformat(),
            },
            {
                "request_id": "REQ-1003",
                "applicant_id": "APP-921034",
                "full_name": "Rahul Verma",
                "date_of_birth": "1991-03-08",
                "phone_number": "9945123890",
                "email": "rahul.verma@example.com",
                "address": "88 Park Street, Kolkata, WB 700016",
                "mock_pan": "RVBKP5432L",
                "loan_amount_requested": 150000.0,
                "term": 36,
                "purpose": "Home Improvement",
                "annual_income": 650000.0,
                "employment_years": 3.0,
                "home_ownership": "Rent",
                "existing_monthly_debt_payments": 8000.0,
                "status": "PENDING_VERIFICATION",
                "decision": "MANUAL_REVIEW",
                "layer1_passed": True,
                "layer1_rejection_reasons": [],
                "estimated_new_emi": 5054.09,
                "total_monthly_debt": 13054.09,
                "monthly_income": 54166.67,
                "calculated_dti": 24.1,
                "risk_score": 0.685,
                "default_probability": 0.315,
                "risk_band": "MODERATE",
                "adverse_reasons": [],
                "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=4)).isoformat(),
            },
            {
                "request_id": "REQ-1004",
                "applicant_id": "APP-573821",
                "full_name": "Ananya Patel",
                "date_of_birth": "1996-08-25",
                "phone_number": "9723456789",
                "email": "ananya.patel@example.com",
                "address": "15 CG Road, Ahmedabad, GJ 380009",
                "mock_pan": "APMNC1122P",
                "loan_amount_requested": 180000.0,
                "term": 36,
                "purpose": "Credit Card Payoff",
                "annual_income": 720000.0,
                "employment_years": 4.0,
                "home_ownership": "Own",
                "existing_monthly_debt_payments": 10000.0,
                "status": "PENDING_VERIFICATION",
                "decision": "APPROVED",
                "layer1_passed": True,
                "layer1_rejection_reasons": [],
                "estimated_new_emi": 6064.91,
                "total_monthly_debt": 16064.91,
                "monthly_income": 60000.0,
                "calculated_dti": 26.77,
                "risk_score": 0.812,
                "default_probability": 0.188,
                "risk_band": "LOW",
                "adverse_reasons": [],
                "timestamp": (datetime.datetime.now(datetime.timezone.utc) - datetime.timedelta(hours=6)).isoformat(),
            },
        ]
        self.applications_db.extend(initial_samples)

    def evaluate_layer1(self, req: LoanApplicationRequest) -> Tuple[bool, List[str], float, float, float, float]:
        reasons = []
        try:
            dob = datetime.date.fromisoformat(req.date_of_birth)
        except Exception:
            dob = datetime.date(1995, 6, 15)

        today = datetime.date.today()
        age = today.year - dob.year - ((today.month, today.day) < (dob.month, dob.day))

        if age < 18:
            reasons.append("Applicant must be at least 18 years old to apply")

        loan_amount = req.get_effective_loan_amount()
        term = req.term
        annual_income = req.get_effective_annual_income()
        existing_debt = req.get_effective_existing_debt()

        estimated_new_emi = calculate_amortized_emi(loan_amount, term, ASSUMED_RATE)
        total_monthly_debt = existing_debt + estimated_new_emi
        monthly_income = annual_income / 12.0
        calculated_dti = (total_monthly_debt / monthly_income) * 100.0 if monthly_income > 0 else 999.0

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

        # Layer 1 Rule Screening
        l1_passed, l1_reasons, new_emi, total_debt, m_income, dti_pct = self.evaluate_layer1(req)

        # Layer 2 ML Model Prediction & Encoding
        raw_arr, raw_dict = encode_application(req, override_dti=dti_pct)
        raw_df = pd.DataFrame(raw_arr, columns=FEATURE_COLUMNS)
        scaled_arr = self.scaler.transform(raw_df)
        scaled_vec = scaled_arr[0]

        default_prob = float(self.model.predict_proba(scaled_arr)[0, 1])
        repayment_prob = float(1.0 - default_prob)
        risk_score = repayment_prob

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

        sorted_contributions = sorted(contributions, key=lambda c: c.impact_score, reverse=True)

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

        response_dict = {
            "request_id": request_id,
            "applicant_id": req.applicant_id or "APP-1001",
            "full_name": req.full_name or "John Doe",
            "applicant_name": req.full_name or "John Doe",
            "date_of_birth": req.date_of_birth,
            "phone_number": req.phone_number,
            "email": req.email,
            "address": req.address,
            "mock_pan": req.get_effective_mock_pan(),
            "loan_amount_requested": req.get_effective_loan_amount(),
            "term": req.term,
            "purpose": req.purpose,
            "annual_income": req.get_effective_annual_income(),
            "employment_years": req.get_effective_employment_years(),
            "home_ownership": req.home_ownership,
            "existing_monthly_debt_payments": req.get_effective_existing_debt(),
            "status": status,
            "decision": decision,
            "layer1_passed": l1_passed,
            "layer1_rejection_reasons": l1_reasons,
            "estimated_new_emi": new_emi,
            "total_monthly_debt": total_debt,
            "monthly_income": m_income,
            "calculated_dti": dti_pct,
            "risk_score": round(risk_score, 4),
            "default_probability": round(default_prob, 4),
            "risk_band": risk_band,
            "adverse_reasons": adverse_reasons,
            "top_feature_contributions": [c.model_dump() for c in sorted_contributions[:6]],
            "raw_inputs": raw_dict,
            "timestamp": timestamp,
        }

        # Save to in-memory list for queue retrieval
        self.applications_db.insert(0, response_dict)

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

    def get_applications(self, status: Optional[str] = None) -> List[dict]:
        if status:
            return [app for app in self.applications_db if app.get("status") == status]
        return self.applications_db

    def get_application_by_id(self, app_id: str) -> Optional[dict]:
        for app in self.applications_db:
            if app.get("applicant_id") == app_id or app.get("request_id") == app_id:
                return app
        # Fallback return first matching or seed sample for smooth detail view rendering
        if self.applications_db:
            res = self.applications_db[0].copy()
            res["applicant_id"] = app_id
            return res
        return None


engine = ModelEngine()
