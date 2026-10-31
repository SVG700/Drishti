"""Pydantic schemas for Project Delay Risk Detection."""
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class OfficialScheduleInfo(BaseModel):
    """Official dates and metrics extracted directly from MoSPI Flash Reports."""
    approval_date: Optional[str] = Field(None, description="Government sanction date (YYYY-MM)")
    start_date: Optional[str] = Field(None, description="Work commencement date (YYYY-MM)")
    original_doc: Optional[str] = Field(None, description="Original Date of Commissioning (YYYY-MM)")
    revised_doc: Optional[str] = Field(None, description="Anticipated / Revised Date of Commissioning (YYYY-MM)")
    official_time_overrun_months: Optional[float] = Field(None, description="Official MoSPI reported schedule overrun in months")
    official_derived_status: Optional[str] = Field(None, description="Official status (e.g. Delayed, In Progress)")
    latest_reported_progress_pct: Optional[float] = Field(None, description="Latest physical progress (0-100%)")
    latest_reported_month: Optional[str] = Field(None, description="Latest MoSPI report month key (YYYY-MM)")


class ModelInferredScheduleInfo(BaseModel):
    """Statistically derived delay indicators from historical observations and forecasting."""
    data_sufficiency: str = Field(..., description="'sufficient' (>=4 obs), 'limited' (2-3 obs), or 'insufficient' (<2 obs)")
    observations_analyzed: int = Field(..., description="Number of monthly reports analyzed")
    trailing_stagnant_months: int = Field(..., description="Number of consecutive recent months with 0.0% progress change")
    is_prolonged_stagnation: bool = Field(..., description="True if trailing stagnant months >= 3 and project incomplete")
    estimated_monthly_velocity_pct: Optional[float] = Field(None, description="Recent physical progress run-rate (%/month)")
    model_forecasted_doc: Optional[str] = Field(None, description="Model projected completion month (YYYY-MM)")
    inferred_slippage_months: Optional[float] = Field(None, description="Model forecast slippage beyond official revised DOC")


class RiskIndicator(BaseModel):
    """Detailed trigger evaluation for an individual delay risk factor."""
    indicator_code: str = Field(..., description="Machine-readable indicator code")
    name: str = Field(..., description="Human-readable indicator name")
    severity: str = Field(..., description="Severity level: INFO, LOW, MODERATE, HIGH, or CRITICAL")
    triggered: bool = Field(..., description="Whether this risk threshold was breached")
    description: str = Field(..., description="Explanation of why the indicator triggered or passed")
    observed_value: Any = Field(None, description="Measured value for this project")
    threshold: Any = Field(None, description="Threshold required to trigger this risk indicator")


class ProjectDelayRiskResponse(BaseModel):
    """Comprehensive delay risk assessment response for an infrastructure project."""
    project_id: str
    project_name: Optional[str] = None
    sector: Optional[str] = None
    agency: Optional[str] = None
    risk_level: str = Field(..., description="Overall risk category: 'Low', 'Moderate', 'High', 'Critical', or 'Indeterminate'")
    risk_score: float = Field(..., description="Composite risk score ranging from 0.0 (minimal risk) to 1.0 (extreme delay risk)")
    
    # Separation of Official vs Model-Inferred
    official_schedule: OfficialScheduleInfo = Field(..., description="Official government reported dates and status")
    model_inferred: ModelInferredScheduleInfo = Field(..., description="Statistically derived velocity, stagnation, and slippage")
    
    risk_indicators: List[RiskIndicator] = Field(default_factory=list, description="Detailed evaluation of all delay indicators")
    explanation: str = Field(..., description="Transparent natural language explanation of the assessed risk")
    actionable_recommendations: List[str] = Field(default_factory=list, description="Suggested administrative or monitoring steps")
    disclaimer: str = Field(
        default=(
            "Delay risk classifications and scores are produced by analytical heuristic models "
            "and do not represent official Ministry of Statistics & Programme Implementation (MoSPI) determinations."
        )
    )
