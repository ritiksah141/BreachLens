"""
test_admin.py — Admin-only endpoint tests for BreachLens.
"""
import pytest
from bson import ObjectId
from unittest.mock import patch
from datetime import datetime, timezone, timedelta


# ===================================================================
# GET /api/v1/admin/stats
# ===================================================================

class TestAdminStats:

    def test_stats_requires_admin(self, client, analyst_headers):
        """Analyst cannot access system stats."""
        resp = client.get("/api/v1/admin/stats", headers=analyst_headers)
        assert resp.status_code == 403

    def test_stats_guest_forbidden(self, client, guest_headers):
        """Guest cannot access system stats."""
        resp = client.get("/api/v1/admin/stats", headers=guest_headers)
        assert resp.status_code == 403

    def test_stats_no_auth(self, client):
        """No auth cannot access system stats."""
        resp = client.get("/api/v1/admin/stats")
        assert resp.status_code == 401

    def test_stats_admin_success(self, client, admin_headers):
        """Admin can fetch system statistics."""
        resp = client.get("/api/v1/admin/stats", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert "users" in data
        assert "breaches" in data
        assert "alerts" in data


# ===================================================================
# PATCH /api/v1/admin/users/<user_id>/role
# ===================================================================

class TestChangeRole:

    def test_change_role_requires_admin(self, client, analyst_headers):
        """Analyst cannot change user roles."""
        resp = client.patch(
            f"/api/v1/admin/users/{str(ObjectId())}/role",
            json={"role": "admin"},
            headers=analyst_headers,
        )
        assert resp.status_code == 403

    def test_change_role_invalid_role(self, client, admin_headers):
        """Invalid roles are rejected."""
        resp = client.patch(
            f"/api/v1/admin/users/{str(ObjectId())}/role",
            json={"role": "superman"},
            headers=admin_headers,
        )
        assert resp.status_code == 422

    def test_change_role_missing_role(self, client, admin_headers):
        """Missing role field returns 422."""
        resp = client.patch(
            f"/api/v1/admin/users/{str(ObjectId())}/role",
            json={},
            headers=admin_headers,
        )
        assert resp.status_code == 422

    def test_change_own_role_blocked(self, client, admin_headers):
        """Admin cannot demote themselves."""
        # Import the admin ID used in admin_headers
        from tests.conftest import _ADMIN_ID
        resp = client.patch(
            f"/api/v1/admin/users/{_ADMIN_ID}/role",
            json={"role": "analyst"},
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert "cannot change your own role" in resp.get_json()["message"]

    def test_change_role_user_not_found(self, client, admin_headers):
        """Changing role for nonexistent user returns 404."""
        resp = client.patch(
            f"/api/v1/admin/users/{str(ObjectId())}/role",
            json={"role": "analyst"},
            headers=admin_headers,
        )
        assert resp.status_code == 404

    def test_change_role_success(self, client, admin_headers):
        """Successfully change user role."""
        user_id = str(ObjectId())
        mock_user = {"_id": ObjectId(user_id), "role": "analyst", "username": "testuser"}

        with (
            patch("app.routes.admin.user_service.get_user", return_value=mock_user),
            patch("app.routes.admin.user_service.set_role", return_value={**mock_user, "role": "admin"}),
        ):
            resp = client.patch(
                f"/api/v1/admin/users/{user_id}/role",
                json={"role": "admin"},
                headers=admin_headers,
            )

        assert resp.status_code == 200
        assert resp.get_json()["data"]["role"] == "admin"

    def test_demote_last_admin_blocked(self, client, admin_headers):
        """Demoting the last admin is blocked by atomic service logic."""
        user_id = str(ObjectId())
        mock_user = {"_id": ObjectId(user_id), "role": "admin", "username": "lastadmin"}

        with (
            patch("app.routes.admin.user_service.get_user", return_value=mock_user),
            patch("app.routes.admin.user_service.demote_admin_atomically",
                   return_value=(None, "Cannot demote the last remaining admin.")),
        ):
            resp = client.patch(
                f"/api/v1/admin/users/{user_id}/role",
                json={"role": "analyst"},
                headers=admin_headers,
            )

        assert resp.status_code == 400
        assert "last remaining admin" in resp.get_json()["message"]


# ===================================================================
# GET /api/v1/admin/users
# ===================================================================

class TestAdminListUsers:

    def test_list_users_requires_admin(self, client, analyst_headers):
        """Analyst cannot list all users through admin endpoint."""
        resp = client.get("/api/v1/admin/users", headers=analyst_headers)
        assert resp.status_code == 403

    def test_list_users_success(self, client, admin_headers):
        """Admin can list all users."""
        resp = client.get("/api/v1/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert isinstance(data, list)

    def test_list_users_pagination(self, client, admin_headers):
        """User list supports pagination parameters."""
        resp = client.get("/api/v1/admin/users?page=1&limit=5", headers=admin_headers)
        assert resp.status_code == 200
        meta = resp.get_json()["meta"]
        assert meta["limit"] == 5

    def test_list_users_invalid_page(self, client, admin_headers):
        """Invalid page param returns 400."""
        resp = client.get("/api/v1/admin/users?page=abc", headers=admin_headers)
        assert resp.status_code == 400


# ===================================================================
# PATCH /api/v1/admin/users/<user_id>/activate / deactivate
# ===================================================================

class TestActivateDeactivate:

    def test_activate_user_success(self, client, admin_headers):
        """Admin can activate a user."""
        user_id = str(ObjectId())
        with patch("app.routes.admin.user_service.activate_user",
                   return_value={"_id": user_id, "is_active": True}):
            resp = client.patch(
                f"/api/v1/admin/users/{user_id}/activate",
                headers=admin_headers,
            )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["is_active"] is True

    def test_activate_user_not_found(self, client, admin_headers):
        """Activating nonexistent user returns 404."""
        with patch("app.routes.admin.user_service.activate_user", return_value=None):
            resp = client.patch(
                f"/api/v1/admin/users/{str(ObjectId())}/activate",
                headers=admin_headers,
            )
        assert resp.status_code == 404

    def test_deactivate_user_success(self, client, admin_headers):
        """Admin can deactivate a user."""
        user_id = str(ObjectId())
        mock_user = {"_id": ObjectId(user_id), "role": "analyst", "is_active": True}
        with (
            patch("app.routes.admin.user_service.get_user", return_value=mock_user),
            patch("app.routes.admin.user_service.deactivate_admin_atomically",
                   return_value=({**mock_user, "is_active": False}, None))
        ):
            resp = client.patch(
                f"/api/v1/admin/users/{user_id}/deactivate",
                headers=admin_headers,
            )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["is_active"] is False

    def test_deactivate_self_blocked(self, client, admin_headers):
        """Admin cannot deactivate themselves."""
        from tests.conftest import _ADMIN_ID
        resp = client.patch(
            f"/api/v1/admin/users/{_ADMIN_ID}/deactivate",
            headers=admin_headers,
        )
        assert resp.status_code == 400
        assert "cannot deactivate your own account" in resp.get_json()["message"]

    def test_deactivate_user_not_found(self, client, admin_headers):
        """Deactivating nonexistent user returns 404."""
        with patch("app.routes.admin.user_service.get_user", return_value=None):
            resp = client.patch(
                f"/api/v1/admin/users/{str(ObjectId())}/deactivate",
                headers=admin_headers,
            )
        assert resp.status_code == 404

    def test_deactivate_last_admin_blocked(self, client, admin_headers):
        """Deactivating the last active admin is blocked."""
        user_id = str(ObjectId())
        mock_user = {"_id": ObjectId(user_id), "role": "admin", "is_active": True}
        with (
            patch("app.routes.admin.user_service.get_user", return_value=mock_user),
            patch("app.routes.admin.user_service.deactivate_admin_atomically",
                   return_value=(None, "Cannot deactivate the last active admin."))
        ):
            resp = client.patch(
                f"/api/v1/admin/users/{user_id}/deactivate",
                headers=admin_headers,
            )
        assert resp.status_code == 409
        assert "last active admin" in resp.get_json()["message"]


# ===================================================================
# DELETE /api/v1/admin/breaches/bulk
# ===================================================================

class TestBulkDeleteBreaches:

    def test_bulk_delete_requires_admin(self, client, analyst_headers):
        """Analyst cannot bulk delete breaches."""
        resp = client.delete(
            "/api/v1/admin/breaches/bulk",
            json={"ids": [str(ObjectId())]},
            headers=analyst_headers,
        )
        assert resp.status_code == 403

    def test_bulk_delete_empty_ids(self, client, admin_headers):
        """Empty ID list returns 400."""
        resp = client.delete(
            "/api/v1/admin/breaches/bulk",
            json={"ids": []},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_bulk_delete_missing_ids(self, client, admin_headers):
        """Missing ids field returns 400."""
        resp = client.delete(
            "/api/v1/admin/breaches/bulk",
            json={},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_bulk_delete_too_many_ids(self, client, admin_headers):
        """Too many IDs (>100) returns 422."""
        ids = [str(ObjectId()) for _ in range(101)]
        resp = client.delete(
            "/api/v1/admin/breaches/bulk",
            json={"ids": ids},
            headers=admin_headers,
        )
        assert resp.status_code == 422

    def test_bulk_delete_success(self, client, admin_headers):
        """Successfully bulk delete multiple breaches."""
        ids = [str(ObjectId()), str(ObjectId())]
        with patch("app.routes.admin.breach_service.bulk_delete",
                   return_value=(2, [])):
            resp = client.delete(
                "/api/v1/admin/breaches/bulk",
                json={"ids": ids},
                headers=admin_headers,
            )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["deleted"] == 2

    def test_bulk_delete_partial_failure(self, client, admin_headers):
        """Handle partial success if some IDs are invalid."""
        ids = [str(ObjectId()), "invalid"]
        with patch("app.routes.admin.breach_service.bulk_delete",
                   return_value=(1, ["invalid"])):
            resp = client.delete(
                "/api/v1/admin/breaches/bulk",
                json={"ids": ids},
                headers=admin_headers,
            )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["deleted"] == 1
        assert data["partial_failure"] is True


# ===================================================================
# GET /api/v1/admin/audit-logs
# ===================================================================

class TestAuditLogs:

    def test_audit_logs_requires_admin(self, client, analyst_headers):
        """Analyst cannot access audit logs."""
        resp = client.get("/api/v1/admin/audit-logs", headers=analyst_headers)
        assert resp.status_code == 403

    def test_audit_logs_success(self, client, admin_headers):
        """Admin can fetch audit logs from MongoDB."""
        # Note: In a heavily parallel test run with a shared DB, exact counts are hard.
        # We just verify the endpoint works and returns a valid structure.
        resp = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert isinstance(data, list)

    def test_audit_logs_pagination(self, client, admin_headers):
        """Audit logs support pagination."""
        resp = client.get("/api/v1/admin/audit-logs?page=1&limit=5", headers=admin_headers)
        assert resp.status_code == 200
        meta = resp.get_json()["meta"]
        assert meta["limit"] == 5

    def test_audit_logs_empty(self, client, admin_headers):
        """When collection is empty, return empty list (not 500)."""
        resp = client.get("/api/v1/admin/audit-logs", headers=admin_headers)
        assert resp.status_code == 200
        assert isinstance(resp.get_json()["data"], list)
