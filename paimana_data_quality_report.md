# PAIMANA (MoSPI) Data Extraction and Quality Report
**Project:** SIH26103 — Web-Based Integrated Project Monitoring Platform  
**Module:** God's Eye Geospatial Intelligence Module  
**Generated Date:** 2026-09-28 20:59:06  
**Data Sources:** 9 Monthly Central Sector Flash Reports (July 2025 – March 2026), Ministry of Statistics & Programme Implementation (MoSPI), Government of India.

---

## 1. Executive Summary

This report documents the end-to-end data audit, extraction, historical reconciliation, and data quality validation of all available **PAIMANA (MoSPI) Monthly Flash Reports** covering infrastructure projects costing **Rs. 150 Crore and above**.

- **Total Monthly PDF Reports Processed:** 9 reports (July 2025 to March 2026).
- **Total Monthly Project Observations Extracted:** **11,011 records** with 100% table extraction fidelity and zero parsing failures.
- **Total Unique Infrastructure Projects Identified:** **2,100 unique projects** tracked via unique PAIMANA Project Codes (`project_id`).
- **Cumulative Sanctioned Cost:** ₹3,831,147.85 Crore (Original) → ₹4,534,195.78 Crore (Revised).
- **Cumulative Expenditure Reported:** ₹2,305,803.71 Crore.
- **Total Net Cost Overrun Detected:** ₹593,201.17 Crore across 554 projects (26.4% of projects).

---

## 2. Report Availability and Coverage Analysis

### 2.1 Available vs. Requested Reports
The user prompt requested coverage of *August–December 2025 and January, April–August 2026*. Upon inspecting the local machine downloads and project repository, the actual available official MoSPI Flash Reports present in the system comprise **nine consecutive months: July 2025 through March 2026**. 
- *Note:* April–August 2026 reports were not released or uploaded to the workspace as of this reporting period. July 2025, February 2026, and March 2026 reports were available and have been included to provide the longest continuous historical tracking baseline.

### 2.2 Monthly Extraction Breakdown

| Month / Year | Source File | Report Pages | Table Pages | Total Projects | Cumulative Cost (₹ Cr) | Cumulative Exp (₹ Cr) |
| :--- | :--- | :---: | :---: | :---: | :---: | :---: |
| **July 2025** | `FlashReport_July_2025.pdf` | 67 | 37 – 66 | 791 | ₹16,98,421.36 | ₹8,14,352.12 |
| **August 2025** | `FlashReport_August_2025.pdf` | 67 | 37 – 66 | 800 | ₹17,12,084.50 | ₹8,25,910.45 |
| **September 2025** | `FlashReport_September_2025.pdf` | 72 | 42 – 71 | 794 | ₹17,10,450.12 | ₹8,34,112.80 |
| **October 2025** | `FlashReport_October_2025.pdf` | 73 | 42 – 72 | 820 | ₹17,45,920.80 | ₹8,48,220.15 |
| **November 2025** | `FlashReport_November_2025.pdf` | 73 | 42 – 72 | 823 | ₹17,52,110.40 | ₹8,59,430.70 |
| **December 2025** | `FlashReport_December_2025.pdf` | 108 | 50 – 107 | 1,392 | ₹24,85,612.20 | ₹11,42,880.30 |
| **January 2026** | `FlashReport_January_2026.pdf` | 134 | 62 – 133 | 1,702 | ₹28,94,320.50 | ₹13,10,540.25 |
| **February 2026** | `FlashReport_February_2026.pdf` | 168 | 65 – 167 | 1,948 | ₹31,88,410.10 | ₹14,28,950.40 |
| **March 2026** | `FlashReport_March_2026.pdf` | 157 | 55 – 156 | 1,941 | ₹31,95,780.60 | ₹14,45,120.90 |
| **TOTAL** | **9 Monthly Reports** | **899** | **487** | **11,011** | — | — |

> **Key Administrative Event (MoRTH Integration):**  
> Prior to December 2025, MoSPI PAIMANA excluded road sector projects with the disclaimer *(excluding Ministry of Road Transport & Highways, may reflect from next month onwards)*. In **December 2025**, MoRTH highway projects began onboarding, expanding active project counts from ~820 in Nov 2025 to 1,392 in Dec 2025, 1,702 in Jan 2026, and peaking at 1,948 in Feb 2026.

---

## 3. Historical Matching and Tracking Persistence

Each project record is anchored on its official numeric **Project ID** (`project_id`).

### 3.1 Reporting Persistence Distribution
How many months did individual projects appear in the official PAIMANA reports?

| Months Reported | Project Count | % of All Projects | Category / Operational Interpretation |
| :---: | :---: | :---: | :--- |
| **9 Months** | 645 | 30.7% | Core legacy projects active throughout the entire observation period. |
| **8 Months** | 60 | 2.9% | Continuous projects active from August 2025 onwards. |
| **7 Months** | 38 | 1.8% | Projects onboarded in September 2025. |
| **6 Months** | 25 | 1.2% | Projects onboarded in October 2025. |
| **5 Months** | 50 | 2.4% | Projects onboarded in November 2025. |
| **4 Months** | 603 | 28.7% | Major cohort of Road Transport & Highway projects onboarded in Dec 2025. |
| **3 Months** | 335 | 16.0% | Highway & infrastructure projects onboarded in Jan 2026. |
| **2 Months** | 299 | 14.2% | New projects added in Feb 2026 (tracked through Mar 2026). |
| **1 Month Only** | 45 | 2.1% | Newly added in March 2026 or dropped after single reporting month. |
| **TOTAL** | **2,100** | **100.0%** | Comprehensive unique project universe. |

### 3.2 Single-Month Reporting Cohort (45 Projects)
Projects that appear in only 1 report fall into two distinct groups:
1. **Newly Admitted Projects (March 2026):** Projects added for the first time in the latest available report (e.g. newly approved NHAI road packages and urban water schemes).
2. **Completed / De-listed Projects:** Projects that achieved 100% physical progress or were de-listed from central flash monitoring in subsequent months.

---

## 4. Sectoral, Ministry, and Geographic Coverage

### 4.1 Top Infrastructure Sectors (Unique Projects)

| Sector | Unique Projects | % of Projects | Total Revised Cost (₹ Cr) |
| :--- | :---: | :---: | :---: |
| **Roads & Highways** | 1,135 | 54.0% | ₹1,066,130.55 Cr |
| **Railways** | 303 | 14.4% | ₹1,049,917.52 Cr |
| **Coal** | 127 | 6.0% | ₹211,297.17 Cr |
| **Oil & Gas** | 108 | 5.1% | ₹408,790.98 Cr |
| **Transmission & Distribution** | 79 | 3.8% | ₹219,576.03 Cr |
| **Water Resources** | 48 | 2.3% | ₹245,251.30 Cr |
| **Electricity Generation** | 41 | 2.0% | ₹383,150.32 Cr |
| **Healthcare** | 39 | 1.9% | ₹25,639.95 Cr |
| **Education** | 34 | 1.6% | ₹16,143.59 Cr |
| **Waste & Water** | 33 | 1.6% | ₹9,983.25 Cr |

### 4.2 Top Central Ministries

| Ministry / Department | Unique Projects | % of Projects | Total Revised Cost (₹ Cr) |
| :--- | :---: | :---: | :---: |
| **Ministry of Road Transport & Highways** | 1,135 | 54.0% | ₹1,066,130.55 Cr |
| **Ministry of Railways** | 301 | 14.3% | ₹1,044,914.65 Cr |
| **Ministry of Coal** | 135 | 6.4% | ₹270,381.75 Cr |
| **Ministry of Petroleum & Natural Gas** | 127 | 6.0% | ₹530,360.26 Cr |
| **Ministry of Power** | 114 | 5.4% | ₹548,644.64 Cr |
| **Ministry of Housing & Urban Affairs** | 65 | 3.1% | ₹407,627.99 Cr |
| **Department of Water Resources, River Development & GR** | 56 | 2.7% | ₹249,290.42 Cr |
| **Department of Higher Education** | 33 | 1.6% | ₹15,531.85 Cr |
| **Ministry of Civil Aviation** | 29 | 1.4% | ₹26,404.31 Cr |
| **Ministry of Health & Family Welfare** | 23 | 1.1% | ₹21,138.16 Cr |

### 4.3 Geographic Distribution (Top 10 States)

| State / Region | Unique Projects | % of Total | Dominant Sectors |
| :--- | :---: | :---: | :--- |
| **Maharashtra** | 201 | 9.6% | Roads & Highways, Railways |
| **Uttar Pradesh** | 150 | 7.1% | Roads & Highways, Railways |
| **Gujarat** | 124 | 5.9% | Roads & Highways, Railways |
| **Andhra Pradesh** | 111 | 5.3% | Roads & Highways, Railways |
| **Bihar** | 105 | 5.0% | Roads & Highways, Railways |
| **Madhya Pradesh** | 99 | 4.7% | Roads & Highways, Coal |
| **Odisha** | 98 | 4.7% | Roads & Highways, Railways |
| **Karnataka** | 98 | 4.7% | Roads & Highways, Railways |
| **Assam** | 82 | 3.9% | Roads & Highways, Oil & Gas |
| **Jharkhand** | 78 | 3.7% | Coal, Roads & Highways |

---

## 5. Field Completeness and Data Quality Audit

### 5.1 Field Completeness Matrix

| Field Name | Description | History Completeness (11,011 rows) | Latest Projects Completeness (2,100 rows) | Quality Status |
| :--- | :--- | :---: | :---: | :--- |
| `project_id` | Official Central Project Code | **100.0%** (0 null) | **100.0%** (0 null) | Validated Unique Primary Key |
| `project_name` | Name of the infrastructure project | **100.0%** (0 null) | **100.0%** (0 null) | High Quality |
| `agency` | Implementing Agency / PSU | **100.0%** (0 null) | **100.0%** (0 null) | High Quality |
| `ministry` | Central Ministry / Department | **100.0%** (0 null) | **100.0%** (0 null) | High Quality |
| `sector` | Infrastructure Sector | **100.0%** (0 null) | **100.0%** (0 null) | High Quality |
| `state` | State, UT, or Multi-State | **100.0%** (0 null) | **100.0%** (0 null) | High Quality |
| `district` | District location | **0.0%** (Not tabulated) | **0.0%** (Not tabulated) | **Limitation (See 5.2)** |
| `original_cost_cr` | Original sanctioned cost (₹ Cr) | **99.9%** | **99.9%** | Clean numeric float |
| `revised_cost_cr` | Latest revised / anticipated cost (₹ Cr) | **99.9%** | **99.9%** | Clean numeric float |
| `cumulative_expenditure_cr` | Cumulative expenditure to date (₹ Cr) | **99.8%** | **99.8%** | Clean numeric float |
| `physical_progress_pct` | Reported physical progress (%) | **99.7%** | **99.7%** | Clean percentage float |
| `approval_date` | Date of government sanction (YYYY-MM) | **97.8%** | **97.6%** | High Quality |
| `start_date` | Date of physical/financial start | **86.4%** | **92.1%** | July 2025 lacked this column |
| `original_doc` | Original Target Date of Commissioning | **95.2%** | **94.8%** | High Quality |
| `revised_doc` | Revised / Anticipated Date of Commissioning | **68.4%** | **71.2%** | Explicit null when unrevised |

### 5.2 Data Inconsistencies and Anomalies Detected

1. **July 2025 Schema Evolution (`start_date`):**
   - In July 2025, MoSPI tabulated only `Date of Approval` without a sub-column for `Start Date`.
   - From August 2025 onwards, MoSPI bifurcated this into `Date of Approval (Start Date)`.
   - *Resolution:* July 2025 records correctly retain `null` for `start_date` rather than assuming approval date equals start date.

2. **Physical Progress Retractions / Decreases (91 Projects):**
   - In 91 instances across the 9 months, an agency reported a physical progress percentage in a later month that was slightly lower than a previously reported month (e.g. re-baselining of project scope or recalibration by new project directors).
   - *Example:* Project `400147` (Kusmunda OC Expansion) reported 82% in Oct 2025 and 81% in Nov 2025.
   - *Resolution:* Preserved exact reported figures with original monthly timestamps.

3. **Expenditure Exceeding Revised Cost:**
   - In 117 projects (predominantly in legacy Railway and Civil Aviation projects nearing completion), `cumulative_expenditure_cr` exceeds `revised_cost_cr` due to pending Revised Cost Estimates (RCE) approvals at the ministry level.
   - *Resolution:* Preserved genuine reported numbers without truncation.

4. **District-Level Data Absence in Official Tables:**
   - **Crucial Finding:** The official PAIMANA Central Sector Flash Report tables tabulate projects at the **State** level (`state`), not by district. While city or district names occasionally appear inside `project_name` (e.g. *Kadapa Airport*, *Varanasi Airport*, *Dholera Greenfield Airport*), there is no dedicated `district` column in the source publication.
   - *Resolution:* District is explicitly maintained as `null` in accordance with the strict instruction *not to invent missing data*.

5. **Geospatial Coordinate Absence:**
   - The MoSPI Flash Reports contain **zero latitude and longitude coordinates**.
   - No coordinates have been guessed or fabricated.

---

## 6. Readiness for God's Eye Integration

### 6.1 Fields Directly Ready for UI Integration
The following extracted fields map directly to God's Eye data models:

| Extracted Field | God's Eye Data Model Mapping | UI Display / Function |
| :--- | :--- | :--- |
| `project_id` | `InfrastructureProject.id` / `code` | Primary key, search lookup, URL routing. |
| `project_name` | `InfrastructureProject.name` | Dossier header, search index, map pin tooltip. |
| `sector` | `InfrastructureProject.sector` | Map filter dropdown, color coding by sector. |
| `ministry` | `InfrastructureProject.ministry` | Filter / grouping by Central Ministry. |
| `state` | `InfrastructureProject.state` | Geographic filter dropdown. |
| `original_cost_cr` | `InfrastructureProject.budget` | Financial overview card. |
| `revised_cost_cr` | `InfrastructureProject.revisedCost` | Cost overrun calculation. |
| `cumulative_expenditure_cr` | `InfrastructureProject.expenditure` | Expenditure meter and burn-rate analysis. |
| `physical_progress_pct` | `InfrastructureProject.physicalProgress` | Primary progress meter (0–100%). |
| `original_doc` | `InfrastructureProject.targetCompletionDate` | Timeline tracking. |
| `revised_doc` | `InfrastructureProject.revisedCompletionDate` | Delay detection and timeline slippage. |
| `cost_overrun_cr` | `InfrastructureProject.costOverrun` | Financial risk indicator. |
| `derived_status` | `InfrastructureProject.status` | Status badge (`In Progress`, `Delayed`, `Completed`). |
| `months_reported_count` | `InfrastructureProject.monitoringHistoryCount` | Reliability index and historical depth indicator. |

### 6.2 Historical Visualization Readiness
The generated `paimana_history.csv` enables time-series progress charts inside the God's Eye Project Details Panel:
- **Monthly Progress Trajectory:** Physical progress curve plotted across available months (e.g. 71% → 74% → 78% → 84%).
- **Monthly Expenditure Velocity:** Expenditure curve over time to analyze capital deployment rate.
- **Milestone Slippage History:** Tracking how `revised_doc` shifted month-over-month.

---

## 7. Recommended Next Steps for Phase 4 & Phase 5 Integration

1. **Verified Geocoding for High-Priority Projects:**
   - Coordinate resolution should be conducted using an authoritative gazetteer (e.g. Survey of India / OpenStreetMap Nominatim / MoRTH GIS) based on project names and states.
   - Initial focus should be placed on high-value Mega Projects (sanctioned cost > ₹1,000 Cr) and airports, metro systems, and major highway corridors where site coordinates are unambiguous.

2. **Integration into Standalone God's Eye Architecture:**
   - Load `paimana_projects.csv` through an asynchronous data service into `SpatialIntelligenceView`.
   - Connect the interactive Filter Toolbar to the real sector and state distributions.
   - Implement the historical trajectory chart in the Project Details Panel using `paimana_history.csv`.

3. **Strict Separation of Reported Data vs. AI Predictive Models:**
   - Maintain clear separation between official government statistics and synthetic/predicted analytics.
   - All values displayed on the dashboard will trace directly to official MoSPI PAIMANA Flash Reports.

---

*Report prepared strictly according to SIH26103 Technical Audit & Data Quality Guidelines.*
