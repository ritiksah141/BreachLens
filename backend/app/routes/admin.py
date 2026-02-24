"""
admin.py — Admin-only Blueprint for BreachLens.
Prefix: /api/v1/admin
"""
from flask import Blueprint, request, g
from app.middleware.auth_middleware import require_role
from app.services.breach_service import BreachService
from app.services.user_service import UserService
from app.utils.response import success_response, error_response
from app.utils.validators import ALLOWED_ROLES
from app.utils.audit import audit_log
from app.extensions import mongo

admin_bp = Blueprint("admin", __name__, url_prefix="/api/v1/admin")
breach_service = BreachService()
user_service = UserService()


# --------------------------------------------------------------------------- #
# GET /api/v1/admin/stats                                                      #
# --------------------------------------------------------------------------- #
@admin_bp.route("/stats", methods=["GET"])
@require_role("admin")
def system_stats():
    """Return system-wide statistics for admin dashboard."""
    users_col = mongo.db["users"]
    breaches_col = mongo.db["breaches"]

    # Users stats
    total_users = users_col.count_documents({})
    total_admins = users_col.count_documents({"role": "admin"})
    total_analysts = users_col.count_documents({"role": "analyst"})
    total_guests = users_col.count_documents({"role": "guest"})
    active_users = users_col.count_documents({"is_active": True})
    inactive_users = total_users - active_users

    # Breaches stats
    total_breaches = breaches_col.count_documents({})
    by_status = {s: breaches_col.count_documents({"status": s}) for s in ("active", "investigating", "contained", "resolved")}
    by_severity = {s: breaches_col.count_documents({"severity": s}) for s in ("critical", "high", "medium", "low", "informational")}

    # Alerts stats
    alert_total_pipeline = [
        {"$project": {"count": {"$size": {"$ifNull": ["$monitoring_alerts", []]}}}},
        {"$group": {"_id": None, "total": {"$sum": "$count"}}},
    ]
    alert_total_result = list(breaches_col.aggregate(alert_total_pipeline))
    total_alerts = alert_total_result[0]["total"] if alert_total_result else 0

    unacked_pipeline = [
        {"$unwind": "$monitoring_alerts"},
        {"$match": {"monitoring_alerts.acknowledged": False}},
        {"$count": "unacknowledged"},
    ]
    unacked_result = list(breaches_col.aggregate(unacked_pipeline))
    unacknowledged = unacked_result[0]["unacknowledged"] if unacked_result else 0

    return success_response({
        "users": {
            "total": total_users,
            "by_role": {"admin": total_admins, "analyst": total_analysts, "guest": total_guests},
            "active": active_users,
            "inactive": inactive_users,
        },
        "breaches": {
            "total": total_breaches,
            "by_status": by_status,
            "by_severity": by_severity,
        },
        "alerts": {
            "total": total_alerts,
            "unacknowledged": unacknowledged,
        },
    })


# --------------------------------------------------------------------------- #
# PATCH /api/v1/admin/users/<user_id>/role                                     #
# --------------------------------------------------------------------------- #
@admin_bp.route("/users/<user_id>/role", methods=["PATCH"])
@require_role("admin")
@audit_log("user_role_changed")
def change_user_role(user_id: str):
    data: dict = request.get_json(silent=True) or {}
    role = data.get("role")
    if not role or role not in ALLOWED_ROLES:
        return error_response(f"'role' must be one of: {', '.join(ALLOWED_ROLES)}.", 422)

    # Prevent self-demotion
    current_admin_id = g.current_user_id
    if current_admin_id == user_id:
        return error_response("You cannot change your own role.", 400)

    # Prevent demoting the last admin
    target_user = user_service.get_user(user_id)
    if not target_user:
        return error_response("User not found.", 404)

    old_role = target_user.get("role")

    # Use atomic operation to prevent TOCTOU race
    if old_role == "admin" and role != "admin":
        updated, error = user_service.demote_admin_atomically(user_id, role)
        if error:
            return error_response(error, 400)
    else:
        updated = user_service.update_user(user_id, {"role": role})
        if not updated:
            return error_response("User not found.", 404)

    # Log the role change details
    g.audit_details = {"target_user_id": user_id, "old_role": old_role, "new_role": role}

    return success_response(updated)


# --------------------------------------------------------------------------- #
# GET /api/v1/admin/users                                                      #
# --------------------------------------------------------------------------- #
@admin_bp.route("/users", methods=["GET"])
@require_role("admin")
def list_all_users():
    try:
        page = max(1, int(request.args.get("page", 1)))
        limit = min(100, max(1, int(request.args.get("limit", 20))))
    except ValueError:
        return error_response("'page' and 'limit' must be integers.", 400)
    users, total = user_service.get_all(page=page, limit=limit)
    total_pages = (total + limit - 1) // limit
    return success_response(users, 200, meta={
        "page": page, "limit": limit, "total": total, "total_pages": total_pages
    })


# --------------------------------------------------------------------------- #
# PATCH /api/v1/admin/users/<user_id>/activate                                #
# --------------------------------------------------------------------------- #
@admin_bp.route("/users/<user_id>/activate", methods=["PATCH"])
@require_role("admin")
@audit_log("user_activated")
def activate_user(user_id: str):
    """Activate a user account (set is_active=True)."""
    updated = user_service.update_user(user_id, {"is_active": True})
    if not updated:
        return error_response("User not found.", 404)

    g.audit_details = {"target_user_id": user_id}

    return success_response(updated)


# --------------------------------------------------------------------------- #
# PATCH /api/v1/admin/users/<user_id>/deactivate                              #
# --------------------------------------------------------------------------- #
@admin_bp.route("/users/<user_id>/deactivate", methods=["PATCH"])
@require_role("admin")
@audit_log("user_deactivated")
def deactivate_user(user_id: str):
    """Deactivate a user account (set is_active=False)."""
    # Prevent self-deactivation
    current_admin_id = g.current_user_id
    if current_admin_id == user_id:
        return error_response("You cannot deactivate your own account.", 400)

    # Prevent deactivating the last active admin
    target_user = user_service.get_user(user_id)
    if not target_user:
        return error_response("User not found.", 404)

    # Always use atomic operation to prevent TOCTOU race
    # The atomic operation handles both admin and non-admin users safely
    updated, error = user_service.deactivate_admin_atomically(user_id)
    if error:
        # For non-admin users or already inactive, try to interpret error appropriately
        if "not found or already inactive" in error.lower():
            return error_response("User not found or already inactive.", 404)
        return error_response(error, 409)

    g.audit_details = {"target_user_id": user_id, "target_role": target_user.get("role")}

    return success_response(updated)


# --------------------------------------------------------------------------- #
# DELETE /api/v1/admin/breaches/bulk                                          #
# --------------------------------------------------------------------------- #
@admin_bp.route("/breaches/bulk", methods=["DELETE"])
@require_role("admin")
@audit_log("breaches_bulk_deleted")
def bulk_delete_breaches():
    """Delete multiple breaches by a list of IDs."""
    data: dict = request.get_json(silent=True) or {}
    breach_ids = data.get("ids", [])
    if not isinstance(breach_ids, list) or not breach_ids:
        return error_response("'ids' must be a non-empty list of breach ID strings.", 422)
    deleted_count, invalid_ids = breach_service.bulk_delete(breach_ids)

    g.audit_details = {
        "requested_count": len(breach_ids),
        "deleted_count": deleted_count,
        "failed_count": len(invalid_ids)
    }

    return success_response({
        "deleted": deleted_count,
        "invalid_ids": invalid_ids,
        "requested": len(breach_ids),
    })
