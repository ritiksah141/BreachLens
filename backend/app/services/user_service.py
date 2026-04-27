"""
user_service.py — User management business logic.
"""
from datetime import datetime
from typing import Optional
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import DuplicateKeyError
from app.extensions import mongo


class UserService:
    """CRUD operations for the users collection."""

    COLLECTION = "users"
    SAFE_FIELDS = {"_id": 1, "username": 1, "email": 1, "role": 1, "is_active": 1, "created_at": 1, "last_login": 1}

    @property
    def col(self):
        return mongo.db[self.COLLECTION]

    @property
    def client(self):
        """Access MongoDB client for transactions."""
        return mongo.cx

    def get_all(self, page: int = 1, limit: int = 20) -> tuple[list[dict], int]:
        """Return paginated list of users (password excluded)."""
        # Validate and sanitize pagination parameters
        if page < 1:
            page = 1
        if limit <= 0:
            limit = 20
        elif limit > 100:
            limit = 100

        skip = (page - 1) * limit
        total = self.col.count_documents({})
        users = list(self.col.find({}, self.SAFE_FIELDS).skip(skip).limit(limit))
        return users, total

    def get_by_id(self, user_id: str) -> Optional[dict]:
        """Fetch a single user by ObjectId string (safe fields only)."""
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None
        return self.col.find_one({"_id": oid}, self.SAFE_FIELDS)

    def verify_password(self, user_id: str, password: str) -> bool:
        """
        Verify a plain-text password against a user's stored hash.
        This keeps the hash encapsulated within the service layer.
        """
        import bcrypt
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return False

        user = self.col.find_one({"_id": oid}, {"password_hash": 1})
        if not user or "password_hash" not in user:
            return False

        stored_hash = user["password_hash"]
        if isinstance(stored_hash, str):
            stored_hash = stored_hash.encode("utf-8")

        return bcrypt.checkpw(password.encode("utf-8"), stored_hash)

    def update_user(self, user_id: str, updates: dict) -> Optional[dict]:
        """
        Partially update a user document.

        Note: "role" and "is_active" are excluded from allowed_fields to enforce
        use of atomic operations (demote_admin_atomically, deactivate_admin_atomically)
        which include proper validation and prevent race conditions.
        """
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None

        # Whitelist safe mutable fields to prevent modification of sensitive fields
        # "role" and "is_active" excluded - use atomic methods instead
        allowed_fields = {"username", "email", "name", "profile", "password_hash"}
        filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}

        # Avoid mutating caller's dict by creating a copy
        safe_updates = {**filtered_updates, "updated_at": datetime.utcnow()}

        try:
            self.col.update_one({"_id": oid}, {"$set": safe_updates})
        except DuplicateKeyError as exc:
            # Extract which field caused the conflict (e.g. username or email)
            err_msg = str(exc)
            if "username" in err_msg:
                raise ValueError("Username already taken.") from exc
            if "email" in err_msg:
                raise ValueError("Email already taken.") from exc
            raise ValueError("Duplicate value.") from exc
        return self.get_by_id(user_id)

    def demote_admin_atomically(self, user_id: str, new_role: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Atomically demote an admin only if other admins exist. Returns (user, error).

        Uses atomic find_one_and_update with a pre-check on admin count.
        Excludes password hash from returned document.
        """
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None, "Invalid user ID"

        # Count other admins (not including this user)
        other_admin_count = self.col.count_documents(
            {"role": "admin", "_id": {"$ne": oid}}
        )

        if other_admin_count < 1:
            return None, "Cannot demote the last remaining admin."

        # Atomic operation: only update if still an admin (prevents race condition)
        # Exclude password hash from returned document
        result = self.col.find_one_and_update(
            {"_id": oid, "role": "admin"},
            {"$set": {"role": new_role, "updated_at": datetime.utcnow()}},
            projection={"password_hash": 0},
            return_document=True
        )

        if result is None:
            return None, "User not found or not an admin."

        return result, None

    def set_role(self, user_id: str, new_role: str) -> Optional[dict]:
        """Directly set a user's role (for non-admin demotion scenarios)."""
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None

        result = self.col.find_one_and_update(
            {"_id": oid},
            {"$set": {"role": new_role, "updated_at": datetime.utcnow()}},
            projection={"password_hash": 0},
            return_document=True
        )
        return result

    def deactivate_admin_atomically(self, user_id: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Atomically deactivate a user (admin or non-admin).

        For admins: only deactivates if other active admins exist.
        For non-admins: deactivates without the admin count check.

        Uses atomic find_one_and_update to safely deactivate. For admins,
        checks that at least one other active admin exists before proceeding.
        Excludes password hash from returned document.

        Returns (user, error).
        """
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None, "Invalid user ID"

        # First, check if user exists and is active
        user = self.col.find_one(
            {"_id": oid},
            {"role": 1, "is_active": 1}
        )

        if not user:
            return None, "User not found or already inactive."

        if not user.get("is_active", True):
            return None, "User not found or already inactive."

        # If user is an admin, check if other active admins exist
        if user.get("role") == "admin":
            other_active_admin_count = self.col.count_documents(
                {"role": "admin", "is_active": True, "_id": {"$ne": oid}}
            )

            if other_active_admin_count < 1:
                return None, "Cannot deactivate the last active admin."

        # Atomic deactivation with projection to exclude password hash
        result = self.col.find_one_and_update(
            {"_id": oid, "is_active": True},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
            projection={"password_hash": 0},
            return_document=True
        )

        if result is None:
            return None, "User not found or already inactive."

        return result, None

    def delete_user(self, user_id: str) -> bool:
        """Soft-delete a user by setting is_active=False. Returns True if deactivated."""
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return False
        result = self.col.update_one(
            {"_id": oid, "is_active": True},
            {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
        )
        return result.modified_count == 1

    def count_users_with_role(self, role: str) -> int:
        """Count the number of users with a specific role."""
        return self.col.count_documents({"role": role})

    def activate_user(self, user_id: str) -> Optional[dict]:
        """Activate a user account by setting is_active=True. Returns updated user or None."""
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None
        result = self.col.find_one_and_update(
            {"_id": oid},
            {"$set": {"is_active": True, "updated_at": datetime.utcnow()}},
            projection={"password_hash": 0},
            return_document=True,
        )
        return result

    def count_active_admins(self) -> int:
        """Count the number of active admin users."""
        return self.col.count_documents({"role": "admin", "is_active": True})

    def get_user(self, user_id: str) -> Optional[dict]:
        """Fetch a user document with safe fields only (no password hash)."""
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None
        return self.col.find_one({"_id": oid}, self.SAFE_FIELDS)
