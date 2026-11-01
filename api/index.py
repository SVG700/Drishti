"""Vercel serverless entry for the DRISHTI AI backend.

Serves the FastAPI app from AI-Backend/ on the same domain as the website;
vercel.json routes /health, /projects, /analytics, /ai, /docs and
/openapi.json here.
"""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent / "AI-Backend"))

from app.main import app  # noqa: E402,F401  (Vercel serves this ASGI app)
from app.services.assistant_service import log_gemini_configuration  # noqa: E402
from app.services.data_loader import data_loader  # noqa: E402

# Vercel does not reliably run ASGI lifespan events, so load the dataset when
# the function instance starts instead of waiting for the startup hook.
if not data_loader.is_loaded:
    data_loader.load_and_validate()
    log_gemini_configuration()
