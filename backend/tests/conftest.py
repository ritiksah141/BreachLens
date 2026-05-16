"""
conftest.py — Shared pytest fixtures for the BreachLens test suite.

All tests in this directory automatically receive these fixtures.
mongomock patches pymongo so no real MongoDB instance is required.
"""
import pytest
from datetime import datetime, timedelta
from unittest.mock import patch, MagicMock
import jwt as pyjwt  # raw PyJWT — module requirement
from bson import ObjectId
import mongomock

# Apply mongomock patch before any app code is imported
# This ensures that even module-level imports of pymongo are patched.
_mongo_patcher = patch("pymongo.MongoClient", mongomock.MongoClient)
_mongo_patcher.start()

from app import create_app


# ---------------------------------------------------------------------------
# Application / client fixtures
# ---------------------------------------------------------------------------

@pytest.fixture(scope="session")
def app():
    """Create a Flask application configured for testing."""
    application = create_app("testing")
    application.config.update({
        "TESTING": True,
        "RATELIMIT_ENABLED": False,
        "WTF_CSRF_ENABLED": False,
        "CACHE_TYPE": "NullCache",  # Disable caching in tests
    })
    return application


@pytest.fixture(scope="function")
def client(app):
    """Flask test client (function-scoped for isolation)."""
    return app.test_client()


# ---------------------------------------------------------------------------
# User identity helpers
# ---------------------------------------------------------------------------

_GUEST_ID = str(ObjectId())
_ANALYST_ID = str(ObjectId())
_ADMIN_ID = str(ObjectId())

MOCK_GUEST_USER = {
    "_id": ObjectId(_GUEST_ID),
    "username": "testguest",
    "email": "guest@test.com",
    "role": "guest",
    "admin": False,
    "is_active": True,
}

MOCK_ANALYST_USER = {
    "_id": ObjectId(_ANALYST_ID),
    "username": "testanalyst",
    "email": "analyst@test.com",
    "role": "analyst",
    "admin": False,
    "is_active": True,
}

MOCK_ADMIN_USER = {
    "_id": ObjectId(_ADMIN_ID),
    "username": "testadmin",
    "email": "admin@test.com",
    "role": "admin",
    "admin": True,
    "is_active": True,
}


def _make_headers(app, identity: str, role: str, username: str) -> dict:
    """Generate a valid x-access-token header using raw ``jwt.encode()``."""
    with app.app_context():
        token = pyjwt.encode(
            {
                "user": username,
                "user_id": identity,
                "admin": role == "admin",
                "role": role,
                "exp": datetime.utcnow() + timedelta(hours=1),
            },
            app.config["SECRET_KEY"],
            algorithm="HS256",
        )
    return {"x-access-token": token}


@pytest.fixture(scope="session")
def guest_headers(app):
    """HTTP headers carrying a valid guest JWT."""
    return _make_headers(app, _GUEST_ID, "guest", "testguest")


@pytest.fixture(scope="session")
def analyst_headers(app):
    """HTTP headers carrying a valid analyst JWT."""
    return _make_headers(app, _ANALYST_ID, "analyst", "testanalyst")


@pytest.fixture(scope="session")
def admin_headers(app):
    """HTTP headers carrying a valid admin JWT."""
    return _make_headers(app, _ADMIN_ID, "admin", "testadmin")


# ---------------------------------------------------------------------------
# DB / service stubs
# ---------------------------------------------------------------------------

@pytest.fixture(autouse=True)
def mock_mongo_indexes():
    """
    Prevent actual index-creation calls during tests.
    BreachService.ensure_indexes and AuthService.ensure_indexes both try to
    communicate with MongoDB; this fixture no-ops them for every test.
    """
    with (
        patch("app.services.breach_service.BreachService.ensure_indexes"),
        patch("app.services.auth_service.AuthService.ensure_indexes"),
    ):
        yield


@pytest.fixture(autouse=True)
def clear_db_collections(app):
    """Clear MongoDB collections between tests to ensure isolation."""
    with app.app_context():
        try:
            from app.extensions import mongo
            collections = ["blacklist", "audit_logs", "breaches", "users"]
            for coll in collections:
                mongo.db[coll].delete_many({})
        except Exception:
            pass
    yield
    with app.app_context():
        try:
            from app.extensions import mongo
            collections = ["blacklist", "audit_logs", "breaches", "users"]
            for coll in collections:
                mongo.db[coll].delete_many({})
        except Exception:
            pass


@pytest.fixture
def mock_auth_service_get_user(app):
    """
    Patch AuthService.get_user_by_id to return a mock user document.
    Tests that call /auth/me or need g.current_user resolved can use this.
    """
    with patch(
        "app.routes.auth.auth_service.get_user_by_id",
        return_value=MOCK_ANALYST_USER,
    ) as mock_fn:
        yield mock_fn


# ---------------------------------------------------------------------------
# Service / factory fixtures
# ---------------------------------------------------------------------------

@pytest.fixture
def auth_service():
    """Return an AuthService instance for unit-level lockout tests."""
    from app.services.auth_service import AuthService
    return AuthService()


@pytest.fixture
def create_test_user():
    """Factory fixture that builds test user dicts (no DB writes)."""
    def _make(email: str, role: str = "analyst"):
        return {
            "_id": ObjectId(),
            "username": email.split("@")[0],
            "email": email,
            "role": role,
            "is_active": True,
            "failed_login_attempts": 0,
        }
    return _make


@pytest.fixture
def sample_breach_payload():
    """Minimal valid breach payload used by endpoint-level tests."""
    return {
        "title": "Test Breach Incident",
        "description": "A detailed description of the test breach for validation compliance.",
        "breach_date": "2024-01-15T00:00:00Z",
        "discovered_date": "2024-01-20T00:00:00Z",
        "severity": "high",
        "status": "active",
        "industry": "technology",
        "affected_records_count": 5000,
        "organisation": {
            "name": "Test Corp",
            "industry": "technology",
            "country": "US",
        },
        "data_types_exposed": ["email", "password"],
    }
