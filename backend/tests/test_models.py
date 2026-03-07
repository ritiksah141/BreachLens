"""
test_models.py — Unit tests for breach model validation schemas AND
standalone validator / sanitization utility functions.

Covers: BreachSchema, AffectedAccountSchema, TimelineEventSchema,
        RemediationActionSchema, MonitoringAlertSchema,
        validate_breach_payload, validate_geojson_point,
        validate_affected_account, validate_timeline_event,
        validate_remediation_action, validate_monitoring_alert,
        sanitize_mongo_input, sanitize_query_params,
        safe_regex_query, sanitize_html, sanitize_breach_payload_html.
"""
import pytest
from app.models.breach import (
    BreachSchema,
    AffectedAccountSchema,
    TimelineEventSchema,
    RemediationActionSchema,
    MonitoringAlertSchema,
)
from app.utils.validators import (
    validate_breach_payload,
    validate_geojson_point,
    validate_affected_account,
    validate_timeline_event,
    validate_remediation_action,
    validate_monitoring_alert,
    sanitize_mongo_input,
    sanitize_query_params,
    safe_regex_query,
    sanitize_html,
    sanitize_breach_payload_html,
)


# ===================================================================
# Helper – minimal valid payloads
# ===================================================================

def _valid_breach():
    return {
        "title": "Major Data Breach Incident",
        "description": "A very detailed description of the data breach that exceeds twenty characters.",
        "severity": "high",
        "status": "active",
        "industry": "technology",
        "affected_records_count": 50000,
        "breach_date": "2024-01-15",
        "discovered_date": "2024-01-20",
    }


def _valid_account():
    return {"email": "victim@example.com"}


def _valid_timeline():
    return {
        "event_date": "2024-01-15",
        "event_type": "breach_occurred",
        "description": "Initial compromise of authentication database detected.",
    }


def _valid_remediation():
    return {
        "action": "Force password reset for all affected users",
        "status": "pending",
        "due_date": "2025-04-01",
    }


def _valid_alert():
    return {
        "alert_type": "new_exposure",
        "severity": "high",
        "details": "Credentials appearing on dark web marketplace identified.",
    }


# ===================================================================
# BreachSchema tests
# ===================================================================

class TestBreachSchema:

    def test_valid_breach_returns_no_errors(self):
        errors = BreachSchema.validate(_valid_breach())
        assert errors == []

    def test_missing_required_fields(self):
        errors = BreachSchema.validate({})
        for field in BreachSchema.REQUIRED_FIELDS:
            assert any(field in e for e in errors)

    def test_partial_update_skips_required(self):
        """PATCH payload (require_all=False) should not flag missing fields."""
        errors = BreachSchema.validate({"severity": "low"}, require_all=False)
        assert errors == []

    def test_title_too_short(self):
        data = _valid_breach()
        data["title"] = "Hi"
        errors = BreachSchema.validate(data)
        assert any("title" in e for e in errors)

    def test_title_too_long(self):
        data = _valid_breach()
        data["title"] = "A" * 201
        errors = BreachSchema.validate(data)
        assert any("title" in e for e in errors)

    def test_description_too_short(self):
        data = _valid_breach()
        data["description"] = "Short"
        errors = BreachSchema.validate(data)
        assert any("description" in e for e in errors)

    def test_invalid_severity(self):
        data = _valid_breach()
        data["severity"] = "ultra"
        errors = BreachSchema.validate(data)
        assert any("severity" in e for e in errors)

    def test_invalid_status(self):
        data = _valid_breach()
        data["status"] = "open"
        errors = BreachSchema.validate(data)
        assert any("status" in e for e in errors)

    def test_invalid_industry(self):
        data = _valid_breach()
        data["industry"] = "aerospace"
        errors = BreachSchema.validate(data)
        assert any("industry" in e for e in errors)

    def test_negative_affected_records(self):
        data = _valid_breach()
        data["affected_records_count"] = -1
        errors = BreachSchema.validate(data)
        assert any("affected_records_count" in e for e in errors)

    def test_non_integer_records_count(self):
        data = _valid_breach()
        data["affected_records_count"] = "many"
        errors = BreachSchema.validate(data)
        assert any("affected_records_count" in e for e in errors)

    def test_data_types_exposed_not_list(self):
        data = _valid_breach()
        data["data_types_exposed"] = "passwords"
        errors = BreachSchema.validate(data)
        assert any("data_types_exposed" in e for e in errors)

    def test_data_types_exposed_non_string(self):
        data = _valid_breach()
        data["data_types_exposed"] = [123, 456]
        errors = BreachSchema.validate(data)
        assert any("data_types_exposed" in e for e in errors)

    def test_invalid_breach_date(self):
        data = _valid_breach()
        data["breach_date"] = "not-a-date"
        errors = BreachSchema.validate(data)
        assert any("breach_date" in e for e in errors)

    def test_invalid_discovered_date(self):
        data = _valid_breach()
        data["discovered_date"] = "nope"
        errors = BreachSchema.validate(data)
        assert any("discovered_date" in e for e in errors)

    def test_breach_after_discovered(self):
        """breach_date must be <= discovered_date."""
        data = _valid_breach()
        data["breach_date"] = "2024-06-01"
        data["discovered_date"] = "2024-01-01"
        errors = BreachSchema.validate(data)
        assert any("breach_date" in e and "before" in e for e in errors)

    def test_invalid_source_url(self):
        data = _valid_breach()
        data["source_url"] = "ftp://bad.example.com"
        errors = BreachSchema.validate(data)
        assert any("source_url" in e for e in errors)

    def test_valid_source_url(self):
        data = _valid_breach()
        data["source_url"] = "https://example.com/breach-report"
        errors = BreachSchema.validate(data)
        assert errors == []

    def test_risk_score_out_of_range(self):
        data = _valid_breach()
        data["risk_score"] = 15.0
        errors = BreachSchema.validate(data)
        assert any("risk_score" in e for e in errors)

    def test_risk_score_negative(self):
        data = _valid_breach()
        data["risk_score"] = -1.0
        errors = BreachSchema.validate(data)
        assert any("risk_score" in e for e in errors)

    def test_risk_score_non_numeric(self):
        data = _valid_breach()
        data["risk_score"] = "xyz"
        errors = BreachSchema.validate(data)
        assert any("risk_score" in e for e in errors)

    def test_risk_score_valid(self):
        data = _valid_breach()
        data["risk_score"] = 7.5
        errors = BreachSchema.validate(data)
        assert errors == []

    def test_organisation_not_dict(self):
        data = _valid_breach()
        data["organisation"] = "A Corp"
        errors = BreachSchema.validate(data)
        assert any("organisation" in e for e in errors)

    def test_organisation_invalid_domain(self):
        data = _valid_breach()
        data["organisation"] = {"domain": "not_a_domain"}
        errors = BreachSchema.validate(data)
        assert any("domain" in e for e in errors)

    def test_organisation_invalid_size(self):
        data = _valid_breach()
        data["organisation"] = {"size": "massive"}
        errors = BreachSchema.validate(data)
        assert any("size" in e for e in errors)

    def test_organisation_valid(self):
        data = _valid_breach()
        data["organisation"] = {"domain": "acme.com", "size": "large"}
        errors = BreachSchema.validate(data)
        assert errors == []

    def test_invalid_geojson_location(self):
        data = _valid_breach()
        data["location"] = {"type": "Polygon", "coordinates": [0, 0]}
        errors = BreachSchema.validate(data)
        assert len(errors) > 0

    def test_valid_geojson_location(self):
        data = _valid_breach()
        data["location"] = {"type": "Point", "coordinates": [-73.97, 40.77]}
        errors = BreachSchema.validate(data)
        assert errors == []

    def test_sanitize_strips_operators(self):
        data = {"title": "ok", "$gt": "1"}
        cleaned = BreachSchema.sanitize(data)
        assert "$gt" not in cleaned

    def test_to_document_builds_correct_structure(self):
        """to_document produces a dict ready for insert_one."""
        from unittest.mock import patch
        data = _valid_breach()
        with patch("app.services.breach_service.BreachService.compute_risk_score", return_value=5.0):
            doc = BreachSchema.to_document(data, created_by="user123")
        assert doc["created_by"] == "user123"
        assert "created_at" in doc
        assert "affected_accounts" in doc
        assert doc["affected_accounts"] == []
        assert doc["risk_score"] == 5.0


# ===================================================================
# AffectedAccountSchema tests
# ===================================================================

class TestAffectedAccountSchema:

    def test_valid_account(self):
        errors = AffectedAccountSchema.validate(_valid_account())
        assert errors == []

    def test_missing_email(self):
        errors = AffectedAccountSchema.validate({})
        assert any("email" in e for e in errors)

    def test_invalid_email_format(self):
        errors = AffectedAccountSchema.validate({"email": "not-an-email"})
        assert any("email" in e for e in errors)

    def test_partial_update_no_email(self):
        errors = AffectedAccountSchema.validate({"notified": True}, require_all=False)
        assert errors == []

    def test_username_exceeds_limit(self):
        errors = AffectedAccountSchema.validate({"email": "a@b.com", "username": "x" * 250})
        assert any("username" in e for e in errors)

    def test_username_non_string(self):
        errors = AffectedAccountSchema.validate({"email": "a@b.com", "username": 999})
        assert any("username" in e for e in errors)

    def test_data_exposed_not_list(self):
        errors = AffectedAccountSchema.validate({"email": "a@b.com", "data_exposed": "email"})
        assert any("data_exposed" in e for e in errors)

    def test_data_exposed_non_string_item(self):
        errors = AffectedAccountSchema.validate({"email": "a@b.com", "data_exposed": [1]})
        assert any("data_exposed" in e for e in errors)

    def test_notified_must_be_bool(self):
        errors = AffectedAccountSchema.validate({"email": "a@b.com", "notified": "yes"})
        assert any("notified" in e for e in errors)

    def test_invalid_notification_date(self):
        errors = AffectedAccountSchema.validate(
            {"email": "a@b.com", "notification_date": "bad-date"}
        )
        assert any("notification_date" in e for e in errors)

    def test_valid_full_payload(self):
        payload = {
            "email": "victim@example.com",
            "username": "victim42",
            "data_exposed": ["email", "password_hash"],
            "notified": True,
            "notification_date": "2024-02-01",
        }
        errors = AffectedAccountSchema.validate(payload)
        assert errors == []


# ===================================================================
# TimelineEventSchema tests
# ===================================================================

class TestTimelineEventSchema:

    def test_valid_event(self):
        errors = TimelineEventSchema.validate(_valid_timeline())
        assert errors == []

    def test_missing_required_fields(self):
        errors = TimelineEventSchema.validate({})
        assert len(errors) >= 3

    def test_invalid_event_type(self):
        data = _valid_timeline()
        data["event_type"] = "hacked"
        errors = TimelineEventSchema.validate(data)
        assert any("event_type" in e for e in errors)

    def test_description_too_short(self):
        data = _valid_timeline()
        data["description"] = "Short"
        errors = TimelineEventSchema.validate(data)
        assert any("description" in e for e in errors)

    def test_invalid_event_date(self):
        data = _valid_timeline()
        data["event_date"] = "yesterday"
        errors = TimelineEventSchema.validate(data)
        assert any("event_date" in e for e in errors)

    def test_historical_event_future_date_rejected(self):
        """breach_occurred in the future should produce an error."""
        data = _valid_timeline()
        data["event_date"] = "2099-01-01"
        data["event_type"] = "breach_occurred"
        errors = TimelineEventSchema.validate(data)
        assert any("future" in e for e in errors)

    def test_non_historical_event_future_ok(self):
        """resolved event in the future is allowed."""
        data = {
            "event_date": "2099-01-01",
            "event_type": "resolved",
            "description": "Breach resolved and all accounts secured.",
        }
        errors = TimelineEventSchema.validate(data)
        assert errors == []

    def test_actor_exceeds_limit(self):
        data = _valid_timeline()
        data["actor"] = "x" * 250
        errors = TimelineEventSchema.validate(data)
        assert any("actor" in e for e in errors)

    def test_actor_non_string(self):
        data = _valid_timeline()
        data["actor"] = 12345
        errors = TimelineEventSchema.validate(data)
        assert any("actor" in e for e in errors)

    def test_partial_update_valid(self):
        errors = TimelineEventSchema.validate(
            {"description": "Updated the description to something longer."},
            require_all=False
        )
        assert errors == []


# ===================================================================
# RemediationActionSchema tests
# ===================================================================

class TestRemediationActionSchema:

    def test_valid_remediation(self):
        errors = RemediationActionSchema.validate(_valid_remediation())
        assert errors == []

    def test_missing_required_fields(self):
        errors = RemediationActionSchema.validate({})
        assert len(errors) >= 3

    def test_action_too_short(self):
        data = _valid_remediation()
        data["action"] = "Fix"
        errors = RemediationActionSchema.validate(data)
        assert any("action" in e for e in errors)

    def test_action_too_long(self):
        data = _valid_remediation()
        data["action"] = "A" * 501
        errors = RemediationActionSchema.validate(data)
        assert any("action" in e for e in errors)

    def test_invalid_status(self):
        data = _valid_remediation()
        data["status"] = "unknown"
        errors = RemediationActionSchema.validate(data)
        assert any("status" in e for e in errors)

    def test_invalid_due_date(self):
        data = _valid_remediation()
        data["due_date"] = "tomorrow"
        errors = RemediationActionSchema.validate(data)
        assert any("due_date" in e for e in errors)

    def test_assigned_to_too_long(self):
        data = _valid_remediation()
        data["assigned_to"] = "X" * 201
        errors = RemediationActionSchema.validate(data)
        assert any("assigned_to" in e for e in errors)

    def test_assigned_to_non_string(self):
        data = _valid_remediation()
        data["assigned_to"] = 42
        errors = RemediationActionSchema.validate(data)
        assert any("assigned_to" in e for e in errors)

    def test_invalid_completed_date(self):
        data = _valid_remediation()
        data["completed_date"] = "nope"
        errors = RemediationActionSchema.validate(data)
        assert any("completed_date" in e for e in errors)

    def test_valid_completed_date(self):
        data = _valid_remediation()
        data["completed_date"] = "2025-05-01"
        errors = RemediationActionSchema.validate(data)
        assert errors == []

    def test_partial_update_valid(self):
        errors = RemediationActionSchema.validate(
            {"status": "completed"}, require_all=False
        )
        assert errors == []


# ===================================================================
# MonitoringAlertSchema tests
# ===================================================================

class TestMonitoringAlertSchema:

    def test_valid_alert(self):
        errors = MonitoringAlertSchema.validate(_valid_alert())
        assert errors == []

    def test_missing_required_fields(self):
        errors = MonitoringAlertSchema.validate({})
        assert len(errors) >= 3

    def test_invalid_alert_type(self):
        data = _valid_alert()
        data["alert_type"] = "random_type"
        errors = MonitoringAlertSchema.validate(data)
        assert any("alert_type" in e for e in errors)

    def test_invalid_severity(self):
        data = _valid_alert()
        data["severity"] = "extreme"
        errors = MonitoringAlertSchema.validate(data)
        assert any("severity" in e for e in errors)

    def test_details_too_short(self):
        data = _valid_alert()
        data["details"] = "Short"
        errors = MonitoringAlertSchema.validate(data)
        assert any("details" in e for e in errors)

    def test_details_too_long(self):
        data = _valid_alert()
        data["details"] = "D" * 5001
        errors = MonitoringAlertSchema.validate(data)
        assert any("details" in e for e in errors)

    def test_invalid_triggered_at(self):
        data = _valid_alert()
        data["triggered_at"] = "bad-datetime"
        errors = MonitoringAlertSchema.validate(data)
        assert any("triggered_at" in e for e in errors)

    def test_acknowledged_must_be_bool(self):
        data = _valid_alert()
        data["acknowledged"] = "true"
        errors = MonitoringAlertSchema.validate(data)
        assert any("acknowledged" in e for e in errors)

    def test_partial_update_valid(self):
        errors = MonitoringAlertSchema.validate(
            {"acknowledged": True}, require_all=False
        )
        assert errors == []

    def test_all_valid_alert_types(self):
        """Verify each allowed alert_type passes validation."""
        for atype in MonitoringAlertSchema.ALLOWED_ALERT_TYPES:
            data = _valid_alert()
            data["alert_type"] = atype
            errors = MonitoringAlertSchema.validate(data)
            assert errors == [], f"Failed for alert_type={atype}"

    def test_all_valid_severities(self):
        """Verify each severity level passes."""
        for sev in ["critical", "high", "medium", "low"]:
            data = _valid_alert()
            data["severity"] = sev
            errors = MonitoringAlertSchema.validate(data)
            assert errors == [], f"Failed for severity={sev}"


# ===================================================================
# ========= STANDALONE VALIDATOR FUNCTIONS (app.utils.validators) ====
# ===================================================================

def _full_breach_payload():
    """Minimal valid breach payload for the standalone validator."""
    return {
        "title": "Valid Breach Title",
        "description": "This is a valid description that is at least twenty characters long for testing.",
        "severity": "critical",
        "status": "active",
        "industry": "finance",
        "affected_records_count": 1000,
        "breach_date": "2024-01-15T00:00:00Z",
        "discovered_date": "2024-02-01T00:00:00Z",
    }


class TestValidateBreachPayload:

    def test_valid_payload(self):
        errors = validate_breach_payload(_full_breach_payload())
        assert errors == []

    def test_missing_required_fields(self):
        errors = validate_breach_payload({})
        assert len(errors) == 8

    def test_partial_update_no_required(self):
        errors = validate_breach_payload({"title": "Valid Title OK"}, require_all=False)
        assert errors == []

    def test_title_too_short(self):
        p = _full_breach_payload()
        p["title"] = "Hi"
        errors = validate_breach_payload(p)
        assert any("title" in e for e in errors)

    def test_title_too_long(self):
        p = _full_breach_payload()
        p["title"] = "A" * 201
        errors = validate_breach_payload(p)
        assert any("title" in e for e in errors)

    def test_title_not_string(self):
        p = _full_breach_payload()
        p["title"] = 123
        errors = validate_breach_payload(p)
        assert any("title" in e for e in errors)

    def test_description_too_short(self):
        p = _full_breach_payload()
        p["description"] = "short"
        errors = validate_breach_payload(p)
        assert any("description" in e for e in errors)

    def test_invalid_severity(self):
        p = _full_breach_payload()
        p["severity"] = "ultra"
        errors = validate_breach_payload(p)
        assert any("severity" in e for e in errors)

    def test_invalid_status(self):
        p = _full_breach_payload()
        p["status"] = "unknown"
        errors = validate_breach_payload(p)
        assert any("status" in e for e in errors)

    def test_invalid_industry(self):
        p = _full_breach_payload()
        p["industry"] = "other_industry"
        errors = validate_breach_payload(p)
        assert any("industry" in e for e in errors)

    def test_negative_records_count(self):
        p = _full_breach_payload()
        p["affected_records_count"] = -5
        errors = validate_breach_payload(p)
        assert any("non-negative" in e for e in errors)

    def test_non_integer_records_count(self):
        p = _full_breach_payload()
        p["affected_records_count"] = "abc"
        errors = validate_breach_payload(p)
        assert any("integer" in e for e in errors)

    def test_data_types_not_list(self):
        p = _full_breach_payload()
        p["data_types_exposed"] = "email"
        errors = validate_breach_payload(p)
        assert any("list" in e for e in errors)

    def test_data_types_non_string(self):
        p = _full_breach_payload()
        p["data_types_exposed"] = [123, "email"]
        errors = validate_breach_payload(p)
        assert any("string" in e for e in errors)

    def test_invalid_breach_date(self):
        p = _full_breach_payload()
        p["breach_date"] = "not-a-date"
        errors = validate_breach_payload(p)
        assert any("breach_date" in e for e in errors)

    def test_invalid_discovered_date(self):
        p = _full_breach_payload()
        p["discovered_date"] = "not-a-date"
        errors = validate_breach_payload(p)
        assert any("discovered_date" in e for e in errors)

    def test_breach_after_discovered(self):
        p = _full_breach_payload()
        p["breach_date"] = "2024-12-01T00:00:00Z"
        p["discovered_date"] = "2024-01-01T00:00:00Z"
        errors = validate_breach_payload(p)
        assert any("before" in e for e in errors)

    def test_invalid_source_url(self):
        p = _full_breach_payload()
        p["source_url"] = "ftp://bad"
        errors = validate_breach_payload(p)
        assert any("source_url" in e for e in errors)

    def test_risk_score_out_of_range(self):
        p = _full_breach_payload()
        p["risk_score"] = 15
        errors = validate_breach_payload(p)
        assert any("risk_score" in e for e in errors)

    def test_risk_score_non_number(self):
        p = _full_breach_payload()
        p["risk_score"] = "high"
        errors = validate_breach_payload(p)
        assert any("risk_score" in e for e in errors)

    def test_organisation_not_dict(self):
        p = _full_breach_payload()
        p["organisation"] = "BigCorp"
        errors = validate_breach_payload(p)
        assert any("organisation" in e for e in errors)

    def test_organisation_invalid_domain(self):
        p = _full_breach_payload()
        p["organisation"] = {"name": "Corp", "domain": "not a domain!"}
        errors = validate_breach_payload(p)
        assert any("domain" in e for e in errors)

    def test_organisation_invalid_size(self):
        p = _full_breach_payload()
        p["organisation"] = {"name": "Corp", "size": "mega"}
        errors = validate_breach_payload(p)
        assert any("size" in e for e in errors)

    def test_location_validated(self):
        p = _full_breach_payload()
        p["location"] = {"type": "Polygon", "coordinates": []}
        errors = validate_breach_payload(p)
        assert any("location" in e or "Point" in e for e in errors)


class TestValidateGeoJSONPoint:

    def test_valid_point(self):
        errors = validate_geojson_point({"type": "Point", "coordinates": [-73.9, 40.7]})
        assert errors == []

    def test_not_dict(self):
        errors = validate_geojson_point("point")
        assert any("GeoJSON" in e for e in errors)

    def test_wrong_type(self):
        errors = validate_geojson_point({"type": "Polygon", "coordinates": [0, 0]})
        assert any("Point" in e for e in errors)

    def test_missing_coords(self):
        errors = validate_geojson_point({"type": "Point"})
        assert any("coordinates" in e for e in errors)

    def test_coords_wrong_length(self):
        errors = validate_geojson_point({"type": "Point", "coordinates": [0]})
        assert any("coordinates" in e for e in errors)

    def test_coords_not_numbers(self):
        errors = validate_geojson_point({"type": "Point", "coordinates": ["a", "b"]})
        assert any("numbers" in e for e in errors)

    def test_longitude_out_of_range(self):
        errors = validate_geojson_point({"type": "Point", "coordinates": [200, 0]})
        assert any("Longitude" in e for e in errors)

    def test_latitude_out_of_range(self):
        errors = validate_geojson_point({"type": "Point", "coordinates": [0, 100]})
        assert any("Latitude" in e for e in errors)


class TestValidateAffectedAccount:

    def test_valid(self):
        errors = validate_affected_account({"email": "user@example.com"})
        assert errors == []

    def test_missing_email(self):
        errors = validate_affected_account({})
        assert any("email" in e and "required" in e for e in errors)

    def test_invalid_email(self):
        errors = validate_affected_account({"email": "not-email"})
        assert any("email" in e.lower() for e in errors)

    def test_username_not_string(self):
        errors = validate_affected_account({"email": "a@b.com", "username": 123})
        assert any("username" in e for e in errors)

    def test_data_exposed_not_list(self):
        errors = validate_affected_account({"email": "a@b.com", "data_exposed": "email"})
        assert any("list" in e for e in errors)

    def test_data_exposed_non_string_item(self):
        errors = validate_affected_account({"email": "a@b.com", "data_exposed": [123]})
        assert any("string" in e for e in errors)

    def test_notified_not_bool(self):
        errors = validate_affected_account({"email": "a@b.com", "notified": "yes"})
        assert any("boolean" in e for e in errors)

    def test_invalid_notification_date(self):
        errors = validate_affected_account({"email": "a@b.com", "notification_date": "bad"})
        assert any("ISO-8601" in e for e in errors)

    def test_partial_update(self):
        errors = validate_affected_account({"notified": True}, require_all=False)
        assert errors == []


class TestValidateTimelineEvent:

    def test_valid(self):
        errors = validate_timeline_event({
            "event_date": "2024-01-15T00:00:00Z",
            "event_type": "discovered",
            "description": "This is a sufficiently long description for testing"
        })
        assert errors == []

    def test_missing_required(self):
        errors = validate_timeline_event({})
        assert len(errors) == 3

    def test_invalid_event_date(self):
        errors = validate_timeline_event({
            "event_date": "bad", "event_type": "discovered", "description": "a" * 20
        })
        assert any("event_date" in e for e in errors)

    def test_invalid_event_type(self):
        errors = validate_timeline_event({
            "event_date": "2024-01-01T00:00:00Z", "event_type": "invalid_type",
            "description": "a" * 20
        })
        assert any("event_type" in e for e in errors)

    def test_description_too_short(self):
        errors = validate_timeline_event({
            "event_date": "2024-01-01T00:00:00Z", "event_type": "discovered",
            "description": "short"
        })
        assert any("description" in e for e in errors)

    def test_description_not_string(self):
        errors = validate_timeline_event({
            "event_date": "2024-01-01T00:00:00Z", "event_type": "discovered",
            "description": 123
        })
        assert any("description" in e for e in errors)

    def test_actor_not_string(self):
        errors = validate_timeline_event({
            "event_date": "2024-01-01T00:00:00Z", "event_type": "discovered",
            "description": "a" * 20, "actor": 42
        })
        assert any("actor" in e for e in errors)

    def test_partial_update(self):
        errors = validate_timeline_event({"description": "a" * 20}, require_all=False)
        assert errors == []


class TestValidateRemediationAction:

    def test_valid(self):
        errors = validate_remediation_action({
            "action": "Force password reset for all users",
            "status": "pending",
            "due_date": "2024-12-31T00:00:00Z",
        })
        assert errors == []

    def test_missing_required(self):
        errors = validate_remediation_action({})
        assert len(errors) == 3

    def test_action_too_short(self):
        errors = validate_remediation_action({
            "action": "Hi", "status": "pending", "due_date": "2024-12-31T00:00:00Z"
        })
        assert any("action" in e for e in errors)

    def test_action_too_long(self):
        errors = validate_remediation_action({
            "action": "A" * 501, "status": "pending", "due_date": "2024-12-31T00:00:00Z"
        })
        assert any("action" in e for e in errors)

    def test_invalid_status(self):
        errors = validate_remediation_action({
            "action": "Reset passwords", "status": "unknown", "due_date": "2024-12-31T00:00:00Z"
        })
        assert any("status" in e for e in errors)

    def test_invalid_due_date(self):
        errors = validate_remediation_action({
            "action": "Reset passwords", "status": "pending", "due_date": "bad"
        })
        assert any("due_date" in e for e in errors)

    def test_assigned_to_not_string(self):
        errors = validate_remediation_action({
            "action": "Reset passwords", "status": "pending",
            "due_date": "2024-12-31T00:00:00Z", "assigned_to": 123
        })
        assert any("assigned_to" in e for e in errors)

    def test_invalid_completed_date(self):
        errors = validate_remediation_action({
            "action": "Reset passwords", "status": "completed",
            "due_date": "2024-12-31T00:00:00Z", "completed_date": "bad"
        })
        assert any("completed_date" in e for e in errors)

    def test_partial_update(self):
        errors = validate_remediation_action({"status": "completed"}, require_all=False)
        assert errors == []


class TestValidateMonitoringAlert:

    def test_valid(self):
        errors = validate_monitoring_alert({
            "alert_type": "new_exposure",
            "severity": "critical",
            "details": "Credentials spotted on dark web marketplace"
        })
        assert errors == []

    def test_missing_required(self):
        errors = validate_monitoring_alert({})
        assert len(errors) == 3

    def test_invalid_alert_type(self):
        errors = validate_monitoring_alert({
            "alert_type": "invalid_type", "severity": "high", "details": "a" * 20
        })
        assert any("alert_type" in e for e in errors)

    def test_invalid_severity(self):
        errors = validate_monitoring_alert({
            "alert_type": "new_exposure", "severity": "ultra", "details": "a" * 20
        })
        assert any("severity" in e for e in errors)

    def test_details_too_short(self):
        errors = validate_monitoring_alert({
            "alert_type": "new_exposure", "severity": "high", "details": "short"
        })
        assert any("details" in e for e in errors)

    def test_details_not_string(self):
        errors = validate_monitoring_alert({
            "alert_type": "new_exposure", "severity": "high", "details": 123
        })
        assert any("details" in e for e in errors)

    def test_invalid_triggered_at(self):
        errors = validate_monitoring_alert({
            "alert_type": "new_exposure", "severity": "high",
            "details": "a" * 20, "triggered_at": "bad"
        })
        assert any("triggered_at" in e for e in errors)

    def test_acknowledged_not_bool(self):
        errors = validate_monitoring_alert({
            "alert_type": "new_exposure", "severity": "high",
            "details": "a" * 20, "acknowledged": "yes"
        })
        assert any("acknowledged" in e for e in errors)

    def test_partial_update(self):
        errors = validate_monitoring_alert({"acknowledged": True}, require_all=False)
        assert errors == []


# ===================================================================
# ============= SANITIZATION UTILITY TESTS ==========================
# ===================================================================

class TestSanitizeMongoInput:

    def test_strips_dollar_keys(self):
        result = sanitize_mongo_input({"$gt": 5, "name": "ok"})
        assert "$gt" not in result
        assert result["name"] == "ok"

    def test_nested_dict(self):
        result = sanitize_mongo_input({"outer": {"$ne": 1, "val": "ok"}})
        assert "$ne" not in result["outer"]
        assert result["outer"]["val"] == "ok"

    def test_list_of_dicts(self):
        result = sanitize_mongo_input([{"$match": 1}, {"ok": 2}])
        assert len(result) == 2
        assert "$match" not in result[0]

    def test_primitives_unchanged(self):
        assert sanitize_mongo_input("hello") == "hello"
        assert sanitize_mongo_input(42) == 42
        assert sanitize_mongo_input(True) is True

    def test_none_returns_none(self):
        assert sanitize_mongo_input(None) is None


class TestSanitizeQueryParams:

    def test_strips_operator_keys(self):
        result = sanitize_query_params({"$or": "bad", "page": "1"})
        assert "$or" not in result
        assert result["page"] == "1"

    def test_nested_dict_sanitized(self):
        result = sanitize_query_params({"filter": {"$gt": 5, "name": "ok"}})
        assert "$gt" not in result.get("filter", {})

    def test_entirely_operator_dict_becomes_empty(self):
        result = sanitize_query_params({"filter": {"$gt": 5}})
        assert result["filter"] == "" or result["filter"] == {}


class TestSafeRegexQuery:

    def test_builds_regex_query(self):
        result = safe_regex_query("test.value", "title")
        assert result["title"]["$regex"] == r"test\.value"
        assert result["title"]["$options"] == "i"

    def test_escapes_special_chars(self):
        result = safe_regex_query("a+b*c?d", "field")
        assert "\\+" in result["field"]["$regex"]
        assert "\\*" in result["field"]["$regex"]


class TestSanitizeHtml:

    def test_strip_all_tags(self):
        result = sanitize_html("<b>bold</b> <i>italic</i>", strip_tags=True)
        assert "<b>" not in result
        assert "bold" in result

    def test_remove_script_tags(self):
        result = sanitize_html('<script>alert("xss")</script>Hello')
        assert "<script>" not in result
        assert "Hello" in result

    def test_remove_event_handlers(self):
        result = sanitize_html('<div onmouseover="alert(1)">safe</div>')
        assert "onmouseover" not in result

    def test_remove_javascript_urls(self):
        result = sanitize_html('<a href="javascript:alert(1)">link</a>')
        assert "javascript:" not in result

    def test_remove_data_urls(self):
        result = sanitize_html('<img src="data:text/html,<script>alert(1)</script>">')
        assert "data:" not in result

    def test_preserve_safe_tags(self):
        result = sanitize_html("<p>Hello <strong>world</strong></p>")
        assert "<p>" in result
        assert "<strong>" in result

    def test_non_string_passthrough(self):
        assert sanitize_html(42) == 42


class TestSanitizeBreachPayloadHtml:

    def test_title_tags_stripped(self):
        data = {"title": "<b>Test</b> Title"}
        result = sanitize_breach_payload_html(data)
        assert "<b>" not in result["title"]
        assert "Test" in result["title"]

    def test_description_preserves_safe_tags(self):
        data = {"description": "<p><strong>Important</strong> info</p>"}
        result = sanitize_breach_payload_html(data)
        assert "<p>" in result["description"]
        assert "<strong>" in result["description"]

    def test_description_removes_scripts(self):
        data = {"description": '<script>alert(1)</script><p>safe</p>'}
        result = sanitize_breach_payload_html(data)
        assert "<script>" not in result["description"]
        assert "<p>safe</p>" in result["description"]

    def test_organisation_fields_stripped(self):
        data = {"organisation": {"name": "<b>Corp</b>", "domain": "<script>x</script>evil.com"}}
        result = sanitize_breach_payload_html(data)
        assert "<b>" not in result["organisation"]["name"]
        assert "<script>" not in result["organisation"]["domain"]

    def test_timeline_description_sanitized(self):
        data = {"timeline": [{"description": '<script>x</script><em>event</em>'}]}
        result = sanitize_breach_payload_html(data)
        assert "<script>" not in result["timeline"][0]["description"]
        assert "<em>" in result["timeline"][0]["description"]

    def test_no_keys_no_error(self):
        data = {"other_field": "value"}
        result = sanitize_breach_payload_html(data)
        assert result["other_field"] == "value"

    def test_non_string_title_unchanged(self):
        data = {"title": 123}
        result = sanitize_breach_payload_html(data)
        assert result["title"] == 123
