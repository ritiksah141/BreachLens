"""
test_subdocuments.py — Tests for sub-document CRUD endpoints (affected accounts, timeline, remediation, alerts).
"""
import pytest
from unittest.mock import patch
from bson import ObjectId
from datetime import datetime

BREACH_ID = str(ObjectId())
ACCOUNT_ID = str(ObjectId())
EVENT_ID = str(ObjectId())
ACTION_ID = str(ObjectId())
ALERT_ID = str(ObjectId())
REMEDIATION_ID = str(ObjectId())

MOCK_ACCOUNT = {
    "_id": ObjectId(ACCOUNT_ID),
    "email": "test@example.com",
    "username": "testuser",
    "data_exposed": ["email", "password_hash"],
    "notified": False,
    "notification_date": None,
}

MOCK_EVENT = {
    "_id": ObjectId(EVENT_ID),
    "event_date": datetime(2025, 1, 15),
    "event_type": "breach_occurred",
    "description": "Initial compromise via phishing email.",
    "actor": "APT28",
}

MOCK_ALERT = {
    "_id": ObjectId(ALERT_ID),
    "alert_type": "new_exposure",
    "severity": "high",
    "details": "Credentials found in dark web dump with 50k records.",
    "triggered_at": datetime.utcnow(),
    "acknowledged": False,
}

MOCK_REMEDIATION = {
    "_id": ObjectId(REMEDIATION_ID),
    "action": "Force password reset for all affected users",
    "status": "pending",
    "assigned_to": "security_team",
    "due_date": datetime(2025, 4, 1),
    "completed_date": None,
}


class TestAffectedAccounts:

    def test_list_accounts_requires_auth(self, client):
        resp = client.get(f"/api/v1/breaches/{BREACH_ID}/affected-accounts")
        assert resp.status_code == 401

    def test_list_accounts_analyst_ok(self, client, analyst_headers):
        with patch("app.routes.breaches.breach_service.list_affected_accounts",
                   return_value=([MOCK_ACCOUNT], None)):
            resp = client.get(f"/api/v1/breaches/{BREACH_ID}/affected-accounts",
                              headers=analyst_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert isinstance(data, list)

    def test_add_account_missing_email(self, client, analyst_headers):
        with patch("app.routes.breaches.breach_service.add_affected_account",
                   return_value=(None, "not_found")):
            resp = client.post(f"/api/v1/breaches/{BREACH_ID}/affected-accounts",
                               json={"username": "nomail"}, headers=analyst_headers)
        assert resp.status_code == 422

    def test_add_account_invalid_email(self, client, analyst_headers):
        resp = client.post(f"/api/v1/breaches/{BREACH_ID}/affected-accounts",
                           json={"email": "invalid-email"}, headers=analyst_headers)
        assert resp.status_code == 422

    def test_add_account_success(self, client, analyst_headers):
        with patch("app.routes.breaches.breach_service.add_affected_account",
                   return_value=(MOCK_ACCOUNT, None)):
            resp = client.post(f"/api/v1/breaches/{BREACH_ID}/affected-accounts",
                               json={"email": "test@example.com"},
                               headers=analyst_headers)
        assert resp.status_code == 201

    def test_delete_account_analyst_forbidden(self, client, analyst_headers):
        resp = client.delete(
            f"/api/v1/breaches/{BREACH_ID}/affected-accounts/{ACCOUNT_ID}",
            headers=analyst_headers
        )
        assert resp.status_code == 403

    def test_delete_account_admin_ok(self, client, admin_headers):
        with patch("app.routes.breaches.breach_service.delete_affected_account",
                   return_value=(True, None)):
            resp = client.delete(
                f"/api/v1/breaches/{BREACH_ID}/affected-accounts/{ACCOUNT_ID}",
                headers=admin_headers
            )
        assert resp.status_code == 204


class TestTimeline:

    def test_list_timeline_no_auth(self, client):
        resp = client.get(f"/api/v1/breaches/{BREACH_ID}/timeline")
        assert resp.status_code == 401

    def test_list_timeline_authenticated(self, client, analyst_headers):
        with patch("app.routes.breaches.breach_service.list_timeline",
                   return_value=([MOCK_EVENT], None)):
            resp = client.get(f"/api/v1/breaches/{BREACH_ID}/timeline",
                              headers=analyst_headers)
        assert resp.status_code == 200

    def test_add_timeline_missing_fields(self, client, analyst_headers):
        resp = client.post(f"/api/v1/breaches/{BREACH_ID}/timeline",
                           json={"event_type": "breach_occurred"},
                           headers=analyst_headers)
        assert resp.status_code == 422

    def test_add_timeline_invalid_event_type(self, client, analyst_headers):
        resp = client.post(f"/api/v1/breaches/{BREACH_ID}/timeline",
                           json={"event_date": "2025-01-15", "event_type": "invalid_type",
                                 "description": "Some description here."},
                           headers=analyst_headers)
        assert resp.status_code == 422

    def test_add_timeline_future_date(self, client, analyst_headers):
        resp = client.post(f"/api/v1/breaches/{BREACH_ID}/timeline",
                           json={"event_date": "2099-01-01", "event_type": "discovered",
                                 "description": "Future event description."},
                           headers=analyst_headers)
        assert resp.status_code == 422

    def test_add_timeline_success(self, client, analyst_headers):
        with patch("app.routes.breaches.breach_service.add_timeline_event",
                   return_value=(MOCK_EVENT, None)):
            resp = client.post(f"/api/v1/breaches/{BREACH_ID}/timeline",
                               json={"event_date": "2025-01-15T00:00:00",
                                     "event_type": "breach_occurred",
                                     "description": "Initial compromise via phishing email.",
                                     "actor": "APT28"},
                               headers=analyst_headers)
        assert resp.status_code == 201


class TestAlerts:

    def test_create_alert_invalid_type(self, client, analyst_headers):
        resp = client.post(f"/api/v1/breaches/{BREACH_ID}/alerts",
                           json={"alert_type": "unknown_type", "severity": "high",
                                 "details": "Some alert details here."},
                           headers=analyst_headers)
        assert resp.status_code == 422

    def test_create_alert_success(self, client, analyst_headers):
        with patch("app.routes.breaches.breach_service.create_alert",
                   return_value=(MOCK_ALERT, None)):
            resp = client.post(f"/api/v1/breaches/{BREACH_ID}/alerts",
                               json={"alert_type": "new_exposure", "severity": "high",
                                     "details": "Credentials found in dark web dump."},
                               headers=analyst_headers)
        assert resp.status_code == 201

    def test_acknowledge_alert(self, client, analyst_headers):
        acknowledged = {**MOCK_ALERT, "acknowledged": True}
        with patch("app.routes.breaches.breach_service.update_alert",
                   return_value=(acknowledged, None)):
            resp = client.patch(
                f"/api/v1/breaches/{BREACH_ID}/alerts/{ALERT_ID}",
                json={"acknowledged": True},
                headers=analyst_headers
            )
        assert resp.status_code == 200
        assert resp.get_json()["data"]["acknowledged"] is True

    def test_delete_alert_admin_only(self, client, analyst_headers):
        resp = client.delete(
            f"/api/v1/breaches/{BREACH_ID}/alerts/{ALERT_ID}",
            headers=analyst_headers
        )
        assert resp.status_code == 403


# ---------------------------------------------------------------------------
# Remediation Actions — NEW TESTS
# ---------------------------------------------------------------------------

class TestRemediation:
    """Tests for remediation sub-document CRUD endpoints."""

    def test_list_remediation_requires_auth(self, client):
        """GET /breaches/<id>/remediation requires authentication."""
        resp = client.get(f"/api/v1/breaches/{BREACH_ID}/remediation")
        assert resp.status_code == 401

    def test_list_remediation_authenticated(self, client, analyst_headers):
        """Authenticated users can view remediation actions."""
        with patch("app.routes.breaches.breach_service.list_remediation",
                   return_value=([MOCK_REMEDIATION], None)):
            resp = client.get(f"/api/v1/breaches/{BREACH_ID}/remediation",
                              headers=analyst_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert isinstance(data, list)
        assert len(data) == 1

    def test_get_single_remediation_action(self, client, analyst_headers):
        """GET single remediation action by ID."""
        with patch("app.routes.breaches.breach_service.get_remediation_action",
                   return_value=(MOCK_REMEDIATION, None)):
            resp = client.get(
                f"/api/v1/breaches/{BREACH_ID}/remediation/{REMEDIATION_ID}",
                headers=analyst_headers
            )
        assert resp.status_code == 200

    def test_get_remediation_action_not_found(self, client, analyst_headers):
        """GET remediation action that does not exist returns 404."""
        fake_id = str(ObjectId())
        with patch("app.routes.breaches.breach_service.get_remediation_action",
                   return_value=(None, "not_found")):
            resp = client.get(
                f"/api/v1/breaches/{BREACH_ID}/remediation/{fake_id}",
                headers=analyst_headers
            )
        assert resp.status_code == 404

    def test_add_remediation_missing_fields(self, client, analyst_headers):
        """POST remediation without required fields returns 422."""
        resp = client.post(f"/api/v1/breaches/{BREACH_ID}/remediation",
                           json={"action": "Reset passwords"},
                           headers=analyst_headers)
        assert resp.status_code == 422

    def test_add_remediation_invalid_status(self, client, analyst_headers):
        """POST remediation with invalid status enum returns 422."""
        resp = client.post(f"/api/v1/breaches/{BREACH_ID}/remediation",
                           json={
                               "action": "Force password reset for all affected accounts",
                               "status": "unknown_status",
                               "due_date": "2025-04-01",
                           },
                           headers=analyst_headers)
        assert resp.status_code == 422

    def test_add_remediation_action_too_short(self, client, analyst_headers):
        """POST remediation with action less than 5 chars returns 422."""
        resp = client.post(f"/api/v1/breaches/{BREACH_ID}/remediation",
                           json={
                               "action": "Fix",
                               "status": "pending",
                               "due_date": "2025-04-01",
                           },
                           headers=analyst_headers)
        assert resp.status_code == 422

    def test_add_remediation_success(self, client, analyst_headers):
        """POST valid remediation action returns 201."""
        with patch("app.routes.breaches.breach_service.add_remediation_action",
                   return_value=(MOCK_REMEDIATION, None)):
            resp = client.post(f"/api/v1/breaches/{BREACH_ID}/remediation",
                               json={
                                   "action": "Force password reset for all affected users",
                                   "status": "pending",
                                   "due_date": "2025-04-01",
                                   "assigned_to": "security_team",
                               },
                               headers=analyst_headers)
        assert resp.status_code == 201

    def test_update_remediation_action(self, client, analyst_headers):
        """PATCH remediation action status."""
        updated = {**MOCK_REMEDIATION, "status": "completed"}
        with patch("app.routes.breaches.breach_service.update_remediation_action",
                   return_value=(updated, None)):
            resp = client.patch(
                f"/api/v1/breaches/{BREACH_ID}/remediation/{REMEDIATION_ID}",
                json={"status": "completed"},
                headers=analyst_headers
            )
        assert resp.status_code == 200

    def test_update_remediation_empty_body_returns_400(self, client, analyst_headers):
        """PATCH remediation with empty body returns 400."""
        resp = client.patch(
            f"/api/v1/breaches/{BREACH_ID}/remediation/{REMEDIATION_ID}",
            json={},
            headers=analyst_headers
        )
        assert resp.status_code == 400

    def test_delete_remediation_analyst_forbidden(self, client, analyst_headers):
        """Analysts cannot delete remediation actions (admin only)."""
        resp = client.delete(
            f"/api/v1/breaches/{BREACH_ID}/remediation/{REMEDIATION_ID}",
            headers=analyst_headers
        )
        assert resp.status_code == 403

    def test_delete_remediation_admin_ok(self, client, admin_headers):
        """Admin can delete remediation actions (204)."""
        with patch("app.routes.breaches.breach_service.delete_remediation_action",
                   return_value=(True, None)):
            resp = client.delete(
                f"/api/v1/breaches/{BREACH_ID}/remediation/{REMEDIATION_ID}",
                headers=admin_headers
            )
        assert resp.status_code == 204

    def test_delete_remediation_not_found(self, client, admin_headers):
        """DELETE remediation action that does not exist returns 404."""
        fake_id = str(ObjectId())
        with patch("app.routes.breaches.breach_service.delete_remediation_action",
                   return_value=(False, "not_found")):
            resp = client.delete(
                f"/api/v1/breaches/{BREACH_ID}/remediation/{fake_id}",
                headers=admin_headers
            )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Additional affected account edge cases
# ---------------------------------------------------------------------------

class TestAffectedAccountsExtended:

    def test_get_single_account_success(self, client, analyst_headers):
        """GET individual affected account returns 200."""
        with patch("app.routes.breaches.breach_service.get_affected_account",
                   return_value=(MOCK_ACCOUNT, None)):
            resp = client.get(
                f"/api/v1/breaches/{BREACH_ID}/affected-accounts/{ACCOUNT_ID}",
                headers=analyst_headers
            )
        assert resp.status_code == 200

    def test_get_single_account_not_found(self, client, analyst_headers):
        """GET non-existent affected account returns 404."""
        fake_id = str(ObjectId())
        with patch("app.routes.breaches.breach_service.get_affected_account",
                   return_value=(None, "not_found")):
            resp = client.get(
                f"/api/v1/breaches/{BREACH_ID}/affected-accounts/{fake_id}",
                headers=analyst_headers
            )
        assert resp.status_code == 404

    def test_update_account_mark_notified(self, client, analyst_headers):
        """PATCH affected account to mark notified."""
        updated = {**MOCK_ACCOUNT, "notified": True}
        with patch("app.routes.breaches.breach_service.update_affected_account",
                   return_value=(updated, None)):
            resp = client.patch(
                f"/api/v1/breaches/{BREACH_ID}/affected-accounts/{ACCOUNT_ID}",
                json={"notified": True},
                headers=analyst_headers
            )
        assert resp.status_code == 200


# ---------------------------------------------------------------------------
# Additional alert edge cases
# ---------------------------------------------------------------------------

class TestAlertsExtended:

    def test_get_single_alert_success(self, client, analyst_headers):
        """GET individual monitoring alert returns 200."""
        with patch("app.routes.breaches.breach_service.get_alert",
                   return_value=(MOCK_ALERT, None)):
            resp = client.get(
                f"/api/v1/breaches/{BREACH_ID}/alerts/{ALERT_ID}",
                headers=analyst_headers
            )
        assert resp.status_code == 200

    def test_get_single_alert_not_found(self, client, analyst_headers):
        """GET non-existent alert returns 404."""
        fake_id = str(ObjectId())
        with patch("app.routes.breaches.breach_service.get_alert",
                   return_value=(None, "not_found")):
            resp = client.get(
                f"/api/v1/breaches/{BREACH_ID}/alerts/{fake_id}",
                headers=analyst_headers
            )
        assert resp.status_code == 404

    def test_delete_alert_admin_success(self, client, admin_headers):
        """Admin can delete monitoring alerts (204)."""
        with patch("app.routes.breaches.breach_service.delete_alert",
                   return_value=(True, None)):
            resp = client.delete(
                f"/api/v1/breaches/{BREACH_ID}/alerts/{ALERT_ID}",
                headers=admin_headers
            )
        assert resp.status_code == 204

    def test_create_alert_missing_details(self, client, analyst_headers):
        """POST alert without required details returns 422."""
        resp = client.post(f"/api/v1/breaches/{BREACH_ID}/alerts",
                           json={"alert_type": "new_exposure", "severity": "high"},
                           headers=analyst_headers)
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Additional timeline edge cases
# ---------------------------------------------------------------------------

class TestTimelineExtended:

    def test_get_single_timeline_event(self, client, analyst_headers):
        """GET individual timeline event returns 200."""
        with patch("app.routes.breaches.breach_service.get_timeline_event",
                   return_value=(MOCK_EVENT, None)):
            resp = client.get(
                f"/api/v1/breaches/{BREACH_ID}/timeline/{EVENT_ID}",
                headers=analyst_headers
            )
        assert resp.status_code == 200

    def test_update_timeline_event(self, client, analyst_headers):
        """PATCH timeline event description."""
        updated = {**MOCK_EVENT, "description": "Updated compromise description here."}
        with patch("app.routes.breaches.breach_service.update_timeline_event",
                   return_value=(updated, None)):
            resp = client.patch(
                f"/api/v1/breaches/{BREACH_ID}/timeline/{EVENT_ID}",
                json={"description": "Updated compromise description here."},
                headers=analyst_headers
            )
        assert resp.status_code == 200

    def test_delete_timeline_analyst_forbidden(self, client, analyst_headers):
        """Analysts cannot delete timeline events (admin only)."""
        resp = client.delete(
            f"/api/v1/breaches/{BREACH_ID}/timeline/{EVENT_ID}",
            headers=analyst_headers
        )
        assert resp.status_code == 403

    def test_delete_timeline_admin_ok(self, client, admin_headers):
        """Admin can delete timeline events (204)."""
        with patch("app.routes.breaches.breach_service.delete_timeline_event",
                   return_value=(True, None)):
            resp = client.delete(
                f"/api/v1/breaches/{BREACH_ID}/timeline/{EVENT_ID}",
                headers=admin_headers
            )
        assert resp.status_code == 204
