"""Conversation session storage and context management for SIH26103 PAIMANA.

Provides an in-memory, thread-safe session store with lazy TTL expiration,
bounded session capacity, and configurable per-session history retention.
Designed with a modular interface suitable for replacement with Redis or a
database in production environments.
"""
from typing import Dict, Any, List, Optional
import os
import re
import time
import threading
import logging

logger = logging.getLogger(__name__)

# Configurable session defaults from environment
DEFAULT_SESSION_TTL_SECONDS = int(os.environ.get("PAIMANA_SESSION_TTL_SECONDS", "1800"))  # 30 minutes
DEFAULT_MAX_SESSIONS = int(os.environ.get("PAIMANA_MAX_SESSIONS", "1000"))
DEFAULT_MAX_SESSION_TURNS = int(os.environ.get("PAIMANA_MAX_SESSION_TURNS", "10"))
SESSION_ID_PATTERN = re.compile(r"^[A-Za-z0-9_\-\.:]{1,128}$")


def validate_session_id(session_id: Optional[str]) -> Optional[str]:
    """Validates and sanitizes a session ID string.

    Returns the clean session ID string if valid, or None if invalid or empty.
    """
    if not session_id or not isinstance(session_id, str):
        return None
    cleaned = session_id.strip()
    if not cleaned or len(cleaned) > 128:
        return None
    if not SESSION_ID_PATTERN.match(cleaned):
        return None
    return cleaned


class ConversationSession:
    """Encapsulates the conversational state of an ongoing dialogue."""

    def __init__(self, session_id: str):
        self.session_id: str = session_id
        self.current_project_id: Optional[str] = None
        self.current_project_name: Optional[str] = None
        self.last_query: Optional[str] = None
        self.last_intents: List[str] = []
        self.history: List[Dict[str, Any]] = []
        self.created_at: float = time.time()
        self.last_accessed_at: float = self.created_at

    def update(
        self,
        query: str,
        answer: str,
        project_id: Optional[str],
        project_name: Optional[str],
        intents: List[str],
        max_turns: int = DEFAULT_MAX_SESSION_TURNS,
    ) -> None:
        """Records a completed conversation turn and updates active project context."""
        now = time.time()
        self.last_accessed_at = now
        self.last_query = query
        self.last_intents = list(intents)

        # Update active project context if this turn resolved a project
        if project_id and str(project_id).strip():
            self.current_project_id = str(project_id).strip()
            if project_name:
                self.current_project_name = str(project_name).strip()

        # Append turn to history
        turn_record = {
            "query": query,
            "answer": answer,
            "project_id": project_id,
            "project_name": project_name,
            "intents": list(intents),
            "timestamp": now,
        }
        self.history.append(turn_record)
        if len(self.history) > max_turns:
            self.history = self.history[-max_turns:]

    def clear(self) -> None:
        """Resets all conversational context and turn history while retaining the session ID."""
        self.current_project_id = None
        self.current_project_name = None
        self.last_query = None
        self.last_intents.clear()
        self.history.clear()
        self.last_accessed_at = time.time()

    def to_dict(self) -> Dict[str, Any]:
        """Serializes session state to a lightweight dictionary."""
        return {
            "session_id": self.session_id,
            "current_project_id": self.current_project_id,
            "current_project_name": self.current_project_name,
            "last_query": self.last_query,
            "last_intents": self.last_intents,
            "turn_count": len(self.history),
            "created_at": self.created_at,
            "last_accessed_at": self.last_accessed_at,
        }


class SessionStore:
    """Thread-safe in-memory session manager with lazy TTL eviction and capacity bounds.

    NOTE: This in-memory store is designed for local single-process development.
    Sessions are retained in process memory and will not persist across server restarts.
    """

    def __init__(
        self,
        ttl_seconds: int = DEFAULT_SESSION_TTL_SECONDS,
        max_sessions: int = DEFAULT_MAX_SESSIONS,
        max_turns_per_session: int = DEFAULT_MAX_SESSION_TURNS,
    ):
        self.ttl_seconds = ttl_seconds
        self.max_sessions = max_sessions
        self.max_turns_per_session = max_turns_per_session
        self._sessions: Dict[str, ConversationSession] = {}
        self._lock = threading.Lock()

    def get(self, session_id: str) -> Optional[ConversationSession]:
        """Retrieves an existing session if present and not expired."""
        valid_id = validate_session_id(session_id)
        if not valid_id:
            return None

        with self._lock:
            self._cleanup_expired()
            session = self._sessions.get(valid_id)
            if session:
                session.last_accessed_at = time.time()
                return session
            return None

    def get_or_create(self, session_id: str) -> ConversationSession:
        """Retrieves an existing session or creates a new one with bounded storage."""
        valid_id = validate_session_id(session_id)
        if not valid_id:
            valid_id = "default_session"

        with self._lock:
            self._cleanup_expired()
            if valid_id in self._sessions:
                session = self._sessions[valid_id]
                session.last_accessed_at = time.time()
                return session

            # Evict least recently accessed session if at capacity
            if len(self._sessions) >= self.max_sessions:
                oldest_id = min(self._sessions.keys(), key=lambda k: self._sessions[k].last_accessed_at)
                del self._sessions[oldest_id]

            session = ConversationSession(valid_id)
            self._sessions[valid_id] = session
            return session

    def reset(self, session_id: str) -> ConversationSession:
        """Resets the state of a session, clearing all project context and history."""
        valid_id = validate_session_id(session_id)
        if not valid_id:
            valid_id = "default_session"

        with self._lock:
            if valid_id in self._sessions:
                self._sessions[valid_id].clear()
                return self._sessions[valid_id]
            session = ConversationSession(valid_id)
            self._sessions[valid_id] = session
            return session

    def delete(self, session_id: str) -> bool:
        """Deletes a session completely from memory."""
        valid_id = validate_session_id(session_id)
        if not valid_id:
            return False

        with self._lock:
            if valid_id in self._sessions:
                del self._sessions[valid_id]
                return True
            return False

    def clear_all(self) -> None:
        """Clears all sessions from memory (used primarily for test isolation)."""
        with self._lock:
            self._sessions.clear()

    def active_session_count(self) -> int:
        """Returns the number of active, non-expired sessions."""
        with self._lock:
            self._cleanup_expired()
            return len(self._sessions)

    def _cleanup_expired(self) -> None:
        """Evicts sessions whose last access exceeds the TTL window. Must be called under lock."""
        now = time.time()
        expired_ids = [
            sid for sid, s in self._sessions.items()
            if (now - s.last_accessed_at) > self.ttl_seconds
        ]
        for sid in expired_ids:
            del self._sessions[sid]


# Global session store instance
session_store = SessionStore()
