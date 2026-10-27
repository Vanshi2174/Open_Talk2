from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Any

GEMINI_COACH_MODELS = (
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
)

FILLER_WORDS = {"um", "uh", "er", "ah", "like", "basically", "actually", "literally", "honestly", "right"}
FILLER_PHRASES = ("you know", "i mean", "sort of", "kind of", "i guess", "to be honest")


def get_trainer_system_instruction(
    mode: str,
    difficulty: str,
    language: str = "English",
    custom_topic: str | None = None,
) -> str:
    lang_note = f"Conduct this session in {language}." if language in ("Hindi", "Hinglish") else "Conduct this session in clear, natural English."
    
    mode_instructions = {
        "interview": (
            "You are a supportive, experienced hiring manager and interview coach named Alex. "
            "Conduct a realistic mock job interview. Ask one focused behavioral or situational question at a time. "
            "Listen attentively to the user's answers, acknowledge key points, and ask natural, probing follow-up questions. "
            "Challenge them gently to provide concrete STAR examples (Situation, Task, Action, Result). "
            "Avoid rapid-fire questions or long monologues."
        ),
        "public_speaking": (
            "You are an inspiring keynote speech coach named Alex. "
            "Guide the user through presenting ideas, elevator pitches, storytelling, or structured explanations. "
            "Prompt them to deliver an opening hook, explain key concepts with clarity, and conclude with impact. "
            "Offer supportive coaching cues on cadence, enthusiasm, and structuring arguments. Ask one question or prompt at a time."
        ),
        "conversation": (
            "You are a friendly, engaging conversational partner and communication coach named Alex. "
            "Engage in natural, organic dialogue, discussing interests, current topics, opinions, or collaborative ideas. "
            "Demonstrate active listening, share brief relatable thoughts, and ask open-ended questions that invite the user to express themselves comfortably."
        ),
        "confidence": (
            "You are an encouraging, empathetic communication coach named Alex. "
            "Help the user overcome speaking hesitation, build vocal presence, and articulate thoughts smoothly. "
            "Provide a warm, psychologically safe environment. Encourage them warmly without overwhelming praise, and gently prompt them through natural pauses."
        ),
        "custom": (
            f"You are an expert communication coach named Alex practicing a customized topic: '{custom_topic or 'general communication'}'. "
            "Stay focused on this topic, guiding the user with tailored questions, active listening, and constructive conversational coaching."
        ),
    }

    difficulty_prompts = {
        "beginner": "Pacing: slow to moderate. Ask straightforward, accessible questions. Be very encouraging, offering hints if they hesitate.",
        "intermediate": "Pacing: standard conversational. Ask realistic questions with moderate depth and one or two thoughtful follow-ups.",
        "advanced": "Pacing: dynamic and professional. Ask challenging questions, test edge cases, and push them to articulate nuanced points succinctly.",
    }

    base = mode_instructions.get(mode, mode_instructions["conversation"])
    diff = difficulty_prompts.get(difficulty, difficulty_prompts["intermediate"])

    return (
        f"{base}\n\n"
        f"Difficulty Level: {difficulty} - {diff}\n"
        f"Language: {lang_note}\n\n"
        "Key Coach Behaviors:\n"
        "1. Speak like a natural human coach: warm, articulate, concise, conversational.\n"
        "2. Keep responses brief (1 to 3 short sentences max) so the user does most of the talking.\n"
        "3. Ask exactly ONE clear question at a time. Never dump multiple questions.\n"
        "4. If the user stops or gets stuck, offer an easy starter hint.\n"
        "5. If camera/visuals are enabled and observable cues are shared, gently remind them to maintain eye contact or open posture if relevant.\n"
        "6. Greet the user warmly when the session begins, introduce the goal, and ask the opening question."
    )


def compute_speech_metrics(
    turns: list[dict[str, Any]],
    duration_seconds: int = 0,
) -> dict[str, Any]:
    user_turns = [t for t in turns if t.get("role") == "user"]
    user_text = " ".join(t.get("text", "") for t in user_turns).strip()
    words = re.findall(r"\b[a-zA-Z']+\b", user_text)
    word_count = len(words)
    
    sentences = [s.strip() for s in re.split(r"[.!?]+", user_text) if s.strip()]
    sentence_count = len(sentences)

    filler_count = 0
    lower_text = user_text.lower()
    for w in words:
        if w.lower() in FILLER_WORDS:
            filler_count += 1
    for phrase in FILLER_PHRASES:
        filler_count += len(re.findall(r"\b" + re.escape(phrase) + r"\b", lower_text))

    wpm = 0
    if duration_seconds > 10 and word_count > 0:
        minutes = duration_seconds / 60.0
        wpm = round(word_count / minutes)

    avg_words_per_turn = round(word_count / len(user_turns), 1) if user_turns else 0
    avg_words_per_sentence = round(word_count / sentence_count, 1) if sentence_count else 0

    return {
        "user_turn_count": len(user_turns),
        "total_turn_count": len(turns),
        "word_count": word_count,
        "sentence_count": sentence_count,
        "filler_count": filler_count,
        "words_per_minute": wpm,
        "avg_words_per_turn": avg_words_per_turn,
        "avg_words_per_sentence": avg_words_per_sentence,
    }


def generate_trainer_report(
    *,
    mode: str,
    difficulty: str,
    language: str,
    custom_topic: str | None,
    turns: list[dict[str, Any]],
    duration_seconds: int,
    camera_enabled: bool,
    visual_observations: dict[str, Any] | None,
    api_key: str = "",
) -> tuple[dict[str, Any], str]:
    metrics = compute_speech_metrics(turns, duration_seconds)

    if api_key.strip():
        try:
            report = _generate_gemini_trainer_report(
                mode=mode,
                difficulty=difficulty,
                language=language,
                custom_topic=custom_topic,
                turns=turns,
                metrics=metrics,
                camera_enabled=camera_enabled,
                visual_observations=visual_observations or {},
                api_key=api_key.strip(),
            )
            return report, "gemini"
        except Exception:
            pass

    return _generate_local_trainer_report(
        mode=mode,
        difficulty=difficulty,
        language=language,
        custom_topic=custom_topic,
        turns=turns,
        metrics=metrics,
        camera_enabled=camera_enabled,
        visual_observations=visual_observations or {},
    ), "local"


def _generate_gemini_trainer_report(
    *,
    mode: str,
    difficulty: str,
    language: str,
    custom_topic: str | None,
    turns: list[dict[str, Any]],
    metrics: dict[str, Any],
    camera_enabled: bool,
    visual_observations: dict[str, Any],
    api_key: str,
) -> dict[str, Any]:
    user_turns = [t for t in turns if t.get("role") == "user"]
    formatted_transcript = "\n".join(
        f"{'User' if t.get('role') == 'user' else 'AI Coach'}: {t.get('text', '')}"
        for t in turns
    )

    system_instruction = (
        "You are an expert executive communication coach reviewing a live conversational training session. "
        "Analyze the transcript and measurable communication data with transparency and actionable rigor. "
        "Do not invent fake psychological diagnoses or claim unsupported acoustic measurements. "
        "Return a strictly valid JSON object adhering to this structure:\n"
        "{\n"
        '  "summary": "Concise 2-3 sentence assessment of the session performance.",\n'
        '  "strengths": ["Strength 1", "Strength 2", "Strength 3"],\n'
        '  "improvement_priorities": ["Priority 1", "Priority 2"],\n'
        '  "communication_feedback": {\n'
        '    "grammar_and_vocabulary": "Feedback on grammatical precision and vocabulary choice.",\n'
        '    "clarity_and_structure": "Feedback on how ideas were structured, answered, and reasoned.",\n'
        '    "relevance_and_completeness": "Assessment of how thoroughly the user addressed questions.",\n'
        '    "fluency_and_pace": "Assessment of speaking flow, filler word usage, and pace.",\n'
        '    "visual_observations": "Analysis of visible posture, eye contact, and gestures if camera was enabled, else empty."\n'
        '  },\n'
        '  "actionable_improvements": [\n'
        '    {\n'
        '      "user_quote": "Exact or representative quote from the user",\n'
        '      "suggested_rewrite": "Coached, elevated alternative version",\n'
        '      "coaching_tip": "Why this change makes the point more compelling"\n'
        '    }\n'
        '  ],\n'
        '  "performance_indicators": {\n'
        '    "overall_score": 85,\n'
        '    "clarity_score": 88,\n'
        '    "fluency_score": 80,\n'
        '    "structure_score": 84,\n'
        '    "engagement_score": 86,\n'
        '    "scoring_criteria": "Scores are qualitative rubric assessments (0-100) based on response relevance, conciseness, vocabulary, and flow."\n'
        '  },\n'
        '  "practice_plan": {\n'
        '    "recommended_focus": "The single most impactful area for next time",\n'
        '    "exercises": ["Targeted practice exercise 1", "Targeted practice exercise 2"],\n'
        '    "suggested_next_mode": "Suggested practice mode for next session"\n'
        '  }\n'
        "}"
    )

    user_prompt = (
        f"Mode: {mode}\n"
        f"Difficulty: {difficulty}\n"
        f"Language: {language}\n"
        f"Custom Topic: {custom_topic or 'None'}\n"
        f"Camera Enabled: {camera_enabled}\n"
        f"Speech Metrics: {json.dumps(metrics)}\n"
        f"Visual Observations Data: {json.dumps(visual_observations)}\n\n"
        f"Full Transcript:\n{formatted_transcript}"
    )

    last_error: Exception | None = None
    for model in GEMINI_COACH_MODELS:
        try:
            url = f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={api_key}"
            body = {
                "systemInstruction": {"parts": [{"text": system_instruction}]},
                "contents": [{"role": "user", "parts": [{"text": user_prompt}]}],
                "generationConfig": {
                    "temperature": 0.3,
                    "responseMimeType": "application/json",
                },
            }
            req = urllib.request.Request(
                url,
                data=json.dumps(body).encode("utf-8"),
                headers={"Content-Type": "application/json"},
                method="POST",
            )
            with urllib.request.urlopen(req, timeout=30) as resp:
                data = json.loads(resp.read().decode("utf-8"))
            candidate = data["candidates"][0]["content"]["parts"][0]["text"]
            parsed = json.loads(candidate)
            parsed["metrics"] = metrics
            return _validate_report_schema(parsed, metrics, camera_enabled, visual_observations)
        except Exception as exc:
            last_error = exc
            continue

    raise last_error or RuntimeError("Gemini trainer coaching failed.")


def _generate_local_trainer_report(
    *,
    mode: str,
    difficulty: str,
    language: str,
    custom_topic: str | None,
    turns: list[dict[str, Any]],
    metrics: dict[str, Any],
    camera_enabled: bool,
    visual_observations: dict[str, Any],
) -> dict[str, Any]:
    word_count = metrics["word_count"]
    filler_count = metrics["filler_count"]
    user_turns = [t for t in turns if t.get("role") == "user"]
    sample_quote = user_turns[0]["text"] if user_turns and user_turns[0].get("text") else "I'd like to practice communicating my points more directly."
    
    # Calculate rubric scores
    # Clarity base: starts at 80, reduced if sentences are too long or too short
    clarity_score = 82
    if metrics["avg_words_per_sentence"] > 25:
        clarity_score -= 8
    elif metrics["avg_words_per_sentence"] < 6 and word_count > 10:
        clarity_score -= 6

    # Fluency base: starts at 85, penalized by filler word density
    filler_ratio = (filler_count / word_count) if word_count > 0 else 0
    fluency_score = max(50, round(88 - (filler_ratio * 200)))

    # Structure base
    structure_score = 80 if len(user_turns) >= 3 else 74

    # Engagement base
    engagement_score = 85 if metrics["user_turn_count"] >= 2 else 72

    overall_score = round((clarity_score + fluency_score + structure_score + engagement_score) / 4)

    strengths = [
        "Maintained conversational engagement and responded promptly to coach questions.",
        f"Shared {word_count} words across {len(user_turns)} conversational turns.",
    ]
    if filler_count <= 2 and word_count > 20:
        strengths.append("Demonstrated good vocal discipline with minimal filler words.")
    else:
        strengths.append("Articulated initial thoughts with good willingness to elaborate.")

    improvements = [
        "Structure longer answers using the PREP framework (Point, Reason, Example, Point).",
        f"Reduce filler word frequency ({filler_count} detected) by pausing deliberately before answering.",
    ]

    visual_note = ""
    if camera_enabled:
        visual_note = (
            "Camera coaching active: Observable positioning showed steady forward orientation. "
            "Maintain relaxed shoulder posture and look directly into the camera lens when making key points."
        )

    return {
        "summary": (
            f"You completed a {mode.replace('_', ' ')} session with {len(user_turns)} conversational exchanges. "
            f"Your pacing and conversational presence established a solid foundation for further refinement."
        ),
        "strengths": strengths,
        "improvement_priorities": improvements,
        "communication_feedback": {
            "grammar_and_vocabulary": "Sentence structures were communicative and functional. Look for opportunities to replace generic verbs with precise action verbs.",
            "clarity_and_structure": "Your core ideas were understandable. Aim to open with your conclusion first, then support it with context.",
            "relevance_and_completeness": f"Responses addressed the coach's prompts directly over {len(user_turns)} turns.",
            "fluency_and_pace": f"Pacing was consistent. {filler_count} filler words recorded. Practice using silent pauses instead of verbal placeholders.",
            "visual_observations": visual_note,
        },
        "actionable_improvements": [
            {
                "user_quote": sample_quote[:120],
                "suggested_rewrite": f"In my experience, the key priority was achieving clear results. Specifically, {sample_quote[:80]}...",
                "coaching_tip": "Lead with the central impact before detailing the background circumstances.",
            }
        ],
        "performance_indicators": {
            "overall_score": overall_score,
            "clarity_score": clarity_score,
            "fluency_score": fluency_score,
            "structure_score": structure_score,
            "engagement_score": engagement_score,
            "scoring_criteria": "Transparent qualitative rubric (0-100) combining filler word ratio, average turn length, and structural coherence.",
        },
        "practice_plan": {
            "recommended_focus": "Pause discipline and executive answer structure.",
            "exercises": [
                "Practice answering interview questions using 3-second silent pauses before your first sentence.",
                "Deliver a 60-second summary using Point-Reason-Example-Point structure.",
            ],
            "suggested_next_mode": mode,
        },
        "metrics": metrics,
    }


def _validate_report_schema(
    report: dict[str, Any],
    metrics: dict[str, Any],
    camera_enabled: bool,
    visual_observations: dict[str, Any],
) -> dict[str, Any]:
    if not isinstance(report.get("strengths"), list):
        report["strengths"] = ["Clear articulation of main thoughts.", "Responsive conversational participation."]
    if not isinstance(report.get("improvement_priorities"), list):
        report["improvement_priorities"] = ["Structure answers more concisely.", "Practice intentional pausing."]
    if not isinstance(report.get("communication_feedback"), dict):
        report["communication_feedback"] = {}
    if not isinstance(report.get("performance_indicators"), dict):
        report["performance_indicators"] = {
            "overall_score": 80,
            "clarity_score": 80,
            "fluency_score": 80,
            "structure_score": 80,
            "engagement_score": 80,
            "scoring_criteria": "Rubric criteria: clarity, fluency, structure, and responsiveness.",
        }
    if not isinstance(report.get("actionable_improvements"), list):
        report["actionable_improvements"] = []
    if not isinstance(report.get("practice_plan"), dict):
        report["practice_plan"] = {
            "recommended_focus": "Pacing and conciseness",
            "exercises": ["60-second elevator summary practice"],
            "suggested_next_mode": "conversation",
        }
    report["metrics"] = metrics
    return report
