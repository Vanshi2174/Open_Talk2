"""Application configuration loaded from environment variables."""

from __future__ import annotations

import os
from datetime import timedelta
from pathlib import Path

from dotenv import load_dotenv

BACKEND_ROOT = Path(__file__).resolve().parents[2]
load_dotenv(BACKEND_ROOT / ".env")


def _int_env(name: str, default: int) -> int:
    raw = os.getenv(name)
    if raw is None or raw.strip() == "":
        return default
    return int(raw)


def _resolve_db_uri(raw_url: str | None) -> str:
    if not raw_url:
        return f"sqlite:///{(BACKEND_ROOT / 'open_talk.db').as_posix()}"
    if raw_url.startswith("sqlite:///") and not raw_url.startswith("sqlite:////"):
        rel_path = raw_url[len("sqlite:///"):]
        p = Path(rel_path)
        if not p.is_absolute():
            return f"sqlite:///{(BACKEND_ROOT / p).as_posix()}"
    return raw_url


class Config:
    SECRET_KEY = os.getenv("SECRET_KEY", "dev-only-change-me-replace-in-production")
    FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:5173")
    ALLOWED_ORIGINS = [
        o.strip().rstrip("/")
        for o in os.getenv(
            "ALLOWED_ORIGINS",
            f"{FRONTEND_ORIGIN},http://localhost:5173,http://localhost:5174,http://localhost:5175,http://localhost:5176,http://127.0.0.1:5173,http://127.0.0.1:5174,http://127.0.0.1:5175,http://127.0.0.1:5176",
        ).split(",")
        if o.strip()
    ]
    MAX_CONTENT_LENGTH = _int_env("MAX_CONTENT_LENGTH", 1 * 1024 * 1024)
    JSON_SORT_KEYS = False
    GEMINI_API_KEY = os.getenv("GEMINI_API_KEY", "")
    DATABASE_URL = os.getenv("DATABASE_URL", "")
    SQLALCHEMY_DATABASE_URI = _resolve_db_uri(os.getenv("DATABASE_URL"))
    SQLALCHEMY_TRACK_MODIFICATIONS = False

    # Session & Cookie security
    SESSION_COOKIE_NAME = "open_talk_session"
    SESSION_COOKIE_HTTPONLY = True
    SESSION_COOKIE_SAMESITE = os.getenv("SESSION_COOKIE_SAMESITE", "Lax")
    SESSION_COOKIE_SECURE = os.getenv("SESSION_COOKIE_SECURE", "false").lower() in ("true", "1")
    PERMANENT_SESSION_LIFETIME = timedelta(seconds=_int_env("SESSION_LIFETIME_SECONDS", 60 * 60 * 24 * 7))

    # CSRF Protection
    CSRF_ENABLED = os.getenv("CSRF_ENABLED", "true").lower() in ("true", "1")


class TestConfig(Config):
    TESTING = True
    SQLALCHEMY_DATABASE_URI = "sqlite:///:memory:"
    SECRET_KEY = "test-secret-key-phase2"
    SESSION_COOKIE_SECURE = False
    CSRF_ENABLED = True
