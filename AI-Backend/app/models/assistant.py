"""Pydantic schemas for the Natural Language Project Inquiry Assistant."""
from typing import List, Optional, Any, Dict, Literal
from pydantic import BaseModel, Field


class AssistantClarificationOption(BaseModel):
    """Candidate project option returned when a query resolves ambiguously."""
    project_id: str
    project_name: Optional[str] = None
    sector: Optional[str] = None
    agency: Optional[str] = None
    latest_reported_progress_pct: Optional[float] = None


class AIAssistantRequest(BaseModel):
    """User query or prompt to the PAIMANA AI assistant."""
    query: str = Field(..., min_length=1, description="Natural language question regarding PAIMANA infrastructure projects")
    project_id: Optional[str] = Field(None, description="Optional target project ID (6-digit MoSPI ID)")
    include_analytical_context: bool = Field(True, description="Whether to compute forecast, delay-risk, and anomaly context")
    session_id: Optional[str] = Field(None, max_length=128, description="Optional conversation session ID to maintain multi-turn context")
    reset_session: bool = Field(False, description="Whether to clear context for the specified session_id before answering")


class AIAssistantResponse(BaseModel):
    """AI assistant answer strictly grounded on MoSPI project data and analytical modules."""
    answer: str = Field(..., description="Assistant response text grounded in retrieved facts")
    project_id: Optional[str] = Field(None, description="Identified project ID if grounded on a specific project")
    project_name: Optional[str] = Field(None, description="Identified project name")
    latest_reported_month: Optional[str] = Field(None, description="Latest MoSPI report month referenced (YYYY-MM)")
    official_data_used: Dict[str, Any] = Field(default_factory=dict, description="Verified official MoSPI figures referenced")
    analytical_results_used: Dict[str, Any] = Field(default_factory=dict, description="Model-generated forecast, delay risk, or anomaly findings used")
    sources_used: List[str] = Field(default_factory=list, description="Data sources and analytical modules queried")
    missing_or_unavailable_data: List[str] = Field(default_factory=list, description="Relevant metrics missing from official reports")
    clarification_options: Optional[List[AssistantClarificationOption]] = Field(None, description="Candidate projects if query was ambiguous")
    llm_synthesized: bool = Field(default=False, description="Whether an external LLM was used to generate response phrasing")
    answer_source: Literal["ai", "fallback"] = Field(default="fallback", description="'ai' if Gemini generated the answer, 'fallback' for the deterministic non-AI answer")
    fallback_reason: Optional[str] = Field(None, description="Why the non-AI answer was used (e.g. gemini_api_key_missing, gemini_call_failed: ClientError); None when AI was used or the request type never calls AI")
    session_id: Optional[str] = Field(None, description="Active session ID tracking this conversation")
    context_retained: bool = Field(default=False, description="Whether context from previous session turn(s) was utilized in resolving this query")
    disclaimer: str = Field(
        default="Official figures originate directly from MoSPI Flash Reports. Projections, delay risk scores, and anomaly alerts are statistical heuristics and do not represent official government determinations."
    )


class SessionResetRequest(BaseModel):
    """Request payload to reset an existing conversation session."""
    session_id: str = Field(..., min_length=1, max_length=128, description="Session identifier to reset")


class SessionResetResponse(BaseModel):
    """Response confirming session reset or deletion."""
    session_id: str = Field(..., description="Session identifier")
    status: str = Field(..., description="Action status ('reset' or 'deleted')")
    message: str = Field(..., description="Detailed confirmation message")
