import unittest

from app import create_app
from app.config import TestConfig


class HealthEndpointTests(unittest.TestCase):
    def setUp(self) -> None:
        self.app = create_app(TestConfig)
        self.client = self.app.test_client()

    def test_health_returns_ok(self) -> None:
        response = self.client.get("/api/health")
        self.assertEqual(response.status_code, 200)
        payload = response.get_json()
        self.assertEqual(payload["status"], "ok")
        self.assertEqual(payload["service"], "open-talk-api")
        self.assertEqual(payload["phase"], 4)


if __name__ == "__main__":
    unittest.main()
