"""Automated unit and integration tests for Executive Intelligence Report Generation."""
import pytest
from unittest.mock import patch
from fastapi.testclient import TestClient

from app.main import app
from app.services.report_service import report_service
from app.models.report import ProjectExecutiveReportResponse


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_report_complete_project_all_modules():
    """Verify generation of a full executive intelligence report with all analytical modules available."""
    # Project 400102 has rich financial, schedule, and trajectory data
    result = report_service.generate_report("400102")
    assert result is not None

    # Validate against Pydantic schema
    report = ProjectExecutiveReportResponse(**result)
    assert report.project_id == "400102"
    assert report.report_id.startswith("REP-400102-")
    assert report.system_version == "PAIMANA-AI-v1.0"

    # 1. Project Overview
    overview = report.project_overview
    assert overview.project_name == "Sri Ram Sagar Project Stage - II"
    assert overview.sector == "Water Resources"
    assert overview.agency is not None
    assert overview.original_cost_cr == 736.13
    assert overview.revised_cost_cr == 949.87
    assert overview.latest_reported_physical_progress_pct == 97.0
    assert overview.latest_reported_month == "2026-03"
    assert "Current" in overview.data_currency

    # 2. Progress Assessment
    prog = report.progress_assessment
    assert prog.status == "Available"
    assert prog.latest_reported_progress_pct == 97.0
    assert prog.forecast_horizon_months == 6
    assert len(prog.trajectory) == 6
    assert prog.forecasted_completion_doc is not None
    assert "not represent official government commitments" in prog.disclaimer.lower()

    # 3. Schedule Assessment
    sched = report.schedule_assessment
    assert sched.status == "Available"
    assert sched.risk_level in ("Critical", "High")
    assert sched.official_time_overrun_months == 72.0
    assert sched.original_doc is not None
    assert sched.revised_doc is not None
    assert len(sched.indicator_details) > 0

    # 4. Financial Assessment
    fin = report.financial_assessment
    assert fin.status == "Available"
    assert fin.cumulative_expenditure_cr == 971.47
    assert fin.financial_progress_pct > 100.0
    assert fin.anomaly_status in ("Warning", "Critical")
    assert "EXPENDITURE_BUDGET_BREACH" in fin.triggered_indicators
    assert len(fin.monthly_anomalies) > 0

    # 5. Executive Summary
    summary = report.executive_summary
    assert summary.overall_health == "Critical Concern"
    assert len(summary.key_findings) >= 3
    assert len(summary.primary_risks) >= 2
    assert len(summary.data_limitations) >= 1

    # 6. Recommended Actions
    actions = report.recommended_actions
    assert len(actions) >= 2
    priorities = [a.priority for a in actions]
    assert "CRITICAL" in priorities or "HIGH" in priorities
    for a in actions:
        assert a.action is not None
        assert a.rationale is not None
        assert "advisory" in a.advisory_notice.lower()


def test_report_missing_financial_information():
    """Verify graceful handling when baseline cost ceiling fields are missing in PAIMANA."""
    # Project 602797 is missing original_cost_cr and revised_cost_cr
    result = report_service.generate_report("602797")
    assert result is not None

    report = ProjectExecutiveReportResponse(**result)
    assert report.project_id == "602797"

    # Overview preserves None for missing costs rather than inventing 0.0
    assert report.project_overview.original_cost_cr is None
    assert report.project_overview.revised_cost_cr is None

    # Financial assessment status reflects missing data
    assert report.financial_assessment.status == "Missing Financial Data"
    assert report.financial_assessment.financial_progress_pct is None

    # Data limitations explicitly declare missing cost baseline
    limitation_text = " ".join(report.executive_summary.data_limitations).lower()
    assert "sanctioned budget baseline" in limitation_text or "cost" in limitation_text


def test_report_insufficient_history_for_forecasting():
    """Verify that projects with very few reports do not crash the forecasting or report pipeline."""
    # Project 400094 has only 1 monthly observation
    result = report_service.generate_report("400094")
    assert result is not None

    report = ProjectExecutiveReportResponse(**result)
    assert report.project_id == "400094"

    # Progress assessment records insufficient data sufficiency
    assert report.progress_assessment.data_sufficiency in ("insufficient", "limited")

    # Limitations mention limited observation depth
    limitation_text = " ".join(report.executive_summary.data_limitations).lower()
    assert "observation depth" in limitation_text or "limited" in limitation_text


def test_report_multiple_triggered_indicators():
    """Verify report synthesis on high-risk projects with multiple active delay and anomaly signals."""
    # Project 611752 has extreme financial progress vs physical progress asymmetry
    result = report_service.generate_report("611752")
    assert result is not None

    report = ProjectExecutiveReportResponse(**result)
    assert report.project_id == "611752"
    assert report.executive_summary.overall_health in ("Critical Concern", "High Risk")

    # Financial indicators contain budget exhaustion asymmetry
    assert "BUDGET_EXHAUSTION_ASYMMETRY" in report.financial_assessment.triggered_indicators

    # Recommended actions should contain CRITICAL financial milestone audit
    crit_actions = [a for a in report.recommended_actions if a.priority == "CRITICAL"]
    assert len(crit_actions) >= 1
    assert crit_actions[0].category == "FINANCIAL"


def test_report_unknown_project_id():
    """Verify that querying a nonexistent project returns None from the report service."""
    result = report_service.generate_report("NONEXISTENT_999999")
    assert result is None


def test_report_separation_of_official_and_model_values():
    """Verify strict isolation between official MoSPI figures and AI/heuristic predictions."""
    result = report_service.generate_report("400023")
    assert result is not None

    report = ProjectExecutiveReportResponse(**result)

    # Official figures reside in overview and official containers
    assert report.project_overview.source_attribution == "Official MoSPI Central Sector Flash Reports (July 2025 - March 2026)"
    assert report.schedule_assessment.official_time_overrun_months is not None

    # Model predictions carry explicit disclaimers
    assert "not represent official government commitments" in report.progress_assessment.disclaimer.lower()
    assert "distinct from official mospi delay classifications" in report.schedule_assessment.disclaimer.lower()
    assert "do not assert fraud" in report.financial_assessment.disclaimer.lower()
    assert "statistical heuristics" in report.general_disclaimer.lower()


def test_report_consistent_reporting_dates():
    """Verify consistent reporting month propagation and data currency evaluation."""
    result = report_service.generate_report("400023")
    assert result is not None

    report = ProjectExecutiveReportResponse(**result)
    assert report.project_overview.latest_reported_month == "2026-03"
    assert "March 2026" in report.project_overview.data_currency


def test_report_advisory_neutral_language():
    """Verify that report text uses objective audit terminology without accusations."""
    result = report_service.generate_report("400102")
    assert result is not None

    report = ProjectExecutiveReportResponse(**result)
    full_text = (
        report.executive_summary.summary_text
        + " "
        + " ".join(report.executive_summary.key_findings)
        + " "
        + " ".join(report.executive_summary.primary_risks)
        + " "
        + " ".join(a.action + " " + a.rationale for a in report.recommended_actions)
    ).lower()

    # Disallowed accusatory terms
    assert "fraud" not in full_text
    assert "corrupt" not in full_text
    assert "embezzl" not in full_text
    assert "guilty" not in full_text


def test_report_graceful_module_failure_handling():
    """Verify that if one underlying analytical module fails, the report service gracefully degrades without crashing."""
    # Simulate an unexpected exception in forecast_service
    with patch("app.services.report_service.forecast_service.get_project_forecast", side_effect=RuntimeError("Forecast engine failure")):
        result = report_service.generate_report("400023")
        assert result is not None
        report = ProjectExecutiveReportResponse(**result)
        assert report.progress_assessment.status == "Unavailable"
        assert "unavailable" in report.progress_assessment.assessment_notes.lower()
        # Schedule and financial sections still succeed
        assert report.schedule_assessment.status == "Available"
        assert report.financial_assessment.status == "Available"


def test_report_api_endpoint_success(client):
    """Verify GET /ai/report/{project_id} returns 200 with complete report schema."""
    response = client.get("/ai/report/400023")
    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == "400023"
    assert "report_id" in data
    assert "project_overview" in data
    assert "progress_assessment" in data
    assert "schedule_assessment" in data
    assert "financial_assessment" in data
    assert "executive_summary" in data
    assert "recommended_actions" in data
    assert len(data["recommended_actions"]) > 0


def test_report_api_endpoint_not_found(client):
    """Verify GET /ai/report/{project_id} returns 404 for an unknown project ID."""
    response = client.get("/ai/report/NONEXISTENT_999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
