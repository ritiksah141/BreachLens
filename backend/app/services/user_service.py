"""
user_service.py — User management business logic.
"""
from datetime import datetime
from typing import Optional
from bson import ObjectId
from bson.errors import InvalidId
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
        """Fetch a single user by ObjectId string."""
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None
        return self.col.find_one({"_id": oid}, self.SAFE_FIELDS)

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
        allowed_fields = {"username", "email", "name", "profile"}
        filtered_updates = {k: v for k, v in updates.items() if k in allowed_fields}

        # Avoid mutating caller's dict by creating a copy
        safe_updates = {**filtered_updates, "updated_at": datetime.utcnow()}

        self.col.update_one({"_id": oid}, {"$set": safe_updates})
        return self.get_by_id(user_id)

    def demote_admin_atomically(self, user_id: str, new_role: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Atomically demote an admin only if other admins exist. Returns (user, error).

        Uses MongoDB transaction to ensure count and update are atomic, preventing TOCTOU races.
        Excludes password hash from returned document.
        """
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None, "Invalid user ID"

        # Use transaction to make count and update atomic
        with self.client.start_session() as session:
            with session.start_transaction():
                # Count other admins (not including this user) within transaction
                other_admin_count = self.col.count_documents(
                    {"role": "admin", "_id": {"$ne": oid}},
                    session=session
                )

                if other_admin_count < 1:
                    # Abort transaction
                    session.abort_transaction()
                    return None, "Cannot demote the last remaining admin."

                # Atomic operation: only update if still an admin (prevents race condition)
                # Exclude password hash from returned document
                result = self.col.find_one_and_update(
                    {"_id": oid, "role": "admin"},
                    {"$set": {"role": new_role, "updated_at": datetime.utcnow()}},
                    projection={"password_hash": 0},
                    return_document=True,
                    session=session
                )

                if result is None:
                    session.abort_transaction()
                    return None, "User not found or not an admin."

        return result, None

    def deactivate_admin_atomically(self, user_id: str) -> tuple[Optional[dict], Optional[str]]:
        """
        Atomically deactivate a user (admin or non-admin).

        For admins: only deactivates if other active admins exist.
        For non-admins: deactivates without the admin count check.

        Uses MongoDB transaction to ensure count and update are atomic, preventing TOCTOU races.
        Excludes password hash from returned document.

        Returns (user, error).
        """
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return None, "Invalid user ID"

        # Use transaction to make all operations atomic
        with self.client.start_session() as session:
            with session.start_transaction():
                # First, check if user exists and get their role
                user = self.col.find_one(
                    {"_id": oid},
                    {"role": 1, "is_active": 1},
                    session=session
                )

                if not user:
                    session.abort_transaction()
                    return None, "User not found or already inactive."

                if not user.get("is_active", True):
                    session.abort_transaction()
                    return None, "User not found or already inactive."

                # If user is an admin, check if other active admins exist
                if user.get("role") == "admin":
                    other_active_admin_count = self.col.count_documents(
                        {"role": "admin", "is_active": True, "_id": {"$ne": oid}},
                        session=session
                    )

                    if other_active_admin_count < 1:
                        session.abort_transaction()
                        return None, "Cannot deactivate the last active admin."

                # Atomic deactivation with projection to exclude password hash
                result = self.col.find_one_and_update(
                    {"_id": oid, "is_active": True},
                    {"$set": {"is_active": False, "updated_at": datetime.utcnow()}},
                    projection={"password_hash": 0},
                    return_document=True,
                    session=session
                )

                if result is None:
                    session.abort_transaction()
                    return None, "User not found or already inactive."

        return result, None

    def delete_user(self, user_id: str) -> bool:
        """Delete a user by ID. Returns True if deleted."""
        try:
            oid = ObjectId(user_id)
        except (InvalidId, TypeError):
            return False
        result = self.col.delete_one({"_id": oid})
        return result.deleted_count == 1

    def count_users_with_role(self, role: str) -> int:
        """Count the number of users with a specific role."""
        return self.col.count_documents({"role": role})

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
