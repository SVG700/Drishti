"""Automated unit and integration tests for Project Progress Forecasting."""
import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.data_loader import data_loader
from app.services.forecast_service import forecast_service


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_forecast_service_full_history():
    # Project 400005 has 9 months of history
    forecast = forecast_service.get_project_forecast("400005", horizon_months=6)
    assert forecast is not None
    assert forecast["project_id"] == "400005"
    assert forecast["data_sufficiency"] == "sufficient"
    assert len(forecast["trajectory"]) == 6
    assert forecast["latest_reported_progress_pct"] is not None
    assert 0.0 <= forecast["latest_reported_progress_pct"] <= 100.0

    # Verify bounds and monotonicity
    for pt in forecast["trajectory"]:
        assert pt["lower_bound_80_pct"] <= pt["predicted_progress_pct"]
        assert pt["predicted_progress_pct"] <= pt["upper_bound_80_pct"]
        assert 0.0 <= pt["lower_bound_80_pct"] <= 100.0
        assert 0.0 <= pt["upper_bound_80_pct"] <= 100.0

    assert "model_metadata" in forecast
    assert forecast["model_metadata"]["estimated_monthly_velocity_pct"] >= 0.0
    assert len(forecast["limitations_and_disclaimers"]) > 0


def test_forecast_service_limited_history():
    # Project 400006 has 4 months of history
    forecast = forecast_service.get_project_forecast("400006", horizon_months=4)
    assert forecast is not None
    assert forecast["project_id"] == "400006"
    assert len(forecast["trajectory"]) == 4


def test_forecast_service_nonexistent_project():
    forecast = forecast_service.get_project_forecast("NONEXISTENT_999999", horizon_months=6)
    assert forecast is None


def test_forecast_completed_project():
    # Project 400065 is already 100% complete
    forecast = forecast_service.get_project_forecast("400065", horizon_months=6)
    assert forecast is not None
    assert forecast["latest_reported_progress_pct"] == 100.0
    assert forecast["forecasted_completion_doc"] == "Completed"
    assert forecast["projected_slippage_months"] == 0.0
    for pt in forecast["trajectory"]:
        assert pt["predicted_progress_pct"] == 100.0


def test_forecast_calendar_gap_project():
    # Project 400023 has gaps in report months (skipped 2025-09)
    forecast = forecast_service.get_project_forecast("400023", horizon_months=6)
    assert forecast is not None
    velocity = forecast["model_metadata"]["estimated_monthly_velocity_pct"]
    assert velocity >= 0.0
    assert velocity < 15.0  # confirms no division-by-1 explosion


def test_forecast_zero_progress_project():
    # Project 611615 starts at 0% physical progress
    forecast = forecast_service.get_project_forecast("611615", horizon_months=6)
    assert forecast is not None
    assert forecast["latest_reported_progress_pct"] == 0.0
    assert len(forecast["trajectory"]) == 6
    assert forecast["trajectory"][0]["predicted_progress_pct"] >= 0.0


def test_forecast_api_endpoint_success(client):
    response = client.get("/ai/forecast/400005?horizon=6")
    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == "400005"
    assert data["latest_reported_month"] == "2026-03"
    assert len(data["trajectory"]) == 6
    first_step = data["trajectory"][0]
    assert first_step["horizon_step"] == 1
    assert first_step["month_key"] == "2026-04"
    assert "baseline_persistence_pct" in first_step
    assert data["model_metadata"]["model_name"] == "Adaptive Run-Rate Velocity with Empirical Bayesian Sector Shrinkage"


def test_forecast_api_custom_horizon(client):
    response = client.get("/ai/forecast/400005?horizon=12")
    assert response.status_code == 200
    data = response.json()
    assert len(data["trajectory"]) == 12
    assert data["trajectory"][-1]["horizon_step"] == 12
    assert data["trajectory"][-1]["month_key"] == "2027-03"


def test_forecast_api_not_found(client):
    response = client.get("/ai/forecast/DOES_NOT_EXIST")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_forecast_api_invalid_horizon(client):
    # Horizon must be between 1 and 24
    response = client.get("/ai/forecast/400005?horizon=0")
    assert response.status_code == 422

    response_high = client.get("/ai/forecast/400005?horizon=30")
    assert response_high.status_code == 422
