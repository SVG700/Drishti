"""Pydantic schemas for Project Progress Forecasting."""
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class MonthlyForecastPoint(BaseModel):
    """Forecast prediction for a single future month."""
    horizon_step: int = Field(..., description="Steps ahead from latest reported month (1, 2, ...)")
    month_key: str = Field(..., description="Projected month key in YYYY-MM format")
    month_label: str = Field(..., description="Readable projected month (e.g., 'April 2026')")
    predicted_progress_pct: float = Field(..., description="Projected physical progress percentage (0.0 - 100.0%)")
    lower_bound_80_pct: float = Field(..., description="Lower 80% prediction interval bound")
    upper_bound_80_pct: float = Field(..., description="Upper 80% prediction interval bound")
    baseline_persistence_pct: float = Field(..., description="Naive baseline prediction (last observed value)")


class ForecastModelMetadata(BaseModel):
    """Metadata regarding model type, calibration, and benchmark performance."""
    model_name: str = Field(..., description="Primary forecasting algorithm")
    baseline_comparison: str = Field(..., description="Baseline model evaluated against")
    sample_observations_used: int = Field(..., description="Number of historical monthly points used")
    estimated_monthly_velocity_pct: float = Field(..., description="Estimated physical progress speed (%/month)")
    sector_prior_velocity_pct: float = Field(..., description="Sector prior velocity used for Bayesian shrinkage")
    evaluation_benchmark: Dict[str, Any] = Field(..., description="Chronological test benchmark (MAE/RMSE) on MoSPI dataset")


class ProjectForecastResponse(BaseModel):
    """Comprehensive forecast response for an individual infrastructure project."""
    project_id: str
    project_name: Optional[str] = None
    sector: Optional[str] = None
    agency: Optional[str] = None
    derived_status: Optional[str] = None
    data_sufficiency: str = Field(..., description="'sufficient' (>=4 obs), 'limited' (2-3 obs), or 'insufficient' (<2 obs)")
    
    # Official MoSPI figures (clearly separated)
    latest_reported_month: Optional[str] = Field(None, description="Official latest reporting month")
    latest_reported_progress_pct: Optional[float] = Field(None, description="Official latest physical progress percentage")
    official_original_doc: Optional[str] = Field(None, description="Official original Date of Commissioning (YYYY-MM)")
    official_revised_doc: Optional[str] = Field(None, description="Official anticipated / revised Date of Commissioning (YYYY-MM)")
    
    # Model predictions
    forecasted_completion_doc: Optional[str] = Field(None, description="Model projected month of 100% completion (YYYY-MM or 'Stalled')")
    projected_slippage_months: Optional[float] = Field(None, description="Difference between model forecasted DOC and official revised DOC")
    trajectory: List[MonthlyForecastPoint] = Field(default_factory=list, description="Step-by-step future month forecasts")
    
    model_metadata: ForecastModelMetadata
    limitations_and_disclaimers: List[str] = Field(default_factory=list, description="Explicit statement of model limitations")
