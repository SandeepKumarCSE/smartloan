# SmartLoan — Task Breakdown & Commit Plan

Use this as your working checklist. Each task = roughly one commit. Suggested commit messages are included so your GitHub history tells a clear story on its own (this matters — interviewers sometimes actually open the repo and scroll the commit log).

**Suggested repo structure:**
```
smartloan/
├── backend/
├── ml/
├── frontend-applicant/
├── frontend-admin/
├── docs/
│   └── PRD.md
└── README.md
```

**Branching approach (optional but looks proper):** work on small feature branches (`feature/rule-engine`, `feature/ml-training`, etc.) and merge into `main` via PR, even solo — it gives your repo a real "Pull Requests" tab with a history, which looks more professional than commits straight to `main`.

---

## Milestone 0 — Project Skeleton

- [ ] **Task 1:** Init repo, add `.gitignore` (Python + Node + `.env`), add empty folder structure above.
  `git commit -m "chore: initialize repo structure"`
- [ ] **Task 2:** Add `docs/PRD.md` (your finalized PRD).
  `git commit -m "docs: add product requirements document"`
- [ ] **Task 3:** Write a placeholder `README.md` with project title, one-line description, and a "Setup instructions coming soon" note. You'll flesh this out at the end.
  `git commit -m "docs: add initial README"`
- [ ] **Task 4:** Set up `docker-compose.yml` for PostgreSQL only (backend comes later).
  `git commit -m "chore: add postgres docker-compose setup"`

---

## Milestone 1 — Data & ML Model (in `/ml`)

- [ ] **Task 5:** Add a `requirements.txt` for the ML side (pandas, scikit-learn, numpy, joblib) and a notebook or script that just loads the raw LendingClub CSV and prints `.info()`/`.head()`.
  `git commit -m "feat(ml): load raw dataset and explore schema"`
- [ ] **Task 6:** Build `credit_score` from `fico_range_low`/`fico_range_high`; clean `emp_length` into floats.
  `git commit -m "feat(ml): engineer credit_score and clean employment length"`
- [ ] **Task 7:** Drop leakage columns (`int_rate`, `grade`, `sub_grade`, post-payment fields) and multicollinear columns (`dti`, `open_acc`). Add a short comment explaining *why* each is dropped — future you (and the interviewer) will thank you.
  `git commit -m "feat(ml): remove leakage and multicollinear features"`
- [ ] **Task 8:** Engineer `loan_to_income_ratio`; median-impute remaining missing values.
  `git commit -m "feat(ml): add loan-to-income feature and impute missing values"`
- [ ] **Task 9:** Train/test split, then fit `StandardScaler` on training data only.
  `git commit -m "feat(ml): add train/test split and feature scaling"`
- [ ] **Task 10:** Train `LogisticRegression(class_weight='balanced')` on scaled features.
  `git commit -m "feat(ml): train logistic regression with class balancing"`
- [ ] **Task 11:** Evaluate with precision, recall, AUC-ROC, confusion matrix. Save these metrics as a markdown/text file in `/ml/results/`.
  `git commit -m "feat(ml): evaluate model and log metrics"`
- [ ] **Task 12:** Export the trained model **and** the fitted scaler as `.pkl` files into `/ml/artifacts/`.
  `git commit -m "feat(ml): export trained model and scaler artifacts"`

---

## Milestone 2 — Backend Core (in `/backend`)

- [ ] **Task 13:** Scaffold FastAPI app (`main.py`), add `requirements.txt`, confirm `/health` endpoint returns 200.
  `git commit -m "feat(backend): scaffold FastAPI app with health check"`
- [ ] **Task 14:** Define the Pydantic request schema for `POST /api/v1/loans/apply`.
  `git commit -m "feat(backend): add loan application request schema"`
- [ ] **Task 15:** Implement Layer 1 rule engine (DTI + credit score checks) as a standalone, testable function — no FastAPI dependency yet.
  `git commit -m "feat(backend): implement rule-based eligibility gatekeeper"`
- [ ] **Task 16:** Add unit tests for Layer 1 (e.g., using `pytest`) — a few cases: clear pass, DTI fail, credit score fail.
  `git commit -m "test(backend): add unit tests for rule engine"`
- [ ] **Task 17:** Load the `.pkl` model + scaler at app startup; implement Layer 2 inference function (scale inputs → predict probability).
  `git commit -m "feat(backend): integrate ML model for risk scoring"`
- [ ] **Task 18:** Implement the three-way threshold logic (Approved / Manual Review / Rejected).
  `git commit -m "feat(backend): add decision thresholding logic"`
- [ ] **Task 19:** Implement the explainability function (coefficient × scaled input, top-N reasons).
  `git commit -m "feat(backend): add explainability engine for rejections"`
- [ ] **Task 20:** Wire everything into the `/apply` endpoint end-to-end; manually test with sample payloads via `curl` or Postman/Thunder Client.
  `git commit -m "feat(backend): wire full decision pipeline into apply endpoint"`

---

## Milestone 3 — Persistence & Audit Trail

- [ ] **Task 21:** Set up SQLAlchemy models for the audit table (relational + JSONB columns).
  `git commit -m "feat(backend): add audit trail database model"`
- [ ] **Task 22:** Connect FastAPI to Postgres (via `docker-compose up`), confirm table creation on startup (or add a basic Alembic migration if you want to mention migrations in the interview).
  `git commit -m "feat(backend): connect application to postgres database"`
- [ ] **Task 23:** Write every decision from `/apply` into the audit table.
  `git commit -m "feat(backend): persist decisions to audit trail"`
- [ ] **Task 24:** Add a `GET /api/v1/loans/{applicant_id}` endpoint so the applicant frontend can fetch a result by ID.
  `git commit -m "feat(backend): add endpoint to fetch application result"`

---

## Milestone 4 — Applicant Frontend (in `/frontend-applicant`)

- [ ] **Task 25:** Scaffold Vite + React + Tailwind app.
  `git commit -m "chore(frontend-applicant): scaffold react + tailwind app"`
- [ ] **Task 26:** Build the application form UI (matches API schema) with basic client-side validation.
  `git commit -m "feat(frontend-applicant): build loan application form"`
- [ ] **Task 27:** Wire form submission to the backend `/apply` endpoint.
  `git commit -m "feat(frontend-applicant): connect form to backend API"`
- [ ] **Task 28:** Build the result screen — handles all three outcomes (approved / rejected + reasons / manual review pending).
  `git commit -m "feat(frontend-applicant): display decision result and reasons"`
- [ ] **Task 29:** Add loading and error states (network failure, validation errors from backend).
  `git commit -m "feat(frontend-applicant): add loading and error handling"`

---

## Milestone 5 — Admin Frontend (in `/frontend-admin`)

- [ ] **Task 30:** Scaffold a second Vite + React + Tailwind app (or a second route group if using one app).
  `git commit -m "chore(frontend-admin): scaffold admin dashboard app"`
- [ ] **Task 31:** Add a simple login/role gate (`employee` role check) before the dashboard loads.
  `git commit -m "feat(frontend-admin): add basic role-gated login"`
- [ ] **Task 32:** Backend: add `GET /api/v1/admin/queue` (returns all `MANUAL_REVIEW` applications).
  `git commit -m "feat(backend): add manual review queue endpoint"`
- [ ] **Task 33:** Frontend: build the Manual Review queue table UI.
  `git commit -m "feat(frontend-admin): build manual review queue view"`
- [ ] **Task 34:** Backend: add `GET /api/v1/admin/applications/{id}` (full detail: inputs, DTI, probability, coefficients).
  `git commit -m "feat(backend): add application detail endpoint for admins"`
- [ ] **Task 35:** Frontend: build the Application Detail view.
  `git commit -m "feat(frontend-admin): build application detail view"`
- [ ] **Task 36:** Backend: add `POST /api/v1/admin/override` (requires `applicant_id`, new decision, and a justification string; logs as a separate audit row).
  `git commit -m "feat(backend): add manual override endpoint with audit logging"`
- [ ] **Task 37:** Frontend: wire Approve/Reject buttons on the queue/detail views to the override endpoint, with a required justification input.
  `git commit -m "feat(frontend-admin): add override actions with justification"`
- [ ] **Task 38:** Backend: add `GET /api/v1/admin/audit-log` (searchable/filterable decision history).
  `git commit -m "feat(backend): add audit log retrieval endpoint"`
- [ ] **Task 39:** Frontend: build the Decision History / Audit Log table with basic filters.
  `git commit -m "feat(frontend-admin): build audit log viewer"`
- [ ] **Task 40:** Backend: add `GET /api/v1/admin/analytics` (approval rate, rejection rate, % manual review, avg credit score/DTI split).
  `git commit -m "feat(backend): add analytics aggregation endpoint"`
- [ ] **Task 41:** Frontend: build a simple analytics panel (a few stat cards or a basic chart).
  `git commit -m "feat(frontend-admin): build analytics dashboard panel"`

---

## Milestone 6 — Polish & Finish

- [ ] **Task 42:** Add consistent error handling + loading states across the admin app.
  `git commit -m "fix(frontend-admin): improve error and loading states"`
- [ ] **Task 43:** (Optional) Add `model_version` field to the audit trail for traceability.
  `git commit -m "feat(backend): add model version tracking to audit trail"`
- [ ] **Task 44:** Write the full `README.md` — architecture overview, two-layer decision flow diagram (even ASCII is fine), setup/run instructions, and a short "Design Decisions" section summarizing the interview talking points (model choice, leakage prevention, class imbalance, standardization).
  `git commit -m "docs: write full project README with architecture overview"`
- [ ] **Task 45:** Do a final end-to-end pass — submit a real application through the applicant UI, confirm it shows up correctly in the admin queue/audit log/analytics.
  `git commit -m "test: end-to-end validation pass"`
- [ ] **Task 46:** Tag a release: `git tag v1.0` — small touch, but shows you understand versioning conventions.

---

## Why this order works

1. **ML before backend** — you need the trained model artifacts before the API can load them.
2. **Backend core before persistence** — get the decision logic right and testable before wiring in a database.
3. **Applicant frontend before admin frontend** — the applicant flow is simpler and validates your API end-to-end faster; the admin side depends on data the applicant flow generates (you need real audit rows before an audit log view means anything).
4. **Polish last** — README and versioning are cheap to do at the end and make the repo look finished and intentional rather than abandoned mid-build.

Check tasks off as you go — by the time you reach Task 46, you'll have ~45 meaningful, readable commits telling the full story of how the system was built, which is exactly what you want an interviewer scrolling your GitHub to see.
