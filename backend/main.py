from __future__ import annotations

import logging
from typing import Optional
from fastapi import FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware

from app.engine import engine
from app.schemas import DecisionResponse, LoanApplicationRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smartloan.backend")

app = FastAPI(
    title="SmartLoan Eligibility Engine API",
    version="1.0.0",
    description="Two-stage loan decision & screening system with Layer 1 DTI pre-screening and Layer 2 ML risk engine.",
)

# Enable CORS for React frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.get("/health")
def health_check():
    return {
        "status": "healthy",
        "service": "SmartLoan Eligibility Engine",
        "model_loaded": engine.model is not None,
        "scaler_loaded": engine.scaler is not None,
        "features_count": len(engine.scaler.mean_) if engine.scaler else 0,
        "pending_applications_count": len(engine.get_applications("PENDING_VERIFICATION")),
    }


@app.get("/api/applications")
def list_applications(status: Optional[str] = Query(default=None)):
    """Fetch applications, optionally filtered by status e.g. PENDING_VERIFICATION."""
    return engine.get_applications(status)


@app.get("/api/applications/{id}")
@app.get("/api/v1/loans/{id}")
def get_application_detail(id: str):
    """Fetch full application details by ID."""
    app_detail = engine.get_application_by_id(id)
    if not app_detail:
        raise HTTPException(status_code=404, detail=f"Application {id} not found")
    return app_detail


@app.post("/api/applications", response_model=DecisionResponse)
@app.post("/api/v1/loans/apply", response_model=DecisionResponse)
def submit_application(payload: LoanApplicationRequest):
    try:
        decision = engine.predict(payload)
        logger.info(
            f"Application {decision.request_id} submitted by {decision.applicant_name}: status={decision.status}, decision={decision.decision}, dti={decision.calculated_dti}%"
        )
        return decision
    except Exception as e:
        logger.error(f"Error processing loan application: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Engine processing error: {str(e)}")


@app.post("/api/v1/predict", response_model=DecisionResponse)
@app.post("/predict", response_model=DecisionResponse)
def predict_risk(payload: LoanApplicationRequest):
    return submit_application(payload)
