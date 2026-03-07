"""
test_users.py — Unit tests for the users Blueprint (/api/v1/users).

Covers: list users (admin), get profile, update profile, password change,
        role change, delete user.
"""
import pytest
from unittest.mock import patch
from bson import ObjectId
from tests.conftest import (
    MOCK_ADMIN_USER,
    MOCK_ANALYST_USER,
    MOCK_GUEST_USER,
    _ADMIN_ID,
    _ANALYST_ID,
    _GUEST_ID,
)


# ===================================================================
# GET /api/v1/users  — admin only
# ===================================================================

class TestListUsers:

    def test_list_users_requires_admin(self, client, analyst_headers):
        resp = client.get("/api/v1/users/", headers=analyst_headers)
        assert resp.status_code == 403

    def test_list_users_guest_forbidden(self, client, guest_headers):
        resp = client.get("/api/v1/users/", headers=guest_headers)
        assert resp.status_code == 403

    def test_list_users_no_auth(self, client):
        resp = client.get("/api/v1/users/")
        assert resp.status_code == 401

    def test_list_users_admin_success(self, client, admin_headers):
        mock_users = [
            {"_id": ObjectId(), "username": "u1", "role": "analyst"},
        ]
        with patch("app.routes.users.user_service.get_all",
                   return_value=(mock_users, 1)):
            resp = client.get("/api/v1/users/", headers=admin_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["meta"]["total"] == 1

    def test_list_users_pagination_params(self, client, admin_headers):
        with patch("app.routes.users.user_service.get_all",
                   return_value=([], 100)):
            resp = client.get(
                "/api/v1/users/?page=2&limit=5", headers=admin_headers
            )
        assert resp.status_code == 200
        meta = resp.get_json()["meta"]
        assert meta["page"] == 2
        assert meta["limit"] == 5

    def test_list_users_invalid_page(self, client, admin_headers):
        resp = client.get(
            "/api/v1/users/?page=abc", headers=admin_headers
        )
        assert resp.status_code == 400


# ===================================================================
# GET /api/v1/users/<user_id> — own profile or admin
# ===================================================================

class TestGetUser:

    def test_get_own_profile(self, client, analyst_headers):
        """Users can view their own profile (g.current_user_id == username from JWT)."""
        # g.current_user_id is set from JWT["user"] which is the username
        with patch("app.routes.users.user_service.get_by_id",
                   return_value=MOCK_ANALYST_USER):
            resp = client.get(
                "/api/v1/users/testanalyst", headers=analyst_headers
            )
        assert resp.status_code == 200

    def test_get_other_profile_forbidden(self, client, analyst_headers):
        """Non-admin users cannot view other users' profiles."""
        other_id = str(ObjectId())
        resp = client.get(
            f"/api/v1/users/{other_id}", headers=analyst_headers
        )
        assert resp.status_code == 403

    def test_admin_can_view_any_profile(self, client, admin_headers):
        """Admin can view any profile."""
        target_id = str(ObjectId())
        mock_user = {"_id": ObjectId(target_id), "username": "someone", "role": "guest"}
        with patch("app.routes.users.user_service.get_by_id",
                   return_value=mock_user):
            resp = client.get(
                f"/api/v1/users/{target_id}", headers=admin_headers
            )
        assert resp.status_code == 200

    def test_get_user_not_found(self, client, admin_headers):
        fake_id = str(ObjectId())
        with patch("app.routes.users.user_service.get_by_id",
                   return_value=None):
            resp = client.get(
                f"/api/v1/users/{fake_id}", headers=admin_headers
            )
        assert resp.status_code == 404

    def test_get_user_no_auth(self, client):
        resp = client.get("/api/v1/users/testanalyst")
        assert resp.status_code == 401


# ===================================================================
# PATCH /api/v1/users/<user_id> — update profile
# ===================================================================

class TestUpdateUser:

    def test_update_own_username(self, client, analyst_headers):
        """Users can change their own username."""
        updated = {**MOCK_ANALYST_USER, "username": "newname"}
        with patch("app.routes.users.user_service.update_user",
                   return_value=updated):
            resp = client.patch(
                "/api/v1/users/testanalyst",
                json={"username": "newname"},
                headers=analyst_headers,
            )
        assert resp.status_code == 200

    def test_update_other_profile_forbidden(self, client, analyst_headers):
        """Non-admin cannot update another user's profile."""
        other_id = str(ObjectId())
        resp = client.patch(
            f"/api/v1/users/{other_id}",
            json={"username": "hacked"},
            headers=analyst_headers,
        )
        assert resp.status_code == 403

    def test_username_too_short(self, client, analyst_headers):
        resp = client.patch(
            "/api/v1/users/testanalyst",
            json={"username": "ab"},
            headers=analyst_headers,
        )
        assert resp.status_code == 422

    def test_username_too_long(self, client, analyst_headers):
        resp = client.patch(
            "/api/v1/users/testanalyst",
            json={"username": "x" * 31},
            headers=analyst_headers,
        )
        assert resp.status_code == 422

    def test_update_invalid_email(self, client, analyst_headers):
        resp = client.patch(
            "/api/v1/users/testanalyst",
            json={"email": "not-an-email"},
            headers=analyst_headers,
        )
        assert resp.status_code == 422

    def test_update_valid_email(self, client, analyst_headers):
        updated = {**MOCK_ANALYST_USER, "email": "new@example.com"}
        with patch("app.routes.users.user_service.update_user",
                   return_value=updated):
            resp = client.patch(
                "/api/v1/users/testanalyst",
                json={"email": "new@example.com"},
                headers=analyst_headers,
            )
        assert resp.status_code == 200

    def test_empty_update_returns_400(self, client, analyst_headers):
        resp = client.patch(
            "/api/v1/users/testanalyst",
            json={},
            headers=analyst_headers,
        )
        assert resp.status_code == 400

    def test_user_not_found_on_update(self, client, admin_headers):
        fake_id = str(ObjectId())
        with patch("app.routes.users.user_service.update_user",
                   return_value=None):
            resp = client.patch(
                f"/api/v1/users/{fake_id}",
                json={"username": "anything"},
                headers=admin_headers,
            )
        assert resp.status_code == 404

    def test_duplicate_username_conflict(self, client, analyst_headers):
        with patch("app.routes.users.user_service.update_user",
                   side_effect=ValueError("Username already taken.")):
            resp = client.patch(
                "/api/v1/users/testanalyst",
                json={"username": "taken"},
                headers=analyst_headers,
            )
        assert resp.status_code == 409


# ===================================================================
# Password change
# ===================================================================

class TestPasswordChange:

    def test_change_own_password_success(self, client, analyst_headers):
        """Valid password update returns 200."""
        updated = {**MOCK_ANALYST_USER}
        with patch("app.routes.users.user_service.update_user",
                   return_value=updated):
            resp = client.patch(
                "/api/v1/users/testanalyst",
                json={"password": "StrongPass1"},  # pragma: allowlist secret
                headers=analyst_headers,
            )
        assert resp.status_code == 200

    def test_weak_password_rejected(self, client, analyst_headers):
        """Password without uppercase + digit returns 422."""
        resp = client.patch(
            "/api/v1/users/testanalyst",
            json={"password": "weakpass"},  # pragma: allowlist secret
            headers=analyst_headers,
        )
        assert resp.status_code == 422

    def test_short_password_rejected(self, client, analyst_headers):
        """Password under 8 chars returns 422."""
        resp = client.patch(
            "/api/v1/users/testanalyst",
            json={"password": "Ab1"},  # pragma: allowlist secret
            headers=analyst_headers,
        )
        assert resp.status_code == 422

    def test_change_others_password_forbidden(self, client, admin_headers):
        """Even admin cannot change another user's password."""
        target_id = str(ObjectId())
        resp = client.patch(
            f"/api/v1/users/{target_id}",
            json={"password": "StrongPass1"},  # pragma: allowlist secret
            headers=admin_headers,
        )
        assert resp.status_code == 403


# ===================================================================
# Role change via user patch
# ===================================================================

class TestRoleChange:

    def test_analyst_cannot_change_role(self, client, analyst_headers):
        """Non-admin users cannot change roles."""
        resp = client.patch(
            "/api/v1/users/testanalyst",
            json={"role": "admin"},
            headers=analyst_headers,
        )
        assert resp.status_code == 403

    def test_admin_can_change_role(self, client, admin_headers):
        """Admin can change a user's role."""
        target_id = str(ObjectId())
        updated = {"_id": ObjectId(target_id), "role": "analyst"}
        with patch("app.routes.users.user_service.update_user",
                   return_value=updated):
            resp = client.patch(
                f"/api/v1/users/{target_id}",
                json={"role": "analyst"},
                headers=admin_headers,
            )
        assert resp.status_code == 200

    def test_invalid_role_rejected(self, client, admin_headers):
        target_id = str(ObjectId())
        resp = client.patch(
            f"/api/v1/users/{target_id}",
            json={"role": "superadmin"},
            headers=admin_headers,
        )
        assert resp.status_code == 422


# ===================================================================
# is_active change via user patch
# ===================================================================

class TestIsActiveChange:

    def test_analyst_cannot_change_active_status(self, client, analyst_headers):
        resp = client.patch(
            "/api/v1/users/testanalyst",
            json={"is_active": False},
            headers=analyst_headers,
        )
        assert resp.status_code == 403

    def test_admin_can_change_active(self, client, admin_headers):
        target_id = str(ObjectId())
        updated = {"_id": ObjectId(target_id), "is_active": False}
        with patch("app.routes.users.user_service.update_user",
                   return_value=updated):
            resp = client.patch(
                f"/api/v1/users/{target_id}",
                json={"is_active": False},
                headers=admin_headers,
            )
        assert resp.status_code == 200


# ===================================================================
# DELETE /api/v1/users/<user_id>  — admin only
# ===================================================================

class TestDeleteUser:

    def test_delete_requires_admin(self, client, analyst_headers):
        resp = client.delete(
            "/api/v1/users/testanalyst", headers=analyst_headers
        )
        assert resp.status_code == 403

    def test_delete_user_success(self, client, admin_headers):
        target_id = str(ObjectId())
        with patch("app.routes.users.user_service.delete_user",
                   return_value=True):
            resp = client.delete(
                f"/api/v1/users/{target_id}", headers=admin_headers
            )
        assert resp.status_code == 204

    def test_delete_user_not_found(self, client, admin_headers):
        fake_id = str(ObjectId())
        with patch("app.routes.users.user_service.delete_user",
                   return_value=False):
            resp = client.delete(
                f"/api/v1/users/{fake_id}", headers=admin_headers
            )
        assert resp.status_code == 404

    def test_delete_no_auth(self, client):
        resp = client.delete("/api/v1/users/testanalyst")
        assert resp.status_code == 401
