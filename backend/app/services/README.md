# BreachLens Services

**Business logic layer for BreachLens API.**

---

## 📁 Structure

```
services/
├── auth_service.py       # Authentication & user management
├── breach_service.py     # Breach CRUD & geospatial operations
├── user_service.py       # User profile management
└── analytics_service.py  # Aggregation pipelines & statistics
```

---

## 🎯 Overview

Services contain all business logic and database operations. Routes are thin controllers that:
1. Validate input (using models)
2. Call service methods
3. Format responses

**Design Philosophy:**
- ✅ **Single Responsibility**: Each service handles one domain
- ✅ **Testable**: Services can be tested with mock databases
- ✅ **Reusable**: Shared logic across multiple routes
- ✅ **Database Abstraction**: MongoDB operations isolated in services

---

## 🔐 AuthService ([auth_service.py](auth_service.py))

Handles authentication, user registration, and account security.

### **Key Methods**

#### **`register(username, email, password, role) -> tuple[dict, str | None]`**
Register a new user.

**Features:**
- Password hashing with BCrypt (12 rounds)
- Duplicate email/username detection
- Role validation (guest/analyst only for self-registration)
- Returns: `(user_dict, error_message)`

**Example:**
```python
from app.services.auth_service import AuthService

service = AuthService()
user, error = service.register(
    username="john_doe",
    email="john@example.com",
    password="Secret123",  # pragma: allowlist secret
    role="analyst"
)

if error:
    return error_response(error), 422
```

#### **`login(email, password) -> tuple[dict, str | None]`**
Authenticate user and generate JWT token.

**Features:**
- Account lockout check (5 attempts, 15 min lockout)
- Password verification with BCrypt
- JWT token generation (1 hour expiry)
- Failed login tracking
- Audit logging

**Returns:** `(token_payload, error_message)`

```python
{
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",  # pragma: allowlist secret
    "user": {
        "id": "507f1f77bcf86cd799439011",  # pragma: allowlist secret
        "username": "john_doe",
        "email": "john@example.com",
        "role": "analyst"
    }
}
```

#### **`check_account_lockout(email) -> tuple[bool, int | None]`**
Check if account is locked due to failed login attempts.

**Returns:** `(is_locked, seconds_remaining)`

#### **`record_failed_login(email) -> None`**
Increment failed login counter.

#### **`reset_failed_attempts(email) -> None`**
Reset failed login counter after successful login.

#### **`get_user_by_id(user_id) -> dict | None`**
Retrieve user by MongoDB ObjectId.

---

## 📊 BreachService ([breach_service.py](breach_service.py))

Handles all breach-related operations including CRUD, geospatial queries, and sub-documents.

### **Core CRUD Methods**

#### **`list_breaches(page, limit, filters, sort) -> tuple[list, int]`**
List breaches with pagination and filtering.

**Parameters:**
- `page`: Page number (1-indexed)
- `limit`: Items per page (default: 20, max: 100)
- `filters`: Dict with optional keys:
  - `severity`: "low", "medium", "high", "critical"
  - `status`: "suspected", "confirmed", "resolved", "under_investigation"
  - `industry`: industry name
  - `search`: text search on title/description
  - `date_from`, `date_to`: date range filtering
- `sort`: Dict like `{"breach_date": -1}` (newest first)

**Returns:** `(breach_list, total_count)`

**Example:**
```python
breaches, total = service.list_breaches(
    page=1,
    limit=20,
    filters={"severity": "critical", "industry": "healthcare"},
    sort={"breach_date": -1}
)
```

#### **`get_by_id(breach_id) -> dict | None`**
Get single breach by ID.

#### **`create(data, created_by) -> dict`**
Create new breach.

**Features:**
- Validates with `BreachSchema`
- Computes risk score based on severity, data types, account count
- Adds timestamps and creator ID
- Returns document with `_id` as string

#### **`update(breach_id, data, user_id, user_role) -> tuple[dict, str | None]`**
Full update (replaces entire document).

**Authorization:**
- Analysts can only update own breaches
- Admins can update any breach

#### **`patch(breach_id, data, user_id, user_role) -> tuple[dict, str | None]`**
Partial update (updates specific fields).

**Example:**
```python
updated, error = service.patch(
    breach_id="507f1f77bcf86cd799439011",
    data={"status": "resolved"},
    user_id=g.user_id,
    user_role=g.user_role
)
```

#### **`delete(breach_id) -> tuple[bool, str | None]`**
Delete breach (admin only, enforced in route).

#### **`bulk_delete(breach_ids) -> tuple[int, list]`**
Delete multiple breaches.

**Returns:** `(deleted_count, failed_ids)`

---

### **Sub-document Methods**

#### **Affected Accounts**

- `list_affected_accounts(breach_id)` → List all accounts
- `get_affected_account(breach_id, account_id)` → Get one account
- `add_affected_account(breach_id, data)` → Add account ($push)
- `update_affected_account(breach_id, account_id, data)` → Update account ($set)
- `delete_affected_account(breach_id, account_id)` → Remove account ($pull)

#### **Timeline Events**

- `list_timeline(breach_id)` → List all events
- `get_timeline_event(breach_id, event_id)` → Get one event
- `add_timeline_event(breach_id, data)` → Add event ($push)
- `update_timeline_event(breach_id, event_id, data)` → Update event ($set)
- `delete_timeline_event(breach_id, event_id)` → Remove event ($pull)

#### **Remediation Actions**

- `list_remediation(breach_id)` → List all actions
- `get_remediation_action(breach_id, action_id)` → Get one action
- `add_remediation_action(breach_id, data)` → Add action ($push)
- `update_remediation_action(breach_id, action_id, data)` → Update action ($set)
- `delete_remediation_action(breach_id, action_id)` → Remove action ($pull)

#### **Monitoring Alerts**

- `list_alerts(breach_id)` → List all alerts
- `get_alert(breach_id, alert_id)` → Get one alert
- `create_alert(breach_id, data)` → Add alert ($push)
- `update_alert(breach_id, alert_id, data)` → Update alert ($set)
- `delete_alert(breach_id, alert_id)` → Remove alert ($pull)

**Note:** All sub-document methods return `(result, error_message)` tuples.

---

### **Geospatial Methods**

#### **`find_near(longitude, latitude, radius) -> list[dict]`**
Find breaches near coordinates using `$geoNear`.

**Parameters:**
- `longitude`: float (-180 to 180)
- `latitude`: float (-90 to 90)
- `radius`: meters (default: 50000)

**Example:**
```python
# Find breaches within 100km of London
breaches = service.find_near(-0.1278, 51.5074, 100000)
```

#### **`find_within_bounds(min_lng, min_lat, max_lng, max_lat) -> list[dict]`**
Find breaches within bounding box using `$geoWithin`.

**Example:**
```python
# Find breaches in UK roughly
breaches = service.find_within_bounds(-8.0, 49.0, 2.0, 61.0)
```

#### **`get_geojson(severity, industry) -> list[dict]`**
Get breaches as GeoJSON features.

**Returns:** Array of GeoJSON Feature objects:
```json
{
  "type": "Feature",
  "geometry": {
    "type": "Point",
    "coordinates": [-0.1278, 51.5074]
  },
  "properties": {
    "breach_id": "...",
    "title": "...",
    "severity": "critical",
    "status": "confirmed"
  }
}
```

---

### **Utility Methods**

#### **`check_exposure(email, domain) -> dict`**
Check if email or domain appears in any breach.

**Returns:**
```python
{
    "exposed": True,
    "breaches": [
        {"breach_id": "...", "title": "...", "breach_date": "..."}
    ],
    "exposure_count": 3
}
```

#### **`compute_risk_score(base_severity, data_types, account_count) -> float`**
Calculate risk score (0-100) based on:
- Base severity: low=20, medium=40, high=60, critical=80
- + 2 points per sensitive data type
- + 0.1 points per 1000 affected accounts
- Capped at 100

---

## 👤 UserService ([user_service.py](user_service.py))

Handles user profile management (non-auth operations).

### **Key Methods**

#### **`get_all(page, limit) -> tuple[list[dict], int]`**
List all users (admin only).

**Returns:** `(user_list, total_count)`

#### **`get_by_id(user_id) -> dict | None`**
Get user by ID.

#### **`update_user(user_id, updates) -> dict | None`**
Update user profile.

**Validates:**
- Cannot change own role (privilege escalation prevention)
- Password updates require current password verification
- Email uniqueness

#### **`demote_admin_atomically(user_id, new_role) -> tuple[dict, str | None]`**
Safely demote admin to analyst/guest.

**Features:**
- Atomic transaction with session
- Prevents demoting last active admin
- Returns `(updated_user, error_message)`

#### **`deactivate_admin_atomically(user_id) -> tuple[dict, str | None]`**
Safely deactivate admin account.

**Features:**
- Atomic transaction
- Prevents deactivating last active admin

#### **`activate_user(user_id) -> dict | None`**
Reactivate deactivated user account.

#### **`delete_user(user_id) -> bool`**
Delete user account.

#### **`count_users_with_role(role) -> int`**
Count users with specific role.

#### **`count_active_admins() -> int`**
Count active admin accounts.

---

## 📈 AnalyticsService ([analytics_service.py](analytics_service.py))

Handles aggregation pipelines and dashboard statistics.

### **Key Methods**

#### **`risk_by_industry() -> list[dict]`**
Average risk score per industry.

**Returns:**
```python
[
    {"industry": "healthcare", "avg_risk_score": 67.5, "breach_count": 45},
    {"industry": "finance", "avg_risk_score": 62.3, "breach_count": 38}
]
```

#### **`severity_breakdown() -> list[dict]`**
Breaches grouped by severity.

**Returns:**
```python
[
    {"severity": "critical", "count": 25, "percentage": 30.0},
    {"severity": "high", "count": 30, "percentage": 36.0}
]
```

#### **`monthly_trend(year) -> list[dict]`**
Time series of breaches per month.

**Parameters:**
- `year`: Filter by year (optional)

**Returns:**
```python
[
    {"month": 1, "year": 2024, "count": 12},
    {"month": 2, "year": 2024, "count": 15}
]
```

#### **`top_organisations(limit) -> list[dict]`**
Most affected organizations.

**Returns:**
```python
[
    {
        "organisation": "Acme Corp",
        "breach_count": 5,
        "industries": ["technology", "retail"]
    }
]
```

#### **`data_types_frequency() -> list[dict]`**
Most commonly exposed data types.

**Returns:**
```python
[
    {"data_type": "email", "count": 120},
    {"data_type": "password_hash", "count": 98}
]
```

#### **`remediation_rate() -> list[dict]`**
Completion rate of remediation actions.

**Returns:**
```python
[
    {"status": "completed", "count": 45, "percentage": 60.0},
    {"status": "in_progress", "count": 20, "percentage": 26.7}
]
```

#### **`alert_acknowledgement() -> list[dict]`**
Alert acknowledgement statistics.

**Returns:**
```python
[
    {
        "alert_type": "dark_web_mention",
        "total": 25,
        "acknowledged": 18,
        "percentage": 72.0
    }
]
```

#### **`summary() -> dict`**
Dashboard summary with all key metrics.

**Returns:**
```python
{
    "total_breaches": 250,
    "total_affected_accounts": 1500000,
    "average_risk_score": 65.4,
    "breaches_by_severity": {...},
    "recent_breaches": [...]
}
```

---

## 🧪 Testing Services

### **Unit Tests (with mocks)**

```python
from unittest.mock import Mock, patch
from app.services.breach_service import BreachService

def test_create_breach():
    service = BreachService()
    service.col = Mock()
    service.col.insert_one.return_value = Mock(inserted_id="123")

    breach = service.create(data, "user123")
    assert breach["_id"] == "123"
```

### **Integration Tests (with mongomock)**

```python
import mongomock
from app.services.breach_service import BreachService

@pytest.fixture
def mock_db():
    client = mongomock.MongoClient()
    return client.breachlens_test

def test_list_breaches(mock_db):
    service = BreachService()
    service.col = mock_db.breaches

    # Insert test data
    service.col.insert_one({"title": "Test", "severity": "high"})

    # Test
    breaches, total = service.list_breaches(page=1, limit=20)
    assert total == 1
    assert breaches[0]["title"] == "Test"
```

---

## 🔍 Database Indexes

Services ensure required indexes on startup:

```python
def ensure_indexes(self):
    """Create MongoDB indexes for optimal query performance."""
    self.col.create_index("email", unique=True)
    self.col.create_index("username", unique=True)
    self.col.create_index([("location", "2dsphere")])  # Geospatial
    self.col.create_index([("breach_date", -1)])       # Recent breaches
```

---

## 📝 Error Handling Pattern

Services return tuples for explicit error handling:

```python
def my_method(self, param) -> tuple[dict | None, str | None]:
    """
    Returns:
        (result, None) on success
        (None, error_message) on failure
    """
    if not param:
        return None, "Parameter is required"

    result = self.col.find_one({"field": param})
    if not result:
        return None, "Not found"

    return result, None
```

**Usage in routes:**
```python
result, error = service.my_method(param)
if error:
    return error_response(error), 404
return success_response(result), 200
```

---

## 📚 Related Documentation

- [Routes Documentation](../routes/README.md) - API endpoints
- [Models Documentation](../models/README.md) - Validation schemas
- [Utils Documentation](../utils/README.md) - Helper functions
