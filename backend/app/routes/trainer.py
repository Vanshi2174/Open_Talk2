from __future__ import annotations

from datetime import datetime, timezone
import json
import logging
import threading
import time
from typing import Any

from flask import Blueprint, current_app, g, jsonify, request, session
from flask.typing import ResponseReturnValue
import websockets.sync.client

from app.auth.decorators import login_required
from app.models.base import db
from app.models.trainer_session import TrainerSession
from app.services.trainer_coach import (
    generate_trainer_report,
    get_trainer_system_instruction,
)

logger = logging.getLogger(__name__)

trainer_bp = Blueprint("trainer", __name__, url_prefix="/api/trainer")

ALLOWED_TRAINER_MODES = {"interview", "public_speaking", "conversation", "confidence", "custom"}
ALLOWED_TRAINER_DIFFICULTIES = {"beginner", "intermediate", "advanced"}
ALLOWED_LANGUAGES = {"English", "Hindi", "Hinglish"}


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


@trainer_bp.get("/status")
def trainer_status() -> ResponseReturnValue:
    api_key = current_app.config.get("GEMINI_API_KEY", "").strip()
    return jsonify({
        "status": "ready",
        "gemini_configured": bool(api_key),
        "supported_modes": list(ALLOWED_TRAINER_MODES),
        "supported_difficulties": list(ALLOWED_TRAINER_DIFFICULTIES),
        "supported_languages": list(ALLOWED_LANGUAGES),
    })


@trainer_bp.post("/sessions")
@login_required
def save_trainer_session() -> ResponseReturnValue:
    payload = request.get_json(silent=True)
    if not isinstance(payload, dict):
        return jsonify({"error": "bad_request", "message": "Invalid JSON payload."}), 400

    session_id = str(payload.get("id") or "").strip()
    mode = str(payload.get("mode") or "conversation").strip()
    difficulty = str(payload.get("difficulty") or "intermediate").strip()
    language = str(payload.get("language") or "English").strip()
    custom_topic = payload.get("custom_topic")
    if custom_topic is not None:
        custom_topic = str(custom_topic).strip()[:255] or None

    duration_seconds = int(payload.get("duration_seconds") or 0)
    target_duration = int(payload.get("target_duration_minutes") or 5)
    camera_enabled = bool(payload.get("camera_enabled"))

    turns = payload.get("turns") if isinstance(payload.get("turns"), list) else []
    transcript = str(payload.get("transcript") or "").strip()
    visual_observations = payload.get("visual_observations") if isinstance(payload.get("visual_observations"), dict) else {}

    field_errors: dict[str, str] = {}
    if not session_id or len(session_id) > 36:
        field_errors["id"] = "A valid session id is required."
    if mode not in ALLOWED_TRAINER_MODES:
        field_errors["mode"] = f"Choose one of: {', '.join(ALLOWED_TRAINER_MODES)}."
    if difficulty not in ALLOWED_TRAINER_DIFFICULTIES:
        field_errors["difficulty"] = f"Choose one of: {', '.join(ALLOWED_TRAINER_DIFFICULTIES)}."

    if field_errors:
        return (
            jsonify({
                "error": "validation_error",
                "message": "Please correct the session details.",
                "field_errors": field_errors,
            }),
            400,
        )

    # Check for existing session
    existing = db.session.get(TrainerSession, session_id)
    if existing is not None:
        if existing.user_id != g.current_user.id:
            return jsonify({"error": "conflict", "message": "Session id already exists for another user."}), 409
        return jsonify({"session": existing.to_dict()}), 200

    started_at = _parse_datetime(payload.get("started_at")) or datetime.now(timezone.utc)
    ended_at = _parse_datetime(payload.get("ended_at")) or datetime.now(timezone.utc)

    # Generate coaching report
    api_key = current_app.config.get("GEMINI_API_KEY", "").strip()
    coaching, source = generate_trainer_report(
        mode=mode,
        difficulty=difficulty,
        language=language,
        custom_topic=custom_topic,
        turns=turns,
        duration_seconds=duration_seconds,
        camera_enabled=camera_enabled,
        visual_observations=visual_observations,
        api_key=api_key,
    )

    record = TrainerSession(
        id=session_id,
        user_id=g.current_user.id,
        mode=mode,
        difficulty=difficulty,
        language=language,
        custom_topic=custom_topic,
        target_duration_minutes=target_duration,
        duration_seconds=duration_seconds,
        camera_enabled=camera_enabled,
        transcript=transcript,
        turns_json=json.dumps(turns),
        metrics_json=json.dumps(coaching.get("metrics") or {}),
        visual_observations_json=json.dumps(visual_observations),
        coaching_source=source,
        coaching_json=json.dumps(coaching),
        started_at=started_at,
        ended_at=ended_at,
    )
    db.session.add(record)
    db.session.commit()

    return jsonify({"session": record.to_dict()}), 201


@trainer_bp.get("/sessions")
@login_required
def list_trainer_sessions() -> ResponseReturnValue:
    rows = db.session.execute(
        db.select(TrainerSession)
        .where(TrainerSession.user_id == g.current_user.id)
        .order_by(TrainerSession.created_at.desc())
    ).scalars().all()
    return jsonify({
        "sessions": [row.to_summary() for row in rows],
        "total": len(rows),
    })


@trainer_bp.get("/sessions/<session_id>")
@login_required
def get_trainer_session(session_id: str) -> ResponseReturnValue:
    record = db.session.get(TrainerSession, session_id)
    if record is None or record.user_id != g.current_user.id:
        return jsonify({"error": "not_found", "message": "Trainer session not found."}), 404
    return jsonify({"session": record.to_dict()})


def _run_local_fallback_ws_session(
    ws: Any,
    mode: str,
    difficulty: str,
    language: str,
    custom_topic: str,
) -> None:
    """Provides an interactive coaching simulation when GEMINI_API_KEY is not configured."""
    try:
        ws.send(json.dumps({"type": "ready"}))
        time.sleep(0.3)

        opening_prompts = {
            "interview": (
                "Hello! I am Alex, your AI interview coach. Welcome to your practice session. "
                "Let's start: Could you please introduce yourself and tell me about a recent project you are proud of?"
            ),
            "public_speaking": (
                "Welcome to your public speaking coaching session! I'm Alex. "
                "Whenever you're ready, deliver your opening speech or elevator pitch, and I'll give you feedback."
            ),
            "conversation": (
                "Hi there! I'm Alex. Good to connect with you today. "
                "What is something interesting or challenging that you've been working on recently?"
            ),
            "confidence": (
                "Hello! I'm Alex, your communication coach. This is a supportive space to build your confidence. "
                "Tell me a little bit about what communication goals you'd like to work on today."
            ),
            "custom": (
                f"Welcome! We're practicing '{custom_topic or 'communication'}'. "
                "Whenever you're ready, share your initial thoughts and we'll dive right in."
            ),
        }

        greeting = opening_prompts.get(mode, opening_prompts["conversation"])
        ws.send(json.dumps({
            "type": "transcript",
            "role": "model",
            "text": greeting,
        }))
        ws.send(json.dumps({"type": "turn_complete"}))

        follow_up_bank = {
            "interview": [
                "That's a compelling example. What was the biggest challenge you faced during that process, and how did you overcome it?",
                "Interesting! How did you measure the success or impact of that initiative?",
                "Could you share how you handled disagreement or conflicting priorities with a teammate or stakeholder?",
                "Great answer. To wrap up this mock interview question, what key takeaway did that experience leave you with?",
            ],
            "public_speaking": [
                "Great opening delivery. What is the core takeaway or action you want your audience to remember most?",
                "Nice cadence. Try expanding on that with a concrete story or supporting statistic to make it even more memorable.",
                "How would you address an audience that might initially be skeptical of that idea?",
            ],
            "conversation": [
                "That's really fascinating. What inspired you to take that approach?",
                "I see your point. How do you see that evolving over the next year or two?",
                "That's a great perspective. What has been the most surprising part of the whole experience for you?",
            ],
            "confidence": [
                "You expressed that clearly and calmly. How did it feel articulating that thought just now?",
                "Take a breath and continue — you're doing great. What is the next point you want to share?",
                "Notice how steady your pacing was there. Let's practice summarizing that idea in one concise closing sentence.",
            ],
            "custom": [
                "That's a solid point on this topic. What factors or evidence support that view?",
                "How might someone with an opposing perspective respond to that argument?",
                "Well articulated. What conclusion would you draw based on that analysis?",
            ],
        }

        turn_index = 0
        questions = follow_up_bank.get(mode, follow_up_bank["conversation"])

        while True:
            raw_msg = ws.receive()
            if raw_msg is None:
                break
            try:
                data = json.loads(raw_msg)
            except Exception:
                continue

            msg_type = data.get("type")
            if msg_type == "end":
                break
            elif msg_type == "text":
                user_text = data.get("text", "").strip()
                if user_text:
                    time.sleep(0.5)
                    response_text = questions[turn_index % len(questions)]
                    turn_index += 1
                    ws.send(json.dumps({
                        "type": "transcript",
                        "role": "model",
                        "text": response_text,
                    }))
                    ws.send(json.dumps({"type": "turn_complete"}))
            elif msg_type == "image":
                continue

    except Exception as exc:
        logger.debug("Local fallback session ended: %s", exc)


def register_trainer_websocket(sock, app):
    """Registers the WebSocket route on flask_sock for real-time bidirectional Gemini Live streaming."""
    @sock.route("/api/trainer/ws")
    def trainer_ws(ws):
        user_id = session.get("user_id")
        if not user_id:
            ws.send(json.dumps({
                "type": "error",
                "code": "UNAUTHORIZED",
                "message": "Authentication required to join the Live AI Trainer.",
            }))
            ws.close(1008, "Unauthorized")
            return

        # Query parameters from connection URL
        mode = request.args.get("mode", "conversation")
        difficulty = request.args.get("difficulty", "intermediate")
        language = request.args.get("language", "English")
        custom_topic = request.args.get("custom_topic", "")

        api_key = app.config.get("GEMINI_API_KEY", "").strip()
        if not api_key:
            _run_local_fallback_ws_session(ws, mode, difficulty, language, custom_topic)
            return

        system_instruction = get_trainer_system_instruction(
            mode=mode,
            difficulty=difficulty,
            language=language,
            custom_topic=custom_topic,
        )

        gemini_url = (
            "wss://generativelanguage.googleapis.com/ws/google.ai.generativelanguage.v1alpha.GenerativeService.BidiGenerateContent"
            f"?key={api_key}"
        )

        try:
            gemini_ws = websockets.sync.client.connect(
                gemini_url,
                open_timeout=15,
                close_timeout=5,
            )
        except Exception as exc:
            logger.error("Failed to connect to Gemini Live API: %s", exc)
            ws.send(json.dumps({
                "type": "error",
                "code": "GEMINI_CONNECTION_FAILED",
                "message": f"Could not establish connection with Gemini Live API: {exc}",
            }))
            ws.close(1011, "Upstream connection error")
            return

        stop_event = threading.Event()

        # Thread: Gemini -> Browser
        def forward_gemini_to_browser():
            try:
                for raw_msg in gemini_ws:
                    if stop_event.is_set():
                        break
                    try:
                        data = json.loads(raw_msg)
                    except Exception:
                        continue

                    # Server Content (Model Turn, Audio, Transcript)
                    server_content = data.get("serverContent")
                    if server_content:
                        model_turn = server_content.get("modelTurn")
                        if model_turn:
                            parts = model_turn.get("parts", [])
                            for part in parts:
                                # Audio chunk
                                inline_data = part.get("inlineData")
                                if inline_data and inline_data.get("data"):
                                    mime = inline_data.get("mimeType", "")
                                    ws.send(json.dumps({
                                        "type": "audio",
                                        "mimeType": mime,
                                        "data": inline_data["data"],
                                    }))
                                # Text chunk if provided
                                text = part.get("text")
                                if text:
                                    ws.send(json.dumps({
                                        "type": "transcript",
                                        "role": "model",
                                        "text": text,
                                    }))

                        if server_content.get("interrupted"):
                            ws.send(json.dumps({"type": "interrupted"}))

                        if server_content.get("turnComplete"):
                            ws.send(json.dumps({"type": "turn_complete"}))

            except Exception as exc:
                logger.debug("Gemini receiver ended: %s", exc)
            finally:
                stop_event.set()

        receiver_thread = threading.Thread(target=forward_gemini_to_browser, daemon=True)

        try:
            # Step 1: Send setup configuration to Gemini Live
            setup_payload = {
                "setup": {
                    "model": "models/gemini-2.0-flash-exp",
                    "generationConfig": {
                        "responseModalities": ["AUDIO"],
                        "speechConfig": {
                            "voiceConfig": {
                                "prebuiltVoiceConfig": {
                                    "voiceName": "Aoede",
                                }
                            }
                        },
                    },
                    "systemInstruction": {
                        "parts": [{"text": system_instruction}]
                    },
                }
            }
            gemini_ws.send(json.dumps(setup_payload))

            # Wait for setupComplete response
            first_msg = gemini_ws.recv(timeout=10)
            first_data = json.loads(first_msg)
            if "setupComplete" not in first_data:
                logger.warning("Unexpected initial Gemini response: %s", first_data)

            # Inform browser we are ready
            ws.send(json.dumps({"type": "ready"}))

            # Prompt initial opening greeting from AI coach
            init_turn = {
                "clientContent": {
                    "turns": [
                        {
                            "role": "user",
                            "parts": [
                                {
                                    "text": (
                                        "Start our live session now. Greet me warmly as my communication coach, "
                                        "briefly mention the exercise we're doing today, and ask me your opening question."
                                    )
                                }
                            ],
                        }
                    ],
                    "turnComplete": True,
                }
            }
            gemini_ws.send(json.dumps(init_turn))

            # Start receiver thread
            receiver_thread.start()

            # Main loop: Browser -> Gemini
            while not stop_event.is_set():
                client_msg = ws.receive(timeout=30)
                if client_msg is None:
                    break

                try:
                    payload = json.loads(client_msg)
                except Exception:
                    continue

                msg_type = payload.get("type")

                if msg_type == "audio":
                    # Audio chunk from microphone (16kHz PCM linear base64)
                    audio_b64 = payload.get("data")
                    if audio_b64:
                        gemini_ws.send(json.dumps({
                            "realtimeInput": {
                                "mediaChunks": [
                                    {
                                        "mimeType": "audio/pcm;rate=16000",
                                        "data": audio_b64,
                                    }
                                ]
                            }
                        }))

                elif msg_type == "image":
                    # Visual frame from camera (JPEG base64)
                    img_b64 = payload.get("data")
                    if img_b64:
                        gemini_ws.send(json.dumps({
                            "realtimeInput": {
                                "mediaChunks": [
                                    {
                                        "mimeType": "image/jpeg",
                                        "data": img_b64,
                                    }
                                ]
                            }
                        }))

                elif msg_type == "text":
                    # Text turn / user transcript
                    text_content = payload.get("text", "").strip()
                    if text_content:
                        gemini_ws.send(json.dumps({
                            "clientContent": {
                                "turns": [
                                    {
                                        "role": "user",
                                        "parts": [{"text": text_content}],
                                    }
                                ],
                                "turnComplete": True,
                            }
                        }))

                elif msg_type == "end":
                    break

        except Exception as exc:
            logger.error("Error in Live Trainer WebSocket session: %s", exc)
        finally:
            stop_event.set()
            try:
                gemini_ws.close()
            except Exception:
                pass
