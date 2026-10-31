"""Health and system status check endpoint."""
from datetime import datetime, timezone
from typing import Dict, Any
from fastapi import APIRouter
from ..services.data_loader import data_loader

router = APIRouter(tags=["Health"])


@router.get("/health", summary="Service health and dataset status")
def get_health() -> Dict[str, Any]:
    """Returns the operational status of the AI backend and dataset readiness."""
    return {
        "status": "healthy",
        "service": "DRISHTI • MoSPI PAIMANA AI Backend",
        "product": "DRISHTI (दृष्टि)",
        "tagline": "AI-Powered Infrastructure Intelligence",
        "project": "MoSPI PAIMANA — SIH26103",
        "team": "KAALNETRA",
        "version": "1.0.0",
        "environment": "development",
        "timestamp_utc": datetime.now(timezone.utc).isoformat(),
        "dataset": {
            "loaded": data_loader.is_loaded,
            "total_projects": len(data_loader.projects_df) if data_loader.projects_df is not None else 0,
            "total_observations": len(data_loader.history_df) if data_loader.history_df is not None else 0,
            "validation_passed": data_loader.quality_summary.get("dataset_valid", False),
            "coverage_period": f"{data_loader.quality_summary.get('coverage_start', 'N/A')} to {data_loader.quality_summary.get('coverage_end', 'N/A')}",
        },
    }
