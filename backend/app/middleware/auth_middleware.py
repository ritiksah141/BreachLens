"""
auth_middleware.py — Authentication and authorisation decorators for BreachLens.

Implements the module-required authentication pattern:

1. Tokens are read from the ``x-access-token`` request header.
2. Tokens are decoded with the raw ``pyjwt`` library (``jwt.decode``).
4. The ``blacklist`` MongoDB collection is checked via ``find_one()`` before
   granting access — if the token is found, the request is rejected with
   "Token has been cancelled".
5. HTTP Basic Authentication (``Authorization: Basic …``) is only used by the
    explicit login endpoint flow, not as a fallback for protected resources.

Decorators provided (all use ``functools.wraps``):
- ``@jwt_required``   — any authenticated user.
- ``@admin_required`` — users whose JWT payload has ``"admin": True``.
- ``@require_role()`` — High-1st extension: multi-tier RBAC (analyst, admin).
- ``@require_auth``   — alias for ``@jwt_required`` for backward compatibility.
"""
import base64
import re
from functools import wraps
from typing import Callable

import bcrypt
import jwt as pyjwt  # raw PyJWT — module requirement
from flask import current_app, g, request

from app.extensions import mongo
from app.utils.response import error_response

_OBJECTID_RE = re.compile(r"^[0-9a-fA-F]{24}$")


# ------------------------------------------------------------------ #
# Internal helpers                                                     #
# ------------------------------------------------------------------ #

def _get_token_from_header() -> str | None:
    """Extract the JWT string from the ``x-access-token`` header."""
    return request.headers.get("x-access-token")


def _check_blacklist(token: str) -> bool:
    """Return ``True`` if *token* has been blacklisted (cancelled)."""
    return mongo.db["blacklist"].find_one({"token": token}) is not None


def _decode_token(token: str) -> dict | None:
    """Decode a JWT using the application's SECRET_KEY.

    Returns the decoded payload dict, or ``None`` on any failure.
    """
    try:
        return pyjwt.decode(
            token,
            current_app.config["SECRET_KEY"],
            algorithms=["HS256"],
        )
    except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
        return None


def _populate_g(payload: dict) -> None:
    """Populate ``flask.g`` with user identity fields from the decoded JWT."""
    g.current_user = payload.get("user", "")
    g.current_user_id = payload.get("user", "")
    g.current_user_claims = payload
    # Role is derived from the admin flag AND the optional role field.
    if payload.get("admin"):
        g.current_user_role = "admin"
    else:
        g.current_user_role = payload.get("role", "guest")


def _try_basic_auth() -> bool:
    """Attempt HTTP Basic Authentication.

    Parse ``Authorization: Basic <base64(username:password)>``, verify the
    credentials against the ``users`` collection with ``bcrypt.checkpw()``,
    and populate ``flask.g`` on success.

    Note: this helper is intended for explicit login flows only.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Basic "):
        return False

    try:
        decoded = base64.b64decode(auth_header[6:]).decode("utf-8")
        username, password = decoded.split(":", 1)
    except Exception:
        return False

    # Look up by username first (module convention), fall back to email
    user = mongo.db["users"].find_one({"username": username})
    if not user:
        user = mongo.db["users"].find_one({"email": username.lower()})
    if not user:
        return False

    stored_hash = user.get("password_hash", b"")
    if isinstance(stored_hash, str):
        stored_hash = stored_hash.encode("utf-8")
    if not bcrypt.checkpw(password.encode("utf-8"), stored_hash):
        return False

    g.current_user = user.get("username", "")
    g.current_user_id = str(user["_id"])
    g.current_user_role = user.get("role", "guest")
    g.current_user_claims = {
        "user": user.get("username", ""),
        "admin": user.get("role") == "admin",
        "role": user.get("role", "guest"),
    }
    return True


# ------------------------------------------------------------------ #
# Public decorators                                                    #
# ------------------------------------------------------------------ #

def jwt_required(f: Callable) -> Callable:
    """Decorator that requires a valid JWT in the ``x-access-token`` header.

    1. Reads the token from ``x-access-token``.
    2. Checks the ``blacklist`` collection via ``find_one()``.
    3. Decodes with ``jwt.decode()`` using the app's ``SECRET_KEY``.
    4. Rejects requests without a token.
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _get_token_from_header()

        if token:
            # Check token blacklist (MongoDB)
            if _check_blacklist(token):
                return error_response("Token has been cancelled.", 401)

            payload = _decode_token(token)
            if payload is None:
                return error_response("Token is invalid or has expired.", 401)

            _populate_g(payload)
            return f(*args, **kwargs)

        return error_response("Token is missing.", 401)
    return decorated


def admin_required(f: Callable) -> Callable:
    """Decorator that requires a valid JWT **and** ``admin: True`` in the payload.

    Enforces admin-only access for sensitive operations (e.g., DELETE).
    """
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _get_token_from_header()

        if token:
            if _check_blacklist(token):
                return error_response("Token has been cancelled.", 401)

            payload = _decode_token(token)
            if payload is None:
                return error_response("Token is invalid or has expired.", 401)

            if not payload.get("admin", False):
                return error_response("Admin access required.", 403)

            _populate_g(payload)
            return f(*args, **kwargs)

        return error_response("Token is missing.", 401)
    return decorated


def require_role(*roles: str) -> Callable:
    """Decorator factory for multi-tier RBAC (High 1st extension).

    Accepts one or more role strings (e.g., ``"analyst"``, ``"admin"``).
    The user's role is determined from the JWT ``role`` field or from the
    ``admin`` boolean (``admin: True`` → role ``"admin"``).
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def decorated(*args, **kwargs):
            token = _get_token_from_header()

            if token:
                if _check_blacklist(token):
                    return error_response("Token has been cancelled.", 401)

                payload = _decode_token(token)
                if payload is None:
                    return error_response("Token is invalid or has expired.", 401)

                _populate_g(payload)
                role = g.current_user_role
                if role not in roles:
                    return error_response(
                        "You are not authorized to access this resource.", 403
                    )
                return f(*args, **kwargs)

            return error_response("Token is missing.", 401)
        return decorated
    return decorator


# Backward-compatible alias
require_auth = jwt_required


def is_valid_object_id(value: str) -> bool:
    """Validate that *value* is a 24-character hexadecimal string (MongoDB ObjectId)."""
    return bool(_OBJECTID_RE.match(str(value)))
