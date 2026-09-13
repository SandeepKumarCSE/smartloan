from __future__ import annotations

from typing import Any, List, Optional
from pydantic import BaseModel, Field, field_validator


class LoanApplicationRequest(BaseModel):
    applicant_id: Optional[str] = Field(default="APP-1001", description="Unique applicant identifier")
    loan_amnt: float = Field(..., gt=0, description="Requested loan amount in USD")
    term: int = Field(default=36, description="Loan term in months (36 or 60)")
    emp_length: float = Field(default=5.0, ge=0.0, le=10.0, description="Employment length in years (0 to 10)")
    annual_inc: float = Field(..., gt=0, description="Annual income in USD")
    dti: float = Field(default=15.0, ge=0.0, description="Debt-to-income ratio (%)")
    fico_score: Optional[float] = Field(default=None, ge=300.0, le=850.0, description="Direct FICO credit score")
    fico_range_low: Optional[float] = Field(default=None, description="Lower FICO range bound")
    fico_range_high: Optional[float] = Field(default=None, description="Upper FICO range bound")
    revol_util: float = Field(default=30.0, ge=0.0, description="Revolving line utilization rate (%)")
    inq_last_6mths: int = Field(default=0, ge=0, description="Inquiries in past 6 months")
    delinq_2yrs: int = Field(default=0, ge=0, description="30+ days delinquencies in past 2 years")
    pub_rec: int = Field(default=0, ge=0, description="Number of derogatory public records")
    open_acc: int = Field(default=8, ge=0, description="Number of open credit lines")
    total_acc: int = Field(default=18, ge=0, description="Total number of credit lines")
    home_ownership: str = Field(default="RENT", description="Home ownership: RENT, OWN, MORTGAGE, OTHER, NONE, ANY")
    purpose: str = Field(
        default="debt_consolidation",
        description="Loan purpose e.g. credit_card, debt_consolidation, home_improvement, car, etc.",
    )
    existing_monthly_debt: Optional[float] = Field(default=None, ge=0.0, description="Optional existing monthly debt")

    @field_validator("term")
    @classmethod
    def validate_term(cls, v: int) -> int:
        if v not in (36, 60):
            # Fallback to closest valid term or extract if integer
            return 60 if v > 48 else 36
        return v

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
    direction: str  # "POSITIVE" or "NEGATIVE"


class DecisionResponse(BaseModel):
    request_id: str
    applicant_id: str
    decision: str  # "APPROVED", "MANUAL_REVIEW", "REJECTED"
    layer1_passed: bool
    layer1_rejection_reasons: List[str]
    risk_score: float  # repayment probability (0.0 to 1.0)
    default_probability: float  # default probability (0.0 to 1.0)
    risk_band: str  # "LOW", "MODERATE", "HIGH"
    adverse_reasons: List[str]
    top_feature_contributions: List[FeatureContribution]
    raw_inputs: dict
    timestamp: str
