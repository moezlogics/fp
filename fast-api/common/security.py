"""
Security utilities — HMAC token creation/verification for inter-service communication.

Used by the VR Tour module to verify capture session tokens created by the Node.js backend.
The same VR_TOUR_SECRET must be configured in both services.
"""

import hashlib
import hmac
import json
import time
import uuid
from typing import Optional

from config import settings


# ── In-memory session registry (anti-replay) ──
# In production with multiple workers, use Redis instead
_used_sessions: dict[str, float] = {}
_SESSION_CLEANUP_INTERVAL = 3600  # Clean up expired sessions every hour
_last_cleanup = time.time()


def _cleanup_expired_sessions() -> None:
    """Remove expired session IDs from memory."""
    global _last_cleanup
    now = time.time()
    if now - _last_cleanup < _SESSION_CLEANUP_INTERVAL:
        return
    _last_cleanup = now
    expired = [sid for sid, exp in _used_sessions.items() if exp < now]
    for sid in expired:
        del _used_sessions[sid]


def create_capture_token(
    restaurant_id: str,
    user_id: str,
    scene_name: str,
    callback_url: str,
) -> str:
    """
    Create an HMAC-signed capture session token.
    This is called by the Node.js backend (via webhook) or for testing.

    Returns a URL-safe token string.
    """
    session_id = uuid.uuid4().hex
    expiry = int(time.time()) + (settings.CAPTURE_TOKEN_EXPIRY_MINUTES * 60)

    payload = {
        "rid": restaurant_id,
        "uid": user_id,
        "sid": session_id,
        "name": scene_name,
        "cb": callback_url,
        "exp": expiry,
    }

    payload_json = json.dumps(payload, separators=(",", ":"), sort_keys=True)

    signature = hmac.new(
        settings.VR_TOUR_SECRET.encode("utf-8"),
        payload_json.encode("utf-8"),
        hashlib.sha256,
    ).hexdigest()

    # Token format: base64(payload).signature
    import base64
    token_payload = base64.urlsafe_b64encode(payload_json.encode("utf-8")).decode("utf-8")
    return f"{token_payload}.{signature}"


def verify_capture_token(token: str) -> Optional[dict]:
    """
    Verify an HMAC-signed capture session token.

    Returns the payload dict if valid, None if invalid/expired/replayed.
    """
    _cleanup_expired_sessions()

    try:
        parts = token.rsplit(".", 1)
        if len(parts) != 2:
            return None

        token_payload, signature = parts

        import base64
        # Add padding if needed
        padding = 4 - len(token_payload) % 4
        if padding != 4:
            token_payload += "=" * padding

        payload_json = base64.urlsafe_b64decode(token_payload).decode("utf-8")

        # Verify HMAC signature
        expected_sig = hmac.new(
            settings.VR_TOUR_SECRET.encode("utf-8"),
            payload_json.encode("utf-8"),
            hashlib.sha256,
        ).hexdigest()

        if not hmac.compare_digest(signature, expected_sig):
            return None

        payload = json.loads(payload_json)

        # Check expiry
        if payload.get("exp", 0) < time.time():
            return None

        # Anti-replay: check if session ID was already used
        session_id = payload.get("sid", "")
        if session_id in _used_sessions:
            return None

        return payload

    except Exception:
        return None


def mark_session_used(session_id: str, expiry: float) -> None:
    """Mark a session ID as used to prevent replay attacks."""
    _used_sessions[session_id] = expiry


def verify_internal_secret(secret: str) -> bool:
    """Verify the internal service-to-service secret."""
    if not settings.INTERNAL_SECRET:
        return False
    return hmac.compare_digest(secret, settings.INTERNAL_SECRET)
