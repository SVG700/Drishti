"""Project query endpoints for PAIMANA infrastructure projects."""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status
from ..models.project import ProjectListResponse, ProjectDetail
from ..services.data_loader import data_loader

router = APIRouter(prefix="/projects", tags=["Projects"])


@router.get("", response_model=ProjectListResponse, summary="Query and filter infrastructure projects")
def list_projects(
    page: int = Query(1, ge=1, description="Page number (1-based)"),
    page_size: int = Query(50, ge=1, le=500, description="Items per page"),
    sector: Optional[str] = Query(None, description="Filter by sector (e.g., Railways, Road Transport, Power)"),
    state: Optional[str] = Query(None, description="Filter by state (e.g., Maharashtra, Karnataka, Gujarat)"),
    status_filter: Optional[str] = Query(None, alias="status", description="Filter by status (Delayed, In Progress, Commissioned)"),
    search: Optional[str] = Query(None, description="Search query across project name, ID, or agency"),
) -> ProjectListResponse:
    """Returns paginated infrastructure projects with optional filtering and search."""
    if not data_loader.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PAIMANA dataset is currently not loaded or unavailable.",
        )

    results = data_loader.get_projects(
        page=page,
        page_size=page_size,
        sector=sector,
        state=state,
        status=status_filter,
        search=search,
    )
    return ProjectListResponse(**results)


@router.get("/{project_id}", response_model=ProjectDetail, summary="Get project details and historical trajectory")
def get_project_detail(project_id: str) -> ProjectDetail:
    """Returns comprehensive project details along with historical monthly observations."""
    if not data_loader.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="PAIMANA dataset is currently not loaded or unavailable.",
        )

    project_data = data_loader.get_project_by_id(project_id)
    if not project_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' not found in PAIMANA repository.",
        )

    return ProjectDetail(**project_data)
