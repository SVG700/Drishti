# SIH26103 PAIMANA — AI & Analytical Backend

Dedicated, modular Python backend for the **SIH26103 PAIMANA Infrastructure Project Monitoring System**.

This service provides data validation, portfolio analytics, and foundational API endpoints over official Ministry of Statistics and Programme Implementation (MoSPI) Central Sector Project Flash Reports.

---

## 1. Project Isolation Guarantee

* **Zero modification to God's Eye Frontend:** This backend is completely isolated within the `AI-Backend/` directory. No React, TypeScript, Vite, or Cesium files are touched.
* **Independent Environment:** Uses its own dedicated virtual environment (`AI-Backend/.venv`) and requirements file (`requirements.txt`).
* **Lightweight & CPU-Compatible:** Runs without specialized GPU hardware and requires minimal memory.

---

## 2. Directory Structure

```text
AI-Backend/
├── .env.example              <- Environment template
├── .gitignore                <- Python & venv ignore patterns
├── README.md                 <- Setup and operation documentation
├── requirements.txt          <- Pinned lightweight dependencies
├── datasets/                 <- Official MoSPI CSV datasets
│   ├── paimana_projects.csv  <- 2,100 unique infrastructure projects
│   └── paimana_history.csv   <- 11,011 monthly observation snapshots
├── app/
│   ├── main.py               <- FastAPI entrypoint and lifespan manager
│   ├── api/                  <- API route handlers
│   │   ├── health.py         <- Healthcheck & readiness endpoint (/health)
│   │   ├── projects.py       <- Project query & detail endpoints (/projects)
│   │   ├── analytics.py      <- Aggregate portfolio metrics (/analytics)
│   │   └── future_ai.py      <- Architecture contracts for future AI modules (/ai/*)
│   ├── data/                 <- Data access interfaces
│   ├── models/               <- Pydantic validation schemas
│   │   ├── project.py        <- Project summary, detail & history schemas
│   │   ├── analytics.py      <- Analytics response models
│   │   └── future_ai.py      <- Future AI module request/response schemas
│   └── services/             <- Business logic & data loaders
│       ├── data_loader.py    <- Dataset reader, validator & indexer
│       └── analytics_service.py <- Portfolio statistical aggregations
├── scripts/
│   └── validate_dataset.py   <- CLI dataset quality auditor
└── tests/                    <- Automated pytest test suite
    ├── test_health.py        <- Tests for /health & /
    ├── test_data_loader.py   <- Tests for schema, missing value preservation
    └── test_projects.py      <- Tests for /projects, /analytics, /ai stubs
```

---

## 3. Environment Setup & Activation

### Step 1: Open PowerShell and navigate to the project directory
```powershell
cd "c:\Users\User\Desktop\God's eye"
```

### Step 2: Activate the dedicated virtual environment
```powershell
# PowerShell:
(Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned) ; (& ".\AI-Backend\.venv\Scripts\Activate.ps1")
```

*(On macOS/Linux: `source AI-Backend/.venv/bin/activate`)*

### Step 3: Install dependencies (if not already installed)
```powershell
& ".\AI-Backend\.venv\Scripts\pip.exe" install -r ".\AI-Backend\requirements.txt"
```

---

## 4. Running the Backend

Start the development server with hot reload:

```powershell
cd "c:\Users\User\Desktop\God's eye\AI-Backend"
..\AI-Backend\.venv\Scripts\uvicorn.exe app.main:app --reload --host 127.0.0.1 --port 8000
```

Alternatively, from the project root:
```powershell
& ".\AI-Backend\.venv\Scripts\python.exe" -m uvicorn app.main:app --app-dir "AI-Backend" --reload --port 8000
```

Interactive OpenAPI Swagger UI is available at:
- **Swagger Documentation:** `http://127.0.0.1:8000/docs`
- **ReDoc Documentation:** `http://127.0.0.1:8000/redoc`

---

## 5. API Endpoints

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Service health, dataset status, and record counts |
| `GET` | `/projects` | Paginated project query (supports `sector`, `state`, `status`, `search`) |
| `GET` | `/projects/{project_id}` | Complete project details with historical monthly snapshots |
| `GET` | `/analytics/summary` | Aggregate portfolio statistics (costs, delays, sector breakdown) |
| `GET` | `/analytics/data-quality` | Data extraction and audit report |
| `GET` | `/ai/forecast/{id}` | **[ACTIVE]** Project progress forecast, prediction intervals, and completion estimate |
| `GET` | `/ai/delay-risk/{id}` | **[ACTIVE]** Multidimensional project delay risk and progress stagnation detector |
| `GET` | `/ai/anomalies/{id}` | **[ACTIVE]** Progress and expenditure anomaly, budget exhaustion, and decoupling detector |
| `GET` | `/ai/report/{id}` | **[ACTIVE]** Automated executive intelligence synthesis report combining all modules |
| `POST`| `/ai/assistant` | **[ACTIVE]** Natural language MoSPI project inquiry assistant grounded in report data |

---

## 6. Project Progress Forecasting Model & Benchmarks

The forecasting engine uses an **Adaptive Run-Rate Velocity model with Empirical Bayesian Sector Shrinkage**, evaluated against a **Naive Persistence (Last Known Progress) Baseline** on chronological out-of-time holdout splits.

### Chronological Evaluation Setup
To strictly avoid data leakage across time:
* **Training Set:** MoSPI monthly observations from July 2025 to January 2026 (`2025-07` through `2026-01`).
* **Test Holdout Set:** Target months February 2026 ($h=1$ month ahead) and March 2026 ($h=2$ months ahead) across 1,600+ projects.

### Quantitative Benchmark Results

| Model | Horizon $h=1$ MAE | Horizon $h=1$ RMSE | Horizon $h=2$ MAE | Horizon $h=2$ RMSE |
| :--- | :---: | :---: | :---: | :---: |
| **Naive Persistence (Baseline)** | **1.9143%** | 7.4634% | 4.3490% | 10.3545% |
| **Linear Trend (Bounded OLS)** | 2.5382% | 7.9412% | 4.7207% | 10.9149% |
| **EWMA Recent Velocity** | 2.4777% | 7.8929% | 4.5937% | 10.7983% |
| **Adaptive Velocity (Ours)** | 2.0505% | **7.4598%** | **4.1106%** | **10.1530%** |

* **Key Finding:** At $h=1$, Naive Persistence achieves lower MAE because 50.6% of projects report zero progress delta in any single month. At $h=2$, progress accumulates and the Adaptive Velocity model outperforms the baseline across both MAE (4.11% vs 4.35%) and RMSE (10.15% vs 10.35%).
* **Empirical Bayesian Shrinkage:** Projects with few observations ($n < 4$) shrink their historical slope towards the sector-wide median velocity, preventing runaway over-extrapolations.

---

## 7. Project Delay Risk & Progress Stagnation Engine

The delay detection module evaluates project schedules by combining official MoSPI reported overruns with statistical run-rate indicators:

### Core Principles
1. **Strict Separation of Official vs. Inferred:** Official figures (`time_overrun_months`, `original_doc`, `revised_doc`, `derived_status`) are isolated from model-inferred risks (`projected_slippage_months`, `trailing_stagnant_months`).
2. **Avoiding False Alarms on 1-Month Plateaus:** Because 50.6% of individual month-to-month intervals exhibit 0.0% delta due to periodic billing and inspection cycles, a 1- or 2-month plateau is treated as normal variance. Stagnation is flagged only when zero progress persists across **$\ge 3$ consecutive months** on an incomplete project.
3. **Transparent Explanations & Thresholds:** Each evaluated factor outputs whether it triggered, its observed value, and the threshold required.

### Evaluated Delay Indicators

| Indicator Code | Risk Dimension | Trigger Threshold |
| :--- | :--- | :--- |
| `OFFICIAL_TIME_OVERRUN` | Official MoSPI record | Reported overrun > 0 months |
| `PAST_COMMISSIONING_DATE` | Milestone breach | Current report date > target DOC with progress < 98% |
| `PROGRESS_STAGNATION` | Prolonged stalling | $\ge 3$ consecutive months of 0.0% change (incomplete project) |
| `MODEL_INFERRED_SLIPPAGE`| Velocity deficit | Run-rate model completion > 3.0 months past official revised DOC |
| `MISSING_MILESTONE_DATES`| Administrative opacity | Key schedule milestones (`start_date`, `revised_doc`) unrecorded |

### Risk Level Categories
* **Critical:** Major official overrun (>24 months) or target date elapsed with progress < 80% (Score $\ge 0.70$).
* **High:** Moderate official overrun (>6 months), prolonged stagnation ($\ge 4$ months), or model slippage >12 months (Score $\ge 0.40$).
* **Moderate:** Minor overrun (1–6 months), 3-month stagnation, or model slippage 3–12 months (Score $\ge 0.15$).
* **Low:** On-schedule, zero official delay, active monthly velocity (Score $< 0.15$).
* **Indeterminate:** Insufficient history ($< 2$ observations) and missing milestone dates.

---

## 8. Progress and Expenditure Anomaly Detection Engine

The anomaly detection module evaluates the correlation between cumulative financial disbursements and on-the-ground physical milestone execution:

### Core Principles
1. **Statistical Alert vs. Legal Adjudication:** Anomalies are flagged as statistical deviations requiring physical audit or administrative clarification. The engine strictly avoids accusatory claims of fraud, corruption, or wrongdoing.
2. **Distinguishing Cash Overdraw from Official MoSPI Cost Overrun:**
   - *Official Cost Overrun:* $\text{Cost Overrun} = \text{Revised Cost} - \text{Original Sanctioned Cost}$ (an authorized budgetary increase approved by authorities).
   - *Expenditure Budget Breach:* $\text{Cumulative Expenditure} > \text{Revised Cost}$ (actual cash disbursed exceeds the sanctioned ceiling).
3. **Normalizing for Reporting Gaps:** When multi-month reporting gaps occur, expenditure and progress increments are divided by elapsed calendar months to avoid false alarms from accumulated periodic lump-sum payments.
4. **Data Sufficiency & Outlier Qualification:** Statistical Z-score outlier analysis is strictly restricted to projects with **$\ge 5$ monthly observation snapshots**.

### Evaluated Anomaly Indicators

| Indicator Code | Dimension | Severity | Trigger Criteria |
| :--- | :--- | :--- | :--- |
| `EXPENDITURE_SURGE_NO_PROGRESS` | Decoupling | CRITICAL / HIGH / MODERATE | Monthly $\Delta E \ge ₹30.0$ Cr (and $\ge 5\%$ of cost) with $\Delta P \le 0.5\%$ |
| `PROGRESS_SURGE_NO_EXPENDITURE` | Decoupling | MODERATE / LOW | Monthly $\Delta P \ge 15.0\%$ with $\Delta E \le ₹0.5$ Cr |
| `BUDGET_EXHAUSTION_ASYMMETRY` | Budget Exhaustion | CRITICAL / HIGH | Financial progress $\ge 70\%$ while physical progress $\le 35\%$ ($\text{Gap} \ge 40\%$) |
| `EXPENDITURE_BUDGET_BREACH` | Cost Overrun | CRITICAL / HIGH | Cumulative expenditure $>$ Revised cost $+ ₹5.0$ Cr |
| `HISTORICAL_STATISTICAL_OUTLIER` | Outlier | MODERATE | Z-score $|Z| \ge 2.5$ on monthly $\Delta E$ or $\Delta P$ (requires $\ge 5$ reports) |

### Composite Anomaly Status
* **Critical (Score $\ge 0.60$):** Cash budget breaches, severe financial exhaustion ($>90\%$ spend with $<10\%$ progress), or major multi-month decoupling.
* **Warning (Score $\ge 0.25$):** Moderate expenditure surge without progress, budget exhaustion gap $>40\%$, or statistical Z-score outlier.
* **Watchlist (Score $\ge 0.10$):** Unfunded progress surge or minor statistical anomaly.
* **Normal (Score $< 0.10$):** Financial drawdown and physical milestones advance synchronously.
* **Indeterminate:** Incomplete budget or progress records preventing evaluation.

---

## 9. Executive Intelligence Report Generation Engine

The Executive Intelligence Report module (`GET /ai/report/{project_id}`) unifies the outputs of data validation, progress forecasting, schedule delay-risk, and expenditure anomaly detection into an integrated, deterministic brief for infrastructure decision-makers.

### Report Structure & Key Fields

1. **`project_overview`**: Official project identity, executing agency, ministry, state, sanctioned budgets (original & revised), cost overrun figures, physical progress, and `data_currency` (evaluating reporting timeliness against the March 2026 portfolio baseline).
2. **`progress_assessment`**: Current physical completion, data sufficiency, monthly run-rate velocity, 6-month projected progress trajectory with 80% confidence bounds, and estimated completion commissioning date (DOC).
3. **`schedule_assessment`**: Official dates (`approval_date`, `start_date`, `original_doc`, `revised_doc`), accumulated time overrun, missing milestone audit, delay-risk score & category (`Critical`, `High`, `Moderate`, `Low`), and triggered schedule indicators.
4. **`financial_assessment`**: Cumulative expenditure, calculated financial progress %, budget exhaustion asymmetry, cash expenditure budget breach, and month-over-month decoupling anomalies.
5. **`executive_summary`**: High-level synthesis with `overall_health` rating (`Good`, `Satisfactory`, `Watchlist`, `High Risk`, `Critical Concern`), narrative summary, bulleted `key_findings`, `primary_risks`, and explicit `data_limitations`.
6. **`recommended_actions`**: Proportionate, prioritized follow-up actions (`CRITICAL`, `HIGH`, `MEDIUM`, `ROUTINE`) across schedule, financial, milestone audit, and data quality categories, accompanied by objective rationales and advisory notices.

### Example API Response (`GET /ai/report/400102`)

```json
{
  "report_id": "REP-400102-2026-03-A8F291BC",
  "project_id": "400102",
  "generated_at": "2026-09-29T11:15:30.123456+00:00",
  "system_version": "PAIMANA-AI-v1.0",
  "project_overview": {
    "project_id": "400102",
    "project_name": "Sri Ram Sagar Project Stage - II",
    "sector": "Water Resources",
    "agency": "Irrigation and CAD-TG",
    "original_cost_cr": 736.13,
    "revised_cost_cr": 949.87,
    "official_cost_overrun_cr": 213.74,
    "official_cost_overrun_pct": 29.04,
    "latest_reported_physical_progress_pct": 97.0,
    "latest_reported_month": "2026-03",
    "data_currency": "Current (March 2026 portfolio snapshot)"
  },
  "progress_assessment": {
    "status": "Available",
    "latest_reported_progress_pct": 97.0,
    "estimated_monthly_velocity_pct": 0.12,
    "forecast_horizon_months": 6,
    "forecasted_completion_doc": "2028-03",
    "projected_slippage_months": 27.0,
    "trajectory": [
      {
        "horizon_step": 1,
        "month_key": "2026-04",
        "month_label": "April 2026",
        "predicted_progress_pct": 97.12,
        "lower_bound_80_pct": 97.0,
        "upper_bound_80_pct": 98.45
      }
    ],
    "disclaimer": "Progress forecasts are model-generated projections based on historical run-rates; they do not represent official government commitments or targets."
  },
  "schedule_assessment": {
    "status": "Available",
    "risk_level": "Critical",
    "risk_score": 0.70,
    "official_time_overrun_months": 72.0,
    "revised_doc": "2025-12",
    "triggered_indicators": ["OFFICIAL_TIME_OVERRUN", "PAST_COMMISSIONING_DATE", "MODEL_INFERRED_SLIPPAGE"]
  },
  "financial_assessment": {
    "status": "Available",
    "cumulative_expenditure_cr": 971.47,
    "financial_progress_pct": 102.27,
    "anomaly_status": "Warning",
    "composite_anomaly_score": 0.55,
    "triggered_indicators": ["EXPENDITURE_SURGE_NO_PROGRESS", "EXPENDITURE_BUDGET_BREACH", "HISTORICAL_STATISTICAL_OUTLIER"]
  },
  "executive_summary": {
    "overall_health": "Critical Concern",
    "summary_text": "Project 400102 ('Sri Ram Sagar Project Stage - II') under the Water Resources sector is assessed at 'Critical Concern' status. Physical execution is at 97.0% against an expenditure of ₹971.47 Cr.",
    "key_findings": [
      "Physical progress stands at 97.0% as of 2026-03 (Status: Delayed).",
      "Cumulative expenditure reached ₹971.47 Cr, representing 102.3% financial budget utilization.",
      "Official reports document an accumulated schedule time overrun of 72.0 months.",
      "Official administrative cost revision has increased budget by +₹213.74 Cr (+29.0%)."
    ],
    "primary_risks": [
      "[Schedule] Official MoSPI Schedule Overrun: Major official schedule overrun of 72.0 months recorded in MoSPI reports.",
      "[Financial] Cumulative Expenditure Exceeds Budget: Cumulative expenditure (₹971.47 Cr) exceeds revised sanctioned cost (₹949.87 Cr) by ₹21.60 Cr (+2.3%)."
    ],
    "data_limitations": [
      "External operational contingencies (land acquisition, right-of-way disputes, environmental clearances) are not captured in quantitative flash reports."
    ]
  },
  "recommended_actions": [
    {
      "priority": "CRITICAL",
      "category": "FINANCIAL",
      "action": "Initiate comprehensive financial audit and verify revised administrative sanction approvals.",
      "rationale": "Cumulative cash expenditure has exceeded the authorized revised cost ceiling.",
      "advisory_notice": "Automated advisory recommendation for project management consideration; not an official administrative directive."
    }
  ]
}
```

### Handling Missing Data & Unavailable Results
* **Missing Baseline Budgets:** For projects missing original or revised sanctioned costs, financial progress is recorded as `null` rather than `0.0`. The financial assessment status is marked as `"Missing Financial Data"`, and an explicit limitation is added to the executive summary.
* **Insufficient History:** For projects with $<2$ monthly observations, forecasting sets `data_sufficiency: "insufficient"` and explains why trajectory projections are bounded.
* **Graceful Degradation:** If any single analytical engine encounters an error or missing input, that specific assessment section marks `status: "Unavailable"` while the remaining sections, overview, and recommendations continue to generate without crashing.

### Limitations of the Report
1. **Decision Support, Not Administrative Directives:** All recommendations are advisory decision-support prompts to facilitate on-site reviews and reconciliations.
2. **Neutral Heuristics:** Anomaly flags and decoupling alerts highlight statistical divergences for audit; they do not imply fraud, corruption, or contractual wrongdoing.
3. **Flash Report Scope:** MoSPI Flash Reports do not record granular qualitative field conditions (e.g., contractor litigation, local weather events, court injunctions, or forest clearance disputes).

---

## 10. Natural Language Project Inquiry Assistant Engine

The Natural Language Assistant (`POST /ai/assistant`) allows users to query infrastructure projects in conversational plain text. All answers are strictly grounded in official MoSPI Flash Report records and the backend's analytical modules.

### Core Capabilities & Supported Question Types

| Query Category | Example Questions | Analytical Engine & Data Sources |
| :--- | :--- | :--- |
| **Project Overview** | *"Tell me about project 400102"*, *"Show summary for Hassan to Belur"* | `data_loader.projects_cache`, Flash Report snapshots |
| **Costs & Financials** | *"What is the cost of 400023?"*, *"Has 400102 breached its budget?"* | Sanctioned costs, expenditure tracking, cost overrun audit |
| **Physical Progress** | *"What is the physical progress of 400010?"*, *"How much work is complete?"* | Milestone % tracking, execution velocity |
| **Progress Forecasts** | *"When will Hassan to Belur be completed?"*, *"What is the projected DOC?"* | `forecast_service`: Adaptive Run-Rate Velocity & Shrinkage |
| **Schedule Delay Risks**| *"Is project 400010 delayed?"*, *"What is the schedule risk for 400022?"* | `delay_risk_service`: Official time overrun, stagnation check |
| **Anomalies & Decoupling**| *"Are there any anomalies in 611752?"*, *"Is there an expenditure surge?"* | `anomaly_service`: Decoupling, budget exhaustion, Z-scores |
| **Executive Briefs** | *"Give me an executive report brief for 400102"* | `report_service`: Unified health rating, findings, limitations |
| **Portfolio Aggregates**| *"How many projects are monitored?"*, *"What is the total expenditure?"* | `analytics_service`: MoSPI 2,100 portfolio statistics |
| **Qualitative Inquiries**| *"Was there fraud or corruption in project 400102?"* | Transparent boundary disclaimer: Flash reports track metrics, not legal determinations |

### Project Resolution Workflow
1. **Explicit ID Parameter:** Directly accepts a 6-digit project ID in the request body.
2. **Embedded ID Extraction:** Identifies 6-digit IDs embedded in the query string (e.g. `\b\d{6}\b`).
3. **Sliding-Window N-Gram Matching:** Scans substantive candidate word groups (from 5 words down to 2 words) against official project titles (e.g., *"Hassan to Belur"* $\rightarrow$ Project `400023`).
4. **Ambiguity Prevention:** If a search matches multiple projects (e.g., *"Metro Rail"*), the assistant returns structured `clarification_options` with candidate IDs and names, prompting the user to clarify rather than guessing.

### Example API Request & Response

#### Request (`POST /ai/assistant`)
```json
{
  "query": "When will Hassan to Belur be completed?"
}
```

#### Response
```json
{
  "answer": "**Progress Forecast for Project 400023 ('Construction of New BG line between Hassan to Belur [27 Km]')**: Latest reported physical progress is **0.3%** as of 2026-03 (Status: In Progress). Based on historical run-rate velocity (0.04%/month), the predictive model projects completion by **2028-04**.",
  "project_id": "400023",
  "project_name": "Construction of New BG line between Hassan to Belur [27 Km]",
  "latest_reported_month": "2026-03",
  "official_data_used": {
    "project_id": "400023",
    "project_name": "Construction of New BG line between Hassan to Belur [27 Km]",
    "sector": "Railways",
    "agency": "South Western Railway [SWR] - II",
    "state": "Karnataka",
    "original_cost_cr": 749.0,
    "revised_cost_cr": 749.0,
    "cumulative_expenditure_cr": 0.94,
    "physical_progress_pct": 0.3,
    "derived_status": "In Progress"
  },
  "analytical_results_used": {
    "forecast": {
      "forecasted_completion_doc": "2028-04",
      "estimated_monthly_velocity_pct": 0.0412,
      "data_sufficiency": "sufficient"
    }
  },
  "sources_used": [
    "MoSPI PAIMANA Project Snapshot",
    "Adaptive Velocity Forecast Service"
  ],
  "missing_or_unavailable_data": [],
  "clarification_options": null,
  "llm_synthesized": false,
  "disclaimer": "Official figures originate directly from MoSPI Flash Reports. Projections, delay risk scores, and anomaly alerts are statistical heuristics and do not represent official government determinations."
}
```

### Configuration & LLM Extensibility
* **Zero-Dependency Default:** Operates 100% locally and offline without requiring external API keys, network calls, or paid LLM providers.
* **Optional LLM Synthesis:** Can be enhanced with external LLMs by setting environment variables (`PAIMANA_LLM_PROVIDER=gemini` and `GEMINI_API_KEY=...`).
* **Resilient Fallback:** If an external LLM fails, times out, or hits a rate limit, the assistant seamlessly falls back to the deterministic verified answer.

---

## 11. Verifying Dataset Integrity

To audit the MoSPI PAIMANA dataset without starting the API server:

```powershell
& ".\AI-Backend\.venv\Scripts\python.exe" "AI-Backend\scripts\validate_dataset.py"
```

---

## 12. Running the Automated Test Suite

Run the full test suite (65 unit and integration tests across data loader, health, projects, forecasting, delay-risk, anomaly detection, executive reports, and the AI assistant) with `pytest`:

```powershell
& ".\AI-Backend\.venv\Scripts\pytest.exe" "AI-Backend\tests" -v
```

---

## 13. System Completion Status

All planned AI backend modules are now **ACTIVE** and fully tested:
* `GET /health` — Service health & dataset verification
* `GET /projects` — Project query, filtering & detail
* `GET /analytics/summary` — MoSPI portfolio aggregations
* `GET /ai/forecast/{id}` — Progress forecasting & completion estimation
* `GET /ai/delay-risk/{id}` — Multidimensional schedule delay & stagnation risk
* `GET /ai/anomalies/{id}` — Progress and expenditure anomaly detection
* `GET /ai/report/{id}` — Unified executive intelligence report generation
* `POST /ai/assistant` — Natural language project inquiry assistant


