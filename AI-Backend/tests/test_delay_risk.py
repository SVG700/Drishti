"""Automated unit and integration tests for Project Delay Risk Detection."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.data_loader import data_loader
from app.services.delay_risk_service import delay_risk_service


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_delay_risk_normal_project():
    # Project 400022 has 0 official overrun, plenty of time before DOC (2030-07), and low risk score
    result = delay_risk_service.evaluate_delay_risk("400022")
    assert result is not None
    assert result["project_id"] == "400022"
    assert result["risk_level"] == "Low"
    assert result["risk_score"] < 0.20
    assert result["official_schedule"]["official_derived_status"] == "In Progress"

    # Verify single-month plateau is NOT flagged as a delay
    stagnation_ind = next(i for i in result["risk_indicators"] if i["indicator_code"] == "PROGRESS_STAGNATION")
    assert stagnation_ind["triggered"] is False
    assert "not flagged as a delay" in stagnation_ind["description"].lower()


def test_delay_risk_delayed_project():
    # Project 400010 has 58 months of official time overrun reported
    result = delay_risk_service.evaluate_delay_risk("400010")
    assert result is not None
    assert result["project_id"] == "400010"
    assert result["risk_level"] in ("Critical", "High")
    assert result["risk_score"] >= 0.40
    assert result["official_schedule"]["official_time_overrun_months"] is not None
    assert float(result["official_schedule"]["official_time_overrun_months"]) > 0

    overrun_ind = next(i for i in result["risk_indicators"] if i["indicator_code"] == "OFFICIAL_TIME_OVERRUN")
    assert overrun_ind["triggered"] is True
    assert overrun_ind["severity"] in ("CRITICAL", "HIGH")
    assert len(result["actionable_recommendations"]) > 0


def test_delay_risk_completed_project():
    # Project 400065 is 100% complete and status is Completed
    result = delay_risk_service.evaluate_delay_risk("400065")
    assert result is not None
    assert result["project_id"] == "400065"
    assert result["risk_level"] == "Low"
    assert result["risk_score"] == 0.0
    assert "complete" in result["explanation"].lower()

    # Active delay indicators should not trigger for finished projects
    overrun_ind = next(i for i in result["risk_indicators"] if i["indicator_code"] == "OFFICIAL_TIME_OVERRUN")
    assert overrun_ind["triggered"] is False
    stagnation_ind = next(i for i in result["risk_indicators"] if i["indicator_code"] == "PROGRESS_STAGNATION")
    assert stagnation_ind["triggered"] is False


def test_delay_risk_missing_dates():
    # Project 400018 is missing revised_doc in official reports
    result = delay_risk_service.evaluate_delay_risk("400018")
    assert result is not None
    assert result["project_id"] == "400018"
    assert result["official_schedule"]["revised_doc"] is None

    missing_ind = next(i for i in result["risk_indicators"] if i["indicator_code"] == "MISSING_MILESTONE_DATES")
    assert missing_ind["triggered"] is True
    assert "Revised DOC" in missing_ind["observed_value"]


def test_delay_risk_insufficient_history():
    # Project 400094 has only 1 monthly observation
    result = delay_risk_service.evaluate_delay_risk("400094")
    assert result is not None
    assert result["project_id"] == "400094"
    assert result["model_inferred"]["data_sufficiency"] == "insufficient"
    assert result["model_inferred"]["observations_analyzed"] == 1
    assert "insufficient" in result["explanation"].lower()


def test_delay_risk_nonexistent_project():
    result = delay_risk_service.evaluate_delay_risk("NONEXISTENT_999999")
    assert result is None


def test_delay_risk_api_endpoint_success(client):
    response = client.get("/ai/delay-risk/400010")
    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == "400010"
    assert "official_schedule" in data
    assert "model_inferred" in data
    assert "risk_indicators" in data
    assert "explanation" in data
    assert "actionable_recommendations" in data
    assert "disclaimer" in data
    assert len(data["risk_indicators"]) >= 5


def test_delay_risk_api_not_found(client):
    response = client.get("/ai/delay-risk/INVALID_ID_12345")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()
