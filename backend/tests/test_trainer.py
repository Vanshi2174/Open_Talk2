from __future__ import annotations

import json
import unittest

from app import create_app
from app.config import TestConfig
from app.models.base import db
from app.services.trainer_coach import (
    compute_speech_metrics,
    generate_trainer_report,
    get_trainer_system_instruction,
)


class TestTrainerCoach(unittest.TestCase):
    def test_get_trainer_system_instruction(self):
        inst = get_trainer_system_instruction("interview", "advanced", "English")
        self.assertIn("mock job interview", inst.lower())
        self.assertIn("advanced", inst.lower())

        inst_hindi = get_trainer_system_instruction("conversation", "beginner", "Hindi")
        self.assertIn("hindi", inst_hindi.lower())

    def test_compute_speech_metrics(self):
        turns = [
            {"role": "user", "text": "Hello, um, I am practicing, you know, my speaking skills."},
            {"role": "model", "text": "That is wonderful to hear."},
            {"role": "user", "text": "Actually, I like to present clearly and directly."},
        ]
        metrics = compute_speech_metrics(turns, duration_seconds=60)
        self.assertEqual(metrics["user_turn_count"], 2)
        self.assertGreater(metrics["word_count"], 5)
        self.assertGreater(metrics["filler_count"], 0)
        self.assertGreater(metrics["words_per_minute"], 0)

    def test_generate_trainer_report_local(self):
        turns = [
            {"role": "user", "text": "I solved the customer issue by listening carefully and taking notes."},
            {"role": "model", "text": "What steps did you take next?"},
            {"role": "user", "text": "I followed up within twenty-four hours to make sure the resolution worked."},
        ]
        report, source = generate_trainer_report(
            mode="interview",
            difficulty="intermediate",
            language="English",
            custom_topic=None,
            turns=turns,
            duration_seconds=90,
            camera_enabled=True,
            visual_observations={"posture": "steady", "eye_contact": "good"},
            api_key="",
        )
        self.assertEqual(source, "local")
        self.assertIn("summary", report)
        self.assertIn("strengths", report)
        self.assertIn("communication_feedback", report)
        self.assertIn("performance_indicators", report)
        self.assertIn("practice_plan", report)
        self.assertIn("actionable_improvements", report)
        self.assertGreaterEqual(report["performance_indicators"]["overall_score"], 0)


class TestTrainerEndpoints(unittest.TestCase):
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

    def _csrf_headers(self, client=None) -> dict[str, str]:
        c = client or self.client
        cookie = c.get_cookie("csrf_token")
        if cookie:
            token = cookie.value
        else:
            res = c.get("/api/auth/csrf-token")
            token = res.get_json()["csrf_token"]
        return {"X-CSRF-Token": token}

    def _register(self, email="trainer_user@example.com", password="Password123!") -> None:
        self.client.post(
            "/api/auth/register",
            json={
                "name": "Trainer Tester",
                "email": email,
                "password": password,
                "confirmPassword": password,
            },
            headers=self._csrf_headers(),
        )

    def test_status_endpoint(self):
        resp = self.client.get("/api/trainer/status")
        self.assertEqual(resp.status_code, 200)
        data = resp.get_json()
        self.assertEqual(data["status"], "ready")
        self.assertIn("interview", data["supported_modes"])

    def test_create_session_unauthorized(self):
        # Fresh client without cookies
        anon_client = self.app.test_client()
        res = anon_client.get("/api/auth/csrf-token")
        token = res.get_json()["csrf_token"]
        resp = anon_client.post(
            "/api/trainer/sessions",
            json={"id": "test-id"},
            headers={"X-CSRF-Token": token},
        )
        self.assertEqual(resp.status_code, 401)

    def test_create_session_validation(self):
        resp = self.client.post(
            "/api/trainer/sessions",
            json={"id": "", "mode": "invalid-mode", "difficulty": "invalid"},
            headers=self._csrf_headers(),
        )
        self.assertEqual(resp.status_code, 400)
        data = resp.get_json()
        self.assertIn("field_errors", data)

    def test_save_and_retrieve_trainer_session(self):
        session_id = "trainer-uuid-12345"
        payload = {
            "id": session_id,
            "mode": "interview",
            "difficulty": "intermediate",
            "language": "English",
            "duration_seconds": 120,
            "target_duration_minutes": 5,
            "camera_enabled": True,
            "transcript": "User: Hello\nAI: Welcome\nUser: Thank you",
            "turns": [
                {"role": "user", "text": "Hello"},
                {"role": "model", "text": "Welcome to your interview practice."},
                {"role": "user", "text": "Thank you, I am ready."},
            ],
            "visual_observations": {"posture": "centered", "orientation": "facing camera"},
        }

        # Create
        post_resp = self.client.post(
            "/api/trainer/sessions",
            json=payload,
            headers=self._csrf_headers(),
        )
        self.assertEqual(post_resp.status_code, 201)
        post_data = post_resp.get_json()
        self.assertEqual(post_data["session"]["id"], session_id)
        self.assertEqual(post_data["session"]["mode"], "interview")

        # List
        list_resp = self.client.get("/api/trainer/sessions")
        self.assertEqual(list_resp.status_code, 200)
        list_data = list_resp.get_json()
        self.assertEqual(len(list_data["sessions"]), 1)
        self.assertEqual(list_data["sessions"][0]["id"], session_id)

        # Get by ID
        get_resp = self.client.get(f"/api/trainer/sessions/{session_id}")
        self.assertEqual(get_resp.status_code, 200)
        get_data = get_resp.get_json()
        self.assertEqual(get_data["session"]["id"], session_id)
        self.assertTrue(get_data["session"]["camera_enabled"])
        self.assertIn("coaching", get_data["session"])

    def test_cross_user_isolation(self):
        session_id = "user-a-trainer-session"
        self.client.post(
            "/api/trainer/sessions",
            json={
                "id": session_id,
                "mode": "public_speaking",
                "difficulty": "beginner",
                "language": "English",
                "duration_seconds": 60,
                "turns": [{"role": "user", "text": "Speaking intro"}],
            },
            headers=self._csrf_headers(),
        )

        # User B registers & logs in on a new client
        client_b = self.app.test_client()
        res = client_b.get("/api/auth/csrf-token")
        csrf_b = res.get_json()["csrf_token"]
        client_b.post(
            "/api/auth/register",
            json={
                "name": "User B",
                "email": "userb@example.com",
                "password": "Password123!",
                "confirmPassword": "Password123!",
            },
            headers={"X-CSRF-Token": csrf_b},
        )

        # User B cannot access User A's session
        get_resp = client_b.get(f"/api/trainer/sessions/{session_id}")
        self.assertEqual(get_resp.status_code, 404)

        # User B cannot overwrite User A's session id
        conflict_resp = client_b.post(
            "/api/trainer/sessions",
            json={
                "id": session_id,
                "mode": "conversation",
                "difficulty": "beginner",
                "language": "English",
                "duration_seconds": 30,
                "turns": [],
            },
            headers=self._csrf_headers(client_b),
        )
        self.assertEqual(conflict_resp.status_code, 409)
