from __future__ import annotations

import hmac
import os
import secrets
from urllib.parse import urlparse
from flask import current_app, jsonify, request, session

CSRF_SESSION_KEY = "_csrf_token"
CSRF_HEADER_NAME = "X-CSRF-Token"
CSRF_COOKIE_NAME = "csrf_token"


def generate_csrf_token() -> str:
    """Generate and store a new CSRF token in session."""
    token = secrets.token_hex(32)
    session[CSRF_SESSION_KEY] = token
    return token


def get_or_create_csrf_token() -> str:
    """Get the existing CSRF token or create one."""
    token = session.get(CSRF_SESSION_KEY)
    if not token:
        token = generate_csrf_token()
    return token


def validate_csrf_token(token: str | None) -> bool:
    """Validate a provided CSRF token against the session."""
    expected = session.get(CSRF_SESSION_KEY)
    if not expected or not token:
        return False
    return hmac.compare_digest(expected, token)


def check_csrf():
    """Before-request CSRF protection hook."""
    if not current_app.config.get("CSRF_ENABLED", True):
        return None

    # Safe HTTP methods are exempt from CSRF checks
    if request.method in ("GET", "HEAD", "OPTIONS"):
        return None

    # Check origin/referer header if present
    origin = request.headers.get("Origin")
    referer = request.headers.get("Referer")
    frontend_origin = current_app.config.get("FRONTEND_ORIGIN", "").rstrip("/")
    host_origin = request.host_url.rstrip("/")
    configured_origins = current_app.config.get("ALLOWED_ORIGINS", [])

    allowed_origins = {frontend_origin, host_origin, *configured_origins}
    allowed_origins.discard("")

    allow_local_dev = bool(
        current_app.debug
        or os.getenv("FLASK_ENV") == "development"
        or current_app.config.get("ENV") == "development"
    )

    def is_origin_allowed(orig_url: str) -> bool:
        cleaned = orig_url.rstrip("/")
        if cleaned in allowed_origins:
            return True
        if allow_local_dev:
            try:
                parsed = urlparse(orig_url)
                hostname = parsed.hostname or ""
                if (
                    parsed.scheme in ("http", "https")
                    and (
                        hostname in ("localhost", "127.0.0.1")
                        or hostname.endswith(".loca.lt")
                        or hostname.endswith(".ngrok-free.app")
                        or hostname.endswith(".ngrok.io")
                    )
                ):
                    return True
            except Exception:
                pass
        return False

    if origin:
        if not is_origin_allowed(origin):
            return jsonify({"error": "csrf_error", "message": "Cross-origin request rejected."}), 403
    elif referer:
        parsed_ref = urlparse(referer)
        ref_origin = f"{parsed_ref.scheme}://{parsed_ref.netloc}"
        if not is_origin_allowed(ref_origin):
            return jsonify({"error": "csrf_error", "message": "Cross-origin referer rejected."}), 403

    # Check CSRF token:
    token = request.headers.get(CSRF_HEADER_NAME)
    if not token and request.is_json and isinstance(request.json, dict):
        token = request.json.get("csrf_token")

    # If user is authenticated in session, CSRF token is strictly mandatory on mutating requests
    is_authenticated = bool(session.get("user_id"))

    if token:
        if not validate_csrf_token(token):
            return (
                jsonify(
                    {
                        "error": "csrf_error",
                        "message": "Invalid CSRF token.",
                    }
                ),
                403,
            )
    elif is_authenticated:
        return (
            jsonify(
                {
                    "error": "csrf_error",
                    "message": "Missing CSRF token for authenticated request.",
                }
            ),
            403,
        )

    return None
