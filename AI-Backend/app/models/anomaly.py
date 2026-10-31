"""Pydantic schemas for Progress and Expenditure Anomaly Detection."""
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class OfficialFinancials(BaseModel):
    """Official budget, expenditure, and progress metrics from MoSPI reports."""
    original_cost_cr: Optional[float] = Field(None, description="Original sanctioned cost in ₹ Crore")
    revised_cost_cr: Optional[float] = Field(None, description="Revised / anticipated cost in ₹ Crore")
    cumulative_expenditure_cr: Optional[float] = Field(None, description="Total expenditure to date in ₹ Crore")
    physical_progress_pct: Optional[float] = Field(None, description="Physical completion percentage (0-100%)")
    official_cost_overrun_cr: Optional[float] = Field(None, description="MoSPI reported cost overrun (revised - original)")
    official_cost_overrun_pct: Optional[float] = Field(None, description="MoSPI reported cost overrun percentage")
    financial_progress_pct: Optional[float] = Field(None, description="Calculated expenditure / revised cost (%)")
    latest_reported_month: Optional[str] = Field(None, description="Latest MoSPI report month key (YYYY-MM)")


class MonthlyAnomalyDetail(BaseModel):
    """Detailed observation of an anomaly detected in a specific reporting transition."""
    month_key: str = Field(..., description="Reporting month when anomaly occurred (YYYY-MM)")
    anomaly_type: str = Field(..., description="e.g. 'EXPENDITURE_SURGE_WITHOUT_PROGRESS' or 'PROGRESS_SURGE_WITHOUT_EXPENDITURE'")
    severity: str = Field(..., description="Severity level: INFO, LOW, MODERATE, HIGH, or CRITICAL")
    expenditure_delta_cr: Optional[float] = Field(None, description="Month-over-month expenditure change in ₹ Crore")
    progress_delta_pct: Optional[float] = Field(None, description="Month-over-month physical progress change in %")
    elapsed_months: int = Field(1, description="Calendar months elapsed since previous report")
    description: str = Field(..., description="Detailed description of the observation")


class AnomalyIndicator(BaseModel):
    """Individual anomaly indicator evaluation."""
    indicator_code: str = Field(..., description="Machine-readable code (e.g., 'BUDGET_EXHAUSTION', 'EXPENDITURE_BREACH')")
    name: str = Field(..., description="Human-readable indicator name")
    dimension: str = Field(..., description="Dimension: 'DECOUPLING', 'BUDGET_EXHAUSTION', 'COST_OVERRUN', or 'STATISTICAL_OUTLIER'")
    severity: str = Field(..., description="Severity: INFO, LOW, MODERATE, HIGH, or CRITICAL")
    triggered: bool = Field(..., description="Whether this anomaly threshold was breached")
    observed_value: Any = Field(None, description="Measured value for this project")
    threshold: Any = Field(None, description="Threshold required to trigger this indicator")
    description: str = Field(..., description="Explanation of why this indicator triggered or passed")


class AnomalyDataSufficiency(BaseModel):
    """Metadata regarding data completeness for anomaly evaluation."""
    sufficiency: str = Field(..., description="'sufficient' (>=5 obs), 'limited' (2-4 obs), or 'insufficient' (<2 obs)")
    observations_analyzed: int = Field(..., description="Total monthly observation reports available")
    missing_fields: List[str] = Field(default_factory=list, description="Relevant fields missing from official reports")
    statistical_outliers_applicable: bool = Field(..., description="True if project has >=5 obs for Z-score analysis")


class ProjectAnomalyResponse(BaseModel):
    """Comprehensive anomaly detection response for an infrastructure project."""
    project_id: str
    project_name: Optional[str] = None
    sector: Optional[str] = None
    agency: Optional[str] = None
    anomaly_status: str = Field(..., description="'Normal', 'Watchlist', 'Warning', 'Critical', or 'Indeterminate'")
    composite_anomaly_score: float = Field(..., description="Calculated composite anomaly score (0.0 to 1.0)")
    
    # Official financials vs derived anomaly metrics
    official_financials: OfficialFinancials
    data_sufficiency: AnomalyDataSufficiency
    
    indicators: List[AnomalyIndicator] = Field(default_factory=list, description="Evaluated anomaly indicators across all 4 dimensions")
    monthly_anomalies: List[MonthlyAnomalyDetail] = Field(default_factory=list, description="Specific monthly anomalies identified in history")
    explanation: str = Field(..., description="Transparent narrative explaining all triggered anomalies")
    actionable_recommendations: List[str] = Field(default_factory=list, description="Audit and investigation recommendations")
    disclaimer: str = Field(
        default=(
            "Anomaly alerts are statistical and heuristic signals highlighting unusual reporting patterns. "
            "They do not constitute evidence or proof of financial mismanagement, fraud, or wrongdoing."
        )
    )
