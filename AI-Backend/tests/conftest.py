"""Shared pytest fixtures."""
import pytest


@pytest.fixture(autouse=True)
def no_real_gemini_key(monkeypatch):
    """Keep tests offline: the real GEMINI_API_KEY from .env is removed; tests that need one set a mock key."""
    monkeypatch.delenv("GEMINI_API_KEY", raising=False)
