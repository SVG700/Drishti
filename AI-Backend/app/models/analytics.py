"""Pydantic models for analytics and portfolio-level reporting."""
from typing import Dict, List, Any
from pydantic import BaseModel, Field


class TopProjectMetric(BaseModel):
    """Highlight of a project with notable variance."""
    project_id: str
    project_name: str
    sector: str
    metric_name: str
    metric_value: float
    unit: str


class AnalyticsSummaryResponse(BaseModel):
    """Aggregate portfolio statistics computed from official PAIMANA datasets."""
    total_projects: int = Field(..., description="Total unique projects in repository")
    total_observations: int = Field(..., description="Total monthly observation records")
    data_coverage_period: str = Field(..., description="Earliest to latest report month available")
    cumulative_original_cost_cr: float = Field(..., description="Total sanctioned original cost (₹ Cr)")
    cumulative_revised_cost_cr: float = Field(..., description="Total anticipated / revised cost (₹ Cr)")
    cumulative_expenditure_cr: float = Field(..., description="Total expenditure incurred to date (₹ Cr)")
    total_cost_overrun_cr: float = Field(..., description="Net cost overrun across all projects (₹ Cr)")
    projects_with_cost_overrun_count: int = Field(..., description="Count of projects experiencing cost overrun")
    projects_with_time_overrun_count: int = Field(..., description="Count of projects experiencing schedule delay")
    status_distribution: Dict[str, int] = Field(..., description="Breakdown of projects by derived status")
    sector_distribution: Dict[str, int] = Field(..., description="Breakdown of projects by infrastructure sector")
    top_cost_overrun_projects: List[TopProjectMetric] = Field(..., description="Projects with highest cost overrun")
    top_delayed_projects: List[TopProjectMetric] = Field(..., description="Projects with highest schedule delay")
