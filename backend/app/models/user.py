"""
user.py — Validation schema for User documents.

Centralises all user-related validation (registration, update, role
changes) so that routes and services stay thin.
"""

import re
from datetime import datetime
from typing import Optional

from app.utils.validators import ALLOWED_ROLES, is_valid_email, sanitize_mongo_input, sanitize_html

# ---------------------------------------------------------------------------
# Security constants
# ---------------------------------------------------------------------------

_MAX_PASSWORD_LEN = 128  # Prevent BCrypt DoS (BCrypt truncates at 72 bytes)
_MAX_EMAIL_LEN = 254     # RFC 5321 maximum
_MAX_USERNAME_LEN = 30   # Matches regex ceiling


# Pre-compiled patterns
_USERNAME_RE = re.compile(r"^[a-zA-Z0-9_]{3,30}$")
_PASSWORD_RE = re.compile(r"^(?=.*[A-Z])(?=.*\d).{8,}$")


class UserSchema:
    """Validation schema for a user document."""

    REQUIRED_FIELDS = ["username", "email", "password"]
    ALLOWED_ROLES = ALLOWED_ROLES
    SELF_REGISTER_ROLES = ["guest", "analyst"]

    # ------------------------------------------------------------------ #
    # Validation — Registration
    # ------------------------------------------------------------------ #

    @classmethod
    def validate_registration(cls, data: dict) -> list[str]:
        """Validate a user registration payload.

        Args:
            data: The raw request payload dict.

        Returns:
            A list of human-readable error strings. Empty = valid.
        """
        errors: list[str] = []

        username = data.get("username", "")
        email = data.get("email", "")
        password = data.get("password", "")
        role = data.get("role", "guest")

        # Type guards — reject non-string inputs early
        if not isinstance(username, str):
            errors.append("'username' must be a string.")
            return errors
        if not isinstance(email, str):
            errors.append("'email' must be a string.")
            return errors
        if not isinstance(password, str):
            errors.append("'password' must be a string.")
            return errors

        # Length ceilings — prevent oversized payloads / BCrypt DoS
        if len(email) > _MAX_EMAIL_LEN:
            errors.append(f"Email must not exceed {_MAX_EMAIL_LEN} characters.")
        if len(password) > _MAX_PASSWORD_LEN:
            errors.append(
                f"Password must not exceed {_MAX_PASSWORD_LEN} characters."
            )

        if not _USERNAME_RE.match(username):
            errors.append(
                "Username must be 3–30 characters and contain only letters, digits, or underscores."
            )
        if not is_valid_email(email):
            errors.append("A valid email address is required.")
        if not _PASSWORD_RE.match(password):
            errors.append(
                "Password must be at least 8 characters and include one uppercase letter and one digit."
            )
        if role == "admin":
            errors.append("Cannot self-register with the 'admin' role.")
        if role not in cls.SELF_REGISTER_ROLES:
            errors.append(f"Role must be one of: {', '.join(cls.SELF_REGISTER_ROLES)}.")

        return errors

    # ------------------------------------------------------------------ #
    # Validation — Profile update
    # ------------------------------------------------------------------ #

    @classmethod
    def validate_update(cls, data: dict) -> list[str]:
        """Validate a user profile update payload (partial).

        Only checks fields that are present in *data*.

        Returns:
            A list of error strings. Empty = valid.
        """
        errors: list[str] = []

        if "username" in data:
            if not isinstance(data["username"], str):
                errors.append("'username' must be a string.")
            elif not _USERNAME_RE.match(data["username"]):
                errors.append(
                    "Username must be 3–30 characters and contain only letters, digits, or underscores."
                )

        if "email" in data:
            if not isinstance(data["email"], str):
                errors.append("'email' must be a string.")
            elif len(data["email"]) > _MAX_EMAIL_LEN:
                errors.append(f"Email must not exceed {_MAX_EMAIL_LEN} characters.")
            elif not is_valid_email(data["email"]):
                errors.append("A valid email address is required.")

        if "password" in data:
            if not isinstance(data["password"], str):
                errors.append("'password' must be a string.")
            elif len(data["password"]) > _MAX_PASSWORD_LEN:
                errors.append(f"Password must not exceed {_MAX_PASSWORD_LEN} characters.")
            elif not _PASSWORD_RE.match(data["password"]):
                errors.append(
                    "Password must be at least 8 characters and include one uppercase letter and one digit."
                )

        if "role" in data:
            if data["role"] not in cls.ALLOWED_ROLES:
                errors.append(f"Role must be one of: {', '.join(cls.ALLOWED_ROLES)}.")

        return errors

    # ------------------------------------------------------------------ #
    # Validation — Role change
    # ------------------------------------------------------------------ #

    @classmethod
    def validate_role(cls, role: str) -> list[str]:
        """Validate that a role string is allowed.

        Returns:
            A list of error strings. Empty = valid.
        """
        if role not in cls.ALLOWED_ROLES:
            return [f"Role must be one of: {', '.join(cls.ALLOWED_ROLES)}."]
        return []

    # ------------------------------------------------------------------ #
    # Document builder — Registration
    # ------------------------------------------------------------------ #

    @classmethod
    def sanitize(cls, data: dict) -> dict:
        """Sanitize a user payload against NoSQL injection and XSS.

        1. Strip ``$``-prefixed MongoDB operator keys.
        2. Strip HTML tags from string fields (plain text only for users).

        Args:
            data: The raw request payload dict.

        Returns:
            A sanitised copy safe for validation and storage.
        """
        cleaned = sanitize_mongo_input(data)
        for field in ("username", "email", "name"):
            if field in cleaned and isinstance(cleaned[field], str):
                cleaned[field] = sanitize_html(cleaned[field], strip_tags=True)
        return cleaned

    @classmethod
    def to_document(
        cls,
        username: str,
        email: str,
        password_hash: str,
        role: str = "guest",
    ) -> dict:
        """Build a MongoDB-ready user document from validated inputs.

        **Security:** String fields are HTML-sanitised (defence-in-depth).

        Args:
            username: Validated username string.
            email: Validated email string (will be lower-cased).
            password_hash: BCrypt hash of the user's password.
            role: User role (default ``'guest'``).

        Returns:
            A dict ready for ``insert_one()``.
        """
        now = datetime.utcnow()
        return {
            "username": sanitize_html(username, strip_tags=True),
            "email": email.lower().strip(),
            "password_hash": password_hash,
            "role": role,
            "is_active": True,
            "created_at": now,
            "last_login": None,
        }

    # ------------------------------------------------------------------ #
    # Safe projection — strip sensitive fields for API responses
    # ------------------------------------------------------------------ #

    SAFE_FIELDS = {
        "_id": 1,
        "username": 1,
        "email": 1,
        "role": 1,
        "is_active": 1,
        "created_at": 1,
        "last_login": 1,
    }

    @classmethod
    def to_safe_dict(cls, user: dict) -> dict:
        """Return a copy of *user* with sensitive fields (password_hash) removed.

        Args:
            user: A raw MongoDB user document.

        Returns:
            A dict safe for API serialisation.
        """
        return {k: user[k] for k in cls.SAFE_FIELDS if k in user}
