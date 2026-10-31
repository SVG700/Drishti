"""AI Capability Endpoints.

Modules:
1. /ai/forecast/{project_id} — [ACTIVE] Infrastructure project progress forecasting
2. /ai/delay-risk/{project_id} — [ACTIVE] Infrastructure project delay risk detection
3. /ai/anomalies/{project_id} — [ACTIVE] Progress and expenditure anomaly detection
4. /ai/assistant — [Planned Stage 5] AI-powered PAIMANA project assistant
5. /ai/report/{project_id} — [Planned Stage 5] AI-generated project reports
"""
from typing import Optional
from fastapi import APIRouter, HTTPException, Query, status

from ..models.forecast import ProjectForecastResponse
from ..models.delay_risk import ProjectDelayRiskResponse
from ..models.anomaly import ProjectAnomalyResponse
from ..models.report import ProjectExecutiveReportResponse
from ..models.assistant import (
    AIAssistantRequest,
    AIAssistantResponse,
    SessionResetRequest,
    SessionResetResponse,
)
from ..services.data_loader import data_loader
from ..services.forecast_service import forecast_service
from ..services.delay_risk_service import delay_risk_service
from ..services.anomaly_service import anomaly_service
from ..services.report_service import report_service
from ..services.assistant_service import assistant_service

router = APIRouter(prefix="/ai", tags=["AI Modules"])


@router.get(
    "/forecast/{project_id}",
    response_model=ProjectForecastResponse,
    summary="Forecast physical progress trajectory and estimated completion date",
)
def get_project_forecast(
    project_id: str,
    horizon: int = Query(6, ge=1, le=24, description="Forecast horizon in months ahead (1 to 24)"),
) -> ProjectForecastResponse:
    """Computes progress forecasts, prediction intervals, and estimated commissioning date for a project.

    Uses an Adaptive Run-Rate Velocity model with Empirical Bayesian sector shrinkage,
    benchmarked against a Naive Persistence baseline on chronological MoSPI holdout data.
    """
    if not data_loader.is_loaded:
        data_loader.load_and_validate()

    forecast_data = forecast_service.get_project_forecast(project_id, horizon_months=horizon)
    if not forecast_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found in the PAIMANA repository.",
        )

    return ProjectForecastResponse(**forecast_data)


@router.get(
    "/delay-risk/{project_id}",
    response_model=ProjectDelayRiskResponse,
    summary="Evaluate multidimensional delay risk and progress stagnation indicators",
)
def get_project_delay_risk(project_id: str) -> ProjectDelayRiskResponse:
    """Evaluates multidimensional delay risk combining official MoSPI schedules and model-inferred metrics.

    Distinguishes official reported overruns from run-rate slippage, flags prolonged
    stagnation, and provides transparent explanations and risk scores.
    """
    if not data_loader.is_loaded:
        data_loader.load_and_validate()

    result = delay_risk_service.evaluate_delay_risk(project_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found in the PAIMANA repository.",
        )

    return ProjectDelayRiskResponse(**result)


@router.get(
    "/anomalies/{project_id}",
    response_model=ProjectAnomalyResponse,
    summary="Detect expenditure-progress decoupling, budget exhaustion, and historical outliers",
)
def get_project_anomalies(project_id: str) -> ProjectAnomalyResponse:
    """Evaluates project physical progress and cumulative expenditure for statistical anomalies.

    Identifies expenditure-progress decoupling surges, budget exhaustion ahead of physical
    milestones, cash expenditure budget breaches, and historical run-rate outliers.
    """
    if not data_loader.is_loaded:
        data_loader.load_and_validate()

    result = anomaly_service.evaluate_anomalies(project_id)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found in the PAIMANA repository.",
        )

    return ProjectAnomalyResponse(**result)


@router.post(
    "/assistant",
    response_model=AIAssistantResponse,
    summary="Natural language project inquiry assistant grounded in PAIMANA data",
)
def ask_assistant(request: AIAssistantRequest) -> AIAssistantResponse:
    """Answers natural language inquiries regarding infrastructure projects.

    Grounds all factual and analytical statements in official MoSPI Flash Report records,
    progress forecasts, delay-risk analyses, and expenditure anomaly detection.
    Supports multi-turn conversational context management via optional session_id.
    """
    if not data_loader.is_loaded:
        data_loader.load_and_validate()

    response_dict = assistant_service.process_inquiry(
        query=request.query,
        project_id=request.project_id,
        include_analytical_context=request.include_analytical_context,
        session_id=request.session_id,
        reset_session=request.reset_session,
    )
    return AIAssistantResponse(**response_dict)


@router.post(
    "/assistant/reset",
    response_model=SessionResetResponse,
    summary="Reset conversational context and history for an active assistant session",
)
def reset_assistant_session(request: SessionResetRequest) -> SessionResetResponse:
    """Clears conversation context and history for the specified session_id while keeping the session allocated."""
    success = assistant_service.reset_session(request.session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid session identifier '{request.session_id}'.",
        )
    return SessionResetResponse(
        session_id=request.session_id,
        status="reset",
        message=f"Session '{request.session_id}' context and turn history have been cleared.",
    )


@router.delete(
    "/assistant/session/{session_id}",
    response_model=SessionResetResponse,
    summary="Delete an assistant session and all associated conversational state from memory",
)
def delete_assistant_session(session_id: str) -> SessionResetResponse:
    """Deletes the specified conversation session and frees associated memory resources."""
    success = assistant_service.delete_session(session_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Session with ID '{session_id}' was not found or already deleted.",
        )
    return SessionResetResponse(
        session_id=session_id,
        status="deleted",
        message=f"Session '{session_id}' has been deleted from memory.",
    )


@router.get(
    "/report/{project_id}",
    response_model=ProjectExecutiveReportResponse,
    summary="Generate comprehensive executive intelligence report for an infrastructure project",
)
def get_project_report(project_id: str) -> ProjectExecutiveReportResponse:
    """Generates an executive intelligence report synthesizing progress forecasting,

    schedule delay-risk analysis, and expenditure anomaly detection into a unified brief.
    """
    if not data_loader.is_loaded:
        data_loader.load_and_validate()

    report_data = report_service.generate_report(project_id)
    if not report_data:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Project with ID '{project_id}' was not found in the PAIMANA repository.",
        )

    return ProjectExecutiveReportResponse(**report_data)
