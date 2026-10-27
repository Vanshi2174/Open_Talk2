from __future__ import annotations

import unittest
from unittest.mock import patch

from app import create_app
from app.config import TestConfig
from app.models.base import db
from app.services.coach import generate_coaching


class SessionTests(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()
        self._register()

    def tearDown(self) -> None:
        with self.app.app_context():
            db.session.remove()
            db.drop_all()

    def _csrf_headers(self) -> dict[str, str]:
        cookie = self.client.get_cookie("csrf_token")
        if cookie:
            token = cookie.value
        else:
            res = self.client.get("/api/auth/csrf-token")
            token = res.get_json()["csrf_token"]
        return {"X-CSRF-Token": token}

    def _register(self) -> None:
        self.client.post(
            "/api/auth/register",
            json={
                "name": "Ava Coach",
                "email": "ava@example.com",
                "password": "Password123",
                "confirmPassword": "Password123",
            },
            headers=self._csrf_headers(),
        )

    def _payload(self, **overrides) -> dict:
        data = {
            "id": "11111111-1111-1111-1111-111111111111",
            "mode": "interview",
            "difficulty": "standard",
            "prompt": {
                "id": "p1",
                "title": "Disagreement",
                "text": "Tell me about a time you handled disagreement at work.",
            },
            "transcript": (
                "When a teammate and I disagreed on the launch date, I asked to walk "
                "through the risks together. We agreed on a smaller first release."
            ),
            "submitted_at": "2026-10-27T12:00:00+00:00",
        }
        data.update(overrides)
        return data

    def test_unauthenticated_create_is_rejected(self) -> None:
        guest = self.app.test_client()
        token = guest.get("/api/auth/csrf-token").get_json()["csrf_token"]
        res = guest.post(
            "/api/sessions",
            json=self._payload(),
            headers={"X-CSRF-Token": token},
        )
        self.assertEqual(res.status_code, 401)

    def test_create_session_stores_local_coaching(self) -> None:
        res = self.client.post(
            "/api/sessions",
            json=self._payload(),
            headers=self._csrf_headers(),
        )
        self.assertEqual(res.status_code, 201)
        session = res.get_json()["session"]
        self.assertEqual(session["mode"], "interview")
        self.assertEqual(session["coaching_source"], "local")
        self.assertIn("summary", session["coaching"])
        self.assertTrue(session["coaching"]["strengths"])

        listed = self.client.get("/api/sessions")
        self.assertEqual(listed.status_code, 200)
        body = listed.get_json()
        self.assertEqual(body["stats"]["total"], 1)
        self.assertEqual(len(body["sessions"]), 1)

        detail = self.client.get(f"/api/sessions/{session['id']}")
        self.assertEqual(detail.status_code, 200)
        self.assertIn("teammate", detail.get_json()["session"]["transcript"])

    def test_create_session_is_idempotent_for_owner(self) -> None:
        payload = self._payload()
        first = self.client.post("/api/sessions", json=payload, headers=self._csrf_headers())
        second = self.client.post("/api/sessions", json=payload, headers=self._csrf_headers())
        self.assertEqual(first.status_code, 201)
        self.assertEqual(second.status_code, 200)
        self.assertEqual(first.get_json()["session"]["id"], second.get_json()["session"]["id"])

    def test_validation_requires_transcript(self) -> None:
        res = self.client.post(
            "/api/sessions",
            json=self._payload(transcript=""),
            headers=self._csrf_headers(),
        )
        self.assertEqual(res.status_code, 400)
        self.assertEqual(res.get_json()["error"], "validation_error")

    def test_other_user_cannot_read_session(self) -> None:
        created = self.client.post(
            "/api/sessions",
            json=self._payload(),
            headers=self._csrf_headers(),
        )
        session_id = created.get_json()["session"]["id"]

        other = self.app.test_client()
        other.post(
            "/api/auth/register",
            json={
                "name": "Other User",
                "email": "other@example.com",
                "password": "Password123",
                "confirmPassword": "Password123",
            },
            headers={"X-CSRF-Token": other.get("/api/auth/csrf-token").get_json()["csrf_token"]},
        )
        res = other.get(f"/api/sessions/{session_id}")
        self.assertEqual(res.status_code, 404)

    def test_local_coach_counts_fillers(self) -> None:
        report, source = generate_coaching(
            mode="conversation",
            difficulty="warm_up",
            prompt_text="Catch up with a colleague.",
            transcript="Um I was like basically going to, you know, ask for help.",
            api_key="",
        )
        self.assertEqual(source, "local")
        self.assertGreaterEqual(report["metrics"]["filler_count"], 2)
        self.assertTrue(report["rewritten_example"])

    def test_gemini_path_is_used_when_key_is_set(self) -> None:
        fake = {
            "summary": "Clear interview story.",
            "strengths": ["Named the disagreement."],
            "improvements": ["Add the result."],
            "grammar_notes": ["None major."],
            "clarity_notes": ["Keep the close short."],
            "rewritten_example": "When we disagreed, I walked through the risks and we shipped a smaller first release.",
            "metrics": {
                "word_count": 20,
                "sentence_count": 2,
                "filler_count": 0,
                "avg_words_per_sentence": 10,
            },
        }
        with patch("app.routes.sessions.generate_coaching", return_value=(fake, "gemini")):
            res = self.client.post(
                "/api/sessions",
                json=self._payload(id="22222222-2222-2222-2222-222222222222"),
                headers=self._csrf_headers(),
            )
        self.assertEqual(res.status_code, 201)
        self.assertEqual(res.get_json()["session"]["coaching_source"], "gemini")
        self.assertEqual(res.get_json()["session"]["coaching"]["summary"], "Clear interview story.")


if __name__ == "__main__":
    unittest.main()
