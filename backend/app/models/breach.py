"""
breach.py — Validation schemas for Breach documents and sub-documents.

Each schema class provides:
- ``REQUIRED_FIELDS``: fields that must be present on create.
- ``ALLOWED_*`` constants: enumerated value constraints.
- ``validate(data, require_all)``: returns a list of error strings.
- ``to_document(data, created_by)``: builds a sanitised MongoDB document
  ready for insertion (breach only).

These schemas centralise all breach-related validation so that routes and
services remain thin.
"""

from datetime import datetime
from typing import Any, Optional

from app.utils.validators import (
    ALLOWED_SEVERITIES,
    ALLOWED_STATUSES,
    ALLOWED_INDUSTRIES,
    ALLOWED_ORG_SIZES,
    ALLOWED_EVENT_TYPES,
    ALLOWED_REMEDIATION_STATUSES,
    ALLOWED_ALERT_TYPES,
    MAX_RISK_SCORE,
    MIN_RISK_SCORE,
    is_valid_email,
    is_valid_domain,
    is_valid_url,
    is_valid_iso_date,
    parse_iso_date,
    validate_geojson_point,
    sanitize_mongo_input,
    sanitize_html,
    sanitize_breach_payload_html,
)

# ---------------------------------------------------------------------------
# Security constants
# ---------------------------------------------------------------------------

# Maximum byte-length for free-text fields to prevent DoS via oversized payloads
_MAX_USERNAME_LEN = 200
_MAX_ACTOR_LEN = 200
_MAX_ASSIGNED_TO_LEN = 200
_MAX_DETAILS_LEN = 5000


# ---------------------------------------------------------------------------
# Breach Schema
# ---------------------------------------------------------------------------

class BreachSchema:
    """Validation schema for a top-level breach document."""

    REQUIRED_FIELDS = [
        "title", "description", "severity", "status", "industry",
        "affected_records_count", "breach_date", "discovered_date",
    ]

    ALLOWED_SEVERITIES = ALLOWED_SEVERITIES
    ALLOWED_STATUSES = ALLOWED_STATUSES
    ALLOWED_INDUSTRIES = ALLOWED_INDUSTRIES
    ALLOWED_ORG_SIZES = ALLOWED_ORG_SIZES
    MIN_RISK_SCORE = MIN_RISK_SCORE
    MAX_RISK_SCORE = MAX_RISK_SCORE

    # ------------------------------------------------------------------ #
    # Validation
    # ------------------------------------------------------------------ #

    @classmethod
    def validate(cls, data: dict, require_all: bool = True) -> list[str]:
        """Validate a breach creation / update payload.

        Args:
            data: The raw request payload dict.
            require_all: If ``True``, enforce that every required field is
                present (used for POST / PUT). ``False`` for PATCH.

        Returns:
            A list of human-readable error strings. An empty list means the
            payload is valid.
        """
        errors: list[str] = []

        # --- presence checks ---
        if require_all:
            for field in cls.REQUIRED_FIELDS:
                if field not in data:
                    errors.append(f"'{field}' is required.")

        # --- title ---
        if "title" in data:
            if not isinstance(data["title"], str) or not (5 <= len(data["title"]) <= 200):
                errors.append("'title' must be a string between 5 and 200 characters.")

        # --- description ---
        if "description" in data:
            if not isinstance(data["description"], str) or not (20 <= len(data["description"]) <= 5000):
                errors.append("'description' must be a string between 20 and 5000 characters.")

        # --- severity ---
        if "severity" in data:
            if data["severity"] not in cls.ALLOWED_SEVERITIES:
                errors.append(f"'severity' must be one of: {cls.ALLOWED_SEVERITIES}.")

        # --- status ---
        if "status" in data:
            if data["status"] not in cls.ALLOWED_STATUSES:
                errors.append(f"'status' must be one of: {cls.ALLOWED_STATUSES}.")

        # --- industry ---
        if "industry" in data:
            if data["industry"] not in cls.ALLOWED_INDUSTRIES:
                errors.append(f"'industry' must be one of: {cls.ALLOWED_INDUSTRIES}.")

        # --- affected_records_count ---
        if "affected_records_count" in data:
            try:
                count = int(data["affected_records_count"])
                if count < 0:
                    errors.append("'affected_records_count' must be a non-negative integer.")
            except (TypeError, ValueError):
                errors.append("'affected_records_count' must be an integer.")

        # --- data_types_exposed ---
        if "data_types_exposed" in data:
            if not isinstance(data["data_types_exposed"], list):
                errors.append("'data_types_exposed' must be a list.")
            elif not all(isinstance(dt, str) for dt in data["data_types_exposed"]):
                errors.append("Each entry in 'data_types_exposed' must be a string.")

        # --- breach_date ---
        if "breach_date" in data and data["breach_date"] is not None:
            if not is_valid_iso_date(data["breach_date"]):
                errors.append("'breach_date' must be an ISO-8601 date string.")

        # --- discovered_date ---
        if "discovered_date" in data and data["discovered_date"] is not None:
            if not is_valid_iso_date(data["discovered_date"]):
                errors.append("'discovered_date' must be an ISO-8601 date string.")

        # --- source_url ---
        if "source_url" in data and data["source_url"]:
            if not is_valid_url(data["source_url"]):
                errors.append("'source_url' must be a valid http/https URL.")

        # --- risk_score ---
        if "risk_score" in data and data["risk_score"] is not None:
            try:
                rs = float(data["risk_score"])
                if not (cls.MIN_RISK_SCORE <= rs <= cls.MAX_RISK_SCORE):
                    errors.append(
                        f"'risk_score' must be between {cls.MIN_RISK_SCORE} and {cls.MAX_RISK_SCORE}."
                    )
            except (TypeError, ValueError):
                errors.append("'risk_score' must be a number.")

        # --- organisation (nested) ---
        if "organisation" in data:
            org = data["organisation"]
            if not isinstance(org, dict):
                errors.append("'organisation' must be an object.")
            else:
                if "domain" in org and org["domain"] and not is_valid_domain(org["domain"]):
                    errors.append("'organisation.domain' must be a valid domain name.")
                if "size" in org and org["size"] and org["size"] not in cls.ALLOWED_ORG_SIZES:
                    errors.append(f"'organisation.size' must be one of: {cls.ALLOWED_ORG_SIZES}.")

        # --- location (GeoJSON Point) ---
        if "location" in data and data["location"] is not None:
            geo_errors = validate_geojson_point(data["location"])
            errors.extend(geo_errors)

        # --- cross-field: date ordering ---
        if "breach_date" in data and "discovered_date" in data:
            if is_valid_iso_date(data["breach_date"]) and is_valid_iso_date(data["discovered_date"]):
                try:
                    bd = parse_iso_date(data["breach_date"])
                    dd = parse_iso_date(data["discovered_date"])
                    if bd > dd:
                        errors.append("'breach_date' must be on or before 'discovered_date'.")
                except ValueError:
                    pass

        return errors

    # ------------------------------------------------------------------ #
    # Document builder
    # ------------------------------------------------------------------ #

    @classmethod
    def sanitize(cls, data: dict) -> dict:
        """Sanitize a breach payload against NoSQL injection and XSS.

        Applies the same sanitization pipeline used by the route layer:
        1. Strip ``$``-prefixed MongoDB operator keys (NoSQL injection).
        2. Strip/neutralise dangerous HTML (XSS).

        Args:
            data: The raw request payload dict.

        Returns:
            A sanitised copy of the payload, safe for validation and storage.
        """
        cleaned = sanitize_mongo_input(data)
        cleaned = sanitize_breach_payload_html(cleaned)
        return cleaned

    @classmethod
    def to_document(cls, data: dict, created_by: str) -> dict:
        """Build a MongoDB-ready breach document from validated payload.

        **Security:** The payload is sanitised against NoSQL injection and XSS
        before document construction, mirroring the route-level pipeline.

        Args:
            data: Pre-validated request payload.
            created_by: The ``user_id`` of the creator (from JWT).

        Returns:
            A dict ready for ``insert_one()``.
        """
        from app.services.breach_service import BreachService

        # Defence-in-depth: sanitise even if the caller already did
        data = cls.sanitize(data)

        severity = data.get("severity", "low")
        affected_records_count = int(data.get("affected_records_count", 0))
        data_types_exposed = data.get("data_types_exposed", [])

        if data.get("risk_score") is not None:
            risk_score = float(data["risk_score"])
        else:
            risk_score = BreachService.compute_risk_score(
                severity, affected_records_count, data_types_exposed,
            )

        breach_date = parse_iso_date(data["breach_date"]) if data.get("breach_date") else None
        discovered_date = parse_iso_date(data["discovered_date"]) if data.get("discovered_date") else None

        now = datetime.utcnow()
        return {
            "title": data["title"],
            "description": data.get("description", ""),
            "severity": severity,
            "status": data.get("status", "active"),
            "breach_date": breach_date,
            "discovered_date": discovered_date,
            "affected_records_count": affected_records_count,
            "data_types_exposed": data_types_exposed,
            "industry": data.get("industry", "other"),
            "organisation": data.get("organisation", {}),
            "location": data.get("location"),
            "risk_score": risk_score,
            "source_url": data.get("source_url", ""),
            "affected_accounts": [],
            "timeline": [],
            "remediation": [],
            "monitoring_alerts": [],
            "created_at": now,
            "updated_at": now,
            "created_by": created_by,
        }


# ---------------------------------------------------------------------------
# Affected Account Schema
# ---------------------------------------------------------------------------

class AffectedAccountSchema:
    """Validation schema for an affected-account sub-document."""

    REQUIRED_FIELDS = ["email"]

    @classmethod
    def validate(cls, data: dict, require_all: bool = True) -> list[str]:
        """Validate an affected-account payload.

        Returns a list of error strings (empty = valid).
        """
        errors: list[str] = []

        if require_all and "email" not in data:
            errors.append("'email' is required.")

        if "email" in data:
            if not isinstance(data["email"], str) or not is_valid_email(data["email"]):
                errors.append("'email' must be a valid e-mail address.")

        if "username" in data and data["username"] is not None:
            if not isinstance(data["username"], str):
                errors.append("'username' must be a string.")
            elif len(data["username"]) > _MAX_USERNAME_LEN:
                errors.append(f"'username' must not exceed {_MAX_USERNAME_LEN} characters.")

        if "data_exposed" in data:
            if not isinstance(data["data_exposed"], list):
                errors.append("'data_exposed' must be a list.")
            elif not all(isinstance(dt, str) for dt in data["data_exposed"]):
                errors.append("Each entry in 'data_exposed' must be a string.")

        if "notified" in data:
            if not isinstance(data["notified"], bool):
                errors.append("'notified' must be a boolean.")

        if "notification_date" in data and data["notification_date"] is not None:
            if not is_valid_iso_date(data["notification_date"]):
                errors.append("'notification_date' must be an ISO-8601 date string.")

        return errors


# ---------------------------------------------------------------------------
# Timeline Event Schema
# ---------------------------------------------------------------------------

class TimelineEventSchema:
    """Validation schema for a timeline event sub-document."""

    REQUIRED_FIELDS = ["event_date", "event_type", "description"]
    ALLOWED_EVENT_TYPES = ALLOWED_EVENT_TYPES

    @classmethod
    def validate(cls, data: dict, require_all: bool = True) -> list[str]:
        """Validate a timeline-event payload.

        Returns a list of error strings (empty = valid).
        """
        errors: list[str] = []

        if require_all:
            for field in cls.REQUIRED_FIELDS:
                if field not in data:
                    errors.append(f"'{field}' is required.")

        if "event_date" in data:
            if not is_valid_iso_date(data["event_date"]):
                errors.append("'event_date' must be an ISO-8601 date string.")
            else:
                try:
                    parsed = datetime.fromisoformat(data["event_date"].replace("Z", "+00:00"))
                    event_type = data.get("event_type", "")
                    _HISTORICAL_TYPES = {"breach_occurred", "discovered", "disclosed"}
                    if event_type in _HISTORICAL_TYPES and parsed.replace(tzinfo=None) > datetime.utcnow():
                        errors.append(
                            f"'event_date' must not be in the future for historical event type '{event_type}'."
                        )
                except (ValueError, TypeError):
                    pass

        if "event_type" in data:
            if data["event_type"] not in cls.ALLOWED_EVENT_TYPES:
                errors.append(f"'event_type' must be one of: {cls.ALLOWED_EVENT_TYPES}.")

        if "description" in data:
            if not isinstance(data["description"], str) or len(data["description"]) < 10:
                errors.append("'description' must be a string of at least 10 characters.")

        if "actor" in data and data["actor"] is not None:
            if not isinstance(data["actor"], str):
                errors.append("'actor' must be a string.")
            elif len(data["actor"]) > _MAX_ACTOR_LEN:
                errors.append(f"'actor' must not exceed {_MAX_ACTOR_LEN} characters.")

        return errors


# ---------------------------------------------------------------------------
# Remediation Action Schema
# ---------------------------------------------------------------------------

class RemediationActionSchema:
    """Validation schema for a remediation action sub-document."""

    REQUIRED_FIELDS = ["action", "status", "due_date"]
    ALLOWED_STATUSES = ALLOWED_REMEDIATION_STATUSES

    @classmethod
    def validate(cls, data: dict, require_all: bool = True) -> list[str]:
        """Validate a remediation-action payload.

        Returns a list of error strings (empty = valid).
        """
        errors: list[str] = []

        if require_all:
            for field in cls.REQUIRED_FIELDS:
                if field not in data:
                    errors.append(f"'{field}' is required.")

        if "action" in data:
            if not isinstance(data["action"], str) or not (5 <= len(data["action"]) <= 500):
                errors.append("'action' must be a string between 5 and 500 characters.")

        if "status" in data:
            if data["status"] not in cls.ALLOWED_STATUSES:
                errors.append(f"'status' must be one of: {cls.ALLOWED_STATUSES}.")

        if "due_date" in data:
            if not is_valid_iso_date(data["due_date"]):
                errors.append("'due_date' must be an ISO-8601 date string.")

        if "assigned_to" in data and data["assigned_to"] is not None:
            if not isinstance(data["assigned_to"], str):
                errors.append("'assigned_to' must be a string.")
            elif len(data["assigned_to"]) > _MAX_ASSIGNED_TO_LEN:
                errors.append(f"'assigned_to' must not exceed {_MAX_ASSIGNED_TO_LEN} characters.")

        if "completed_date" in data and data["completed_date"] is not None:
            if not is_valid_iso_date(data["completed_date"]):
                errors.append("'completed_date' must be an ISO-8601 date string.")

        return errors


# ---------------------------------------------------------------------------
# Monitoring Alert Schema
# ---------------------------------------------------------------------------

class MonitoringAlertSchema:
    """Validation schema for a monitoring alert sub-document."""

    REQUIRED_FIELDS = ["alert_type", "severity", "details"]
    ALLOWED_ALERT_TYPES = ALLOWED_ALERT_TYPES

    @classmethod
    def validate(cls, data: dict, require_all: bool = True) -> list[str]:
        """Validate a monitoring-alert payload.

        Returns a list of error strings (empty = valid).
        """
        errors: list[str] = []

        if require_all:
            for field in cls.REQUIRED_FIELDS:
                if field not in data:
                    errors.append(f"'{field}' is required.")

        if "alert_type" in data:
            if data["alert_type"] not in cls.ALLOWED_ALERT_TYPES:
                errors.append(f"'alert_type' must be one of: {cls.ALLOWED_ALERT_TYPES}.")

        if "severity" in data:
            if data["severity"] not in ["critical", "high", "medium", "low"]:
                errors.append("'severity' must be one of: critical, high, medium, low.")

        if "details" in data:
            if not isinstance(data["details"], str) or len(data["details"]) < 10:
                errors.append("'details' must be a string of at least 10 characters.")
            elif len(data["details"]) > _MAX_DETAILS_LEN:
                errors.append(f"'details' must not exceed {_MAX_DETAILS_LEN} characters.")

        if "triggered_at" in data and data["triggered_at"] is not None:
            if not is_valid_iso_date(data["triggered_at"]):
                errors.append("'triggered_at' must be an ISO-8601 date string.")

        if "acknowledged" in data:
            if not isinstance(data["acknowledged"], bool):
                errors.append("'acknowledged' must be a boolean.")

        return errors
