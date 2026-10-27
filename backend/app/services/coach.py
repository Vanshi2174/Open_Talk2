from __future__ import annotations

import json
import re
import urllib.error
import urllib.request
from typing import Any

GEMINI_MODELS = (
    "gemini-2.0-flash",
    "gemini-2.5-flash",
    "gemini-flash-latest",
)

FILLER_PHRASES = (
    "you know",
    "i mean",
    "kind of",
    "sort of",
    "i guess",
)
FILLER_WORDS = {"um", "uh", "er", "ah", "like", "basically", "actually", "literally"}


def generate_coaching(
    *,
    mode: str,
    difficulty: str,
    prompt_text: str,
    transcript: str,
    api_key: str = "",
) -> tuple[dict[str, Any], str]:
    if api_key.strip():
        try:
            return _from_gemini(
                mode=mode,
                difficulty=difficulty,
                prompt_text=prompt_text,
                transcript=transcript,
                api_key=api_key.strip(),
            ), "gemini"
        except Exception:
            pass
    return _from_local(mode=mode, difficulty=difficulty, transcript=transcript), "local"


def _from_gemini(
    *,
    mode: str,
    difficulty: str,
    prompt_text: str,
    transcript: str,
    api_key: str,
) -> dict[str, Any]:
    instruction = (
        "You are a communication coach for spoken English practice. "
        "Review the speaker's transcript only. Do not invent acoustic scores, "
        "pronunciation grades, or claims you cannot observe from text. "
        "Return JSON only with keys: summary (string), strengths (array of 2-4 short strings), "
        "improvements (array of 2-4 short strings), grammar_notes (array of strings), "
        "clarity_notes (array of strings), rewritten_example (one improved version of their answer, "
        "same meaning, spoken and natural), metrics (object with word_count, sentence_count, "
        "filler_count, avg_words_per_sentence as numbers)."
    )
    user_text = (
        f"Mode: {mode}\nDifficulty: {difficulty}\nPrompt: {prompt_text}\n\n"
        f"Transcript:\n{transcript}"
    )
    last_error: Exception | None = None
    for model in GEMINI_MODELS:
        try:
            payload = _gemini_request(model, api_key, instruction, user_text)
            return _normalize_report(payload, transcript)
        except Exception as exc:
            last_error = exc
            continue
    raise last_error or RuntimeError("Gemini coaching failed.")


def _gemini_request(model: str, api_key: str, system: str, user_text: str) -> dict[str, Any]:
    url = (
        "https://generativelanguage.googleapis.com/v1beta/models/"
        f"{model}:generateContent?key={api_key}"
    )
    body = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user_text}]}],
        "generationConfig": {
            "temperature": 0.4,
            "responseMimeType": "application/json",
        },
    }
    request = urllib.request.Request(
        url,
        data=json.dumps(body).encode("utf-8"),
        headers={"Content-Type": "application/json"},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=25) as response:
            raw = json.loads(response.read().decode("utf-8"))
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode("utf-8", errors="replace")
        raise RuntimeError(f"Gemini HTTP {exc.code}: {detail[:400]}") from exc

    text = (
        raw.get("candidates", [{}])[0]
        .get("content", {})
        .get("parts", [{}])[0]
        .get("text", "")
    )
    if not text:
        raise RuntimeError("Gemini returned an empty coaching response.")
    return _parse_json_object(text)


def _parse_json_object(text: str) -> dict[str, Any]:
    try:
        payload = json.loads(text)
        if isinstance(payload, dict):
            return payload
    except json.JSONDecodeError:
        pass
    start = text.find("{")
    end = text.rfind("}")
    if start >= 0 and end > start:
        payload = json.loads(text[start : end + 1])
        if isinstance(payload, dict):
            return payload
    raise ValueError("Could not parse coaching JSON.")


def _from_local(*, mode: str, difficulty: str, transcript: str) -> dict[str, Any]:
    cleaned = re.sub(r"\s+", " ", transcript).strip()
    sentences = [part.strip() for part in re.split(r"[.!?]+", cleaned) if part.strip()]
    words = re.findall(r"[A-Za-z']+", cleaned.lower())
    word_count = len(words)
    sentence_count = max(len(sentences), 1 if cleaned else 0)
    filler_count = _count_fillers(cleaned.lower())
    avg = round(word_count / sentence_count, 1) if sentence_count else 0.0

    strengths: list[str] = []
    improvements: list[str] = []
    grammar_notes: list[str] = []
    clarity_notes: list[str] = []

    if word_count >= 40:
        strengths.append("You gave enough detail for a listener to follow the situation.")
    elif word_count >= 18:
        strengths.append("You answered with a complete thought instead of a one-word reply.")
    else:
        improvements.append("Add one concrete example so the listener can picture what happened.")

    if sentence_count >= 2:
        strengths.append("You used more than one sentence, which helps the answer land.")
    if 8 <= avg <= 22:
        strengths.append("Sentence length is easy to follow out loud.")
    elif avg > 28:
        improvements.append("Break long sentences into two so the point is easier to hear.")
        clarity_notes.append("A few sentences run long. Pause, then start the next idea.")
    elif 0 < avg < 8:
        improvements.append("Join a couple of short fragments into full sentences.")

    if filler_count >= 3:
        improvements.append("Cut filler phrases such as “um”, “like”, or “you know”.")
        clarity_notes.append(f"Heard about {filler_count} filler words or phrases in this transcript.")
    elif filler_count == 0 and word_count >= 20:
        strengths.append("The transcript has few obvious filler words.")

    if cleaned and cleaned[0].islower():
        grammar_notes.append("Start with a capital letter; it reads more like a finished answer.")
    if cleaned and cleaned[-1] not in ".!?":
        grammar_notes.append("End the last sentence with a period so the close is clear.")

    lowered = cleaned.lower()
    if mode == "interview" and "i" in words[:6]:
        strengths.append("You started from your own action, which interviewers can follow.")
    if mode == "public_speaking" and not any(
        marker in lowered for marker in ("first", "today", "i want", "let me")
    ):
        improvements.append("Open with one clear line that tells the room what this is about.")
    if mode == "conversation" and word_count > 90:
        improvements.append("Keep everyday replies shorter, then invite the other person in.")
    if difficulty == "stretch" and word_count < 50:
        improvements.append("For a stretch prompt, name the tension and what you did next.")

    if not strengths:
        strengths.append("You showed up and put words on the page. That is the start of practice.")
    if not improvements:
        improvements.append("On the next pass, add one specific result or next step.")
    if not grammar_notes:
        grammar_notes.append("No glaring grammar issues stood out from the transcript alone.")
    if not clarity_notes:
        clarity_notes.append("Keep one idea per sentence and drop extra hedging.")

    rewritten = _rewrite_local(cleaned)
    summary = (
        f"Local transcript review for a {difficulty.replace('_', ' ')} {mode.replace('_', ' ')} "
        f"session: {word_count} words across {sentence_count} sentence"
        f"{'s' if sentence_count != 1 else ''}."
    )
    return {
        "summary": summary,
        "strengths": strengths[:4],
        "improvements": improvements[:4],
        "grammar_notes": grammar_notes[:4],
        "clarity_notes": clarity_notes[:4],
        "rewritten_example": rewritten,
        "metrics": {
            "word_count": word_count,
            "sentence_count": sentence_count,
            "filler_count": filler_count,
            "avg_words_per_sentence": avg,
        },
    }


def _count_fillers(text: str) -> int:
    count = 0
    remaining = f" {text} "
    for phrase in FILLER_PHRASES:
        matches = len(re.findall(rf"\b{re.escape(phrase)}\b", remaining))
        count += matches
        remaining = re.sub(rf"\b{re.escape(phrase)}\b", " ", remaining)
    tokens = re.findall(r"[a-z']+", remaining)
    count += sum(1 for token in tokens if token in FILLER_WORDS)
    return count


def _rewrite_local(transcript: str) -> str:
    text = transcript.strip()
    if not text:
        return ""
    text = re.sub(r"\b(um+|uh+|er+|ah+)\b[, ]*", "", text, flags=re.IGNORECASE)
    text = re.sub(r"\s+", " ", text).strip()
    if text:
        text = text[0].upper() + text[1:]
    if text and text[-1] not in ".!?":
        text += "."
    return text


def _normalize_report(payload: dict[str, Any], transcript: str) -> dict[str, Any]:
    local = _from_local(mode="conversation", difficulty="standard", transcript=transcript)
    metrics_in = payload.get("metrics") if isinstance(payload.get("metrics"), dict) else {}
    metrics = local["metrics"] | {
        key: metrics_in[key]
        for key in ("word_count", "sentence_count", "filler_count", "avg_words_per_sentence")
        if key in metrics_in
    }
    return {
        "summary": str(payload.get("summary") or local["summary"]).strip(),
        "strengths": _string_list(payload.get("strengths"), local["strengths"]),
        "improvements": _string_list(payload.get("improvements"), local["improvements"]),
        "grammar_notes": _string_list(payload.get("grammar_notes"), local["grammar_notes"]),
        "clarity_notes": _string_list(payload.get("clarity_notes"), local["clarity_notes"]),
        "rewritten_example": str(
            payload.get("rewritten_example") or local["rewritten_example"]
        ).strip(),
        "metrics": metrics,
    }


def _string_list(value: Any, fallback: list[str]) -> list[str]:
    if not isinstance(value, list):
        return fallback
    items = [str(item).strip() for item in value if str(item).strip()]
    return items[:6] or fallback
