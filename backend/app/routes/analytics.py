"""
analytics.py — Analytics Blueprint for BreachLens.
Prefix: /api/v1/analytics

Analytics endpoints are cached for 5 minutes by default to reduce database load.
Cache keys include authentication status and query parameters to ensure correct data isolation.
"""
from flask import Blueprint, request
from flask_jwt_extended import get_jwt_identity, verify_jwt_in_request
from app.middleware.auth_middleware import require_auth, require_role
from app.services.analytics_service import AnalyticsService
from app.utils.response import success_response, error_response
from app.extensions import cache

analytics_bp = Blueprint("analytics", __name__, url_prefix="/api/v1/analytics")
analytics_service = AnalyticsService()


def make_cache_key(*args, **kwargs):
    """
    Generate cache key including authentication status and request args.

    This ensures that cached responses respect authorization:
    - Unauthenticated requests get cached separately from authenticated ones
    - Different user roles get cached separately
    """
    # Check if JWT is present (optional endpoints)
    try:
        verify_jwt_in_request(optional=True)
        user_id = get_jwt_identity() or "anonymous"
    except Exception:
        user_id = "anonymous"

    # Include path, user, and query params in cache key
    try:
        path = request.path
        args_str = str(sorted(request.args.items()))
    except RuntimeError:
        # Outside request context (e.g., during testing setup)
        path = "test"
        args_str = ""

    return f"{path}:{user_id}:{args_str}"


@analytics_bp.route("/risk-by-industry", methods=["GET"])
@require_role("analyst", "admin")
@cache.cached(timeout=300, key_prefix=make_cache_key)
def risk_by_industry():
    data = analytics_service.risk_by_industry()
    return success_response(data)


@analytics_bp.route("/severity-breakdown", methods=["GET"])
@cache.cached(timeout=300, key_prefix=make_cache_key)
def severity_breakdown():
    data = analytics_service.severity_breakdown()
    return success_response(data)


@analytics_bp.route("/monthly-trend", methods=["GET"])
@cache.cached(timeout=300, key_prefix=make_cache_key)
def monthly_trend():
    year_param = request.args.get("year")
    year: int | None = None
    if year_param:
        try:
            year = int(year_param)
        except ValueError:
            return error_response("'year' must be an integer.", 400)
    data = analytics_service.monthly_trend(year=year)
    return success_response(data)


@analytics_bp.route("/top-organisations", methods=["GET"])
@require_role("analyst", "admin")
@cache.cached(timeout=300, key_prefix=make_cache_key)
def top_organisations():
    try:
        limit = int(request.args.get("limit", 10))
        limit = min(max(limit, 1), 25)
    except ValueError:
        return error_response("'limit' must be an integer between 1 and 25.", 400)
    data = analytics_service.top_organisations(limit=limit)
    return success_response(data)


@cache.cached(timeout=300, key_prefix=make_cache_key)
@analytics_bp.route("/data-types-frequency", methods=["GET"])
def data_types_frequency():
    data = analytics_service.data_types_frequency()
    return success_response(data)


@analytics_bp.route("/remediation-rate", methods=["GET"])
@require_role("analyst", "admin")
@cache.cached(timeout=300, key_prefix=make_cache_key)
def remediation_rate():
    data = analytics_service.remediation_rate()
    return success_response(data)


@analytics_bp.route("/alert-acknowledgement", methods=["GET"])
@require_role("analyst", "admin")
@cache.cached(timeout=300, key_prefix=make_cache_key)
def alert_acknowledgement():
    data = analytics_service.alert_acknowledgement()
    return success_response(data)


@analytics_bp.route("/industry-year-trend", methods=["GET"])
@require_role("analyst", "admin")
@cache.cached(timeout=300, key_prefix=make_cache_key)
def industry_year_trend():
    data = analytics_service.industry_year_trend()
    return success_response(data)


@analytics_bp.route("/risk-scores", methods=["GET"])
@cache.cached(timeout=300, key_prefix=make_cache_key)
def risk_scores():
    try:
        bins = int(request.args.get("bins", 10))
        bins = min(max(bins, 2), 20)
    except ValueError:
        return error_response("'bins' must be an integer between 2 and 20.", 400)
    data = analytics_service.risk_score_distribution(bins=bins)
    return success_response(data)


@analytics_bp.route("/summary", methods=["GET"])
@cache.cached(timeout=300, key_prefix=make_cache_key)
def summary():
    data = analytics_service.summary()
    return success_response(data)
