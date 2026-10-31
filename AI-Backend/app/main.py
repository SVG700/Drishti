"""FastAPI application entrypoint for SIH26103 PAIMANA AI Backend."""
import logging
import os
from contextlib import asynccontextmanager
from dotenv import load_dotenv

# Load environment variables (.env) from AI-Backend or project root
load_dotenv()
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv(os.path.join(os.path.dirname(__file__), "..", "..", ".env"))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .services.data_loader import data_loader
from .services.assistant_service import log_gemini_configuration
from .api import health, projects, analytics, future_ai

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s",
)
logger = logging.getLogger("drishti_backend")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Lifespan context manager for startup and shutdown procedures."""
    logger.info("Starting DRISHTI (दृष्टि) • MoSPI PAIMANA AI Backend...")
    success, msg = data_loader.load_and_validate()
    if success:
        logger.info("PAIMANA dataset initialized: %s", msg)
    else:
        logger.warning("PAIMANA dataset warning: %s", msg)
    log_gemini_configuration()
    yield
    logger.info("Shutting down DRISHTI AI Backend.")


app = FastAPI(
    title="DRISHTI (दृष्टि) • MoSPI PAIMANA AI Backend",
    description=(
        "AI-Powered Infrastructure Intelligence for MoSPI PAIMANA Central Sector "
        "Infrastructure Project Monitoring — SIH26103. Developed by Team KAALNETRA."
    ),
    version="1.0.0",
    lifespan=lifespan,
)

# CORS configuration (allowing local development access)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Register route modules
app.include_router(health.router)
app.include_router(projects.router)
app.include_router(analytics.router)
app.include_router(future_ai.router)


@app.get("/", summary="API Root")
def root():
    """Root endpoint detailing API overview and documentation links."""
    return {
        "title": "DRISHTI (दृष्टि) • MoSPI PAIMANA AI Backend",
        "tagline": "AI-Powered Infrastructure Intelligence",
        "project": "MoSPI PAIMANA — SIH26103",
        "team": "KAALNETRA",
        "version": "1.0.0",
        "documentation": "/docs",
        "openapi_schema": "/openapi.json",
        "endpoints": {
            "health": "/health",
            "projects": "/projects",
            "project_detail": "/projects/{project_id}",
            "analytics_summary": "/analytics/summary",
            "data_quality": "/analytics/data-quality",
            "future_ai": "/ai/*",
        },
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="127.0.0.1", port=8000, reload=True)
