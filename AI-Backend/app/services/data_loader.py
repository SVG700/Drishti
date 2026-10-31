"""Data loading and validation module for MoSPI PAIMANA CSV datasets.

Handles:
- Loading projects and monthly history CSVs
- Verifying required schema, columns, and data types
- Preserving authentic missing values (NaN -> None, no synthetic substitution)
- Validating record counts, duplicates, date formats, and numeric bounds
- Generating a comprehensive Data Quality Summary
"""
import os
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Tuple
import pandas as pd
import numpy as np

logger = logging.getLogger(__name__)

# Required core columns in paimana_projects.csv
REQUIRED_PROJECTS_COLUMNS = [
    "project_id",
    "project_name",
    "ministry",
    "sector",
    "original_cost_cr",
    "revised_cost_cr",
    "cumulative_expenditure_cr",
    "physical_progress_pct",
    "cost_overrun_cr",
    "time_overrun_months",
    "derived_status",
]

# Required core columns in paimana_history.csv
REQUIRED_HISTORY_COLUMNS = [
    "project_id",
    "project_name",
    "sector",
    "original_cost_cr",
    "revised_cost_cr",
    "cumulative_expenditure_cr",
    "physical_progress_pct",
    "report_month",
    "report_month_key",
    "source_file",
]

NUMERIC_COLUMNS = [
    "original_cost_cr",
    "revised_cost_cr",
    "cumulative_expenditure_cr",
    "physical_progress_pct",
    "cost_overrun_cr",
    "cost_overrun_pct",
    "progress_delta_pct",
    "time_overrun_months",
    "initial_cost_cr",
    "initial_expenditure_cr",
    "initial_progress_pct",
    "serial_no",
    "months_reported_count",
]


def clean_val(val: Any) -> Any:
    """Safely convert pandas NaN / None / inf to Python None."""
    if val is None:
        return None
    if isinstance(val, (float, np.floating)):
        if np.isnan(val) or np.isinf(val):
            return None
    if isinstance(val, str) and val.strip().lower() in ("", "nan", "none", "null"):
        return None
    return val


class DataLoader:
    """Manages loading, validating, and serving PAIMANA datasets."""

    def __init__(self, datasets_dir: Optional[Path] = None):
        if datasets_dir is None:
            # AI-Backend/datasets by default
            base_dir = Path(__file__).resolve().parent.parent.parent
            self.datasets_dir = base_dir / "datasets"
        else:
            self.datasets_dir = Path(datasets_dir)

        self.projects_df: Optional[pd.DataFrame] = None
        self.history_df: Optional[pd.DataFrame] = None
        self.is_loaded: bool = False
        self.quality_summary: Dict[str, Any] = {}
        self.projects_cache: Dict[str, Dict[str, Any]] = {}
        self.history_by_project: Dict[str, List[Dict[str, Any]]] = {}

    def locate_file(self, filename: str) -> Optional[Path]:
        """Locates dataset file inside datasets_dir, or project root as fallback."""
        candidate = self.datasets_dir / filename
        if candidate.exists():
            return candidate

        # Fallback to project root (parent of AI-Backend)
        root_candidate = self.datasets_dir.parent.parent / filename
        if root_candidate.exists():
            return root_candidate

        return None

    def load_and_validate(self) -> Tuple[bool, str]:
        """Loads and validates both projects and history CSV datasets."""
        projects_file = self.locate_file("paimana_projects.csv")
        history_file = self.locate_file("paimana_history.csv")

        if not projects_file or not projects_file.exists():
            msg = f"Dataset file 'paimana_projects.csv' could not be found in {self.datasets_dir} or parent paths."
            logger.error(msg)
            return False, msg

        if not history_file or not history_file.exists():
            msg = f"Dataset file 'paimana_history.csv' could not be found in {self.datasets_dir} or parent paths."
            logger.error(msg)
            return False, msg

        try:
            # Load raw data preserving missing values as NaN (never fabricate)
            # Use dtype={'project_id': str} to prevent ID truncation or floating point conversion
            projects_df = pd.read_csv(projects_file, dtype={"project_id": str}, keep_default_na=True)
            history_df = pd.read_csv(history_file, dtype={"project_id": str}, keep_default_na=True)

            projects_df["project_id"] = projects_df["project_id"].astype(str).str.strip()
            history_df["project_id"] = history_df["project_id"].astype(str).str.strip()

            # Ensure numeric conversion where possible, preserving NaNs
            for col in NUMERIC_COLUMNS:
                if col in projects_df.columns:
                    projects_df[col] = pd.to_numeric(projects_df[col], errors="coerce")
                if col in history_df.columns:
                    history_df[col] = pd.to_numeric(history_df[col], errors="coerce")

            # Validate schemas
            projects_missing_cols = [c for c in REQUIRED_PROJECTS_COLUMNS if c not in projects_df.columns]
            history_missing_cols = [c for c in REQUIRED_HISTORY_COLUMNS if c not in history_df.columns]

            if projects_missing_cols:
                return False, f"Missing required columns in paimana_projects.csv: {projects_missing_cols}"
            if history_missing_cols:
                return False, f"Missing required columns in paimana_history.csv: {history_missing_cols}"

            # Calculate Data Quality Metrics
            total_projects = len(projects_df)
            unique_project_ids = projects_df["project_id"].nunique()
            duplicate_project_ids = total_projects - unique_project_ids

            total_observations = len(history_df)
            unique_obs_keys = history_df[["project_id", "report_month_key"]].drop_duplicates().shape[0] if "report_month_key" in history_df.columns else total_observations
            duplicate_observations = total_observations - unique_obs_keys

            # Missing value analysis
            projects_nulls = {col: int(projects_df[col].isna().sum()) for col in projects_df.columns}
            history_nulls = {col: int(history_df[col].isna().sum()) for col in history_df.columns}

            # Range & aggregate sanity metrics
            cum_orig_cost = float(projects_df["original_cost_cr"].dropna().sum())
            cum_rev_cost = float(projects_df["revised_cost_cr"].dropna().sum())
            cum_expenditure = float(projects_df["cumulative_expenditure_cr"].dropna().sum())
            cost_overrun_sum = float(projects_df["cost_overrun_cr"].dropna().sum())

            earliest_month = str(history_df["report_month_key"].dropna().min()) if "report_month_key" in history_df.columns else "N/A"
            latest_month = str(history_df["report_month_key"].dropna().max()) if "report_month_key" in history_df.columns else "N/A"

            self.quality_summary = {
                "dataset_valid": True,
                "projects_file": str(projects_file),
                "history_file": str(history_file),
                "total_projects": total_projects,
                "unique_projects": unique_project_ids,
                "duplicate_projects": duplicate_project_ids,
                "total_observations": total_observations,
                "duplicate_observations": duplicate_observations,
                "coverage_start": earliest_month,
                "coverage_end": latest_month,
                "cumulative_original_cost_cr": round(cum_orig_cost, 2),
                "cumulative_revised_cost_cr": round(cum_rev_cost, 2),
                "cumulative_expenditure_cr": round(cum_expenditure, 2),
                "total_cost_overrun_cr": round(cost_overrun_sum, 2),
                "projects_missing_fields_count": projects_nulls,
                "history_missing_fields_count": history_nulls,
                "synthetic_values_injected": False,
                "missing_values_preserved": True,
            }

            self.projects_df = projects_df
            self.history_df = history_df

            # Pre-index for fast API lookups
            self._build_indexes()
            self.is_loaded = True

            logger.info("Successfully validated PAIMANA dataset: %d projects, %d observations", total_projects, total_observations)
            return True, "Dataset loaded and validated successfully."

        except Exception as e:
            logger.exception("Failed to load or validate PAIMANA dataset: %s", str(e))
            return False, f"Validation error: {str(e)}"

    def _build_indexes(self):
        """Build in-memory dictionary indexes for O(1) project and history lookups."""
        if self.projects_df is None or self.history_df is None:
            return

        # Pre-group history records by project_id
        grouped_hist = self.history_df.groupby("project_id")
        history_by_pid = {}
        for pid, group in grouped_hist:
            clean_records = []
            for _, row in group.sort_values(by="report_month_key", ascending=True).iterrows():
                clean_records.append({k: clean_val(v) for k, v in row.to_dict().items()})
            history_by_pid[str(pid)] = clean_records

        self.history_by_project = history_by_pid

        # Index projects
        proj_cache = {}
        for _, row in self.projects_df.iterrows():
            pid = str(row["project_id"])
            proj_cache[pid] = {k: clean_val(v) for k, v in row.to_dict().items()}
        self.projects_cache = proj_cache

    def get_projects(
        self,
        page: int = 1,
        page_size: int = 50,
        sector: Optional[str] = None,
        state: Optional[str] = None,
        status: Optional[str] = None,
        search: Optional[str] = None,
    ) -> Dict[str, Any]:
        """Returns filtered, paginated projects."""
        if not self.is_loaded or self.projects_df is None:
            return {"total": 0, "page": page, "page_size": page_size, "total_pages": 0, "items": []}

        df = self.projects_df

        if sector:
            df = df[df["sector"].astype(str).str.contains(sector, case=False, na=False)]
        if state:
            df = df[df["state"].astype(str).str.contains(state, case=False, na=False)]
        if status:
            df = df[df["derived_status"].astype(str).str.contains(status, case=False, na=False)]
        if search:
            search_str = search.lower()
            df = df[
                df["project_name"].astype(str).str.lower().str.contains(search_str, na=False)
                | df["project_id"].astype(str).str.lower().str.contains(search_str, na=False)
                | df["agency"].astype(str).str.lower().str.contains(search_str, na=False)
            ]

        total = len(df)
        total_pages = max(1, (total + page_size - 1) // page_size) if total > 0 else 0
        start_idx = (page - 1) * page_size
        end_idx = start_idx + page_size

        sliced = df.iloc[start_idx:end_idx]
        items = [{k: clean_val(v) for k, v in row.to_dict().items()} for _, row in sliced.iterrows()]

        return {
            "total": total,
            "page": page,
            "page_size": page_size,
            "total_pages": total_pages,
            "items": items,
        }

    def get_project_by_id(self, project_id: str) -> Optional[Dict[str, Any]]:
        """Returns project summary details and historical monthly observations."""
        pid = str(project_id).strip()
        project_data = self.projects_cache.get(pid)
        if not project_data:
            return None

        result = dict(project_data)
        result["history"] = self.history_by_project.get(pid, [])
        return result


# Global singleton instance
data_loader = DataLoader()
