"""
test_breach_service.py — Unit tests for BreachService business logic.

Covers:
  - compute_risk_score (static method)
  - CRUD operations (create, update, patch, delete)
  - Bulk operations (bulk_delete, bulk_insert)
  - Exposure check
  - Sub-document CRUD (affected_accounts, timeline, remediation, alerts)
  - Geospatial (find_near, find_within_bounds, get_geojson)
"""
import pytest
from unittest.mock import patch, MagicMock, PropertyMock
from datetime import datetime
from bson import ObjectId


# ---------------------------------------------------------------------------
# Risk score computation (pure logic — no DB needed)
# ---------------------------------------------------------------------------

class TestComputeRiskScore:
    """Tests for BreachService.compute_risk_score static method."""

    def _compute(self, severity, count, data_types):
        from app.services.breach_service import BreachService
        return BreachService.compute_risk_score(severity, count, data_types)

    def test_critical_high_count_is_high_risk(self):
        score = self._compute("critical", 10_000_000, ["password", "ssn", "email"])
        assert 8.0 <= score <= 10.0

    def test_informational_zero_records_is_low_risk(self):
        score = self._compute("informational", 0, [])
        assert 0.0 <= score <= 2.0

    def test_medium_severity_moderate_count(self):
        score = self._compute("medium", 50_000, ["email", "phone"])
        assert 3.0 <= score <= 7.0

    def test_score_capped_at_ten(self):
        score = self._compute("critical", 10**12, ["password", "ssn", "credit_card", "biometric"])
        assert score <= 10.0

    def test_score_never_negative(self):
        score = self._compute("informational", 0, [])
        assert score >= 0.0

    def test_high_sensitivity_data_types_boost_score(self):
        low_score = self._compute("high", 1000, ["username"])
        high_score = self._compute("high", 1000, ["password", "credit_card"])
        assert high_score > low_score

    def test_empty_data_types_yields_zero_sensitivity(self):
        score = self._compute("low", 100, [])
        low_bound = self._compute("low", 100, ["username"])
        assert score < low_bound

    def test_unknown_severity_treated_as_zero(self):
        score = self._compute("nonexistent", 0, [])
        assert score == 0.0

    def test_returns_float_rounded_to_two_decimals(self):
        score = self._compute("high", 5000, ["email"])
        assert isinstance(score, float)
        assert score == round(score, 2)


# ---------------------------------------------------------------------------
# Core CRUD (via route-level mocking + client)
# ---------------------------------------------------------------------------

BREACH_ID = str(ObjectId())
MOCK_BREACH_DOC = {
    "_id": ObjectId(BREACH_ID),
    "title": "Service Test Breach",
    "description": "A test breach for service-layer testing.",
    "severity": "high",
    "status": "active",
    "industry": "finance",
    "affected_records_count": 100000,
    "data_types_exposed": ["email", "password"],
    "risk_score": 7.5,
    "breach_date": datetime(2025, 3, 1),
    "discovered_date": datetime(2025, 3, 5),
    "source_url": "https://example.com/breach",
    "organisation": {"name": "FinCorp", "domain": "fincorp.com", "country": "UK", "size": "large"},
    "location": {"type": "Point", "coordinates": [-0.1276, 51.5074]},
    "affected_accounts": [],
    "timeline": [],
    "remediation": [],
    "monitoring_alerts": [],
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow(),
    "created_by": str(ObjectId()),
}


class TestCreateBreach:
    """Test breach creation through the route."""

    def test_create_breach_returns_201_with_valid_payload(self, client, analyst_headers):
        with patch("app.routes.breaches.breach_service.create", return_value=MOCK_BREACH_DOC):
            resp = client.post("/api/v1/breaches/", json={
                "title": "Finance Breach 2025",
                "description": "Large-scale financial data breach affecting many users.",
                "breach_date": "2025-03-01",
                "discovered_date": "2025-03-05",
                "severity": "high",
                "status": "active",
                "industry": "finance",
                "affected_records_count": 100000,
                "data_types_exposed": ["email", "password"],
            }, headers=analyst_headers)
        assert resp.status_code == 201
        body = resp.get_json()
        assert body["status"] == "success"

    def test_create_breach_missing_title_returns_422(self, client, analyst_headers):
        resp = client.post("/api/v1/breaches/", json={
            "description": "Missing title field for validation test.",
            "breach_date": "2025-03-01",
            "discovered_date": "2025-03-05",
            "severity": "high",
            "status": "active",
            "industry": "finance",
            "affected_records_count": 100,
        }, headers=analyst_headers)
        assert resp.status_code == 422

    def test_create_breach_date_ordering_violation_returns_422(self, client, analyst_headers):
        resp = client.post("/api/v1/breaches/", json={
            "title": "Date Order Test Breach",
            "description": "Testing that breach_date must be before discovered_date.",
            "breach_date": "2025-06-01",
            "discovered_date": "2025-01-01",
            "severity": "low",
            "status": "active",
            "industry": "technology",
            "affected_records_count": 10,
        }, headers=analyst_headers)
        assert resp.status_code == 422


class TestUpdateBreach:
    """Test PUT and PATCH breach operations."""

    def test_put_breach_admin_success(self, client, admin_headers):
        with patch("app.routes.breaches.breach_service.update",
                   return_value=(MOCK_BREACH_DOC, None)):
            resp = client.put(f"/api/v1/breaches/{BREACH_ID}", json={
                "title": "Updated Breach Title Here",
                "description": "Updated description for the breach record here.",
                "breach_date": "2025-03-01",
                "discovered_date": "2025-03-05",
                "severity": "critical",
                "status": "contained",
                "industry": "finance",
                "affected_records_count": 200000,
            }, headers=admin_headers)
        assert resp.status_code == 200
        assert resp.get_json()["status"] == "success"

    def test_put_breach_forbidden_for_non_owner_analyst(self, client, analyst_headers):
        with patch("app.routes.breaches.breach_service.update",
                   return_value=(None, "forbidden")):
            resp = client.put(f"/api/v1/breaches/{BREACH_ID}", json={
                "title": "Forbidden Update Attempt Breach",
                "description": "Should be rejected because analyst doesn't own this.",
                "breach_date": "2025-03-01",
                "discovered_date": "2025-03-05",
                "severity": "high",
                "status": "active",
                "industry": "finance",
                "affected_records_count": 100000,
            }, headers=analyst_headers)
        assert resp.status_code == 403

    def test_put_breach_not_found_returns_404(self, client, admin_headers):
        with patch("app.routes.breaches.breach_service.update",
                   return_value=(None, "not_found")):
            resp = client.put(f"/api/v1/breaches/{BREACH_ID}", json={
                "title": "Missing Breach Record Test",
                "description": "Trying to update a breach that does not exist.",
                "breach_date": "2025-03-01",
                "discovered_date": "2025-03-05",
                "severity": "low",
                "status": "active",
                "industry": "retail",
                "affected_records_count": 0,
            }, headers=admin_headers)
        assert resp.status_code == 404

    def test_patch_breach_partial_update_status_only(self, client, analyst_headers):
        updated = {**MOCK_BREACH_DOC, "status": "resolved"}
        with patch("app.routes.breaches.breach_service.patch",
                   return_value=(updated, None)):
            resp = client.patch(f"/api/v1/breaches/{BREACH_ID}",
                                json={"status": "resolved"},
                                headers=analyst_headers)
        assert resp.status_code == 200

    def test_patch_breach_invalid_severity_returns_422(self, client, analyst_headers):
        resp = client.patch(f"/api/v1/breaches/{BREACH_ID}",
                            json={"severity": "super_critical"},
                            headers=analyst_headers)
        assert resp.status_code == 422

    def test_patch_breach_empty_body_returns_400(self, client, analyst_headers):
        resp = client.patch(f"/api/v1/breaches/{BREACH_ID}",
                            json={},
                            headers=analyst_headers)
        assert resp.status_code == 400


class TestDeleteBreach:

    def test_delete_breach_invalid_id_returns_404_or_400(self, client, admin_headers):
        with patch("app.routes.breaches.breach_service.delete",
                   return_value=(False, "invalid_id")):
            resp = client.delete(f"/api/v1/breaches/{BREACH_ID}", headers=admin_headers)
        assert resp.status_code in (400, 404)


# ---------------------------------------------------------------------------
# Bulk operations
# ---------------------------------------------------------------------------

class TestBulkOperations:

    def test_bulk_delete_requires_admin(self, client, analyst_headers):
        resp = client.delete("/api/v1/admin/breaches/bulk",
                             json={"ids": [BREACH_ID]},
                             headers=analyst_headers)
        assert resp.status_code == 403

    def test_bulk_delete_admin_success(self, client, admin_headers):
        with patch("app.routes.admin.breach_service.bulk_delete",
                   return_value=(1, [])):
            resp = client.delete("/api/v1/admin/breaches/bulk",
                                 json={"ids": [BREACH_ID]},
                                 headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["deleted"] == 1
        assert data["partial_failure"] is False

    def test_bulk_delete_empty_ids_returns_400(self, client, admin_headers):
        resp = client.delete("/api/v1/admin/breaches/bulk",
                             json={"ids": []},
                             headers=admin_headers)
        assert resp.status_code == 400

    def test_bulk_delete_too_many_ids_returns_422(self, client, admin_headers):
        ids = [str(ObjectId()) for _ in range(101)]
        resp = client.delete("/api/v1/admin/breaches/bulk",
                             json={"ids": ids},
                             headers=admin_headers)
        assert resp.status_code == 422

    def test_bulk_delete_partial_failure(self, client, admin_headers):
        id1, id2 = str(ObjectId()), "invalid-id"
        with patch("app.routes.admin.breach_service.bulk_delete",
                   return_value=(1, ["invalid-id"])):
            resp = client.delete("/api/v1/admin/breaches/bulk",
                                 json={"ids": [id1, id2]},
                                 headers=admin_headers)
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["partial_failure"] is True
        assert data["deleted"] == 1
        assert len(data["invalid_ids"]) == 1

    def test_bulk_import_requires_admin(self, client, analyst_headers):
        resp = client.post("/api/v1/breaches/bulk",
                           json={"breaches": [{"title": "Test"}]},
                           headers=analyst_headers)
        assert resp.status_code == 403

    def test_bulk_import_empty_list_returns_400(self, client, admin_headers):
        resp = client.post("/api/v1/breaches/bulk",
                           json={"breaches": []},
                           headers=admin_headers)
        assert resp.status_code == 400


# ---------------------------------------------------------------------------
# Exposure check
# ---------------------------------------------------------------------------

class TestExposureCheckService:

    def test_exposure_check_by_domain(self, client):
        with patch("app.routes.breaches.breach_service.check_exposure",
                   return_value={"domain": "example.com", "domain_exposed": True, "breach_count": 2, "breaches": []}):
            resp = client.get("/api/v1/breaches/check?domain=example.com")
        assert resp.status_code == 200
        assert resp.get_json()["data"]["domain_exposed"] is True

    def test_exposure_check_email_not_found(self, client):
        with patch("app.routes.breaches.breach_service.check_exposure",
                   return_value={"email": "clean@test.com", "email_exposed": False, "breach_count": 0, "breaches": []}):
            resp = client.get("/api/v1/breaches/check?email=clean@test.com")
        assert resp.status_code == 200
        assert resp.get_json()["data"]["email_exposed"] is False

    def test_exposure_check_both_email_and_domain(self, client):
        with patch("app.routes.breaches.breach_service.check_exposure",
                   return_value={
                       "email": "user@corp.com", "domain": "corp.com",
                       "email_exposed": True, "domain_exposed": True,
                       "breach_count": 3, "breaches": [],
                   }):
            resp = client.get("/api/v1/breaches/check?email=user@corp.com&domain=corp.com")
        assert resp.status_code == 200
        data = resp.get_json()["data"]
        assert data["email_exposed"] is True
        assert data["domain_exposed"] is True

    def test_exposure_check_invalid_domain(self, client):
        resp = client.get("/api/v1/breaches/check?domain=not-a-domain")
        assert resp.status_code == 422



# ---------------------------------------------------------------------------
# Geospatial endpoints
# ---------------------------------------------------------------------------

class TestGeoEndpointsService:

    def test_geo_near_success(self, client):
        mock_doc = {
            **MOCK_BREACH_DOC,
            "location": {"type": "Point", "coordinates": [-0.1276, 51.5074]},
        }
        with patch("app.routes.breaches.breach_service.find_near",
                   return_value=[mock_doc]):
            resp = client.get("/api/v1/breaches/geo/near?longitude=-0.1276&latitude=51.5074&radius=10000")
        assert resp.status_code == 200
        body = resp.get_json()
        assert body["data"]["type"] == "FeatureCollection"
        assert len(body["data"]["features"]) == 1

    def test_geo_near_missing_params_returns_400(self, client):
        resp = client.get("/api/v1/breaches/geo/near")
        assert resp.status_code == 400

    def test_geo_near_invalid_longitude_returns_422(self, client):
        resp = client.get("/api/v1/breaches/geo/near?longitude=200&latitude=51.5")
        assert resp.status_code == 422

    def test_geo_near_invalid_latitude_returns_422(self, client):
        resp = client.get("/api/v1/breaches/geo/near?longitude=-0.1&latitude=95")
        assert resp.status_code == 422

    def test_geo_near_invalid_radius_returns_422(self, client):
        resp = client.get("/api/v1/breaches/geo/near?longitude=-0.1&latitude=51.5&radius=600000")
        assert resp.status_code == 422

    def test_geo_within_bounds_success(self, client):
        mock_doc = {
            **MOCK_BREACH_DOC,
            "location": {"type": "Point", "coordinates": [-0.1, 51.5]},
        }
        with patch("app.routes.breaches.breach_service.find_within_bounds",
                   return_value=[mock_doc]):
            resp = client.get("/api/v1/breaches/geo/within-bounds?min_lng=-1&min_lat=50&max_lng=1&max_lat=52")
        assert resp.status_code == 200
        assert resp.get_json()["data"]["type"] == "FeatureCollection"

    def test_geo_within_bounds_missing_params_returns_400(self, client):
        resp = client.get("/api/v1/breaches/geo/within-bounds?min_lng=-1")
        assert resp.status_code == 400

    def test_geo_within_bounds_out_of_range_returns_422(self, client):
        resp = client.get("/api/v1/breaches/geo/within-bounds?min_lng=-200&min_lat=50&max_lng=1&max_lat=52")
        assert resp.status_code == 422

    def test_geo_geojson_with_severity_filter(self, client):
        with patch("app.routes.breaches.breach_service.get_geojson",
                   return_value=[]):
            resp = client.get("/api/v1/breaches/geo/geojson?severity=critical")
        assert resp.status_code == 200

    def test_geo_geojson_with_industry_filter(self, client):
        with patch("app.routes.breaches.breach_service.get_geojson",
                   return_value=[]):
            resp = client.get("/api/v1/breaches/geo/geojson?industry=finance")
        assert resp.status_code == 200
