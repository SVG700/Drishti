"""Tests for /projects and /analytics endpoints."""
import pytest
from fastapi.testclient import TestClient
from app.main import app


@pytest.fixture(scope="module")
def client():
    with TestClient(app) as test_client:
        yield test_client


def test_list_projects(client):
    response = client.get("/projects?page=1&page_size=20")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] == 2100
    assert data["page"] == 1
    assert data["page_size"] == 20
    assert len(data["items"]) == 20
    first_item = data["items"][0]
    assert "project_id" in first_item
    assert "sector" in first_item


def test_filter_projects_by_sector(client):
    response = client.get("/projects?sector=Railways&page_size=10")
    assert response.status_code == 200
    data = response.json()
    assert data["total"] > 0
    for item in data["items"]:
        assert "Railways" in item["sector"]


def test_get_project_detail(client):
    # Test valid project 400005
    response = client.get("/projects/400005")
    assert response.status_code == 200
    data = response.json()
    assert data["project_id"] == "400005"
    assert "history" in data
    assert len(data["history"]) >= 1
    # Check that observations have report_month
    assert data["history"][0]["report_month"] is not None


def test_get_nonexistent_project(client):
    response = client.get("/projects/NONEXISTENT_999999")
    assert response.status_code == 404
    assert "not found" in response.json()["detail"].lower()


def test_analytics_summary(client):
    response = client.get("/analytics/summary")
    assert response.status_code == 200
    data = response.json()
    assert data["total_projects"] == 2100
    assert data["total_observations"] == 11011
    assert data["cumulative_original_cost_cr"] > 0
    assert data["cumulative_revised_cost_cr"] > 0
    assert data["cumulative_expenditure_cr"] > 0
    assert "Railways" in data["sector_distribution"]
    assert len(data["top_delayed_projects"]) > 0


def test_assistant_endpoint_basic(client):
    # Verify active Stage 6 AI assistant endpoint returns 200 OK
    res_assistant = client.post("/ai/assistant", json={"query": "What is project 400005?"})
    assert res_assistant.status_code == 200
    data = res_assistant.json()
    assert data["project_id"] == "400005"
    assert "answer" in data
    assert len(data["answer"]) > 0
