"""Tests for /health endpoint."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_health_check(client):
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert "service" in data
    assert "version" in data
    assert "dataset" in data
    assert data["dataset"]["loaded"] is True
    assert data["dataset"]["total_projects"] == 2100
    assert data["dataset"]["total_observations"] == 11011
    assert data["dataset"]["validation_passed"] is True


def test_root_endpoint(client):
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "endpoints" in data
    assert data["endpoints"]["health"] == "/health"
