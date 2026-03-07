"""
test_analytics.py — Tests for analytics aggregation endpoints.
"""
import pytest
from unittest.mock import patch


class TestAnalyticsEndpoints:

    def test_severity_breakdown_no_auth(self, client):
        """Severity breakdown is public."""
        with patch("app.routes.analytics.analytics_service.severity_breakdown", return_value=[
            {"severity": "critical", "breach_count": 10, "total_records": 5000000},
            {"severity": "high", "breach_count": 15, "total_records": 2000000},
        ]):
            resp = client.get("/api/v1/analytics/severity-breakdown")
        assert resp.status_code == 200
        data = resp.get_json()
        assert data["status"] == "success"
        assert isinstance(data["data"], list)

    def test_monthly_trend_no_auth(self, client):
        with patch("app.routes.analytics.analytics_service.monthly_trend", return_value=[
            {"year": 2025, "month": 1, "count": 5},
        ]):
            resp = client.get("/api/v1/analytics/monthly-trend")
        assert resp.status_code == 200

    def test_monthly_trend_invalid_year(self, client):
        resp = client.get("/api/v1/analytics/monthly-trend?year=notayear")
        assert resp.status_code == 400

    def test_risk_by_industry_requires_auth(self, client):
        resp = client.get("/api/v1/analytics/risk-by-industry")
        assert resp.status_code == 401

    def test_risk_by_industry_analyst_ok(self, client, analyst_headers):
        with patch("app.routes.analytics.analytics_service.risk_by_industry", return_value=[
            {"industry": "finance", "avg_risk_score": 7.2, "max_risk_score": 9.5, "min_risk_score": 4.1, "breach_count": 8, "total_records_exposed": 5000000},
        ]):
            resp = client.get("/api/v1/analytics/risk-by-industry", headers=analyst_headers)
        assert resp.status_code == 200
        assert resp.get_json()["data"][0]["industry"] == "finance"

    def test_top_organisations_requires_auth(self, client):
        resp = client.get("/api/v1/analytics/top-organisations")
        assert resp.status_code == 401

    def test_top_organisations_limit_capped(self, client, analyst_headers):
        with patch("app.routes.analytics.analytics_service.top_organisations", return_value=[]) as mock_top:
            resp = client.get("/api/v1/analytics/top-organisations?limit=99", headers=analyst_headers)
            mock_top.assert_called_with(limit=25)
        assert resp.status_code == 200

    def test_summary_no_auth(self, client):
        with patch("app.routes.analytics.analytics_service.summary", return_value={
            "total_breaches": 25,
            "total_records_exposed": 50000000,
            "avg_risk_score": 7.8,
            "open_alerts": 12,
            "active_breaches": 8,
            "resolved_breaches": 5,
            "industries_affected": 4,
        }):
            resp = client.get("/api/v1/analytics/summary")
        assert resp.status_code == 200
        assert resp.get_json()["data"]["total_breaches"] == 25

    def test_data_types_frequency_no_auth(self, client):
        with patch("app.routes.analytics.analytics_service.data_types_frequency", return_value=[
            {"data_type": "email", "count": 22},
        ]):
            resp = client.get("/api/v1/analytics/data-types-frequency")
        assert resp.status_code == 200

    def test_remediation_rate_requires_analyst(self, client):
        resp = client.get("/api/v1/analytics/remediation-rate")
        assert resp.status_code == 401

    def test_risk_scores_distribution(self, client):
        with patch("app.routes.analytics.analytics_service.risk_score_distribution", return_value=[
            {"_id": 0.0, "count": 2},
            {"_id": 5.0, "count": 10},
        ]):
            resp = client.get("/api/v1/analytics/risk-scores?bins=5")
        assert resp.status_code == 200
