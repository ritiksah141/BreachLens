"""
auth_service.py — Authentication and user-management service for BreachLens.

Uses the raw ``pyjwt`` library for token generation (``jwt.encode``) as
required by the module specification.  Passwords are hashed with ``bcrypt``.
"""
from datetime import datetime, timedelta
import hashlib
import secrets
from typing import Optional, Tuple

import bcrypt
import jwt as pyjwt  # raw PyJWT — module requirement
from bson import ObjectId
from bson.errors import InvalidId
from flask import current_app
from pymongo.errors import DuplicateKeyError

from app.extensions import mongo

TOKEN_TYPE_BEARER = "Bearer"  # nosec B105 - token type label


class AuthService:
    COLLECTION = "users"

    @property
    def col(self):
        return mongo.db[self.COLLECTION]

    def ensure_indexes(self) -> None:
        """Create unique indexes for users collection."""
        self.col.create_index("email", unique=True, background=True)
        self.col.create_index("username", unique=True, background=True)

    def register(
        self,
        username: str,
        email: str,
        password: str,
        role: str = "guest",
    ) -> tuple[Optional[dict], Optional[str]]:
        """Register a new user.

        Returns ``(user_doc, None)`` on success or ``(None, error_message)``
        on failure.
        """
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"), bcrypt.gensalt(rounds=12)
        ).decode("utf-8")

        now = datetime.utcnow()
        doc = {
            "username": username,
            "email": email.lower(),
            "password_hash": password_hash,
            "role": role,
            "is_active": True,
            "created_at": now,
            "last_login": None,
        }

        try:
            result = self.col.insert_one(doc)
            doc["_id"] = result.inserted_id
            doc.pop("password_hash", None)
            return doc, None
        except DuplicateKeyError as exc:
            err_str = str(exc)
            if "email" in err_str:
                return None, "An account with that email already exists."
            if "username" in err_str:
                return None, "That username is already taken."
            return None, "A duplicate key error occurred."

    def login(
        self,
        email: str = None,
        password: str = None,
        username: str = None,
    ) -> tuple[Optional[dict], Optional[str]]:
        """Authenticate a user and return a JWT token.

        Uses ``jwt.encode()`` from the raw ``pyjwt`` library.  The token
        payload includes the ``user`` (username), ``admin`` boolean, ``role``,
        and an ``exp`` expiration timestamp — exactly as prescribed by the
        module materials.

        Returns ``(token_data, None)`` on success or ``(None, error_message)``
        on failure.
        """
        # Look up user by email or username
        if username:
            user = self.col.find_one({"username": username})
        elif email:
            user = self.col.find_one({"email": email.lower()})
        else:
            return None, "Username or email is required."

        if not user:
            return None, "Invalid credentials."

        if not user.get("is_active", True):
            return None, "Account is inactive. Please contact support."

        if not bcrypt.checkpw(
            password.encode("utf-8"), user["password_hash"].encode("utf-8")
        ):
            return None, "Invalid credentials."

        # Update last login timestamp
        self.col.update_one(
            {"_id": user["_id"]}, {"$set": {"last_login": datetime.utcnow()}}
        )

        # --- Generate JWT with raw pyjwt (jwt.encode) ---
        secret_key = current_app.config["SECRET_KEY"]
        expires_seconds = int(
            current_app.config.get("JWT_ACCESS_TOKEN_EXPIRES", timedelta(hours=1)).total_seconds()
        )

        token = pyjwt.encode(
            {
                "user": user.get("username", ""),
                "user_id": str(user["_id"]),
                "admin": user.get("role") == "admin",
                "role": user.get("role", "guest"),
                "exp": datetime.utcnow() + timedelta(seconds=expires_seconds),
            },
            secret_key,
            algorithm="HS256",
        )

        return (
            {
                "token": token,
                "token_type": TOKEN_TYPE_BEARER,
                "expires_in": expires_seconds,
                "user": {
                    "_id": str(user["_id"]),
                    "username": user.get("username", ""),
                    "email": user.get("email", ""),
                    "role": user.get("role", "guest"),
                    "admin": user.get("role") == "admin",
                },
            },
            None,
        )

    def get_user_by_id(self, user_id: str) -> Optional[dict]:
        """Return a user document by ID, without the password hash."""
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None
        user = self.col.find_one({"_id": oid})
        if not user:
            return None
        user.pop("password_hash", None)
        return user

    # ------------------------------------------------------------------ #
    # Account lockout
    # ------------------------------------------------------------------ #

    def check_account_lockout(self, email: str) -> Tuple[bool, Optional[int]]:
        """Check if an account is locked due to too many failed login attempts.

        Returns ``(is_locked, remaining_seconds)``.  If the account is not
        locked, returns ``(False, None)``.
        """
        user = self.col.find_one({"email": email.lower()})
        if not user:
            return False, None

        locked_until = user.get("locked_until")
        if locked_until and isinstance(locked_until, datetime):
            now = datetime.utcnow()
            if locked_until > now:
                remaining = int((locked_until - now).total_seconds())
                return True, remaining
        return False, None

    def record_failed_login(self, email: str) -> None:
        """Increment the failed-login counter for *email*.

        When the counter reaches ``MAX_LOGIN_ATTEMPTS`` (default 5), the
        account is locked for 15 minutes.
        """
        max_attempts = current_app.config.get("MAX_LOGIN_ATTEMPTS", 5)
        lockout_minutes = current_app.config.get("LOCKOUT_DURATION_MINUTES", 15)

        user = self.col.find_one({"email": email.lower()})
        if not user:
            return

        current_attempts = user.get("failed_login_attempts", 0)
        new_attempts = current_attempts + 1

        update: dict = {"$set": {"failed_login_attempts": new_attempts}}
        if new_attempts >= max_attempts:
            update["$set"]["locked_until"] = datetime.utcnow() + timedelta(minutes=lockout_minutes)

        self.col.update_one({"email": email.lower()}, update)

    def reset_failed_attempts(self, email: str) -> None:
        """Reset the failed-login counter and remove the lockout timestamp."""
        self.col.update_one(
            {"email": email.lower()},
            {"$set": {"failed_login_attempts": 0}, "$unset": {"locked_until": 1}},
        )

    def resolve_lockout_identity(self, email: str = None, username: str = None) -> Optional[str]:
        """Resolve the canonical email key used for lockout tracking.

        Returns a lower-cased email when a matching account exists, else ``None``.
        """
        if email:
            return email.lower()
        if username:
            user = self.col.find_one({"username": username}, {"email": 1})
            if user and user.get("email"):
                return str(user["email"]).lower()
        return None

    # ------------------------------------------------------------------ #
    # Password reset
    # ------------------------------------------------------------------ #

    def create_password_reset_token(self, email: str) -> tuple[bool, Optional[str]]:
        """Create a password reset token for an existing user.

        Returns ``(True, raw_token)`` when the user exists, else ``(False, None)``.
        """
        user = self.col.find_one({"email": email.lower()}, {"_id": 1})
        if not user:
            return False, None

        raw_token = secrets.token_urlsafe(32)
        token_hash = hashlib.sha256(raw_token.encode("utf-8")).hexdigest()
        ttl_minutes = int(current_app.config.get("PASSWORD_RESET_TOKEN_TTL_MINUTES", 30))
        expires_at = datetime.utcnow() + timedelta(minutes=ttl_minutes)

        self.col.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_reset_token_hash": token_hash,
                    "password_reset_expires_at": expires_at,
                    "password_reset_requested_at": datetime.utcnow(),
                }
            },
        )

        return True, raw_token

    def reset_password_with_token(self, token: str, new_password: str) -> tuple[bool, str]:
        """Reset password for a user identified by a valid reset token."""
        token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
        now = datetime.utcnow()

        user = self.col.find_one(
            {
                "password_reset_token_hash": token_hash,
                "password_reset_expires_at": {"$gt": now},
            },
            {"_id": 1, "password_hash": 1},  # nosec B105
        )
        if not user:
            return False, "Invalid or expired reset token."

        existing_hash = user.get("password_hash")
        if existing_hash and bcrypt.checkpw(new_password.encode("utf-8"), existing_hash.encode("utf-8")):
            return False, "New password must be different from your current password."

        password_hash = bcrypt.hashpw(
            new_password.encode("utf-8"), bcrypt.gensalt(rounds=12)
        ).decode("utf-8")

        self.col.update_one(
            {"_id": user["_id"]},
            {
                "$set": {
                    "password_hash": password_hash,
                    "updated_at": now,
                    "failed_login_attempts": 0,
                },
                "$unset": {  # nosec B105
                    "password_reset_token_hash": 1,
                    "password_reset_expires_at": 1,
                    "password_reset_requested_at": 1,
                    "locked_until": 1,
                },
            },
        )

        return True, "Password has been reset successfully."
