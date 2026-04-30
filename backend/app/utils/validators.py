"""
validators.py — Input validation helpers for BreachLens.
"""
import html
import re
from datetime import datetime
from typing import Any

# ---------------------------------------------------------------------------
# Allowed-value constants
# ---------------------------------------------------------------------------

ALLOWED_SEVERITIES = ["critical", "high", "medium", "low", "informational"]
ALLOWED_STATUSES = ["active", "contained", "investigating", "resolved"]
ALLOWED_INDUSTRIES = [
    "finance", "healthcare", "retail", "government",
    "technology", "education", "energy", "other",
]
ALLOWED_ORG_SIZES = ["small", "medium", "large", "enterprise"]
ALLOWED_EVENT_TYPES = [
    "breach_occurred", "discovered", "disclosed", "contained", "resolved",
]
ALLOWED_REMEDIATION_STATUSES = ["pending", "in_progress", "completed"]
ALLOWED_ALERT_TYPES = [
    "new_exposure", "credential_stuffing", "dark_web_mention", "domain_squatting",
]
ALLOWED_ROLES = ["guest", "analyst", "admin"]

MAX_RISK_SCORE = 10.0
MIN_RISK_SCORE = 0.0

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]+$")
_DOMAIN_RE = re.compile(r"^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$")
_OBJECTID_RE = re.compile(r"^[0-9a-fA-F]{24}$")

# ---------------------------------------------------------------------------
# Basic format validators
# ---------------------------------------------------------------------------


def is_valid_object_id(value: str) -> bool:
    """Validate that *value* is a 24-character hexadecimal string (ObjectId).

    This check runs *before* calling ``bson.ObjectId(value)`` to prevent
    unexpected exceptions and provide a clearer error message.
    """
    if not isinstance(value, str):
        return False
    return bool(_OBJECTID_RE.match(value))


def is_valid_email(value: str) -> bool:
    """Return True if *value* matches a basic e-mail pattern."""
    return bool(_EMAIL_RE.match(value))


def is_valid_domain(value: str) -> bool:
    """Return True if *value* looks like a valid domain name."""
    return bool(_DOMAIN_RE.match(value))


def is_valid_url(value: str) -> bool:
    """Return True if *value* is an http/https URL."""
    try:
        from urllib.parse import urlparse
        parsed = urlparse(value)
        return parsed.scheme in ("http", "https") and bool(parsed.netloc)
    except Exception:
        return False


def is_valid_iso_date(value: Any) -> bool:
    """Return True if *value* can be parsed as an ISO-8601 date/datetime."""
    if not isinstance(value, str):
        return False
    # Try fromisoformat first (flexible, handles YYYY-MM-DD, YYYY-MM-DDTHH:MM, etc.)
    try:
        # replace Z with +00:00 to support Z suffix in Python < 3.11
        datetime.fromisoformat(value.replace("Z", "+00:00"))
        return True
    except (ValueError, TypeError, AttributeError):
        pass
    # Fallback to strptime for safety
    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d"):
        try:
            datetime.strptime(value, fmt)
            return True
        except ValueError:
            continue
    return False


def parse_iso_date(value: str) -> datetime:
    """Parse an ISO-8601 date string and return a :class:`datetime` object.

    Raises :exc:`ValueError` if *value* cannot be parsed.
    """
    try:
        return datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (ValueError, TypeError, AttributeError):
        pass

    for fmt in ("%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M", "%Y-%m-%d"):
        try:
            return datetime.strptime(value, fmt)
        except ValueError:
            continue
    raise ValueError(f"Cannot parse date: {value!r}")


# ---------------------------------------------------------------------------
# Payload validators
# ---------------------------------------------------------------------------


def validate_breach_payload(data: dict, require_all: bool = True) -> list[str]:
    """Validate a breach creation / update payload.

    Returns a list of error strings (empty means valid).
    """
    errors: list[str] = []

    required_fields = ["title", "description", "severity", "status", "industry",
                       "affected_records_count", "breach_date", "discovered_date"]

    if require_all:
        for field in required_fields:
            if field not in data:
                errors.append(f"'{field}' is required.")

    # title
    if "title" in data:
        if not isinstance(data["title"], str) or not (5 <= len(data["title"]) <= 200):
            errors.append("'title' must be a string between 5 and 200 characters.")

    # description
    if "description" in data:
        if not isinstance(data["description"], str) or not (20 <= len(data["description"]) <= 5000):
            errors.append("'description' must be a string between 20 and 5000 characters.")

    # severity
    if "severity" in data:
        if data["severity"] not in ALLOWED_SEVERITIES:
            errors.append(f"'severity' must be one of: {ALLOWED_SEVERITIES}.")

    # status
    if "status" in data:
        if data["status"] not in ALLOWED_STATUSES:
            errors.append(f"'status' must be one of: {ALLOWED_STATUSES}.")

    # industry
    if "industry" in data:
        if data["industry"] not in ALLOWED_INDUSTRIES:
            errors.append(f"'industry' must be one of: {ALLOWED_INDUSTRIES}.")

    # affected_records_count
    if "affected_records_count" in data:
        try:
            count = int(data["affected_records_count"])
            if count < 0:
                errors.append("'affected_records_count' must be a non-negative integer.")
        except (TypeError, ValueError):
            errors.append("'affected_records_count' must be an integer.")

    # data_types_exposed
    if "data_types_exposed" in data:
        if not isinstance(data["data_types_exposed"], list):
            errors.append("'data_types_exposed' must be a list.")
        elif not all(isinstance(dt, str) for dt in data["data_types_exposed"]):
            errors.append("Each entry in 'data_types_exposed' must be a string.")

    # breach_date
    if "breach_date" in data and data["breach_date"] is not None:
        if not is_valid_iso_date(data["breach_date"]):
            errors.append("'breach_date' must be an ISO-8601 date string.")

    # discovered_date
    if "discovered_date" in data and data["discovered_date"] is not None:
        if not is_valid_iso_date(data["discovered_date"]):
            errors.append("'discovered_date' must be an ISO-8601 date string.")

    # source_url
    if "source_url" in data and data["source_url"]:
        if not is_valid_url(data["source_url"]):
            errors.append("'source_url' must be a valid http/https URL.")

    # risk_score
    if "risk_score" in data and data["risk_score"] is not None:
        try:
            rs = float(data["risk_score"])
            if not (MIN_RISK_SCORE <= rs <= MAX_RISK_SCORE):
                errors.append(f"'risk_score' must be between {MIN_RISK_SCORE} and {MAX_RISK_SCORE}.")
        except (TypeError, ValueError):
            errors.append("'risk_score' must be a number.")

    # organisation
    if "organisation" in data:
        org = data["organisation"]
        if not isinstance(org, dict):
            errors.append("'organisation' must be an object.")
        else:
            if "domain" in org and org["domain"] and not is_valid_domain(org["domain"]):
                errors.append("'organisation.domain' must be a valid domain name.")
            if "size" in org and org["size"] and org["size"] not in ALLOWED_ORG_SIZES:
                errors.append(f"'organisation.size' must be one of: {ALLOWED_ORG_SIZES}.")

    # location
    if "location" in data and data["location"] is not None:
        geo_errors = validate_geojson_point(data["location"])
        errors.extend(geo_errors)

    # date ordering: breach_date must be <= discovered_date
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


def validate_geojson_point(location: Any) -> list[str]:
    """Validate that *location* is a valid GeoJSON Point object."""
    errors: list[str] = []
    if not isinstance(location, dict):
        errors.append("'location' must be a GeoJSON Point object.")
        return errors
    if location.get("type") != "Point":
        errors.append("'location.type' must be 'Point'.")
    coords = location.get("coordinates")
    if not isinstance(coords, list) or len(coords) != 2:
        errors.append("'location.coordinates' must be an array of [longitude, latitude].")
        return errors
    try:
        lng, lat = float(coords[0]), float(coords[1])
    except (TypeError, ValueError):
        errors.append("'location.coordinates' values must be numbers.")
        return errors
    if not (-180.0 <= lng <= 180.0):
        errors.append("Longitude must be between -180 and 180.")
    if not (-90.0 <= lat <= 90.0):
        errors.append("Latitude must be between -90 and 90.")
    return errors


def validate_affected_account(data: dict, require_all: bool = True) -> list[str]:
    """Validate an affected-account sub-document payload."""
    errors: list[str] = []

    if require_all and "email" not in data:
        errors.append("'email' is required.")

    if "email" in data:
        if not isinstance(data["email"], str) or not is_valid_email(data["email"]):
            errors.append("'email' must be a valid e-mail address.")

    if "username" in data and data["username"] is not None:
        if not isinstance(data["username"], str):
            errors.append("'username' must be a string.")

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


def validate_timeline_event(data: dict, require_all: bool = True) -> list[str]:
    """Validate a timeline event sub-document payload."""
    errors: list[str] = []

    required_fields = ["event_date", "event_type", "description"]
    if require_all:
        for field in required_fields:
            if field not in data:
                errors.append(f"'{field}' is required.")

    if "event_date" in data:
        if not is_valid_iso_date(data["event_date"]):
            errors.append("'event_date' must be an ISO-8601 date string.")
        else:
            from datetime import datetime as _dt
            try:
                parsed = _dt.fromisoformat(data["event_date"].replace("Z", "+00:00"))
                event_type = data.get("event_type", "")
                # Historical event types must not be in the future;
                # forward-looking types (contained, resolved) may have future dates.
                _HISTORICAL_TYPES = {"breach_occurred", "discovered", "disclosed"}
                if event_type in _HISTORICAL_TYPES and parsed.replace(tzinfo=None) > _dt.utcnow():
                    errors.append(
                        f"'event_date' must not be in the future for historical event type '{event_type}'."
                    )
            except (ValueError, TypeError):
                pass

    if "event_type" in data:
        if data["event_type"] not in ALLOWED_EVENT_TYPES:
            errors.append(f"'event_type' must be one of: {ALLOWED_EVENT_TYPES}.")

    if "description" in data:
        if not isinstance(data["description"], str) or len(data["description"]) < 10:
            errors.append("'description' must be a string of at least 10 characters.")

    if "actor" in data and data["actor"] is not None:
        if not isinstance(data["actor"], str):
            errors.append("'actor' must be a string.")

    return errors


def validate_remediation_action(data: dict, require_all: bool = True) -> list[str]:
    """Validate a remediation action sub-document payload."""
    errors: list[str] = []

    required_fields = ["action", "status", "due_date"]
    if require_all:
        for field in required_fields:
            if field not in data:
                errors.append(f"'{field}' is required.")

    if "action" in data:
        if not isinstance(data["action"], str) or not (5 <= len(data["action"]) <= 500):
            errors.append("'action' must be a string between 5 and 500 characters.")

    if "status" in data:
        if data["status"] not in ALLOWED_REMEDIATION_STATUSES:
            errors.append(f"'status' must be one of: {ALLOWED_REMEDIATION_STATUSES}.")

    if "due_date" in data:
        if not is_valid_iso_date(data["due_date"]):
            errors.append("'due_date' must be an ISO-8601 date string.")

    if "assigned_to" in data and data["assigned_to"] is not None:
        if not isinstance(data["assigned_to"], str):
            errors.append("'assigned_to' must be a string.")

    if "completed_date" in data and data["completed_date"] is not None:
        if not is_valid_iso_date(data["completed_date"]):
            errors.append("'completed_date' must be an ISO-8601 date string.")

    return errors


def validate_monitoring_alert(data: dict, require_all: bool = True) -> list[str]:
    """Validate a monitoring alert sub-document payload."""
    errors: list[str] = []

    required_fields = ["alert_type", "severity", "details"]
    if require_all:
        for field in required_fields:
            if field not in data:
                errors.append(f"'{field}' is required.")

    if "alert_type" in data:
        if data["alert_type"] not in ALLOWED_ALERT_TYPES:
            errors.append(f"'alert_type' must be one of: {ALLOWED_ALERT_TYPES}.")

    if "severity" in data:
        if data["severity"] not in ["critical", "high", "medium", "low"]:
            errors.append("'severity' must be one of: critical, high, medium, low.")

    if "details" in data:
        if not isinstance(data["details"], str) or len(data["details"]) < 10:
            errors.append("'details' must be a string of at least 10 characters.")

    if "triggered_at" in data and data["triggered_at"] is not None:
        if not is_valid_iso_date(data["triggered_at"]):
            errors.append("'triggered_at' must be an ISO-8601 date string.")

    if "acknowledged" in data:
        if not isinstance(data["acknowledged"], bool):
            errors.append("'acknowledged' must be a boolean.")

    return errors


# ---------------------------------------------------------------------------
# NoSQL injection sanitization
# ---------------------------------------------------------------------------

_MONGO_OPERATORS = re.compile(r"^\$")


def sanitize_mongo_input(data: Any) -> Any:
    """Recursively strip MongoDB operator keys (``$``-prefixed) from dicts/lists.

    Strings, numbers, booleans and ``None`` are returned unchanged.
    """
    if data is None:
        return None
    if isinstance(data, dict):
        return {k: sanitize_mongo_input(v) for k, v in data.items() if not _MONGO_OPERATORS.match(str(k))}
    if isinstance(data, list):
        return [sanitize_mongo_input(item) for item in data]
    # Primitive types (str, int, float, bool) are safe
    return data


def sanitize_query_params(params: dict) -> dict:
    """Sanitize URL query parameters by removing operator keys and dict values with operators."""
    cleaned: dict = {}
    for key, value in params.items():
        if _MONGO_OPERATORS.match(str(key)):
            continue
        if isinstance(value, dict):
            sanitized = sanitize_mongo_input(value)
            # If the dict was entirely operators, return empty string
            cleaned[key] = sanitized if sanitized else ""
        else:
            cleaned[key] = value
    return cleaned


def safe_regex_query(pattern: str, field: str) -> dict:
    """Build a safe MongoDB regex query by escaping special regex characters."""
    escaped = re.escape(pattern)
    return {field: {"$regex": escaped, "$options": "i"}}


# ---------------------------------------------------------------------------
# HTML / XSS sanitization
# ---------------------------------------------------------------------------

_SCRIPT_RE = re.compile(r"<script[^>]*>.*?</script>", re.IGNORECASE | re.DOTALL)
_EVENT_HANDLER_RE = re.compile(r"\s+on\w+\s*=\s*[\"'][^\"']*[\"']", re.IGNORECASE)
_JS_URL_RE = re.compile(r'(href|src)\s*=\s*["\']javascript:[^"\']*["\']', re.IGNORECASE)
_DATA_URL_RE = re.compile(r'(href|src)\s*=\s*["\']data:[^"\']*["\']', re.IGNORECASE)
_IMG_ONERROR_RE = re.compile(r"<img[^>]*\s+onerror\s*=[^>]*>", re.IGNORECASE)
_DANGEROUS_TAGS_RE = re.compile(r"<(img|iframe|object|embed|form|input|meta|link|base)[^>]*>", re.IGNORECASE)
_ALL_TAGS_RE = re.compile(r"<[^>]+>")

# Tags considered safe for rich content (descriptions)
_SAFE_TAGS = {"p", "strong", "em", "b", "i", "u", "ul", "ol", "li", "br", "a", "code", "pre", "blockquote", "h1", "h2", "h3", "h4", "h5", "h6"}


def sanitize_html(value: str, strip_tags: bool = False) -> str:
    """Sanitize HTML content, removing dangerous elements.

    If *strip_tags* is ``True``, **all** HTML tags are removed.
    Otherwise only dangerous elements (scripts, event handlers, JS URLs,
    data URLs, dangerous tags like <img> with onerror) are stripped while
    safe formatting tags are preserved.
    """
    if not isinstance(value, str):
        return value

    if strip_tags:
        # Remove all HTML — plain text output
        result = _SCRIPT_RE.sub("", value)
        result = _ALL_TAGS_RE.sub("", result)
        return result.strip()

    # Remove dangerous elements but keep safe tags
    result = _SCRIPT_RE.sub("", value)
    result = _EVENT_HANDLER_RE.sub("", result)
    result = _JS_URL_RE.sub("", result)
    result = _DATA_URL_RE.sub("", result)
    result = _IMG_ONERROR_RE.sub("", result)
    result = _DANGEROUS_TAGS_RE.sub("", result)
    return result.strip()


def sanitize_breach_payload_html(data: dict) -> dict:
    """Sanitize HTML in a breach payload.

    - ``title``: all tags stripped (plain text).
    - ``description``: dangerous elements removed, safe formatting preserved.
    - Nested ``organisation`` string fields: all tags stripped.
    - Nested ``timeline[].description``: dangerous elements removed, safe formatting preserved.
    """
    result = dict(data)

    if "title" in result and isinstance(result["title"], str):
        result["title"] = sanitize_html(result["title"], strip_tags=True)

    if "description" in result and isinstance(result["description"], str):
        result["description"] = sanitize_html(result["description"])

    if "organisation" in result and isinstance(result["organisation"], dict):
        org = dict(result["organisation"])
        for key in ("name", "domain", "country"):
            if key in org and isinstance(org[key], str):
                org[key] = sanitize_html(org[key], strip_tags=True)
        result["organisation"] = org

    if "timeline" in result and isinstance(result["timeline"], list):
        sanitized_events = []
        for event in result["timeline"]:
            if isinstance(event, dict):
                event = dict(event)
                if "description" in event and isinstance(event["description"], str):
                    event["description"] = sanitize_html(event["description"])
            sanitized_events.append(event)
        result["timeline"] = sanitized_events

    return result
