"""
test_subdocuments.py — Tests for sub-document CRUD endpoints (affected accounts, timeline, etc.).
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
        assert isinstance(resp.get_json()["data"], list)

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
