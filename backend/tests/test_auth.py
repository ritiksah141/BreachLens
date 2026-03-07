"""
test_auth.py — Authentication endpoint tests for BreachLens.

Covers test cases across:
  - POST /api/v1/auth/register
  - POST /api/v1/auth/login
  - GET  /api/v1/login  (Basic Auth — module requirement)
  - POST /api/v1/auth/logout
  - GET  /api/v1/auth/me
"""
import pytest
from unittest.mock import patch
from bson import ObjectId
from tests.conftest import MOCK_ANALYST_USER


# ---------------------------------------------------------------------------
# Registration tests
# ---------------------------------------------------------------------------

class TestRegister:

    def test_register_missing_fields_returns_422(self, client):
        """Missing required fields should return 422 with validation errors."""
        resp = client.post("/api/v1/auth/register", json={"username": "nopass"})
        assert resp.status_code == 422
        body = resp.get_json()
        assert body["status"] == "error"
        assert "errors" in body.get("details", {})

    def test_register_invalid_email_returns_422(self, client):
        """Invalid email format should fail validation."""
        resp = client.post("/api/v1/auth/register", json={
            "username": "validuser",
            "email": "not-an-email",
            "password": "ValidPass1",  # pragma: allowlist secret
        })
        assert resp.status_code == 422
        body = resp.get_json()
        assert "errors" in body.get("details", {})

    def test_register_weak_password_returns_422(self, client):
        """Passwords that fail complexity rules should be rejected."""
        resp = client.post("/api/v1/auth/register", json={
            "username": "validuser",
            "email": "user@test.com",
            "password": "weak",  # pragma: allowlist secret
        })
        assert resp.status_code == 422

    def test_register_admin_role_rejected(self, client):
        """Self-registering as admin must be rejected."""
        resp = client.post("/api/v1/auth/register", json={
            "username": "hackeradmin",
            "email": "hacker@test.com",
            "password": "ValidPass1",  # pragma: allowlist secret
            "role": "admin",
        })
        assert resp.status_code == 422

    def test_register_success(self, client):
        """Valid payload should create a user and return 201."""
        new_user = {
            "_id": ObjectId(),
            "username": "newuser",
            "email": "newuser@test.com",
            "role": "guest",
            "is_active": True,
        }
        with patch("app.routes.auth.auth_service.register", return_value=(new_user, None)):
            resp = client.post("/api/v1/auth/register", json={
                "username": "newuser",
                "email": "newuser@test.com",
                "password": "ValidPass1",  # pragma: allowlist secret
            })
        assert resp.status_code == 201
        assert resp.get_json()["status"] == "success"

    def test_register_duplicate_email_returns_409(self, client):
        """Duplicate registration should return 409 Conflict."""
        with patch(
            "app.routes.auth.auth_service.register",
            return_value=(None, "Email already registered."),
        ):
            resp = client.post("/api/v1/auth/register", json={
                "username": "dupuser",
                "email": "dup@test.com",
                "password": "ValidPass1",  # pragma: allowlist secret
            })
        assert resp.status_code == 409


# ---------------------------------------------------------------------------
# Login tests
# ---------------------------------------------------------------------------

class TestLogin:

    def test_login_missing_credentials_returns_400(self, client):
        """Login without email/password should return 400."""
        resp = client.post("/api/v1/auth/login", json={})
        assert resp.status_code == 400

    def test_login_wrong_password_returns_401(self, client):
        """Wrong credentials should return 401."""
        with patch(
            "app.routes.auth.auth_service.login",
            return_value=(None, "Invalid credentials."),
        ):
            resp = client.post("/api/v1/auth/login", json={
                "email": "user@test.com",
                "password": "WrongPass1",  # pragma: allowlist secret
            })
        assert resp.status_code == 401

    def test_login_success_returns_tokens(self, client):
        """Successful login should return a JWT token."""
        token_data = {
            "token": "mock.jwt.token",
            "token_type": "JWT",
            "expires_in": 3600,
            "user": {
                "_id": "507f1f77bcf86cd799439011",
                "username": "analyst",
                "email": "analyst@test.com",
                "role": "analyst",
                "admin": False,
            },
        }
        with patch("app.routes.auth.auth_service.login", return_value=(token_data, None)):
            resp = client.post("/api/v1/auth/login", json={
                "email": "analyst@test.com",
                "password": "ValidPass1",  # pragma: allowlist secret
            })
        assert resp.status_code == 200
        body = resp.get_json()
        assert "token" in body["data"]
        assert body["data"]["token_type"] == "JWT"


# ---------------------------------------------------------------------------
# Protected-route tests
# ---------------------------------------------------------------------------

class TestMeAndLogout:

    def test_me_requires_auth(self, client):
        """GET /me without a token should return 401."""
        resp = client.get("/api/v1/auth/me")
        assert resp.status_code == 401

    def test_me_returns_user_profile(self, client, analyst_headers):
        """Authenticated GET /me should return the user profile."""
        with patch(
            "app.routes.auth.auth_service.get_user_by_id",
            return_value=MOCK_ANALYST_USER,
        ):
            resp = client.get("/api/v1/auth/me", headers=analyst_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["data"]["role"] == "analyst"

    def test_logout_requires_auth(self, client):
        """POST /logout without a token should return 401."""
        resp = client.post("/api/v1/auth/logout")
        assert resp.status_code == 401

    def test_logout_success(self, client, analyst_headers):
        """Authenticated logout should return 204 No Content."""
        resp = client.post("/api/v1/auth/logout", headers=analyst_headers)
        assert resp.status_code == 204
