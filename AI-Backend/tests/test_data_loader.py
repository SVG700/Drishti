"""Tests for data loading, schema verification, and quality audit."""
from pathlib import Path
from app.services.data_loader import DataLoader


def test_data_loader_validation():
    backend_root = Path(__file__).resolve().parent.parent
    loader = DataLoader(datasets_dir=backend_root / "datasets")
    success, msg = loader.load_and_validate()

    assert success is True, f"Data validation failed: {msg}"
    assert loader.is_loaded is True

    qs = loader.quality_summary
    assert qs["dataset_valid"] is True
    assert qs["total_projects"] == 2100
    assert qs["unique_projects"] == 2100
    assert qs["duplicate_projects"] == 0
    assert qs["total_observations"] == 11011
    assert qs["duplicate_observations"] == 0
    assert qs["coverage_start"] == "2025-07"
    assert qs["coverage_end"] == "2026-03"

    # Verify missing value preservation
    assert qs["missing_values_preserved"] is True
    assert qs["synthetic_values_injected"] is False


def test_missing_dataset_handling(tmp_path):
    # Test that loader handles non-existent datasets gracefully without crashing
    empty_loader = DataLoader(datasets_dir=tmp_path)
    # temporarily prevent fallback to root by providing a nonexistent path with no parent CSV
    empty_loader.locate_file = lambda filename: None
    success, msg = empty_loader.load_and_validate()
    assert success is False
    assert "could not be found" in msg
