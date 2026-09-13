from __future__ import annotations

import datetime
import math
import re
from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator


class LoanApplicationRequest(BaseModel):
    # KYC / Identity (display & verification only, not sent to ML model)
    applicant_id: Optional[str] = Field(default="APP-1001", description="Unique application ID")
    full_name: str = Field(default="John Doe", description="Applicant full legal name")
    date_of_birth: str = Field(default="1995-06-15", description="Date of birth (YYYY-MM-DD)")
    phone_number: str = Field(default="9876543210", description="10-digit contact phone number")
    email: str = Field(default="john.doe@example.com", description="Applicant contact email address")
    address: str = Field(default="123 Bank Street, Mumbai, MH", description="Applicant residence address")
    mock_pan: str = Field(default="ABCDE1234F", description="Mock PAN for demo pre-screening")
    pan_number: Optional[str] = Field(default=None, description="Alias for mock_pan")

    # Loan Details
    loan_amount_requested: float = Field(default=250000.0, gt=0, description="Requested loan amount in INR / USD")
    loan_amnt: Optional[float] = Field(default=None, description="Alias for loan_amount_requested")
    term: int = Field(default=36, description="Loan term in months (36 or 60)")
    purpose: str = Field(default="Debt Consolidation", description="Loan purpose dropdown label")

    # Financial Self-Reported Info
    annual_income: float = Field(default=900000.0, gt=0, description="Annual income in INR / USD")
    annual_inc: Optional[float] = Field(default=None, description="Alias for annual_income")
    employment_years: float = Field(default=5.0, ge=0.0, le=50.0, description="Employment length in years (0 to 10+)")
    emp_length: Optional[float] = Field(default=None, description="Alias for employment_years")
    home_ownership: str = Field(default="Rent", description="Home ownership: Rent, Own, Mortgage, Other, None")
    existing_monthly_debt_payments: float = Field(default=12000.0, ge=0.0, description="Existing monthly debt obligations")
    existing_monthly_emi: Optional[float] = Field(default=None, description="Alias for existing_monthly_debt_payments")

    # Client-Calculated or Optional Fields
    dti: Optional[float] = Field(default=None, ge=0.0, description="Calculated DTI ratio (%)")
    calculated_dti: Optional[float] = Field(default=None, description="Alias for dti")
    fico_score: Optional[float] = Field(default=None, ge=300.0, le=850.0, description="FICO score")
    fico_range_low: Optional[float] = Field(default=700.0, description="Lower FICO bound")
    fico_range_high: Optional[float] = Field(default=704.0, description="Upper FICO bound")
    revol_util: float = Field(default=30.0, ge=0.0, description="Revolving line utilization rate (%)")
    inq_last_6mths: int = Field(default=0, ge=0, description="Inquiries in past 6 months")
    delinq_2yrs: int = Field(default=0, ge=0, description="Delinquencies in past 2 years")
    pub_rec: int = Field(default=0, ge=0, description="Public records")
    open_acc: int = Field(default=8, ge=0, description="Open credit lines")
    total_acc: int = Field(default=18, ge=0, description="Total credit lines")

    @field_validator("term")
    @classmethod
    def validate_term(cls, v: int) -> int:
        if v not in (36, 60):
            return 60 if v > 48 else 36
        return v

    def get_effective_loan_amount(self) -> float:
        if self.loan_amount_requested and self.loan_amount_requested > 0:
            return float(self.loan_amount_requested)
        if self.loan_amnt and self.loan_amnt > 0:
            return float(self.loan_amnt)
        return 250000.0

    def get_effective_annual_income(self) -> float:
        if self.annual_income and self.annual_income > 0:
            return float(self.annual_income)
        if self.annual_inc and self.annual_inc > 0:
            return float(self.annual_inc)
        return 900000.0

    def get_effective_employment_years(self) -> float:
        if self.employment_years is not None:
            return float(self.employment_years)
        if self.emp_length is not None:
            return float(self.emp_length)
        return 5.0

    def get_effective_existing_debt(self) -> float:
        if self.existing_monthly_debt_payments is not None:
            return float(self.existing_monthly_debt_payments)
        if self.existing_monthly_emi is not None:
            return float(self.existing_monthly_emi)
        return 0.0

    def get_effective_mock_pan(self) -> str:
        if self.mock_pan:
            return self.mock_pan.strip().upper()
        if self.pan_number:
            return self.pan_number.strip().upper()
        return "ABCDE1234F"

    def get_effective_fico(self) -> float:
        if self.fico_score is not None:
            return float(self.fico_score)
        if self.fico_range_low is not None and self.fico_range_high is not None:
            return float((self.fico_range_low + self.fico_range_high) / 2.0)
        return 700.0


class FeatureContribution(BaseModel):
    feature: str
    label: str
    impact_score: float
    raw_value: Any
    scaled_value: float
    direction: str


class DecisionResponse(BaseModel):
    request_id: str
    applicant_id: str
    applicant_name: str
    mock_pan: str
    status: str  # "PENDING_VERIFICATION", "REJECTED"
    decision: str  # "APPROVED", "MANUAL_REVIEW", "REJECTED"
    layer1_passed: bool
    layer1_rejection_reasons: List[str]
    estimated_new_emi: float
    total_monthly_debt: float
    monthly_income: float
    calculated_dti: float
    risk_score: float
    default_probability: float
    risk_band: str
    adverse_reasons: List[str]
    top_feature_contributions: List[FeatureContribution]
    raw_inputs: dict
    timestamp: str
