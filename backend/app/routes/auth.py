"""
auth.py — Authentication routes for BreachLens.

Provides:
- ``GET  /api/v1/login``          — Basic Auth login (module requirement)
- ``POST /api/v1/auth/register``  — User registration
- ``POST /api/v1/auth/login``     — JSON login (extra convenience endpoint)
- ``POST /api/v1/auth/logout``    — Token revocation (full token in blacklist)
- ``GET  /api/v1/auth/me``        — Current user profile

All JWT operations use the raw ``pyjwt`` library (``jwt.encode`` / ``jwt.decode``)
as required by the module specification.  Flask-JWT-Extended is NOT used.
"""
import re
from datetime import datetime

from flask import Blueprint, current_app, request, g

from app.extensions import limiter, mongo
from app.middleware.auth_middleware import jwt_required, require_auth
from app.models.user import UserSchema
from app.services.auth_service import AuthService
from app.utils.response import error_response, success_response
from app.utils.validators import ALLOWED_ROLES, is_valid_email

# ---------------------------------------------------------------------------
# Token blacklist — MongoDB-backed collection storing full tokens
# ---------------------------------------------------------------------------


def _blacklist_collection():
    """Return the ``blacklist`` MongoDB collection for revoked tokens."""
    return mongo.db["blacklist"]


def _add_to_blacklist(token: str) -> None:
    """Insert a revoked **full token** into the blacklist collection.

    Includes the 'expires_at' field for the MongoDB TTL index to automatically
    purge the token after it has expired.
    """
    try:
        # Decode without verification to get the 'exp' claim
        import jwt as pyjwt
        payload = pyjwt.decode(token, options={"verify_signature": False})
        exp_timestamp = payload.get("exp")
        # Ensure expires_at is a datetime object in UTC
        expires_at = datetime.fromtimestamp(exp_timestamp) if exp_timestamp else datetime.utcnow()
    except Exception:
        expires_at = datetime.utcnow()

    _blacklist_collection().update_one(
        {"token": token},
        {"$set": {
            "token": token,
            "blacklisted_at": datetime.utcnow(),
            "expires_at": expires_at
        }},
        upsert=True,
    )


def _is_blacklisted(token: str) -> bool:
    """Check whether *token* exists in the blacklist via ``find_one()``."""
    return _blacklist_collection().find_one({"token": token}) is not None


# ---------------------------------------------------------------------------
# Blueprint — /api/v1/auth (and top-level /api/v1/login)
# ---------------------------------------------------------------------------

auth_bp = Blueprint("auth", __name__, url_prefix="/api/v1/auth")

# Top-level login blueprint: provides ``GET /api/v1/login`` as required by module spec
login_bp = Blueprint("login", __name__, url_prefix="/api/v1")

auth_service = AuthService()

_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,30}$")
_PASSWORD_RE = re.compile(r"^(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9]).{8,}$")


def _validate_registration(data: dict) -> list[str]:
    """Return a list of validation error strings for a registration payload.

    Delegates to :class:`UserSchema` for centralised validation.
    """
    return UserSchema.validate_registration(data)


# ---------------------------------------------------------------------------
# Module-required login: GET /api/v1/login  (Basic Authentication)
# ---------------------------------------------------------------------------

def _handle_basic_auth_login():
    """Shared handler for Basic Auth login (used by both blueprints)."""
    import base64

    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Basic "):
        return error_response(
            "Basic Authentication required. Send 'Authorization: Basic <credentials>'.",
            401,
        )

    try:
        decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
        username, password = decoded.split(":", 1)
    except Exception:
        return error_response("Malformed Basic Auth header.", 401)

    if not username or not password:
        return error_response("Username and password are required.", 400)

    token_data, err = auth_service.login(
        username=username,
        password=password,
    )
    if err:
        return error_response(err, 401)

    return success_response(token_data)


@login_bp.get("/login")
@limiter.limit("10 per minute")
def login_basic_auth_toplevel():
    """``GET /api/v1/login`` — module-required Basic Auth login endpoint."""
    return _handle_basic_auth_login()


@auth_bp.get("/login")
@limiter.limit("10 per minute")
def login_basic_auth():
    """``GET /api/v1/auth/login`` — Basic Auth login (alias)."""
    return _handle_basic_auth_login()

    return success_response(token_data)


# ---------------------------------------------------------------------------
# Routes
# ---------------------------------------------------------------------------


@auth_bp.post("/register")
@limiter.limit("3 per minute")
def register():
    """Register a new user account."""
    data = request.get_json(silent=True) or {}

    missing = [f for f in ("username", "email", "password") if not data.get(f)]
    if missing:
        return error_response(
            "Validation failed.",
            422,
            details={"errors": [f"'{f}' is required." for f in missing]},
        )

    validation_errors = _validate_registration(data)
    if validation_errors:
        return error_response("Validation failed.", 422, details={"errors": validation_errors})

    user, err = auth_service.register(
        username=data["username"],
        email=data["email"],
        password=data["password"],
        role=data.get("role", "guest"),
    )
    if err:
        return error_response(err, 409)

    response = success_response(user, 201)
    # Set Location header on the actual Response object.
    resp_obj = response[0]
    resp_obj.headers["Location"] = f"/api/v1/users/{user['_id']}"
    return response


@auth_bp.post("/login")
@limiter.limit("5 per minute")
def login():
    """Authenticate via JSON body and return a JWT token.

    This is a convenience endpoint in addition to the module-required
    ``GET /api/v1/login`` with Basic Auth.
    """
    data = request.get_json(silent=True) or {}

    email = data.get("email")
    username = data.get("username")
    password = data.get("password")
    lockout_key = auth_service.resolve_lockout_identity(email=email, username=username)

    if not password or (not email and not username):
        return error_response("'email' (or 'username') and 'password' are required.", 400)

    # Check account lockout before attempting authentication
    if lockout_key:
        is_locked, remaining = auth_service.check_account_lockout(lockout_key)
        if is_locked:
            return error_response(
                f"Account is locked due to too many failed login attempts. "
                f"Try again in {remaining} seconds.",
                429,
            )

    token_data, err = auth_service.login(
        email=email,
        password=password,
        username=username,
    )
    if err:
        # Record failed login attempt
        if lockout_key:
            auth_service.record_failed_login(lockout_key)
        return error_response(err, 401)

    # Reset failed attempts on successful login
    if lockout_key:
        auth_service.reset_failed_attempts(lockout_key)

    return success_response(token_data)


@auth_bp.post("/logout")
@require_auth
def logout():
    """Invalidate the current session by blacklisting the **full token**.

    The module requires storing the full token string in the blacklist
    collection so that the decorator can check via ``find_one({"token": …})``.
    Supports 'Authorization: Bearer <token>' and the legacy 'x-access-token' header.
    """
    auth_header = request.headers.get("Authorization")
    if auth_header and auth_header.startswith("Bearer "):
        token = auth_header.split(" ")[1]
    else:
        token = request.headers.get("x-access-token")

    if token:
        _add_to_blacklist(token)
    return "", 204


@auth_bp.get("/me")
@require_auth
def me():
    """Return the authenticated user's profile."""
    # g.current_user_id may be a username (from JWT 'user' claim) or an ObjectId string
    # Try to look up by user_id claim first, fall back to username lookup
    user = None
    user_id = getattr(g, "current_user_claims", {}).get("user_id")
    if user_id:
        user = auth_service.get_user_by_id(user_id)
    if not user:
        # Fall back to username lookup
        username = getattr(g, "current_user", None)
        if username:
            user_doc = mongo.db["users"].find_one({"username": username})
            if user_doc:
                user_doc.pop("password_hash", None)
                user = user_doc
    if not user:
        return error_response("User not found.", 404)
    return success_response({
        "_id": str(user["_id"]),
        "username": user.get("username", ""),
        "email": user.get("email", ""),
        "role": user.get("role", "guest"),
        "admin": user.get("admin", False),
        "is_active": user.get("is_active", True),
        "created_at": user.get("created_at"),
        "last_login": user.get("last_login"),
    })


# ---------------------------------------------------------------------------
# Password reset flow
# ---------------------------------------------------------------------------

@auth_bp.post("/forgot-password")
@limiter.limit("3 per hour")
def forgot_password():
    """Request a password reset token (sent via email in production)."""
    data = request.get_json(silent=True) or {}
    email = data.get("email")
    if not email or not is_valid_email(email):
        return error_response("A valid 'email' is required.", 422)

    exists, reset_token = auth_service.create_password_reset_token(email)

    payload = {
        "message": "If an account with that email exists, a password reset link has been sent.",
    }
    # Dev/testing convenience: expose token for local flow when no mail service exists.
    if exists and (current_app.config.get("DEBUG") or current_app.config.get("TESTING")):
        payload["reset_token"] = reset_token

    # Always return success to prevent user enumeration.
    return success_response(payload)


@auth_bp.post("/reset-password")
@limiter.limit("5 per hour")
def reset_password():
    """Reset a user's password using a valid reset token."""
    data = request.get_json(silent=True) or {}
    token = data.get("token")
    new_password = data.get("new_password")
    confirm_password = data.get("confirm_password")

    if not token:
        return error_response("'token' is required.", 400)
    if not new_password:
        return error_response("'new_password' is required.", 400)
    if confirm_password is not None and new_password != confirm_password:
        return error_response("'confirm_password' must match 'new_password'.", 422)

    if not _PASSWORD_RE.match(new_password):
        return error_response(
            "Password must be at least 8 characters and include one uppercase letter, one digit, and one special character.",
            422,
        )

    ok, message = auth_service.reset_password_with_token(token=token, new_password=new_password)
    if not ok:
        return error_response(message, 400)

    return success_response({"message": message})
