"""Pydantic models for PAIMANA infrastructure projects."""
from typing import Optional, List
from pydantic import BaseModel, ConfigDict, Field


class ProjectObservation(BaseModel):
    """Single monthly observation of a project from MoSPI Flash Reports."""
    model_config = ConfigDict(from_attributes=True)

    project_id: str = Field(..., description="Unique PAIMANA project identifier")
    project_name: Optional[str] = Field(None, description="Project name / description")
    agency: Optional[str] = Field(None, description="Implementing agency")
    ministry: Optional[str] = Field(None, description="Administrative Ministry / Department")
    sector: Optional[str] = Field(None, description="Infrastructure sector")
    state: Optional[str] = Field(None, description="State / Multi-State location")
    district: Optional[str] = Field(None, description="District location")
    legacy_ocms_code: Optional[str] = Field(None, description="Legacy OCMS tracking code")
    approval_date: Optional[str] = Field(None, description="Government approval date (YYYY-MM)")
    start_date: Optional[str] = Field(None, description="Work commencement date (YYYY-MM)")
    original_doc: Optional[str] = Field(None, description="Original Date of Commissioning (YYYY-MM)")
    revised_doc: Optional[str] = Field(None, description="Anticipated / Revised Date of Commissioning (YYYY-MM)")
    original_cost_cr: Optional[float] = Field(None, description="Sanctioned original cost in ₹ Crore")
    revised_cost_cr: Optional[float] = Field(None, description="Anticipated / Revised cost in ₹ Crore")
    cumulative_expenditure_cr: Optional[float] = Field(None, description="Cumulative expenditure reported in ₹ Crore")
    physical_progress_pct: Optional[float] = Field(None, description="Reported physical progress percentage (0-100)")
    report_month: Optional[str] = Field(None, description="Reporting month label (e.g., 'March 2026')")
    report_month_key: Optional[str] = Field(None, description="Reporting month sorting key (YYYY-MM)")
    source_file: Optional[str] = Field(None, description="Source MoSPI Flash Report PDF")
    serial_no: Optional[float] = Field(None, description="Report table item serial number")


class ProjectSummary(BaseModel):
    """Summary view of a unique infrastructure project."""
    model_config = ConfigDict(from_attributes=True)

    project_id: str
    project_name: Optional[str] = None
    agency: Optional[str] = None
    ministry: Optional[str] = None
    sector: Optional[str] = None
    state: Optional[str] = None
    district: Optional[str] = None
    legacy_ocms_code: Optional[str] = None
    approval_date: Optional[str] = None
    start_date: Optional[str] = None
    original_doc: Optional[str] = None
    revised_doc: Optional[str] = None
    original_cost_cr: Optional[float] = None
    revised_cost_cr: Optional[float] = None
    cumulative_expenditure_cr: Optional[float] = None
    physical_progress_pct: Optional[float] = None
    cost_overrun_cr: Optional[float] = None
    cost_overrun_pct: Optional[float] = None
    time_overrun_months: Optional[float] = None
    derived_status: Optional[str] = None
    months_reported_count: Optional[int] = None
    latest_reported_month: Optional[str] = None


class ProjectDetail(ProjectSummary):
    """Detailed view of an infrastructure project including history."""
    first_reported_month: Optional[str] = None
    reported_months_list: Optional[str] = None
    initial_cost_cr: Optional[float] = None
    initial_expenditure_cr: Optional[float] = None
    initial_progress_pct: Optional[float] = None
    progress_delta_pct: Optional[float] = None
    history: List[ProjectObservation] = Field(default_factory=list, description="Historical monthly report snapshots")


class ProjectListResponse(BaseModel):
    """Paginated response for project queries."""
    total: int = Field(..., description="Total count matching filter criteria")
    page: int = Field(..., description="Current page index (1-based)")
    page_size: int = Field(..., description="Items per page")
    total_pages: int = Field(..., description="Total available pages")
    items: List[ProjectSummary] = Field(..., description="List of project summaries")
