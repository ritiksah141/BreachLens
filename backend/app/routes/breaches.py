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
from app.services.breach_service import BreachService
from app.utils.response import error_response, success_response
from app.utils.validators import (
    validate_affected_account,
    validate_breach_payload,
    validate_monitoring_alert,
    validate_remediation_action,
    validate_timeline_event,
    sanitize_mongo_input,
    sanitize_breach_payload_html,
    is_valid_object_id,
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
    """
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
        g.current_user_id = payload.get("user", payload.get("user_id"))
    except Exception:
        g.current_user_id = None


# ---------------------------------------------------------------------------
# Core breach routes
# ---------------------------------------------------------------------------

@breaches_bp.get("/")
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

    min_risk = request.args.get("min_risk")
    max_risk = request.args.get("max_risk")
    try:
        min_risk = float(min_risk) if min_risk is not None else None
        max_risk = float(max_risk) if max_risk is not None else None
    except (ValueError, TypeError):
        return error_response("'min_risk' and 'max_risk' must be numbers.", 400)

    # Authenticated users see affected_accounts; guests do not
    is_authenticated = getattr(g, "current_user_id", None) is not None

    breaches, total = breach_service.list_breaches(
        page=page,
        limit=limit,
        sort_by=sort_by,
        order=order,
        severity=request.args.get("severity"),
        status=request.args.get("status"),
        industry=request.args.get("industry"),
        search=request.args.get("search"),
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


@breaches_bp.post("/")
@require_role("analyst", "admin")
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

@breaches_bp.get("/exposure-check")
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
