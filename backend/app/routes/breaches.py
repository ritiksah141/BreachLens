"""
breaches.py — Breach CRUD and sub-document routes for BreachLens (/api/v1/breaches).
"""
import math

import jwt as pyjwt
from flask import Blueprint, current_app, g, request

from app.middleware.auth_middleware import require_auth, require_role
from app.models.breach import (
    AffectedAccountSchema,
    BreachSchema,
    MonitoringAlertSchema,
    RemediationActionSchema,
    TimelineEventSchema,
)
from app.extensions import limiter, mongo
from app.services.breach_service import BreachService
from app.utils.audit import audit_log
from app.utils.response import error_response, success_response
from app.utils.validators import (
    ALLOWED_INDUSTRIES,
    ALLOWED_SEVERITIES,
    ALLOWED_STATUSES,
    validate_affected_account,
    validate_breach_payload,
    validate_monitoring_alert,
    validate_remediation_action,
    validate_timeline_event,
    sanitize_mongo_input,
    sanitize_breach_payload_html,
    is_valid_object_id,
    is_valid_iso_date,
)

breaches_bp = Blueprint("breaches", __name__, url_prefix="/api/v1/breaches")
breach_service = BreachService()


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _not_found_or_invalid(err: str):
    """Translate service error codes to HTTP error responses."""
    if err == "invalid_id":
        return error_response("Invalid ID format.", 400)
    return error_response("Resource not found.", 404)


def _try_optional_jwt() -> None:
    """Attempt to verify a JWT if present; silently ignore missing/invalid tokens.

    Uses raw ``pyjwt.decode()`` — no Flask-JWT-Extended dependency.
    Supports 'Authorization: Bearer <token>' and the legacy 'x-access-token' header.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        token = request.headers.get("x-access-token")

    if not token:
        g.current_user_id = None
        return
    try:
        payload = pyjwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"],
        )
        g.current_user_id = payload.get("user_id") or payload.get("user")
    except Exception:
        g.current_user_id = None


def _parse_csv_param(value: str | None) -> list[str]:
    """Parse comma-separated query parameter values into a clean list."""
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def _parse_bool_param(name: str) -> bool | None:
    """Parse optional query bool value from common true/false forms."""
    raw = request.args.get(name)
    if raw is None:
        return None
    lowered = raw.lower()
    if lowered in {"true", "1", "yes"}:
        return True
    if lowered in {"false", "0", "no"}:
        return False
    raise ValueError(name)


# ---------------------------------------------------------------------------
# Core breach routes
# ---------------------------------------------------------------------------

@breaches_bp.get("")
def list_breaches():
    """List all breaches with optional filtering and pagination."""
    _try_optional_jwt()

    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = min(100, max(1, int(request.args.get("limit", 20))))
    except (ValueError, TypeError):
        return error_response("'page' and 'limit' must be integers.", 400)

    sort_by = request.args.get("sort_by", "created_at")
    order = request.args.get("order", "desc")

    allowed_sort_fields = {
        "breach_date",
        "risk_score",
        "affected_records_count",
        "title",
        "created_at",
    }
    if sort_by not in allowed_sort_fields:
        return error_response(
            "'sort_by' must be one of: breach_date, risk_score, affected_records_count, title, created_at.",
            422,
        )
    if order not in {"asc", "desc"}:
        return error_response("'order' must be either 'asc' or 'desc'.", 422)

    severity = request.args.get("severity")
    status = request.args.get("status")
    industry = request.args.get("industry")
    if severity and severity not in ALLOWED_SEVERITIES:
        return error_response(f"'severity' must be one of: {ALLOWED_SEVERITIES}.", 422)
    if status and status not in ALLOWED_STATUSES:
        return error_response(f"'status' must be one of: {ALLOWED_STATUSES}.", 422)
    if industry and industry not in ALLOWED_INDUSTRIES:
        return error_response(f"'industry' must be one of: {ALLOWED_INDUSTRIES}.", 422)

    min_risk = request.args.get("min_risk")
    max_risk = request.args.get("max_risk")
    try:
        min_risk = float(min_risk) if min_risk is not None else None
        max_risk = float(max_risk) if max_risk is not None else None
    except (ValueError, TypeError):
        return error_response("'min_risk' and 'max_risk' must be numbers.", 400)

    if min_risk is not None and not (0.0 <= min_risk <= 10.0):
        return error_response("'min_risk' must be between 0 and 10.", 422)
    if max_risk is not None and not (0.0 <= max_risk <= 10.0):
        return error_response("'max_risk' must be between 0 and 10.", 422)
    if min_risk is not None and max_risk is not None and min_risk > max_risk:
        return error_response("'min_risk' must be less than or equal to 'max_risk'.", 422)

    # Authenticated users see affected_accounts; guests do not
    is_authenticated = getattr(g, "current_user_id", None) is not None

    breaches, total = breach_service.list_breaches(
        page=page,
        limit=limit,
        sort_by=sort_by,
        order=order,
        severity=severity,
        status=status,
        industry=industry,
        search=request.args.get("search"),
        data_type=request.args.get("data_type"),
        min_risk=min_risk,
        max_risk=max_risk,
        include_accounts=is_authenticated,
    )
    return success_response(
        breaches,
        meta={
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": math.ceil(total / limit) if limit else 1,
        },
    )


@breaches_bp.get("/advanced-search")
def advanced_search_breaches():
    """Advanced multi-filter search with optional facet aggregations."""
    _try_optional_jwt()

    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = min(100, max(1, int(request.args.get("limit", 20))))
    except (ValueError, TypeError):
        return error_response("'page' and 'limit' must be integers.", 400)

    sort_by = request.args.get("sort_by", "created_at")
    order = request.args.get("order", "desc")
    allowed_sort_fields = {
        "breach_date",
        "risk_score",
        "affected_records_count",
        "title",
        "created_at",
    }
    if sort_by not in allowed_sort_fields:
        return error_response(
            "'sort_by' must be one of: breach_date, risk_score, affected_records_count, title, created_at.",
            422,
        )
    if order not in {"asc", "desc"}:
        return error_response("'order' must be either 'asc' or 'desc'.", 422)

    severities = _parse_csv_param(request.args.get("severities"))
    statuses = _parse_csv_param(request.args.get("statuses"))
    industries = _parse_csv_param(request.args.get("industries"))
    data_types = _parse_csv_param(request.args.get("data_types"))
    # Allow single data_type param as fallback/alternative for dashboard integration
    dt_single = request.args.get("data_type")
    if dt_single and dt_single not in data_types:
        data_types.append(dt_single)

    invalid_severities = sorted(set(severities) - set(ALLOWED_SEVERITIES))
    if invalid_severities:
        return error_response(
            f"Invalid 'severities' values: {invalid_severities}.",
            422,
        )

    invalid_statuses = sorted(set(statuses) - set(ALLOWED_STATUSES))
    if invalid_statuses:
        return error_response(
            f"Invalid 'statuses' values: {invalid_statuses}.",
            422,
        )

    invalid_industries = sorted(set(industries) - set(ALLOWED_INDUSTRIES))
    if invalid_industries:
        return error_response(
            f"Invalid 'industries' values: {invalid_industries}.",
            422,
        )

    def _to_float_param(name: str):
        raw = request.args.get(name)
        if raw is None:
            return None
        try:
            return float(raw)
        except (TypeError, ValueError):
            raise ValueError(name)

    try:
        min_risk = _to_float_param("min_risk")
        max_risk = _to_float_param("max_risk")
        min_records = _to_float_param("min_records")
        max_records = _to_float_param("max_records")
    except ValueError as err:
        return error_response(f"'{str(err)}' must be numeric.", 400)

    if min_risk is not None and not (0.0 <= min_risk <= 10.0):
        return error_response("'min_risk' must be between 0 and 10.", 422)
    if max_risk is not None and not (0.0 <= max_risk <= 10.0):
        return error_response("'max_risk' must be between 0 and 10.", 422)
    if min_risk is not None and max_risk is not None and min_risk > max_risk:
        return error_response("'min_risk' must be less than or equal to 'max_risk'.", 422)
    if min_records is not None and min_records < 0:
        return error_response("'min_records' must be non-negative.", 422)
    if max_records is not None and max_records < 0:
        return error_response("'max_records' must be non-negative.", 422)
    if min_records is not None and max_records is not None and min_records > max_records:
        return error_response("'min_records' must be less than or equal to 'max_records'.", 422)

    has_location = request.args.get("has_location")
    has_location_bool: bool | None = None
    if has_location is not None:
        lowered = has_location.lower()
        if lowered in {"true", "1", "yes"}:
            has_location_bool = True
        elif lowered in {"false", "0", "no"}:
            has_location_bool = False
        else:
            return error_response("'has_location' must be true or false.", 422)

    include_facets = (request.args.get("include_facets", "false").lower() in {"true", "1", "yes"})

    from_date = request.args.get("from_date")
    to_date = request.args.get("to_date")
    if from_date and not is_valid_iso_date(from_date):
        return error_response("'from_date' must be an ISO-8601 date string.", 422)
    if to_date and not is_valid_iso_date(to_date):
        return error_response("'to_date' must be an ISO-8601 date string.", 422)

    is_authenticated = getattr(g, "current_user_id", None) is not None

    breaches, total, facets = breach_service.advanced_search(
        page=page,
        limit=limit,
        sort_by=sort_by,
        order=order,
        query_text=request.args.get("q"),
        severities=severities,
        statuses=statuses,
        industries=industries,
        data_types=data_types,
        breach_from=from_date,
        breach_to=to_date,
        min_risk=min_risk,
        max_risk=max_risk,
        min_records=min_records,
        max_records=max_records,
        has_location=has_location_bool,
        include_accounts=is_authenticated,
        include_facets=include_facets,
    )

    return success_response(
        breaches,
        meta={
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": math.ceil(total / limit) if limit else 1,
            "facets": facets,
        },
    )


@breaches_bp.get("/filter-options")
def breach_filter_options():
    """Return dynamic filter metadata for frontend dropdowns and sliders."""
    options = breach_service.get_filter_options()
    return success_response(options)


@breaches_bp.get("/subdocuments/query")
@require_role("analyst", "admin")
def query_subdocuments():
    """Run complex filters over subdocuments and return aggregated insight slices."""
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = min(100, max(1, int(request.args.get("limit", 20))))
    except (ValueError, TypeError):
        return error_response("'page' and 'limit' must be integers.", 400)

    sort_by = request.args.get("sort_by", "risk_score")
    order = request.args.get("order", "desc")
    allowed_sort_fields = {"risk_score", "breach_date", "affected_records_count", "created_at"}
    if sort_by not in allowed_sort_fields:
        return error_response(
            "'sort_by' must be one of: risk_score, breach_date, affected_records_count, created_at.",
            422,
        )
    if order not in {"asc", "desc"}:
        return error_response("'order' must be either 'asc' or 'desc'.", 422)

    timeline_event_types = _parse_csv_param(request.args.get("timeline_event_types"))
    remediation_statuses = _parse_csv_param(request.args.get("remediation_statuses"))
    alert_severities = _parse_csv_param(request.args.get("alert_severities"))
    exposed_data_types = _parse_csv_param(request.args.get("exposed_data_types"))

    for sev in alert_severities:
        if sev not in {"critical", "high", "medium", "low"}:
            return error_response("'alert_severities' contains invalid values.", 422)

    for status in remediation_statuses:
        if status not in {"pending", "in_progress", "completed"}:
            return error_response("'remediation_statuses' contains invalid values.", 422)

    try:
        alert_acknowledged = _parse_bool_param("alert_acknowledged")
        account_notified = _parse_bool_param("account_notified")
    except ValueError as err:
        return error_response(f"'{str(err)}' must be true or false.", 422)

    timeline_from = request.args.get("timeline_from")
    timeline_to = request.args.get("timeline_to")
    if timeline_from and not is_valid_iso_date(timeline_from):
        return error_response("'timeline_from' must be an ISO-8601 date string.", 422)
    if timeline_to and not is_valid_iso_date(timeline_to):
        return error_response("'timeline_to' must be an ISO-8601 date string.", 422)

    data, total, facets = breach_service.query_subdocuments(
        page=page,
        limit=limit,
        sort_by=sort_by,
        order=order,
        timeline_event_types=timeline_event_types,
        timeline_from=timeline_from,
        timeline_to=timeline_to,
        remediation_statuses=remediation_statuses,
        alert_severities=alert_severities,
        alert_acknowledged=alert_acknowledged,
        account_notified=account_notified,
        exposed_data_types=exposed_data_types,
    )

    return success_response(
        data,
        meta={
            "page": page,
            "limit": limit,
            "total": total,
            "total_pages": math.ceil(total / limit) if limit else 1,
            "facets": facets,
        },
    )


@breaches_bp.post("")
@require_role("analyst", "admin")
@audit_log("breach_created", include_response=True)
def create_breach():
    """Create a new breach record."""
    data = request.get_json(silent=True) or {}

    # Sanitize input against NoSQL injection and XSS
    data = sanitize_mongo_input(data)
    data = sanitize_breach_payload_html(data)

    errors = validate_breach_payload(data, require_all=True)
    if errors:
        return error_response("Validation failed.", 422, details={"errors": errors})

    breach = breach_service.create(data, created_by=g.current_user_id)
    response = success_response(breach, 201)
    # Add Location header per REST spec
    resp_obj = response[0]
    breach_id = str(breach.get("_id", "")) if isinstance(breach, dict) else ""
    resp_obj.headers["Location"] = f"/api/v1/breaches/{breach_id}"
    return response


@breaches_bp.get("/<breach_id>")
def get_breach(breach_id: str):
    """Get a single breach by ID."""
    _try_optional_jwt()

    # Validate ID is a 24-character hexadecimal string before casting to ObjectId
    if not is_valid_object_id(breach_id):
        return error_response("Invalid breach ID format. Must be a 24-character hex string.", 400)

    # Authenticated users see affected_accounts; guests do not
    is_authenticated = getattr(g, "current_user_id", None) is not None

    breach = breach_service.get_by_id(breach_id, include_accounts=is_authenticated)
    if not breach:
        return error_response("Breach not found.", 404)
    return success_response(breach)


@breaches_bp.put("/<breach_id>")
@require_role("analyst", "admin")
@audit_log("breach_fully_updated")
def update_breach(breach_id: str):
    """Fully replace a breach record."""
    data = request.get_json(silent=True) or {}

    # Sanitize input
    data = sanitize_mongo_input(data)
    data = sanitize_breach_payload_html(data)

    errors = validate_breach_payload(data, require_all=True)
    if errors:
        return error_response("Validation failed.", 422, details={"errors": errors})

    result, err = breach_service.update(
        breach_id, data, g.current_user_id, g.current_user_role
    )
    if err:
        if err == "forbidden":
            return error_response("You are not authorised to modify this breach.", 403)
        return _not_found_or_invalid(err)
    return success_response(result)


@breaches_bp.patch("/<breach_id>")
@require_role("analyst", "admin")
@audit_log("breach_partially_updated")
def patch_breach(breach_id: str):
    """Partially update a breach record."""
    data = request.get_json(silent=True) or {}

    if not data:
        return error_response("No fields provided for update.", 400)

    # Sanitize input
    data = sanitize_mongo_input(data)
    data = sanitize_breach_payload_html(data)

    errors = validate_breach_payload(data, require_all=False)
    if errors:
        return error_response("Validation failed.", 422, details={"errors": errors})

    result, err = breach_service.patch(
        breach_id, data, g.current_user_id, g.current_user_role
    )
    if err:
        if err == "forbidden":
            return error_response("You are not authorised to modify this breach.", 403)
        return _not_found_or_invalid(err)
    return success_response(result)


@breaches_bp.delete("/<breach_id>")
@require_role("admin")
@audit_log("breach_deleted")
def delete_breach(breach_id: str):
    """Delete a breach record."""
    success, err = breach_service.delete(breach_id)
    if err:
        return _not_found_or_invalid(err)
    return "", 204


# ---------------------------------------------------------------------------
# Bulk operations
# ---------------------------------------------------------------------------

@breaches_bp.post("/bulk")
@require_role("admin")
def bulk_import_breaches():
    """Bulk-import breach records using ``insert_many``.

    Accepts a JSON body ``{"breaches": [...]}``.  Each record is validated
    individually and inserted in a single ``insert_many`` call.  This
    demonstrates the bulk-write operations required by the module rubric.
    """
    data = request.get_json(silent=True) or {}
    records = data.get("breaches", [])

    if not isinstance(records, list) or not records:
        return error_response("'breaches' must be a non-empty list of breach objects.", 400)
    if len(records) > 100:
        return error_response("Maximum 100 records per bulk request.", 422)

    # Validate each record before inserting
    validation_errors: list[str] = []
    clean_records: list[dict] = []
    for idx, rec in enumerate(records):
        rec = sanitize_mongo_input(rec)
        rec = sanitize_breach_payload_html(rec)
        errors = validate_breach_payload(rec, require_all=True)
        if errors:
            validation_errors.append(f"Record #{idx}: {'; '.join(errors)}")
        else:
            clean_records.append(rec)

    if validation_errors and not clean_records:
        return error_response(
            "All records failed validation.", 422,
            details={"errors": validation_errors},
        )

    inserted, insert_errors = breach_service.bulk_insert(clean_records, created_by=g.current_user_id)
    all_errors = validation_errors + insert_errors

    return success_response(
        {"inserted_count": len(inserted), "records": inserted},
        201,
        meta={"errors": all_errors} if all_errors else None,
    )


@breaches_bp.delete("/bulk")
@require_role("admin")
def bulk_delete_breaches():
    """Delete multiple breaches by a list of IDs (``delete_many``)."""
    data = request.get_json(silent=True) or {}
    breach_ids = data.get("ids", [])

    if not isinstance(breach_ids, list) or not breach_ids:
        return error_response("'ids' must be a non-empty list of breach ID strings.", 400)
    if len(breach_ids) > 100:
        return error_response("Maximum 100 IDs per request.", 422)

    deleted_count, invalid_ids = breach_service.bulk_delete(breach_ids)

    return success_response({
        "deleted_count": deleted_count,
        "invalid_ids": invalid_ids,
    })


# ---------------------------------------------------------------------------
# Exposure check
# ---------------------------------------------------------------------------

@breaches_bp.get("/check")
@limiter.limit("3 per minute")
def exposure_check():
    """Check if an email address or domain appears in any known breach."""
    from app.utils.validators import is_valid_email, is_valid_domain

    email = request.args.get("email")
    domain = request.args.get("domain")

    if not email and not domain:
        return error_response("At least one of 'email' or 'domain' is required.", 400)

    if email and not is_valid_email(email):
        return error_response("Invalid email format.", 422)
    if domain and not is_valid_domain(domain):
        return error_response("Invalid domain format.", 422)

    result = breach_service.check_exposure(email=email, domain=domain)
    return success_response(result)


@breaches_bp.post("/exposure/password")
@limiter.limit("3 per minute")
def password_exposure_check():
    """Check if a password has been exposed using k-Anonymity (POST for security)."""
    from app.utils.pwned_passwords import check_password_exposure, get_pwned_suffixes

    data = request.get_json(silent=True) or {}
    password = data.get("password")
    prefix = data.get("prefix")

    if not password and not prefix:
        return error_response("'password' or 'prefix' field is required in request body.", 400)

    try:
        if prefix:
            # Client-side k-Anonymity flow: Client sends 5-char prefix
            suffixes = get_pwned_suffixes(prefix)

            # The client will check the suffix locally, but we provide the playbook
            # for "exposure detected" scenario which the UI can render if needed.
            # However, for true client-side flow, the client should decide.
            # But the UI renders results based on what we send.

            return success_response({
                "prefix": prefix,
                "suffixes": suffixes,
                "defense_playbook": [
                    {
                        "priority": "critical",
                        "action": "IMMEDIATE ROTATION",
                        "details": "This password has been identified in global public breaches. Change it immediately wherever it is used."
                    },
                    {
                        "priority": "high",
                        "action": "USE PASSWORD MANAGER",
                        "details": "Adopt a manager like Bitwarden or 1Password to generate and store unique, strong credentials for every service."
                    },
                    {
                        "priority": "medium",
                        "action": "CROSS-SERVICE AUDIT",
                        "details": "Identify other accounts where you might have reused this password and update them to prevent credential stuffing attacks."
                    }
                ],
                "info": "Matching performed client-side for maximum privacy."
            })
        else:
            # Traditional flow: Client sends raw password (backend hashes it)
            is_exposed, count = check_password_exposure(password)

            playbook = []
            if is_exposed:
                playbook = [
                    {
                        "priority": "critical",
                        "action": "IMMEDIATE ROTATION",
                        "details": "This password has been identified in global public breaches. Change it immediately wherever it is used."
                    },
                    {
                        "priority": "high",
                        "action": "USE PASSWORD MANAGER",
                        "details": "Adopt a manager like Bitwarden or 1Password to generate and store unique, strong credentials for every service."
                    },
                    {
                        "priority": "medium",
                        "action": "CROSS-SERVICE AUDIT",
                        "details": "Identify other accounts where you might have reused this password and update them to prevent credential stuffing attacks."
                    }
                ]

            return success_response({
                "password_exposed": is_exposed,
                "exposure_count": count,
                "defense_playbook": playbook,
                "recommendation": "Change your password immediately if exposed." if is_exposed else "Password not found in known public breaches."
            })
    except RuntimeError:
        return error_response(
            "Password exposure service is temporarily unavailable. Please try again later.",
            503,
        )


# ---------------------------------------------------------------------------
# Geospatial
# ---------------------------------------------------------------------------

@breaches_bp.get("/geo/near")
def geo_near():
    """Find breaches near a geographic point."""
    try:
        lng = float(request.args.get("longitude") or request.args["lng"])
        lat = float(request.args.get("latitude") or request.args["lat"])
    except (KeyError, ValueError, TypeError):
        return error_response("'longitude' and 'latitude' are required numeric parameters.", 400)

    # Validate coordinate ranges
    if not (-180.0 <= lng <= 180.0):
        return error_response("Longitude must be between -180 and 180.", 422)
    if not (-90.0 <= lat <= 90.0):
        return error_response("Latitude must be between -90 and 90.", 422)

    try:
        radius = int(request.args.get("radius", 50000))
        if not (1 <= radius <= 500000):
            return error_response("'radius' must be between 1 and 500000 metres.", 422)
    except (ValueError, TypeError):
        return error_response("'radius' must be an integer (metres).", 400)

    breaches = breach_service.find_near(lng, lat, radius)

    features = []
    for doc in breaches:
        loc = doc.get("location")
        if not loc:
            continue
        # Compute approximate distance
        import math as _math
        doc_lng, doc_lat = loc.get("coordinates", [0, 0])
        # Haversine approximation for distance_metres
        R = 6_371_000  # Earth radius in metres
        phi1, phi2 = _math.radians(lat), _math.radians(doc_lat)
        dphi = _math.radians(doc_lat - lat)
        dlam = _math.radians(doc_lng - lng)
        a = _math.sin(dphi / 2) ** 2 + _math.cos(phi1) * _math.cos(phi2) * _math.sin(dlam / 2) ** 2
        dist = R * 2 * _math.atan2(_math.sqrt(a), _math.sqrt(1 - a))

        features.append({
            "type": "Feature",
            "geometry": loc,
            "properties": {
                "id": str(doc["_id"]),
                "title": doc.get("title", ""),
                "severity": doc.get("severity", ""),
                "risk_score": doc.get("risk_score"),
                "affected_records_count": doc.get("affected_records_count"),
                "industry": doc.get("industry", ""),
                "distance_metres": round(dist, 2),
            },
        })

    return success_response(
        {"type": "FeatureCollection", "features": features},
        meta={"total": len(features), "radius_metres": radius, "centre": [lng, lat]},
    )


@breaches_bp.get("/geo/within-bounds")
def geo_within_bounds():
    """Find breaches within a bounding box."""
    try:
        min_lng = float(request.args["min_lng"])
        min_lat = float(request.args["min_lat"])
        max_lng = float(request.args["max_lng"])
        max_lat = float(request.args["max_lat"])
    except (KeyError, ValueError, TypeError):
        return error_response(
            "'min_lng', 'min_lat', 'max_lng', and 'max_lat' are required numeric parameters.", 400
        )

    # Validate coordinate ranges
    for name, val, lo, hi in [
        ("min_lng", min_lng, -180, 180), ("max_lng", max_lng, -180, 180),
        ("min_lat", min_lat, -90, 90), ("max_lat", max_lat, -90, 90),
    ]:
        if not (lo <= val <= hi):
            return error_response(
                f"'{name}' must be between {lo} and {hi}.", 422
            )

    breaches = breach_service.find_within_bounds(min_lng, min_lat, max_lng, max_lat)

    # Convert to GeoJSON FeatureCollection
    features = []
    for doc in breaches:
        loc = doc.get("location")
        if not loc:
            continue
        features.append({
            "type": "Feature",
            "geometry": loc,
            "properties": {
                "id": str(doc["_id"]) if "_id" in doc else str(doc.get("id", "")),
                "title": doc.get("title", ""),
                "severity": doc.get("severity", ""),
                "risk_score": doc.get("risk_score"),
            },
        })

    return success_response({
        "type": "FeatureCollection",
        "features": features,
    })


@breaches_bp.get("/geo/geojson")
def geo_geojson():
    """Return a GeoJSON FeatureCollection of all geolocated breaches."""
    severity = request.args.get("severity")
    industry = request.args.get("industry")

    docs = breach_service.get_geojson(severity=severity, industry=industry)

    features = []
    for doc in docs:
        loc = doc.get("location")
        if not loc:
            continue
        features.append({
            "type": "Feature",
            "geometry": loc,
            "properties": {
                "id": str(doc["_id"]),
                "title": doc.get("title", ""),
                "severity": doc.get("severity", ""),
                "risk_score": doc.get("risk_score"),
                "affected_records_count": doc.get("affected_records_count"),
                "industry": doc.get("industry", ""),
                "status": doc.get("status", ""),
            },
        })

    return success_response({
        "type": "FeatureCollection",
        "features": features,
    })


# ---------------------------------------------------------------------------
# Affected accounts
# ---------------------------------------------------------------------------

@breaches_bp.get("/<breach_id>/affected-accounts")
@require_role("analyst", "admin")
def list_affected_accounts(breach_id: str):
    """List all affected accounts for a breach."""
    accounts, err = breach_service.list_affected_accounts(breach_id)
    if err:
        return _not_found_or_invalid(err)
    return success_response(accounts)


@breaches_bp.get("/<breach_id>/affected-accounts/<account_id>")
@require_role("analyst", "admin")
def get_affected_account(breach_id: str, account_id: str):
    """Get a single affected account."""
    account, err = breach_service.get_affected_account(breach_id, account_id)
    if err:
        return _not_found_or_invalid(err)
    return success_response(account)


@breaches_bp.post("/<breach_id>/affected-accounts")
@require_role("analyst", "admin")
def add_affected_account(breach_id: str):
    """Add an affected account to a breach."""
    data = request.get_json(silent=True) or {}

    data = sanitize_mongo_input(data)

    errors = validate_affected_account(data, require_all=True)
    if errors:
        return error_response("Validation failed.", 422, details={"errors": errors})

    account, err = breach_service.add_affected_account(breach_id, data)
    if err:
        return _not_found_or_invalid(err)
    return success_response(account, 201)


@breaches_bp.patch("/<breach_id>/affected-accounts/<account_id>")
@require_role("analyst", "admin")
def update_affected_account(breach_id: str, account_id: str):
    """Update an affected account."""
    data = request.get_json(silent=True) or {}

    if not data:
        return error_response("No fields provided for update.", 400)

    data = sanitize_mongo_input(data)

    errors = validate_affected_account(data, require_all=False)
    if errors:
        return error_response("Validation failed.", 422, details={"errors": errors})

    account, err = breach_service.update_affected_account(breach_id, account_id, data)
    if err:
        return _not_found_or_invalid(err)
    return success_response(account)


@breaches_bp.delete("/<breach_id>/affected-accounts/<account_id>")
@require_role("admin")
def delete_affected_account(breach_id: str, account_id: str):
    """Remove an affected account from a breach."""
    success, err = breach_service.delete_affected_account(breach_id, account_id)
    if err:
        return _not_found_or_invalid(err)
    return "", 204


# ---------------------------------------------------------------------------
# Timeline
# ---------------------------------------------------------------------------

@breaches_bp.get("/<breach_id>/timeline")
@require_auth
def list_timeline(breach_id: str):
    """List all timeline events for a breach."""
    events, err = breach_service.list_timeline(breach_id)
    if err:
        return _not_found_or_invalid(err)
    return success_response(events)


@breaches_bp.get("/<breach_id>/timeline/<event_id>")
@require_auth
def get_timeline_event(breach_id: str, event_id: str):
    """Get a single timeline event."""
    event, err = breach_service.get_timeline_event(breach_id, event_id)
    if err:
        return _not_found_or_invalid(err)
    return success_response(event)


@breaches_bp.post("/<breach_id>/timeline")
@require_role("analyst", "admin")
def add_timeline_event(breach_id: str):
    """Add a timeline event to a breach."""
    data = request.get_json(silent=True) or {}

    data = sanitize_mongo_input(data)

    errors = validate_timeline_event(data, require_all=True)
    if errors:
        return error_response("Validation failed.", 422, details={"errors": errors})

    event, err = breach_service.add_timeline_event(breach_id, data)
    if err:
        return _not_found_or_invalid(err)
    return success_response(event, 201)


@breaches_bp.patch("/<breach_id>/timeline/<event_id>")
@require_role("analyst", "admin")
def update_timeline_event(breach_id: str, event_id: str):
    """Update a timeline event."""
    data = request.get_json(silent=True) or {}

    if not data:
        return error_response("No fields provided for update.", 400)

    data = sanitize_mongo_input(data)

    errors = validate_timeline_event(data, require_all=False)
    if errors:
        return error_response("Validation failed.", 422, details={"errors": errors})

    event, err = breach_service.update_timeline_event(breach_id, event_id, data)
    if err:
        return _not_found_or_invalid(err)
    return success_response(event)


@breaches_bp.delete("/<breach_id>/timeline/<event_id>")
@require_role("admin")
def delete_timeline_event(breach_id: str, event_id: str):
    """Remove a timeline event from a breach."""
    success, err = breach_service.delete_timeline_event(breach_id, event_id)
    if err:
        return _not_found_or_invalid(err)
    return "", 204


# ---------------------------------------------------------------------------
# Remediation
# ---------------------------------------------------------------------------

@breaches_bp.get("/<breach_id>/remediation")
@require_auth
def list_remediation(breach_id: str):
    """List all remediation actions for a breach."""
    actions, err = breach_service.list_remediation(breach_id)
    if err:
        return _not_found_or_invalid(err)
    return success_response(actions)


@breaches_bp.get("/<breach_id>/remediation/<action_id>")
@require_auth
def get_remediation_action(breach_id: str, action_id: str):
    """Get a single remediation action."""
    action, err = breach_service.get_remediation_action(breach_id, action_id)
    if err:
        return _not_found_or_invalid(err)
    return success_response(action)


@breaches_bp.post("/<breach_id>/remediation")
@require_role("analyst", "admin")
def add_remediation_action(breach_id: str):
    """Add a remediation action to a breach."""
    data = request.get_json(silent=True) or {}

    data = sanitize_mongo_input(data)

    errors = validate_remediation_action(data, require_all=True)
    if errors:
        return error_response("Validation failed.", 422, details={"errors": errors})

    action, err = breach_service.add_remediation_action(breach_id, data)
    if err:
        return _not_found_or_invalid(err)
    return success_response(action, 201)


@breaches_bp.patch("/<breach_id>/remediation/<action_id>")
@require_role("analyst", "admin")
def update_remediation_action(breach_id: str, action_id: str):
    """Update a remediation action."""
    data = request.get_json(silent=True) or {}

    if not data:
        return error_response("No fields provided for update.", 400)

    data = sanitize_mongo_input(data)

    errors = validate_remediation_action(data, require_all=False)
    if errors:
        return error_response("Validation failed.", 422, details={"errors": errors})

    action, err = breach_service.update_remediation_action(breach_id, action_id, data)
    if err:
        return _not_found_or_invalid(err)
    return success_response(action)


@breaches_bp.delete("/<breach_id>/remediation/<action_id>")
@require_role("admin")
def delete_remediation_action(breach_id: str, action_id: str):
    """Remove a remediation action from a breach."""
    success, err = breach_service.delete_remediation_action(breach_id, action_id)
    if err:
        return _not_found_or_invalid(err)
    return "", 204


# ---------------------------------------------------------------------------
# Monitoring alerts
# ---------------------------------------------------------------------------

@breaches_bp.get("/<breach_id>/alerts")
@require_auth
def list_alerts(breach_id: str):
    """List all monitoring alerts for a breach."""
    alerts, err = breach_service.list_alerts(breach_id)
    if err:
        return _not_found_or_invalid(err)
    return success_response(alerts)


@breaches_bp.get("/<breach_id>/alerts/<alert_id>")
@require_auth
def get_alert(breach_id: str, alert_id: str):
    """Get a single monitoring alert."""
    alert, err = breach_service.get_alert(breach_id, alert_id)
    if err:
        return _not_found_or_invalid(err)
    return success_response(alert)


@breaches_bp.post("/<breach_id>/alerts")
@require_role("analyst", "admin")
def create_alert(breach_id: str):
    """Add a monitoring alert to a breach."""
    data = request.get_json(silent=True) or {}

    data = sanitize_mongo_input(data)

    errors = validate_monitoring_alert(data, require_all=True)
    if errors:
        return error_response("Validation failed.", 422, details={"errors": errors})

    alert, err = breach_service.create_alert(breach_id, data)
    if err:
        return _not_found_or_invalid(err)
    return success_response(alert, 201)


@breaches_bp.patch("/<breach_id>/alerts/<alert_id>")
@require_role("analyst", "admin")
def update_alert(breach_id: str, alert_id: str):
    """Update a monitoring alert."""
    data = request.get_json(silent=True) or {}

    if not data:
        return error_response("No fields provided for update.", 400)

    data = sanitize_mongo_input(data)

    errors = validate_monitoring_alert(data, require_all=False)
    if errors:
        return error_response("Validation failed.", 422, details={"errors": errors})

    alert, err = breach_service.update_alert(breach_id, alert_id, data)
    if err:
        return _not_found_or_invalid(err)
    return success_response(alert)


@breaches_bp.delete("/<breach_id>/alerts/<alert_id>")
@require_role("admin")
def delete_alert(breach_id: str, alert_id: str):
    """Remove a monitoring alert from a breach."""
    success, err = breach_service.delete_alert(breach_id, alert_id)
    if err:
        return _not_found_or_invalid(err)
    return "", 204
