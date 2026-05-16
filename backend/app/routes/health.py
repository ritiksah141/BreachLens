"""
health.py — Health check endpoints for BreachLens (/api/v1/health).

Provides liveness, readiness, and version probes.
"""
import platform
import time
from datetime import datetime, timezone

from flask import Blueprint, current_app, jsonify

from app.extensions import mongo, limiter

health_bp = Blueprint("health", __name__, url_prefix="/api/v1/health")

# Track application start time for uptime reporting
_START_TIME: float = time.time()


# ---------------------------------------------------------------------------
# GET /api/v1/health/live  — Liveness probe
# ---------------------------------------------------------------------------
@health_bp.get("/live")
@limiter.exempt
def liveness():
    """
    Liveness probe.

    Returns 200 if the application process is running. Does NOT check
    external dependencies — this endpoint is used by orchestrators to decide
    whether to restart the container.
    """
    return jsonify({
        "status": "ok",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200


# ---------------------------------------------------------------------------
# GET /api/v1/health/ready  — Readiness probe
# ---------------------------------------------------------------------------
@health_bp.get("/ready")
def readiness():
    """
    Readiness probe.

    Returns 200 only when the application can serve traffic, i.e. the
    database connection is healthy. Returns 503 when the DB is unreachable.
    """
    db_status = "ok"
    try:
        mongo.db.command("ping")
    except Exception as exc:  # noqa: BLE001
        current_app.logger.warning("Readiness probe: DB ping failed — %s", exc)
        db_status = "unavailable"

    overall = "ok" if db_status == "ok" else "degraded"
    code = 200 if overall == "ok" else 503

    return jsonify({
        "status": overall,
        "checks": {
            "database": db_status,
        },
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), code


# ---------------------------------------------------------------------------
# GET /api/v1/health/info  — Build / version info
# ---------------------------------------------------------------------------
@health_bp.get("/info")
def info():
    """
    Version and environment info.

    Returns non-sensitive build metadata useful for dashboards and support.
    """
    uptime_seconds = int(time.time() - _START_TIME)
    return jsonify({
        "status": "ok",
        "application": "BreachLens API",
        "python_version": platform.python_version(),
        "uptime_seconds": uptime_seconds,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }), 200
