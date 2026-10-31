"""Automated unit and integration tests for Progress and Expenditure Anomaly Detection."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.data_loader import data_loader
from app.services.anomaly_service import anomaly_service


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_anomaly_normal_project():
    """Verify that a project with normal progress, expenditure, and budget is classified as Normal."""
    # Project 400023 has 8 monthly observations, modest spend, steady progress, no breaches
    result = anomaly_service.evaluate_anomalies("400023")
    assert result is not None
    assert result["project_id"] == "400023"
    assert result["anomaly_status"] == "Normal"
    assert result["composite_anomaly_score"] == 0.0
    assert result["data_sufficiency"]["sufficiency"] == "sufficient"
    assert result["data_sufficiency"]["statistical_outliers_applicable"] is True
    assert len(result["monthly_anomalies"]) == 0

    # Ensure none of the 5 indicators are triggered
    for ind in result["indicators"]:
        assert ind["triggered"] is False


def test_anomaly_expenditure_surge_without_progress():
    """Verify detection of unusual expenditure surge without commensurate physical progress."""
    # Project 400012 experienced a major expenditure spike in 2025-08 with 0.0% progress increment
    result = anomaly_service.evaluate_anomalies("400012")
    assert result is not None
    assert result["project_id"] == "400012"
    assert result["anomaly_status"] in ("Warning", "Critical")

    exp_ind = next(i for i in result["indicators"] if i["indicator_code"] == "EXPENDITURE_SURGE_NO_PROGRESS")
    assert exp_ind["triggered"] is True
    assert exp_ind["severity"] in ("CRITICAL", "HIGH", "MEDIUM")

    # Confirm monthly anomalies record the decoupling event
    surge_events = [m for m in result["monthly_anomalies"] if m["anomaly_type"] == "EXPENDITURE_SURGE_WITHOUT_PROGRESS"]
    assert len(surge_events) >= 1
    assert surge_events[0]["expenditure_delta_cr"] > 0


def test_anomaly_progress_surge_without_expenditure():
    """Verify detection of sudden reported progress advance without recorded expenditure."""
    # Project 400382 jumped by +88% progress in 2025-11 with 0 expenditure delta
    result = anomaly_service.evaluate_anomalies("400382")
    assert result is not None
    assert result["project_id"] == "400382"
    assert result["anomaly_status"] in ("Watchlist", "Warning", "Critical")

    prog_ind = next(i for i in result["indicators"] if i["indicator_code"] == "PROGRESS_SURGE_NO_EXPENDITURE")
    assert prog_ind["triggered"] is True

    surge_events = [m for m in result["monthly_anomalies"] if m["anomaly_type"] == "PROGRESS_SURGE_WITHOUT_EXPENDITURE"]
    assert len(surge_events) >= 1
    assert surge_events[0]["progress_delta_pct"] >= 15.0


def test_anomaly_budget_exhaustion_ahead_of_physical():
    """Verify detection of extreme asymmetry where financial progress outpaces physical progress."""
    # Project 611752 has financial progress > 90% while physical progress is ~3%
    result = anomaly_service.evaluate_anomalies("611752")
    assert result is not None
    assert result["project_id"] == "611752"
    assert result["anomaly_status"] in ("Critical", "Warning")

    budget_ind = next(i for i in result["indicators"] if i["indicator_code"] == "BUDGET_EXHAUSTION_ASYMMETRY")
    assert budget_ind["triggered"] is True
    assert budget_ind["severity"] == "CRITICAL"
    assert result["official_financials"]["financial_progress_pct"] > 70.0
    assert result["official_financials"]["physical_progress_pct"] < 35.0


def test_anomaly_expenditure_exceeds_revised_cost():
    """Verify detection of cumulative expenditure exceeding revised sanctioned cost ceiling."""
    # Project 400102 has spent ₹971.47 Cr vs revised cost ₹949.87 Cr
    result = anomaly_service.evaluate_anomalies("400102")
    assert result is not None
    assert result["project_id"] == "400102"

    breach_ind = next(i for i in result["indicators"] if i["indicator_code"] == "EXPENDITURE_BUDGET_BREACH")
    assert breach_ind["triggered"] is True
    assert breach_ind["severity"] in ("CRITICAL", "HIGH")
    assert result["official_financials"]["cumulative_expenditure_cr"] > result["official_financials"]["revised_cost_cr"]


def test_anomaly_missing_data_graceful_handling():
    """Verify that projects with missing budget or progress fields are handled safely without fake data."""
    # Project 602797 is missing original and revised cost
    result = anomaly_service.evaluate_anomalies("602797")
    assert result is not None
    assert result["project_id"] == "602797"
    assert result["data_sufficiency"]["sufficiency"] == "insufficient"
    assert "original_cost_cr" in result["data_sufficiency"]["missing_fields"]
    assert "revised_cost_cr" in result["data_sufficiency"]["missing_fields"]
    assert result["official_financials"]["financial_progress_pct"] is None


def test_anomaly_insufficient_history_statistical_outliers():
    """Verify that statistical outlier detection is disabled for projects with < 5 observations."""
    # Project 400094 has only 1 monthly observation
    result = anomaly_service.evaluate_anomalies("400094")
    assert result is not None
    assert result["project_id"] == "400094"
    assert result["data_sufficiency"]["observations_analyzed"] < 5
    assert result["data_sufficiency"]["statistical_outliers_applicable"] is False

    outlier_ind = next(i for i in result["indicators"] if i["indicator_code"] == "HISTORICAL_STATISTICAL_OUTLIER")
    assert outlier_ind["triggered"] is False
    assert "skipped" in outlier_ind["description"].lower() or "requires >= 5" in outlier_ind["description"].lower()


def test_anomaly_nonexistent_project():
    """Verify that querying a nonexistent project returns None from the service."""
    result = anomaly_service.evaluate_anomalies("NONEXISTENT_999999")
    assert result is None


def test_anomaly_api_endpoint_success(client):
    """Verify GET /ai/anomalies/{project_id} returns 200 with valid schema."""
    response = client.get("/ai/anomalies/400023")
    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == "400023"
    assert data["anomaly_status"] == "Normal"
    assert "composite_anomaly_score" in data
    assert "official_financials" in data
    assert "indicators" in data
    assert len(data["indicators"]) == 5
    assert "explanation" in data
    assert "actionable_recommendations" in data


def test_anomaly_api_endpoint_not_found(client):
    """Verify GET /ai/anomalies/{project_id} returns 404 for nonexistent project."""
    response = client.get("/ai/anomalies/NONEXISTENT_999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_anomaly_disclaimer_neutral_language():
    """Verify that outputs adhere strictly to neutral statistical audit language without accusations."""
    result = anomaly_service.evaluate_anomalies("611752")
    assert result is not None
    full_text = (
        result["explanation"]
        + " "
        + " ".join(result["actionable_recommendations"])
        + " "
        + " ".join(i["description"] for i in result["indicators"])
    ).lower()

    # Disallowed accusatory words
    assert "fraud" not in full_text
    assert "corrupt" not in full_text
    assert "embezzl" not in full_text
    assert "guilty" not in full_text
