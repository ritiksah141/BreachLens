"""
test_admin.py — Unit tests for the admin Blueprint (/api/v1/admin).

Covers: system stats, role changes, user listing, activate/deactivate,
        and bulk breach deletion.
"""
import pytest
from unittest.mock import patch, MagicMock
from bson import ObjectId
from tests.conftest import (
    MOCK_ADMIN_USER,
    MOCK_ANALYST_USER,
    _ADMIN_ID,
    _ANALYST_ID,
)


# ===================================================================
# GET /api/v1/admin/stats
# ===================================================================

class TestAdminStats:

    def test_stats_requires_admin(self, client, analyst_headers):
        """Analyst cannot access admin stats."""
        resp = client.get("/api/v1/admin/stats", headers=analyst_headers)
        assert resp.status_code == 403

    def test_stats_guest_forbidden(self, client, guest_headers):
        """Guest cannot access admin stats."""
        resp = client.get("/api/v1/admin/stats", headers=guest_headers)
        assert resp.status_code == 403

    def test_stats_no_auth(self, client):
        """Unauthenticated request returns 401."""
        resp = client.get("/api/v1/admin/stats")
        assert resp.status_code == 401

    def test_stats_admin_success(self, client, admin_headers):
        """Admin can fetch system stats."""
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
        """Analyst cannot change roles."""
        resp = client.patch(
            f"/api/v1/admin/users/{_ANALYST_ID}/role",
            json={"role": "admin"},
            headers=analyst_headers,
        )
        assert resp.status_code == 403

    def test_change_role_invalid_role(self, client, admin_headers):
        """Invalid role value returns 422."""
        fake_id = str(ObjectId())
        resp = client.patch(
            f"/api/v1/admin/users/{fake_id}/role",
            json={"role": "superadmin"},
            headers=admin_headers,
        )
        assert resp.status_code == 422

    def test_change_role_missing_role(self, client, admin_headers):
        """Missing role field returns 422."""
        fake_id = str(ObjectId())
        resp = client.patch(
            f"/api/v1/admin/users/{fake_id}/role",
            json={},
            headers=admin_headers,
        )
        assert resp.status_code == 422

    def test_change_own_role_blocked(self, client, admin_headers):
        """Admin cannot change their own role."""
        # g.current_user_id is set from JWT['user'] = 'testadmin'
        resp = client.patch(
            "/api/v1/admin/users/testadmin/role",
            json={"role": "guest"},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_change_role_user_not_found(self, client, admin_headers):
        """Non-existent user returns 404."""
        fake_id = str(ObjectId())
        with patch("app.routes.admin.user_service.get_user", return_value=None):
            resp = client.patch(
                f"/api/v1/admin/users/{fake_id}/role",
                json={"role": "analyst"},
                headers=admin_headers,
            )
        assert resp.status_code == 404

    def test_change_role_success(self, client, admin_headers):
        """Successful role change returns 200."""
        target_id = str(ObjectId())
        mock_user = {"_id": ObjectId(target_id), "role": "guest", "username": "target"}
        updated_user = {**mock_user, "role": "analyst"}
        with patch("app.routes.admin.user_service.get_user", return_value=mock_user), \
             patch("app.routes.admin.user_service.update_user", return_value=updated_user):
            resp = client.patch(
                f"/api/v1/admin/users/{target_id}/role",
                json={"role": "analyst"},
                headers=admin_headers,
            )
        assert resp.status_code == 200

    def test_demote_last_admin_blocked(self, client, admin_headers):
        """Cannot demote the last admin."""
        target_id = str(ObjectId())
        mock_user = {"_id": ObjectId(target_id), "role": "admin", "username": "otheradmin"}
        with patch("app.routes.admin.user_service.get_user", return_value=mock_user), \
             patch("app.routes.admin.user_service.demote_admin_atomically",
                   return_value=(None, "Cannot demote the last remaining admin.")):
            resp = client.patch(
                f"/api/v1/admin/users/{target_id}/role",
                json={"role": "analyst"},
                headers=admin_headers,
            )
        assert resp.status_code == 400


# ===================================================================
# GET /api/v1/admin/users
# ===================================================================

class TestAdminListUsers:

    def test_list_users_requires_admin(self, client, analyst_headers):
        resp = client.get("/api/v1/admin/users", headers=analyst_headers)
        assert resp.status_code == 403

    def test_list_users_success(self, client, admin_headers):
        mock_users = [
            {"_id": ObjectId(), "username": "u1", "role": "guest"},
            {"_id": ObjectId(), "username": "u2", "role": "analyst"},
        ]
        with patch("app.routes.admin.user_service.get_all",
                   return_value=(mock_users, 2)):
            resp = client.get("/api/v1/admin/users", headers=admin_headers)
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["meta"]["total"] == 2

    def test_list_users_pagination(self, client, admin_headers):
        with patch("app.routes.admin.user_service.get_all",
                   return_value=([], 50)):
            resp = client.get(
                "/api/v1/admin/users?page=3&limit=10", headers=admin_headers
            )
        assert resp.status_code == 200
        meta = resp.get_json()["meta"]
        assert meta["page"] == 3
        assert meta["limit"] == 10

    def test_list_users_invalid_page(self, client, admin_headers):
        resp = client.get(
            "/api/v1/admin/users?page=abc", headers=admin_headers
        )
        assert resp.status_code == 400


# ===================================================================
# PATCH activate / deactivate
# ===================================================================

class TestActivateDeactivate:

    def test_activate_user_success(self, client, admin_headers):
        target_id = str(ObjectId())
        mock_updated = {"_id": ObjectId(target_id), "is_active": True}
        with patch("app.routes.admin.user_service.activate_user",
                   return_value=mock_updated):
            resp = client.patch(
                f"/api/v1/admin/users/{target_id}/activate",
                headers=admin_headers,
            )
        assert resp.status_code == 200

    def test_activate_user_not_found(self, client, admin_headers):
        fake_id = str(ObjectId())
        with patch("app.routes.admin.user_service.activate_user",
                   return_value=None):
            resp = client.patch(
                f"/api/v1/admin/users/{fake_id}/activate",
                headers=admin_headers,
            )
        assert resp.status_code == 404

    def test_deactivate_user_success(self, client, admin_headers):
        target_id = str(ObjectId())
        mock_user = {"_id": ObjectId(target_id), "role": "analyst", "is_active": True}
        mock_updated = {**mock_user, "is_active": False}
        with patch("app.routes.admin.user_service.get_user",
                   return_value=mock_user), \
             patch("app.routes.admin.user_service.deactivate_admin_atomically",
                   return_value=(mock_updated, None)):
            resp = client.patch(
                f"/api/v1/admin/users/{target_id}/deactivate",
                headers=admin_headers,
            )
        assert resp.status_code == 200

    def test_deactivate_self_blocked(self, client, admin_headers):
        """Admin cannot deactivate their own account."""
        # g.current_user_id is set from JWT['user'] = 'testadmin'
        resp = client.patch(
            "/api/v1/admin/users/testadmin/deactivate",
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_deactivate_user_not_found(self, client, admin_headers):
        fake_id = str(ObjectId())
        with patch("app.routes.admin.user_service.get_user", return_value=None):
            resp = client.patch(
                f"/api/v1/admin/users/{fake_id}/deactivate",
                headers=admin_headers,
            )
        assert resp.status_code == 404

    def test_deactivate_last_admin_blocked(self, client, admin_headers):
        """Cannot deactivate the last active admin."""
        target_id = str(ObjectId())
        mock_user = {"_id": ObjectId(target_id), "role": "admin", "is_active": True}
        with patch("app.routes.admin.user_service.get_user",
                   return_value=mock_user), \
             patch("app.routes.admin.user_service.deactivate_admin_atomically",
                   return_value=(None, "Cannot deactivate the last active admin.")):
            resp = client.patch(
                f"/api/v1/admin/users/{target_id}/deactivate",
                headers=admin_headers,
            )
        assert resp.status_code == 409


# ===================================================================
# DELETE /api/v1/admin/breaches/bulk
# ===================================================================

class TestBulkDeleteBreaches:

    def test_bulk_delete_requires_admin(self, client, analyst_headers):
        resp = client.delete(
            "/api/v1/admin/breaches/bulk",
            json={"ids": [str(ObjectId())]},
            headers=analyst_headers,
        )
        assert resp.status_code == 403

    def test_bulk_delete_empty_ids(self, client, admin_headers):
        resp = client.delete(
            "/api/v1/admin/breaches/bulk",
            json={"ids": []},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_bulk_delete_missing_ids(self, client, admin_headers):
        resp = client.delete(
            "/api/v1/admin/breaches/bulk",
            json={},
            headers=admin_headers,
        )
        assert resp.status_code == 400

    def test_bulk_delete_too_many_ids(self, client, admin_headers):
        ids = [str(ObjectId()) for _ in range(101)]
        resp = client.delete(
            "/api/v1/admin/breaches/bulk",
            json={"ids": ids},
            headers=admin_headers,
        )
        assert resp.status_code == 422

    def test_bulk_delete_success(self, client, admin_headers):
        ids = [str(ObjectId()), str(ObjectId())]
        with patch("app.routes.admin.breach_service.bulk_delete",
                   return_value=(2, [])):
            resp = client.delete(
                "/api/v1/admin/breaches/bulk",
                json={"ids": ids},
                headers=admin_headers,
            )
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["deleted"] == 2
        assert data["partial_failure"] is False

    def test_bulk_delete_partial_failure(self, client, admin_headers):
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

    def test_audit_logs_success(self, client, admin_headers, tmp_path):
        """Admin can fetch audit logs from file."""
        log_dir = tmp_path / "logs"
        log_dir.mkdir()
        log_file = log_dir / "audit.log"

        # Write some dummy logs
        log_entries = [
            '{"timestamp": "2026-03-27T10:00:00Z", "user_id": "admin", "action": "login", "result": "success"}',
            '{"timestamp": "2026-03-27T10:05:00Z", "user_id": "admin", "action": "user_role_changed", "result": "success"}'
        ]
        log_file.write_text("\n".join(log_entries))

        with patch.dict("os.environ", {
            "AUDIT_LOG_DIR": str(log_dir),
            "AUDIT_LOG_FILE": "audit.log"
        }):
            resp = client.get("/api/v1/admin/audit-logs", headers=admin_headers)

        assert resp.status_code == 200
        data = resp.get_json()["data"]
        meta = resp.get_json()["meta"]

        # Reversed order
        assert len(data) == 2
        assert data[0]["action"] == "user_role_changed"
        assert data[1]["action"] == "login"
        assert meta["total"] == 2

    def test_audit_logs_pagination(self, client, admin_headers, tmp_path):
        """Audit logs support pagination."""
        log_dir = tmp_path / "logs"
        log_dir.mkdir()
        log_file = log_dir / "audit.log"

        log_entries = [f'{{"id": {i}}}' for i in range(15)]
        log_file.write_text("\n".join(log_entries))

        with patch.dict("os.environ", {
            "AUDIT_LOG_DIR": str(log_dir),
            "AUDIT_LOG_FILE": "audit.log"
        }):
            resp = client.get("/api/v1/admin/audit-logs?page=1&limit=10", headers=admin_headers)

        assert resp.status_code == 200
        data = resp.get_json()["data"]
        meta = resp.get_json()["meta"]
        assert len(data) == 10
        assert meta["total"] == 15
        assert meta["total_pages"] == 2

    def test_audit_logs_file_missing(self, client, admin_headers):
        """If log file missing, return empty list (not 500)."""
        with patch.dict("os.environ", {
            "AUDIT_LOG_DIR": "/tmp/nonexistent_logs_dir_123",
            "AUDIT_LOG_FILE": "audit.log"
        }):
            resp = client.get("/api/v1/admin/audit-logs", headers=admin_headers)

        assert resp.status_code == 200
        assert resp.get_json()["data"] == []
