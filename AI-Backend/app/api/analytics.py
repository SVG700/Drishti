"""Analytics and portfolio summary endpoints."""
from typing import Dict, Any
from fastapi import APIRouter, HTTPException, status
from ..models.analytics import AnalyticsSummaryResponse
from ..services.data_loader import data_loader
from ..services.analytics_service import analytics_service

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/summary", response_model=AnalyticsSummaryResponse, summary="Get portfolio-wide statistical summary")
def get_analytics_summary() -> AnalyticsSummaryResponse:
    """Returns official portfolio totals, sector distributions, status breakdowns, and major variance projects."""
    if not data_loader.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PAIMANA dataset is currently not loaded or unavailable.",
        )

    summary_data = analytics_service.get_summary()
    return AnalyticsSummaryResponse(**summary_data)


@router.get("/data-quality", summary="Inspect PAIMANA data extraction quality report")
def get_data_quality() -> Dict[str, Any]:
    """Returns data quality audit summary, checking schema adherence, missing fields, and duplication."""
    if not data_loader.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PAIMANA dataset is currently not loaded or unavailable.",
        )

    return data_loader.quality_summary
