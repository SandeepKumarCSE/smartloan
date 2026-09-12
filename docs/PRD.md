# Product Requirements Document (PRD): SmartLoan Eligibility Engine

**Version:** 3.0 (Finalized for Build — Intern Project Scope)
**Status:** Approved for Development
**Target:** SDE Summer Intern Project — Banking/FinTech Interview Pitch

---

## 1. Executive Summary

SmartLoan is a real-time, unified FastAPI microservice that combines deterministic rule-based logic (for immediate regulatory-style screening) with machine learning (for probabilistic risk assessment). It ingests applicant data, calculates financial ratios on the fly, and returns an instant credit decision along with a transparent, plain-English explanation when an application is rejected — mirroring the real-world **Adverse Action Notice** requirement under ECOA/Regulation B, where lenders are legally required to give applicants specific reasons for denial.

**Core Value Proposition:**
- **Speed** — instant decisions via a low-latency, in-memory Python backend
- **Transparency** — coefficient-based explainability makes every rejection auditable and consumer-facing
- **Robustness** — hybrid PostgreSQL storage gives schema flexibility without sacrificing relational query speed
- **Human-in-the-loop** — borderline cases route to a Manual Review queue instead of a binary approve/reject, mirroring real underwriting operations

**Two-sided system:** SmartLoan serves two distinct user types through two separate UIs — the **Applicant** (submits an application, sees only their own result) and the **Bank Employee/Underwriter** (manages the review queue, sees full model internals, can override decisions).

---

## 2. Functional Requirements

### 2.1. API Payload (Data Ingestion)

**Endpoint:** `POST /api/v1/loans/apply`
**Validation:** FastAPI Pydantic schema enforcing strict typing.

```json
{
  "applicant_id": "UUID-string",
  "annual_income": 85000,
  "existing_monthly_debt": 1200,
  "loan_amount_requested": 25000,
  "credit_score": 720,
  "employment_years": 5.5
}
```

### 2.2. Dual-Layer Decision Engine

The system processes decisions in a strict two-step funnel to optimize compute resources — cheap deterministic checks run first, expensive ML inference only runs on applications that survive the first filter.

**Layer 1: Hard Logic Gatekeeper (Rule-Based)**

- `Estimated New EMI = loan_amount_requested / 36`
- `Proposed DTI = (existing_monthly_debt + Estimated New EMI) / (annual_income / 12)`

Rules:
- If `Proposed DTI > 0.43` (43%) → **REJECTED** ("High Debt-to-Income Ratio"). *Basis: mirrors the real CFPB Ability-to-Repay/Qualified Mortgage 43% DTI threshold used in actual U.S. lending.*
- If `Credit Score < 580` → **REJECTED** ("Low Credit Score"). *Basis: 580 is the standard industry line between subprime and deep-subprime borrowers.*

**Layer 2: AI Risk Assessment (Machine Learning)**

- **Trigger:** only executes if Layer 1 passes.
- **Feature Engineering:** `loan_to_income_ratio = loan_amount_requested / annual_income`
- **Input Features:** `credit_score`, `employment_years`, `loan_to_income_ratio`
- **Preprocessing:** All three features are standardized using a `StandardScaler` fitted during training and saved alongside the model (never refit at request time). *Required so that coefficients are on a comparable scale — otherwise `credit_score` (hundreds) would dominate `employment_years` (single digits) purely due to magnitude, and the explainability layer would be misleading.*
- **Class Imbalance Handling:** the LendingClub dataset has far more "Fully Paid" than "Charged Off" labels. The Logistic Regression is trained with `class_weight='balanced'` (or equivalent resampling) so the model doesn't just default to predicting "approve" for everyone. Evaluated with **precision/recall and AUC-ROC**, not raw accuracy.

Decision Boundaries (Straight-Through Processing):
- Probability > 0.75 (75%) → **APPROVED**
- Probability 0.65–0.74 → **MANUAL_REVIEW**
- Probability < 0.65 → **REJECTED**

### 2.3. Explainability Engine

- Every `REJECTED` response from Layer 2 includes a `reasons` array (max 3–4 entries, matching real adverse-action-notice practice, where disclosing more than four reasons isn't considered useful to the applicant).
- Computed by extracting the trained Logistic Regression coefficients (on **standardized** features), multiplying by the applicant's scaled input values, and ranking the top negative contributors.
- Example: `["Low Credit Score", "High Loan-to-Income Ratio"]`
- This directly simulates the real-world legal requirement that lenders provide specific, plain-English reasons for denial to the applicant — not just an internal risk team.

### 2.4. Audit Trail

- **Storage:** PostgreSQL, hybrid schema.
- **Relational columns:** `request_id`, `timestamp`, `applicant_id`, `final_decision`, `decided_by` (`SYSTEM` or employee ID if overridden).
- **JSONB columns:** `raw_input_data` (exact API payload) and `decision_reasons` (model outputs/coefficients) — avoids schema migrations as ML features evolve.
- Every **manual override** by an employee is logged as its own audit row, separate from the original automated decision, with an `override_reason` text field.

### 2.5. Applicant-Facing UI

- Loan application form (matches the API payload fields)
- Result screen: `APPROVED` / `REJECTED` (with reasons) / `MANUAL_REVIEW` ("Your application is under review")
- Applicant can only see their own application(s) — no access to model internals, other applicants, or the audit trail

### 2.6. Bank Employee / Admin UI

- **Manual Review Queue** — table of all applications sitting in the 65–74% band, sortable by date/probability, with Approve/Reject actions
- **Application Detail View** — for any application: raw inputs, DTI, loan-to-income ratio, model probability, explainability reasons
- **Override + Reason Logging** — employee overrides require a typed justification, logged separately in the audit trail
- **Decision History / Audit Log Viewer** — searchable table of all past decisions
- **Basic Analytics Dashboard** — approval rate, rejection rate, % routed to manual review, average credit score/DTI of approved vs. rejected
- **Role-gated login** — simple `applicant` vs `employee` role check before the dashboard loads

---

## 3. Technical Specifications

### 3.1. Tech Stack

- **Backend:** Python 3, FastAPI, Pydantic, SQLAlchemy
- **Database:** PostgreSQL (Dockerized)
- **ML Framework:** Scikit-Learn (Logistic Regression, saved as `.pkl`, loaded once at server startup — not per request)
- **Frontend:** React (Vite) + Tailwind CSS — two separate views/apps: Applicant Form and Admin Dashboard

### 3.2. Data Pipeline (LendingClub Dataset)

- **Target Variable:** `loan_status` → `Fully Paid = 1`, `Charged Off = 0`
- **Transformations:**
  - Average `fico_range_low` and `fico_range_high` into `credit_score`
  - Clean `emp_length` text into floats; median-impute missing values
  - **Standardize** `credit_score`, `employment_years`, `loan_to_income_ratio` before training
  - Apply `class_weight='balanced'` to the Logistic Regression to correct for label imbalance
- **Exclusions (leakage/multicollinearity prevention):**
  - Drop `open_acc` — simplifies UX, not predictive enough to justify complexity
  - Drop `dti` — correlated with `loan_to_income_ratio`; including both destabilizes coefficients and breaks explainability
  - Drop `int_rate`, `grade`/`sub_grade`, and any post-origination/post-payment fields (`total_pymnt`, `recoveries`, `last_pymnt_d`, etc.) — these are assigned *after* the loan is issued and would leak the outcome into the model

---

## 4. Interview Talking Points (Key Differentiators)

**"Why Logistic Regression instead of Random Forest/Deep Learning?"**
Regulatory compliance. Financial lending decisions require explainability — even complex ML models don't exempt a lender from ECOA's requirement to give specific denial reasons. Logistic regression is inherently interpretable via coefficients; black-box models risk both bad UX and regulatory exposure.

**"Why drop DTI from the ML model if it's so important?"**
Multicollinearity and gatekeeper bias. DTI is heavily correlated with loan-to-income ratio. Including both creates unstable coefficients, breaking the explainability engine. Layer 1 already filters bad DTIs, so feeding it to the AI wastes compute on a pre-filtered population.

**"Why did you add a Manual Review status?"**
To optimize Straight-Through Processing (STP) rates. Rejecting borderline cases outright loses revenue; blindly approving them spikes default risk. Routing 65–74% probabilities to a human underwriter mirrors real banking operations — and gives the admin UI's queue system a concrete purpose.

**"How did you handle class imbalance?"**
LendingClub has far more paid loans than defaults. Used `class_weight='balanced'` during training and evaluated with precision/recall/AUC-ROC instead of raw accuracy, since accuracy alone would be misleading on an imbalanced dataset.

**"Why standardize features before computing explainability?"**
Coefficients are only comparable across features when those features are on the same scale. Without standardization, a feature with naturally large numeric values (like income) could appear artificially more "important" than one with small values (like years employed), even if that's not true.

**"Does the applicant get to see why they were rejected?"**
Yes — this mirrors the real ECOA/Regulation B requirement that lenders provide applicants with specific reasons for denial (an Adverse Action Notice). The `reasons` array in the API response is a simplified simulation of that legal disclosure, not just an internal debugging tool.

---

## 5. Step-by-Step Build Roadmap

### Phase 0 — Setup (Day 1)
1. Set up project repo structure: `/backend`, `/frontend-applicant`, `/frontend-admin` (or one React app with route-based role split), `/ml`.
2. Set up PostgreSQL via Docker Compose.
3. Set up a Python virtual environment; install FastAPI, SQLAlchemy, scikit-learn, pandas, psycopg2.

### Phase 1 — Data & Model (Days 2–4)
4. Download the LendingClub dataset; load into pandas.
5. Build `credit_score` from `fico_range_low`/`fico_range_high`; clean `emp_length`.
6. Drop leakage columns (`int_rate`, `grade`, `sub_grade`, post-payment fields) and multicollinear columns (`dti`, `open_acc`).
7. Engineer `loan_to_income_ratio`.
8. Median-impute missing values.
9. Split train/test; fit a `StandardScaler` on the training features **only** (avoid leaking test data into scaling).
10. Train `LogisticRegression(class_weight='balanced')` on the scaled features.
11. Evaluate with precision, recall, AUC-ROC, and a confusion matrix — not just accuracy.
12. Save the trained model **and** the fitted scaler (e.g., both inside one `.pkl`, or two separate files) so both are available at inference time.

### Phase 2 — Backend Core (Days 5–8)
13. Define the Pydantic schema for `POST /api/v1/loans/apply`.
14. Implement Layer 1 (DTI + credit score rules) as a standalone function — easy to unit test independently of the ML layer.
15. Implement Layer 2: load the model + scaler once at app startup, write a function that scales incoming features and returns a probability.
16. Implement the three-way threshold logic (Approved / Manual Review / Rejected).
17. Implement the explainability function: coefficient × scaled-input ranking, capped at ~4 reasons.
18. Wire it all into the endpoint: validate → Layer 1 → Layer 2 → threshold → explain if rejected → return response.

### Phase 3 — Persistence & Audit (Days 9–10)
19. Design the PostgreSQL schema: relational columns (`request_id`, `timestamp`, `applicant_id`, `final_decision`, `decided_by`) + JSONB columns (`raw_input_data`, `decision_reasons`).
20. Set up SQLAlchemy models and a migration (Alembic optional but nice to mention).
21. Write every decision (automated or overridden) to the audit table.

### Phase 4 — Applicant Frontend (Days 11–13)
22. Build the React application form matching the API payload.
23. Call the API on submit; render the three possible outcomes clearly (approved / rejected + reasons / under review).
24. Basic client-side validation (no negative numbers, required fields).

### Phase 5 — Admin Frontend (Days 14–17)
25. Add a simple login/role gate (`applicant` vs `employee`) — doesn't need to be production-grade auth, just enough to demonstrate the concept.
26. Build the Manual Review queue view — list applications with `MANUAL_REVIEW` status, sorted by probability/date.
27. Build the Application Detail view — show raw inputs, DTI, model probability, and coefficients for any application.
28. Implement the Approve/Reject override actions, each requiring a typed justification, written to the audit table as a separate row.
29. Build the Decision History / Audit Log table view with basic filters (by date, decision type).
30. Build a lightweight analytics panel (approval rate, rejection rate, % to manual review) by aggregating the audit table.

### Phase 6 — Polish & Interview Prep (Days 18–20)
31. Add basic error handling and loading states across both frontends.
32. Write a short `README.md` documenting the architecture, the two-layer decision flow, and the reasoning behind each major design choice (leakage prevention, class imbalance handling, standardization, model choice).
33. Do a dry run of the "Interview Talking Points" section above — be ready to explain every tradeoff out loud without notes.
34. (Optional, if time allows) Add a `model_version` field to the audit trail so decisions stay traceable if the model is ever retrained.

---

*End of PRD v3.0*
