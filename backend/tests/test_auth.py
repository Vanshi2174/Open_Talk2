from __future__ import annotations

import unittest
from app import create_app
from app.config import TestConfig
from app.models.base import db
from app.models.user import User


class AuthTests(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()
        with self.app.app_context():
            db.create_all()

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

    def test_registration_success(self) -> None:
        res = self.client.post(
            "/api/auth/register",
            json={
                "name": "Jane Doe",
                "email": "Jane@Example.com",
                "password": "SecurePassword123",
                "confirmPassword": "SecurePassword123",
            },
            headers=self._csrf_headers(),
        )
        self.assertEqual(res.status_code, 201)
        data = res.get_json()
        self.assertIn("user", data)
        self.assertEqual(data["user"]["name"], "Jane Doe")
        self.assertEqual(data["user"]["email"], "jane@example.com")
        self.assertNotIn("password", data["user"])
        self.assertNotIn("password_hash", data["user"])

        # Check in DB
        with self.app.app_context():
            user = User.find_by_email("jane@example.com")
            self.assertIsNotNone(user)
            self.assertNotEqual(user.password_hash, "SecurePassword123")
            self.assertTrue(user.check_password("SecurePassword123"))

    def test_registration_duplicate_email(self) -> None:
        payload = {
            "name": "User One",
            "email": "duplicate@example.com",
            "password": "Password123",
            "confirmPassword": "Password123",
        }
        res1 = self.client.post("/api/auth/register", json=payload, headers=self._csrf_headers())
        self.assertEqual(res1.status_code, 201)

        # Attempt to register same email (case insensitive) with updated csrf cookie
        payload["email"] = "DUPLICATE@example.com"
        res2 = self.client.post("/api/auth/register", json=payload, headers=self._csrf_headers())
        self.assertEqual(res2.status_code, 409)
        self.assertEqual(res2.get_json()["error"], "conflict")

    def test_registration_validation_errors(self) -> None:
        # Mismatched passwords
        res = self.client.post(
            "/api/auth/register",
            json={
                "name": "Jane",
                "email": "jane@example.com",
                "password": "Password123",
                "confirmPassword": "DifferentPassword456",
            },
            headers=self._csrf_headers(),
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("confirmPassword", res.get_json()["field_errors"])

        # Password without number
        res = self.client.post(
            "/api/auth/register",
            json={
                "name": "Jane",
                "email": "jane@example.com",
                "password": "OnlyLettersHere",
                "confirmPassword": "OnlyLettersHere",
            },
            headers=self._csrf_headers(),
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("password", res.get_json()["field_errors"])

        # Password too short
        res = self.client.post(
            "/api/auth/register",
            json={
                "name": "Jane",
                "email": "jane@example.com",
                "password": "P1",
                "confirmPassword": "P1",
            },
            headers=self._csrf_headers(),
        )
        self.assertEqual(res.status_code, 400)
        self.assertIn("password", res.get_json()["field_errors"])

    def test_login_success_and_session_persistence(self) -> None:
        # Register first
        self.client.post(
            "/api/auth/register",
            json={
                "name": "Active User",
                "email": "active@example.com",
                "password": "Password123",
                "confirmPassword": "Password123",
            },
            headers=self._csrf_headers(),
        )

        # Clear cookies by creating a fresh client
        client2 = self.app.test_client()

        # Login
        login_res = client2.post(
            "/api/auth/login",
            json={"email": "active@example.com", "password": "Password123"},
            headers=self._csrf_headers(client2),
        )
        self.assertEqual(login_res.status_code, 200)
        data = login_res.get_json()
        self.assertEqual(data["user"]["email"], "active@example.com")

        # Test session persistence via /api/auth/me
        me_res = client2.get("/api/auth/me")
        self.assertEqual(me_res.status_code, 200)
        me_data = me_res.get_json()
        self.assertTrue(me_data["authenticated"])
        self.assertEqual(me_data["user"]["email"], "active@example.com")

    def test_login_invalid_credentials(self) -> None:
        self.client.post(
            "/api/auth/register",
            json={
                "name": "Test User",
                "email": "test@example.com",
                "password": "Password123",
                "confirmPassword": "Password123",
            },
            headers=self._csrf_headers(),
        )

        # Wrong password
        res = self.client.post(
            "/api/auth/login",
            json={"email": "test@example.com", "password": "WrongPassword999"},
            headers=self._csrf_headers(),
        )
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.get_json()["error"], "unauthorized")

        # Non-existent user
        res = self.client.post(
            "/api/auth/login",
            json={"email": "nobody@example.com", "password": "Password123"},
            headers=self._csrf_headers(),
        )
        self.assertEqual(res.status_code, 401)

    def test_logout(self) -> None:
        self.client.post(
            "/api/auth/register",
            json={
                "name": "Logout User",
                "email": "logout@example.com",
                "password": "Password123",
                "confirmPassword": "Password123",
            },
            headers=self._csrf_headers(),
        )

        # Confirm logged in
        me_res = self.client.get("/api/auth/me")
        self.assertEqual(me_res.status_code, 200)

        # Logout (must include valid CSRF token as authenticated request)
        logout_res = self.client.post(
            "/api/auth/logout",
            headers=self._csrf_headers(),
        )
        self.assertEqual(logout_res.status_code, 200)

        # Confirm unauthenticated
        me_after = self.client.get("/api/auth/me")
        self.assertEqual(me_after.status_code, 401)
        self.assertFalse(me_after.get_json()["authenticated"])

    def test_unauthorized_access(self) -> None:
        # Accessing protected profile without being logged in
        res = self.client.get("/api/auth/users/1/profile")
        self.assertEqual(res.status_code, 401)
        self.assertEqual(res.get_json()["error"], "unauthorized")

    def test_user_isolation_cannot_access_other_user_data(self) -> None:
        # Register User A
        res_a = self.client.post(
            "/api/auth/register",
            json={
                "name": "User A",
                "email": "usera@example.com",
                "password": "Password123",
                "confirmPassword": "Password123",
            },
            headers=self._csrf_headers(),
        )
        user_a_id = res_a.get_json()["user"]["id"]

        # Register User B using another client
        client_b = self.app.test_client()
        res_b = client_b.post(
            "/api/auth/register",
            json={
                "name": "User B",
                "email": "userb@example.com",
                "password": "Password123",
                "confirmPassword": "Password123",
            },
            headers=self._csrf_headers(client_b),
        )
        user_b_id = res_b.get_json()["user"]["id"]

        # User A accessing User A's profile -> 200 OK
        res_own = self.client.get(f"/api/auth/users/{user_a_id}/profile")
        self.assertEqual(res_own.status_code, 200)
        self.assertEqual(res_own.get_json()["user"]["id"], user_a_id)

        # User A attempting to access User B's profile -> 403 Forbidden
        res_other = self.client.get(f"/api/auth/users/{user_b_id}/profile")
        self.assertEqual(res_other.status_code, 403)
        self.assertEqual(res_other.get_json()["error"], "forbidden")

    def test_csrf_authenticated_protection(self) -> None:
        self.client.post(
            "/api/auth/register",
            json={
                "name": "CSRF User",
                "email": "csrf@example.com",
                "password": "Password123",
                "confirmPassword": "Password123",
            },
            headers=self._csrf_headers(),
        )

        # Mutating request with invalid CSRF token -> 403
        bad_token_res = self.client.post(
            "/api/auth/logout",
            headers={"X-CSRF-Token": "invalid-token-123"},
        )
        self.assertEqual(bad_token_res.status_code, 403)

        # Mutating request from malicious origin -> 403
        bad_origin_res = self.client.post(
            "/api/auth/logout",
            headers={**self._csrf_headers(), "Origin": "http://malicious-attacker.com"},
        )
        self.assertEqual(bad_origin_res.status_code, 403)

    def test_csrf_allows_local_dev_origins(self) -> None:
        # Request originating from Vite dev server on port 5175 should succeed
        res = self.client.post(
            "/api/auth/register",
            json={
                "name": "Local Dev User",
                "email": "devorigin@example.com",
                "password": "Password123",
                "confirmPassword": "Password123",
            },
            headers={**self._csrf_headers(), "Origin": "http://localhost:5175"},
        )
        self.assertEqual(res.status_code, 201)


if __name__ == "__main__":
    unittest.main()
