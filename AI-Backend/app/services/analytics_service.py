"""Analytics calculation service based on official MoSPI PAIMANA data."""
from typing import Dict, Any, List
from .data_loader import data_loader


class AnalyticsService:
    """Calculates official aggregate portfolio metrics."""

    @staticmethod
    def get_summary() -> Dict[str, Any]:
        """Calculates portfolio metrics directly from validated dataset."""
        if not data_loader.is_loaded or data_loader.projects_df is None:
            return {
                "total_projects": 0,
                "total_observations": 0,
                "data_coverage_period": "No data loaded",
                "cumulative_original_cost_cr": 0.0,
                "cumulative_revised_cost_cr": 0.0,
                "cumulative_expenditure_cr": 0.0,
                "total_cost_overrun_cr": 0.0,
                "projects_with_cost_overrun_count": 0,
                "projects_with_time_overrun_count": 0,
                "status_distribution": {},
                "sector_distribution": {},
                "top_cost_overrun_projects": [],
                "top_delayed_projects": [],
            }

        df = data_loader.projects_df
        total_projects = len(df)
        total_observations = len(data_loader.history_df) if data_loader.history_df is not None else 0

        qs = data_loader.quality_summary
        coverage_period = f"{qs.get('coverage_start', '2025-07')} to {qs.get('coverage_end', '2026-03')}"

        cum_orig = float(df["original_cost_cr"].dropna().sum())
        cum_rev = float(df["revised_cost_cr"].dropna().sum())
        cum_exp = float(df["cumulative_expenditure_cr"].dropna().sum())
        cost_overrun = float(df["cost_overrun_cr"].dropna().sum())

        cost_overrun_count = int((df["cost_overrun_cr"] > 0).sum())
        time_overrun_count = int((df["time_overrun_months"] > 0).sum())

        status_dist = {str(k): int(v) for k, v in df["derived_status"].fillna("Unknown").value_counts().items()}
        sector_dist = {str(k): int(v) for k, v in df["sector"].fillna("Unassigned").value_counts().items()}

        # Top 5 cost overrun projects
        top_cost = []
        if "cost_overrun_cr" in df.columns:
            sorted_cost = df.sort_values(by="cost_overrun_cr", ascending=False).head(5)
            for _, r in sorted_cost.iterrows():
                val = float(r["cost_overrun_cr"]) if not pd_isna(r["cost_overrun_cr"]) else 0.0
                if val > 0:
                    top_cost.append({
                        "project_id": str(r["project_id"]),
                        "project_name": str(r["project_name"]),
                        "sector": str(r.get("sector", "N/A")),
                        "metric_name": "Cost Overrun",
                        "metric_value": round(val, 2),
                        "unit": "₹ Crore",
                    })

        # Top 5 delayed projects (by time_overrun_months)
        top_delayed = []
        if "time_overrun_months" in df.columns:
            sorted_delay = df.sort_values(by="time_overrun_months", ascending=False).head(5)
            for _, r in sorted_delay.iterrows():
                val = float(r["time_overrun_months"]) if not pd_isna(r["time_overrun_months"]) else 0.0
                if val > 0:
                    top_delayed.append({
                        "project_id": str(r["project_id"]),
                        "project_name": str(r["project_name"]),
                        "sector": str(r.get("sector", "N/A")),
                        "metric_name": "Schedule Delay",
                        "metric_value": round(val, 1),
                        "unit": "Months",
                    })

        return {
            "total_projects": total_projects,
            "total_observations": total_observations,
            "data_coverage_period": coverage_period,
            "cumulative_original_cost_cr": round(cum_orig, 2),
            "cumulative_revised_cost_cr": round(cum_rev, 2),
            "cumulative_expenditure_cr": round(cum_exp, 2),
            "total_cost_overrun_cr": round(cost_overrun, 2),
            "projects_with_cost_overrun_count": cost_overrun_count,
            "projects_with_time_overrun_count": time_overrun_count,
            "status_distribution": status_dist,
            "sector_distribution": sector_dist,
            "top_cost_overrun_projects": top_cost,
            "top_delayed_projects": top_delayed,
        }


def pd_isna(val: Any) -> bool:
    """Helper to check if a value is nan or None."""
    if val is None:
        return True
    try:
        import numpy as np
        return bool(np.isnan(val))
    except (TypeError, ValueError):
        return False


analytics_service = AnalyticsService()
