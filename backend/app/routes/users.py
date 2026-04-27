"""
users.py — User Management Blueprint for BreachLens.
Prefix: /api/v1/users
"""
import re

import bcrypt
from flask import Blueprint, request, g
from app.middleware.auth_middleware import require_auth, require_role
from app.services.user_service import UserService
from app.utils.response import success_response, error_response
from app.utils.validators import ALLOWED_ROLES, is_valid_email

users_bp = Blueprint("users", __name__, url_prefix="/api/v1/users")
user_service = UserService()

_PASSWORD_RE = re.compile(r"^(?=.*[A-Z])(?=.*\d).{8,}$")


# --------------------------------------------------------------------------- #
# GET /api/v1/users  (admin only)                                              #
# --------------------------------------------------------------------------- #
@users_bp.route("", methods=["GET"])
@require_role("admin")
def list_users():
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
# GET /api/v1/users/<user_id>                                                  #
# --------------------------------------------------------------------------- #
@users_bp.route("/<user_id>", methods=["GET"])
@require_auth
def get_user(user_id: str):
    # Users can only view their own profile unless admin
    if g.current_user_id != user_id and g.current_user_claims.get("role") != "admin":
        return error_response("You can only view your own profile.", 403)
    user = user_service.get_by_id(user_id)
    if not user:
        return error_response("User not found.", 404)
    return success_response(user)


# --------------------------------------------------------------------------- #
# PATCH /api/v1/users/<user_id>                                                #
# --------------------------------------------------------------------------- #
@users_bp.route("/<user_id>", methods=["PATCH"])
@require_auth
def update_user(user_id: str):
    data: dict = request.get_json(silent=True) or {}
    current_role = g.current_user_claims.get("role")

    # Non-admins can only update their own profile and cannot change role
    if g.current_user_id != user_id and current_role != "admin":
        return error_response("You can only update your own profile.", 403)

    allowed: dict = {}
    if "username" in data:
        if not isinstance(data["username"], str) or not (3 <= len(data["username"]) <= 30):
            return error_response("'username' must be 3–30 characters.", 422)
        allowed["username"] = data["username"]

    if "email" in data:
        if not is_valid_email(data["email"]):
            return error_response("A valid email address is required.", 422)
        allowed["email"] = data["email"].lower()

    if "password" in data:
        if g.current_user_id != user_id:
            return error_response("You can only change your own password.", 403)

        # Security: Require current password verification
        current_password = data.get("current_password")
        if not current_password:
            return error_response("Current password is required to set a new password.", 400)

        if not user_service.verify_password(user_id, current_password):
            return error_response("Current password verification failed.", 401)

        if not _PASSWORD_RE.match(data["password"]):
            return error_response(
                "Password must be at least 8 characters and include one uppercase letter and one digit.",
                422,
            )
        password_hash = bcrypt.hashpw(
            data["password"].encode("utf-8"), bcrypt.gensalt(rounds=12)
        ).decode("utf-8")
        allowed["password_hash"] = password_hash

    if "role" in data:
        if current_role != "admin":
            return error_response("Only admins can change user roles.", 403)
        if data["role"] not in ALLOWED_ROLES:
            return error_response(f"'role' must be one of: {', '.join(ALLOWED_ROLES)}.", 422)
        allowed["role"] = data["role"]

    if "is_active" in data:
        if current_role != "admin":
            return error_response("Only admins can change user activation status.", 403)
        allowed["is_active"] = bool(data["is_active"])

    if not allowed:
        return error_response("No valid fields to update.", 400)

    try:
        updated = user_service.update_user(user_id, allowed)
    except ValueError as exc:
        return error_response(str(exc), 409)
    if not updated:
        return error_response("User not found.", 404)
    return success_response(updated)


# --------------------------------------------------------------------------- #
# DELETE /api/v1/users/<user_id>  (admin only)                                 #
# --------------------------------------------------------------------------- #
@users_bp.route("/<user_id>", methods=["DELETE"])
@require_role("admin")
def delete_user(user_id: str):
    ok = user_service.delete_user(user_id)
    if not ok:
        return error_response("User not found.", 404)
    return "", 204
