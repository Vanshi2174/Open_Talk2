from __future__ import annotations

import json
from datetime import datetime, timezone

from flask import Blueprint, current_app, g, jsonify, request
from flask.typing import ResponseReturnValue

from app.auth.decorators import login_required
from app.models.base import db
from app.models.session import PracticeSession
from app.services.coach import generate_coaching

sessions_bp = Blueprint("sessions", __name__, url_prefix="/api/sessions")

ALLOWED_MODES = {"interview", "public_speaking", "conversation"}
ALLOWED_DIFFICULTIES = {"warm_up", "standard", "stretch"}


def _parse_datetime(value: object) -> datetime | None:
    if not value or not isinstance(value, str):
        return None
    raw = value.strip()
    if not raw:
        return None
    try:
        parsed = datetime.fromisoformat(raw.replace("Z", "+00:00"))
    except ValueError:
        return None
    if parsed.tzinfo is None:
        parsed = parsed.replace(tzinfo=timezone.utc)
    return parsed


@sessions_bp.route("", methods=["POST"], strict_slashes=False)
@login_required
def create_session() -> ResponseReturnValue:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "bad_request", "message": "Invalid JSON payload."}), 400

    session_id = str(payload.get("id") or "").strip()
    mode = str(payload.get("mode") or "").strip()
    difficulty = str(payload.get("difficulty") or "").strip()
    transcript = str(payload.get("transcript") or "").strip()
    prompt = payload.get("prompt") if isinstance(payload.get("prompt"), dict) else {}
    prompt_id = str(prompt.get("id") or "").strip()
    prompt_title = str(prompt.get("title") or "").strip()
    prompt_text = str(prompt.get("text") or "").strip()

    field_errors: dict[str, str] = {}
    if not session_id or len(session_id) > 36:
        field_errors["id"] = "A session id is required."
    if mode not in ALLOWED_MODES:
        field_errors["mode"] = "Choose a valid practice mode."
    if difficulty not in ALLOWED_DIFFICULTIES:
        field_errors["difficulty"] = "Choose a valid difficulty."
    if not transcript:
        field_errors["transcript"] = "A transcript is required."
    elif len(transcript) > 20000:
        field_errors["transcript"] = "Transcript is too long."
    if not prompt_id or not prompt_text:
        field_errors["prompt"] = "A practice prompt is required."
    if not prompt_title:
        prompt_title = prompt_id

    if field_errors:
        return (
            jsonify(
                {
                    "error": "validation_error",
                    "message": "Please correct the session details.",
                    "field_errors": field_errors,
                }
            ),
            400,
        )

    existing = db.session.get(PracticeSession, session_id)
    if existing is not None:
        if existing.user_id != g.current_user.id:
            return (
                jsonify(
                    {
                        "error": "conflict",
                        "message": "A session with this id already exists.",
                    }
                ),
                409,
            )
        return jsonify({"session": existing.to_dict()}), 200

    submitted_at = _parse_datetime(payload.get("submitted_at")) or datetime.now(timezone.utc)
    started_at = _parse_datetime(payload.get("started_at"))
    stopped_at = _parse_datetime(payload.get("stopped_at"))

    coaching, source = generate_coaching(
        mode=mode,
        difficulty=difficulty,
        prompt_text=prompt_text,
        transcript=transcript,
        api_key=current_app.config.get("GEMINI_API_KEY", ""),
    )

    record = PracticeSession(
        id=session_id,
        user_id=g.current_user.id,
        mode=mode,
        difficulty=difficulty,
        prompt_id=prompt_id,
        prompt_title=prompt_title,
        prompt_text=prompt_text,
        transcript=transcript,
        started_at=started_at,
        stopped_at=stopped_at,
        submitted_at=submitted_at,
        coaching_source=source,
        coaching_json=json.dumps(coaching),
    )
    db.session.add(record)
    db.session.commit()
    return jsonify({"session": record.to_dict()}), 201


@sessions_bp.route("", methods=["GET"], strict_slashes=False)
@login_required
def list_sessions() -> ResponseReturnValue:
    rows = db.session.execute(
        db.select(PracticeSession)
        .where(PracticeSession.user_id == g.current_user.id)
        .order_by(PracticeSession.submitted_at.desc())
    ).scalars().all()
    return jsonify(
        {
            "sessions": [row.to_summary() for row in rows],
            "stats": _stats(rows),
        }
    )


@sessions_bp.get("/<session_id>")
@login_required
def get_session(session_id: str) -> ResponseReturnValue:
    record = db.session.get(PracticeSession, session_id)
    if record is None or record.user_id != g.current_user.id:
        return jsonify({"error": "not_found", "message": "Session not found."}), 404
    return jsonify({"session": record.to_dict()})


def _stats(rows: list[PracticeSession]) -> dict:
    by_mode = {"interview": 0, "public_speaking": 0, "conversation": 0}
    for row in rows:
        if row.mode in by_mode:
            by_mode[row.mode] += 1
    last = rows[0].submitted_at.isoformat() if rows else None
    return {
        "total": len(rows),
        "by_mode": by_mode,
        "last_practiced_at": last,
    }
