"""
test_breaches.py — Breach CRUD endpoint tests for BreachLens.

Covers 21 test cases across:
  - GET    /api/v1/breaches           (list)
  - POST   /api/v1/breaches           (create)
  - GET    /api/v1/breaches/<id>      (retrieve)
  - PUT    /api/v1/breaches/<id>      (full update)
  - PATCH  /api/v1/breaches/<id>      (partial update)
  - DELETE /api/v1/breaches/<id>      (delete)
  - GET    /api/v1/breaches/exposure-check
  - GET    /api/v1/breaches/geo/*     (geospatial)
"""
import pytest
from unittest.mock import patch, MagicMock
from bson import ObjectId
from datetime import datetime

BREACH_ID = str(ObjectId())

MOCK_BREACH = {
    "_id": ObjectId(BREACH_ID),
    "title": "Test Corp Breach",
    "organisation": {"name": "Test Corp", "industry": "Technology", "country": "US"},
    "breach_date": datetime(2025, 1, 15),
    "description": "Test breach description.",
    "severity": "critical",
    "status": "active",
    "records_exposed": 5_000_000,
    "data_types_exposed": ["email", "password_hash"],
    "risk_score": 9.1,
    "source_url": "https://example.com/breach",
    "affected_accounts": [],
    "timeline": [],
    "remediation_checklist": [],
    "monitoring_alerts": [],
    "location": None,
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow(),
}


# ---------------------------------------------------------------------------
# List breaches
# ---------------------------------------------------------------------------

class TestListBreaches:

    def test_list_breaches_public_accessible(self, client):
        """GET /breaches is accessible without authentication."""
        with patch(
            "app.routes.breaches.breach_service.list_breaches",
            return_value=([], 0),
        ):
            resp = client.get("/api/v1/breaches/")
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["status"] == "success"
        assert isinstance(body["data"], list)

    def test_list_breaches_pagination_meta(self, client):
        """Response should include pagination metadata."""
        with patch(
            "app.routes.breaches.breach_service.list_breaches",
            return_value=([MOCK_BREACH], 1),
        ):
            resp = client.get("/api/v1/breaches/?page=1&limit=10")
        assert resp.status_code == 200
        meta = resp.get_json().get("meta", {})
        assert "page" in meta
        assert "total" in meta

    def test_list_breaches_invalid_page_returns_400(self, client):
        """Non-integer page param should return 400."""
        resp = client.get("/api/v1/breaches/?page=abc")
        assert resp.status_code == 400

    def test_list_breaches_severity_filter(self, client):
        """Severity query param should be forwarded to the service."""
        with patch(
            "app.routes.breaches.breach_service.list_breaches",
            return_value=([MOCK_BREACH], 1),
        ) as mock_list:
            resp = client.get("/api/v1/breaches/?severity=critical")
        assert resp.status_code == 200

    def test_list_breaches_invalid_sort_order_returns_422(self, client):
        """Invalid order parameter should return 422."""
        resp = client.get("/api/v1/breaches/?order=down")
        assert resp.status_code == 422

    def test_list_breaches_invalid_risk_range_returns_422(self, client):
        """min_risk greater than max_risk should be rejected."""
        resp = client.get("/api/v1/breaches/?min_risk=9.0&max_risk=2.0")
        assert resp.status_code == 422

    def test_list_breaches_invalid_severity_returns_422(self, client):
        """Invalid severity filter should be rejected early."""
        resp = client.get("/api/v1/breaches/?severity=extreme")
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Create breach
# ---------------------------------------------------------------------------

class TestCreateBreach:

    def test_create_breach_requires_auth(self, client):
        """POST /breaches without a token should return 401."""
        resp = client.post("/api/v1/breaches/", json={"organisation_name": "Corp"})
        assert resp.status_code == 401

    def test_create_breach_guest_forbidden(self, client, guest_headers):
        """Guests must not be able to create breaches."""
        resp = client.post(
            "/api/v1/breaches/",
            json={"organisation_name": "Corp"},
            headers=guest_headers,
        )
        assert resp.status_code == 403

    def test_create_breach_analyst_success(self, client, analyst_headers):
        """Analyst should be able to create a valid breach."""
        with patch(
            "app.routes.breaches.breach_service.create",
            return_value=(MOCK_BREACH, None),
        ):
            resp = client.post(
                "/api/v1/breaches/",
                json={
                    "title": "Test Corp Breach",
                    "breach_date": "2025-01-15",
                    "discovered_date": "2025-01-20",
                    "description": "A detailed test breach description for validation.",
                    "severity": "critical",
                    "status": "active",
                    "industry": "technology",
                    "data_types_exposed": ["email"],
                    "affected_records_count": 1000,
                },
                headers=analyst_headers,
            )
        assert resp.status_code == 201

    def test_create_breach_invalid_severity_returns_422(self, client, analyst_headers):
        """Invalid severity value should be rejected."""
        resp = client.post(
            "/api/v1/breaches/",
            json={
                "title": "Test Corp Breach",
                "breach_date": "2025-01-15",
                "discovered_date": "2025-01-20",
                "description": "A detailed test breach description for validation.",
                "severity": "invalid_level",
                "status": "active",
                "industry": "technology",
                "affected_records_count": 1000,
            },
            headers=analyst_headers,
        )
        assert resp.status_code == 422


# ---------------------------------------------------------------------------
# Retrieve breach
# ---------------------------------------------------------------------------

class TestGetBreach:

    def test_get_breach_not_found(self, client):
        """GET /breaches/<id> for a missing breach should return 404."""
        with patch(
            "app.routes.breaches.breach_service.get_by_id",
            return_value=None,
        ):
            resp = client.get(f"/api/v1/breaches/{BREACH_ID}")
        assert resp.status_code == 404

    def test_get_breach_invalid_id(self, client):
        """Malformed ObjectId should return 400."""
        resp = client.get("/api/v1/breaches/not-a-valid-id")
        assert resp.status_code == 400

    def test_get_breach_success(self, client):
        """GET /breaches/<id> should return the breach document."""
        with patch(
            "app.routes.breaches.breach_service.get_by_id",
            return_value=MOCK_BREACH,
        ):
            resp = client.get(f"/api/v1/breaches/{BREACH_ID}")
        assert resp.status_code == 200
        assert resp.get_json()["data"]["title"] == "Test Corp Breach"


# ---------------------------------------------------------------------------
# Update breach
# ---------------------------------------------------------------------------

class TestUpdateBreach:

    def test_put_breach_requires_analyst(self, client, guest_headers):
        """Full update requires at least analyst role."""
        resp = client.put(
            f"/api/v1/breaches/{BREACH_ID}",
            json={"organisation_name": "Updated"},
            headers=guest_headers,
        )
        assert resp.status_code == 403

    def test_patch_breach_analyst_success(self, client, analyst_headers):
        """PATCH should perform a partial update."""
        with patch(
            "app.routes.breaches.breach_service.patch",
            return_value=(MOCK_BREACH, None),
        ):
            resp = client.patch(
                f"/api/v1/breaches/{BREACH_ID}",
                json={"status": "resolved"},
                headers=analyst_headers,
            )
        assert resp.status_code == 200

    def test_patch_breach_not_found(self, client, analyst_headers):
        """PATCH for a missing breach should return 404."""
        with patch(
            "app.routes.breaches.breach_service.patch",
            return_value=(None, "not_found"),
        ):
            resp = client.patch(
                f"/api/v1/breaches/{BREACH_ID}",
                json={"status": "resolved"},
                headers=analyst_headers,
            )
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Delete breach
# ---------------------------------------------------------------------------

class TestDeleteBreach:

    def test_delete_requires_admin(self, client, analyst_headers):
        """Only admins may delete breaches."""
        resp = client.delete(f"/api/v1/breaches/{BREACH_ID}", headers=analyst_headers)
        assert resp.status_code == 403

    def test_delete_admin_success(self, client, admin_headers):
        """Admin DELETE should return 204."""
        with patch(
            "app.routes.breaches.breach_service.delete",
            return_value=(True, None),
        ):
            resp = client.delete(f"/api/v1/breaches/{BREACH_ID}", headers=admin_headers)
        assert resp.status_code == 204

    def test_delete_not_found(self, client, admin_headers):
        """Deleting a non-existent breach should return 404."""
        with patch(
            "app.routes.breaches.breach_service.delete",
            return_value=(None, "not_found"),
        ):
            resp = client.delete(f"/api/v1/breaches/{BREACH_ID}", headers=admin_headers)
        assert resp.status_code == 404


# ---------------------------------------------------------------------------
# Exposure check
# ---------------------------------------------------------------------------

class TestExposureCheck:

    def test_exposure_check_requires_email_or_domain(self, client):
        """Missing both email and domain should return 400."""
        resp = client.get("/api/v1/breaches/check")
        assert resp.status_code == 400

    def test_exposure_check_invalid_email(self, client):
        """Malformed email should return 422."""
        resp = client.get("/api/v1/breaches/check?email=not-an-email")
        assert resp.status_code == 422

    def test_exposure_check_by_email(self, client):
        """Valid email query should return matching breaches."""
        with patch(
            "app.routes.breaches.breach_service.check_exposure",
            return_value={"email_exposed": True, "breach_count": 1, "breaches": [MOCK_BREACH]},
        ):
            resp = client.get("/api/v1/breaches/check?email=victim@example.com")
        assert resp.status_code == 200
        assert resp.get_json()["data"]["email_exposed"] is True


# ---------------------------------------------------------------------------
# Geospatial endpoints
# ---------------------------------------------------------------------------

class TestGeoEndpoints:

    def test_geo_geojson_public(self, client):
        """GeoJSON endpoint should be publicly accessible."""
        with patch(
            "app.routes.breaches.breach_service.get_geojson",
            return_value=[],
        ):
            resp = client.get("/api/v1/breaches/geo/geojson")
        assert resp.status_code == 200
        assert resp.get_json()["data"]["type"] == "FeatureCollection"


# ---------------------------------------------------------------------------
# Advanced search endpoint
# ---------------------------------------------------------------------------

class TestAdvancedSearch:

    def test_advanced_search_success_with_facets(self, client):
        with patch(
            "app.routes.breaches.breach_service.advanced_search",
            return_value=([MOCK_BREACH], 1, {"severity": [{"value": "critical", "count": 1}]}),
        ) as mock_advanced:
            resp = client.get(
                "/api/v1/breaches/advanced-search?"
                "q=corp&severities=critical,high&industries=technology&"
                "min_risk=5&max_risk=10&include_facets=true"
            )

        assert resp.status_code == 200
        body = resp.get_json()
        assert body["status"] == "success"
        assert body["meta"]["total"] == 1
        assert "facets" in body["meta"]
        assert mock_advanced.called

    def test_advanced_search_invalid_severity_returns_422(self, client):
        resp = client.get("/api/v1/breaches/advanced-search?severities=critical,extreme")
        assert resp.status_code == 422

    def test_advanced_search_invalid_date_returns_422(self, client):
        resp = client.get("/api/v1/breaches/advanced-search?from_date=2026/02/01")
        assert resp.status_code == 422

    def test_advanced_search_invalid_has_location_returns_422(self, client):
        resp = client.get("/api/v1/breaches/advanced-search?has_location=maybe")
        assert resp.status_code == 422

    def test_advanced_search_invalid_sort_by_returns_422(self, client):
        resp = client.get("/api/v1/breaches/advanced-search?sort_by=unknown_field")
        assert resp.status_code == 422


class TestFilterOptions:

    def test_filter_options_public(self, client):
        with patch(
            "app.routes.breaches.breach_service.get_filter_options",
            return_value={
                "severities": ["critical", "high"],
                "statuses": ["active", "resolved"],
                "industries": ["finance", "technology"],
                "data_types": [{"value": "email", "count": 8}],
                "ranges": {"min_risk": 1.0, "max_risk": 9.5, "min_records": 5, "max_records": 99999},
            },
        ):
            resp = client.get("/api/v1/breaches/filter-options")

        assert resp.status_code == 200
        body = resp.get_json()
        assert body["status"] == "success"
        assert "ranges" in body["data"]


class TestSubdocumentQuery:

    def test_subdocument_query_requires_auth(self, client):
        resp = client.get("/api/v1/breaches/subdocuments/query")
        assert resp.status_code == 401

    def test_subdocument_query_analyst_success(self, client, analyst_headers):
        with patch(
            "app.routes.breaches.breach_service.query_subdocuments",
            return_value=(
                [
                    {
                        "_id": ObjectId(),
                        "title": "Complex Subdoc Breach",
                        "subdoc_counts": {
                            "affected_accounts": 2,
                            "timeline": 3,
                            "remediation": 2,
                            "monitoring_alerts": 1,
                        },
                    }
                ],
                1,
                {"timeline_event_types": [{"value": "discovered", "count": 3}]},
            ),
        ):
            resp = client.get(
                "/api/v1/breaches/subdocuments/query?"
                "timeline_event_types=discovered,resolved&"
                "remediation_statuses=completed&"
                "alert_severities=high&alert_acknowledged=false&"
                "account_notified=true&"
                "timeline_from=2024-01-01&timeline_to=2025-12-31",
                headers=analyst_headers,
            )
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["meta"]["total"] == 1
        assert "facets" in body["meta"]

    def test_subdocument_query_invalid_alert_severity(self, client, analyst_headers):
        resp = client.get(
            "/api/v1/breaches/subdocuments/query?alert_severities=extreme",
            headers=analyst_headers,
        )
        assert resp.status_code == 422

    def test_subdocument_query_invalid_bool(self, client, analyst_headers):
        resp = client.get(
            "/api/v1/breaches/subdocuments/query?account_notified=maybe",
            headers=analyst_headers,
        )
        assert resp.status_code == 422
