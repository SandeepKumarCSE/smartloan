from __future__ import annotations

import logging
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

from app.engine import engine
from app.schemas import DecisionResponse, LoanApplicationRequest

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("smartloan.backend")

app = FastAPI(
    title="SmartLoan Eligibility Engine API",
    version="1.0.0",
    description="Dual-layer loan decision engine with 30-feature Scikit-Learn Logistic Regression model and Adverse Action explainability.",
)

# Enable CORS for React frontends
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows local Vite dev servers on port 5173, 5174, etc.
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
    }


@app.post("/api/v1/loans/apply", response_model=DecisionResponse)
def apply_for_loan(payload: LoanApplicationRequest):
    try:
        decision = engine.predict(payload)
        logger.info(f"Application {decision.request_id} processed: decision={decision.decision}, score={decision.risk_score}")
        return decision
    except Exception as e:
        logger.error(f"Error processing loan application: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Engine processing error: {str(e)}")


@app.post("/api/v1/predict", response_model=DecisionResponse)
@app.post("/predict", response_model=DecisionResponse)
def predict_risk(payload: LoanApplicationRequest):
    """Direct prediction endpoint for Admin model testing and scenario analysis."""
    return apply_for_loan(payload)
