"""Pydantic schemas for Executive Intelligence Project Reports."""
from typing import List, Optional, Any, Dict
from pydantic import BaseModel, Field


class ReportProjectOverview(BaseModel):
    """General identity and high-level official parameters of the project."""
    project_id: str
    project_name: Optional[str] = None
    sector: Optional[str] = None
    agency: Optional[str] = None
    ministry: Optional[str] = None
    state: Optional[str] = None
    original_cost_cr: Optional[float] = Field(None, description="Original sanctioned cost in ₹ Crore")
    revised_cost_cr: Optional[float] = Field(None, description="Revised sanctioned cost in ₹ Crore")
    official_cost_overrun_cr: Optional[float] = Field(None, description="Reported MoSPI cost overrun in ₹ Crore")
    official_cost_overrun_pct: Optional[float] = Field(None, description="Reported MoSPI cost overrun in %")
    latest_reported_physical_progress_pct: Optional[float] = Field(None, description="Physical progress percentage")
    latest_reported_month: Optional[str] = Field(None, description="Latest available reporting month (YYYY-MM)")
    data_currency: str = Field(..., description="Timeliness of reporting data relative to latest portfolio snapshot")
    source_attribution: str = Field(
        default="Official MoSPI Central Sector Flash Reports (July 2025 - March 2026)"
    )


class ReportTrajectoryPoint(BaseModel):
    """Projected milestone progress point."""
    horizon_step: int = Field(..., description="Forecast horizon step in months ahead (1, 2, ...)")
    month_key: str = Field(..., description="Target forecast month key (YYYY-MM)")
    month_label: str = Field(..., description="Human-readable month label (e.g. 'April 2026')")
    predicted_progress_pct: float
    lower_bound_80_pct: float
    upper_bound_80_pct: float


class ReportProgressAssessment(BaseModel):
    """Progress forecasting assessment and trajectory projections."""
    status: str = Field(..., description="'Available', 'Limited Data', 'Insufficient Data', or 'Unavailable'")
    latest_reported_progress_pct: Optional[float] = None
    data_sufficiency: Optional[str] = None
    estimated_monthly_velocity_pct: Optional[float] = None
    forecast_horizon_months: Optional[int] = None
    forecasted_completion_doc: Optional[str] = None
    projected_slippage_months: Optional[float] = None
    trajectory: List[ReportTrajectoryPoint] = Field(default_factory=list)
    assessment_notes: str
    disclaimer: str = Field(
        default="Progress forecasts are model-generated projections based on historical run-rates; they do not represent official government commitments or targets."
    )


class ReportScheduleIndicator(BaseModel):
    """Schedule risk indicator item."""
    indicator_code: str
    name: str
    severity: str
    triggered: bool
    observed_value: Any
    threshold: Any
    description: str


class ReportScheduleAssessment(BaseModel):
    """Official milestone dates and schedule delay risk evaluation."""
    status: str = Field(..., description="'Available', 'Incomplete Dates', or 'Unavailable'")
    risk_level: Optional[str] = None
    risk_score: Optional[float] = None
    official_derived_status: Optional[str] = None
    official_time_overrun_months: Optional[float] = None
    original_doc: Optional[str] = None
    revised_doc: Optional[str] = None
    start_date: Optional[str] = None
    approval_date: Optional[str] = None
    missing_milestones: List[str] = Field(default_factory=list)
    triggered_indicators: List[str] = Field(default_factory=list)
    indicator_details: List[ReportScheduleIndicator] = Field(default_factory=list)
    assessment_notes: str
    disclaimer: str = Field(
        default="Delay risk levels and inferred slippage reflect analytical run-rate modeling and are distinct from official MoSPI delay classifications."
    )


class ReportAnomalyIndicator(BaseModel):
    """Financial and progress anomaly indicator item."""
    indicator_code: str
    name: str
    dimension: str
    severity: str
    triggered: bool
    observed_value: Any
    threshold: Any
    description: str


class ReportMonthlyAnomaly(BaseModel):
    """Specific monthly interval where an anomaly was recorded."""
    month_key: str
    anomaly_type: str
    severity: str
    expenditure_delta_cr: Optional[float] = None
    progress_delta_pct: Optional[float] = None
    elapsed_months: int = 1
    description: str


class ReportFinancialAssessment(BaseModel):
    """Financial drawdown, budget exhaustion, and expenditure anomaly assessment."""
    status: str = Field(..., description="'Available', 'Missing Financial Data', or 'Unavailable'")
    cumulative_expenditure_cr: Optional[float] = None
    revised_cost_cr: Optional[float] = None
    financial_progress_pct: Optional[float] = None
    anomaly_status: Optional[str] = None
    composite_anomaly_score: Optional[float] = None
    triggered_indicators: List[str] = Field(default_factory=list)
    indicator_details: List[ReportAnomalyIndicator] = Field(default_factory=list)
    monthly_anomalies: List[ReportMonthlyAnomaly] = Field(default_factory=list)
    assessment_notes: str
    disclaimer: str = Field(
        default="Anomaly alerts identify statistical decoupling for audit verification; they do not assert fraud, corruption, or contractual wrongdoing."
    )


class ReportFollowUpAction(BaseModel):
    """Structured follow-up action with priority, category, and objective rationale."""
    priority: str = Field(..., description="'CRITICAL', 'HIGH', 'MEDIUM', or 'ROUTINE'")
    category: str = Field(..., description="'SCHEDULE', 'FINANCIAL', 'MILESTONE_AUDIT', or 'DATA_QUALITY'")
    action: str = Field(..., description="Actionable recommendation description")
    rationale: str = Field(..., description="Underlying trigger or indicator driving this action")
    advisory_notice: str = Field(
        default="Automated advisory recommendation for project management consideration; not an official administrative directive."
    )


class ExecutiveSummary(BaseModel):
    """High-level synthesis of project health, key findings, and data limitations."""
    overall_health: str = Field(
        ...,
        description="'Good', 'Satisfactory', 'Watchlist', 'High Risk', 'Critical Concern', or 'Indeterminate'",
    )
    summary_text: str
    key_findings: List[str] = Field(default_factory=list)
    primary_risks: List[str] = Field(default_factory=list)
    data_limitations: List[str] = Field(default_factory=list)


class ProjectExecutiveReportResponse(BaseModel):
    """Unified executive project intelligence report combining all analytical modules."""
    report_id: str
    project_id: str
    generated_at: str
    system_version: str = Field(default="PAIMANA-AI-v1.0")
    project_overview: ReportProjectOverview
    progress_assessment: ReportProgressAssessment
    schedule_assessment: ReportScheduleAssessment
    financial_assessment: ReportFinancialAssessment
    executive_summary: ExecutiveSummary
    recommended_actions: List[ReportFollowUpAction] = Field(default_factory=list)
    general_disclaimer: str = Field(
        default="This automated executive intelligence report is generated for senior infrastructure monitoring and decision support. Official figures originate directly from MoSPI Flash Reports. All forecasts, risk scores, and anomaly alerts are statistical heuristics and must be cross-referenced with official project documentation."
    )
