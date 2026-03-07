# BreachLens Data Models

**Validation schemas for MongoDB documents.**

---

## 📁 Structure

```
models/
├── __init__.py       # Package marker
├── breach.py         # Breach validation schemas (5 classes)
└── user.py           # User validation schema (1 class)
```

---

## 🎯 Overview

Models provide **schema validation** for MongoDB documents. Unlike SQL ORMs, these are not database models but validation schemas that:

- Define required fields
- Validate data types and formats
- Enforce business rules
- Sanitize user input
- Build MongoDB documents

**Design Philosophy:**
- ✅ Thin routes: validation happens in models, not routes
- ✅ Reusable: schemas used in both routes and services
- ✅ Centralized: all validation logic in one place
- ✅ Type-safe: strict type checking and format validation

---

## 📄 User Schema ([user.py](user.py))

### **UserSchema**

Validates user registration and profile updates.

#### **Class Attributes**

```python
REQUIRED_FIELDS = ["username", "email", "password"]
ALLOWED_ROLES = ["admin", "analyst", "guest"]
SELF_REGISTER_ROLES = ["guest", "analyst"]  # Admins must be promoted
```

#### **Methods**

##### **`validate_registration(data: dict) -> list[str]`**
Validates user registration payload.

**Validates:**
- ✅ Username: 3-30 chars, alphanumeric + underscore only
- ✅ Email: valid format, max 254 chars
- ✅ Password: min 8 chars, 1 uppercase, 1 digit
- ✅ Role: must be 'guest' or 'analyst' (no self-promotion to admin)

**Returns:** List of error messages (empty = valid)

**Example:**
```python
from app.models.user import UserSchema

data = {"username": "john_doe", "email": "john@example.com", "password": "Secret123"}  # pragma: allowlist secret
errors = UserSchema.validate_registration(data)

if errors:
    return {"status": "error", "errors": errors}, 422
```

##### **`validate_update(data: dict, allow_role_change: bool = False) -> list[str]`**
Validates profile update payload.

**Validates:**
- ✅ Email: optional, valid format if provided
- ✅ Username: optional, correct format if provided
- ✅ Password: optional, meets requirements if provided
- ✅ Role: only if `allow_role_change=True` (admin action)

**Example:**
```python
update_data = {"email": "newemail@example.com"}
errors = UserSchema.validate_update(update_data)
```

##### **`to_document(data: dict, hashed_password: str) -> dict`**
Builds a sanitized MongoDB document ready for insertion.

**Returns:**
```python
{
    "username": "john_doe",
    "email": "john@example.com",
    "password_hash": "...",  # BCrypt hash
    "role": "analyst",
    "is_active": True,
    "failed_login_attempts": 0,
    "lockout_until": None,
    "created_at": datetime.utcnow(),
    "updated_at": datetime.utcnow()
}
```

---

## 📊 Breach Schemas ([breach.py](breach.py))

### **1. BreachSchema**

Main breach document validation.

#### **Class Attributes**

```python
REQUIRED_FIELDS = [
    "title", "description", "breach_date", "discovery_date",
    "severity", "status", "organisation", "location"
]

ALLOWED_SEVERITIES = ["low", "medium", "high", "critical"]
ALLOWED_STATUSES = ["suspected", "confirmed", "resolved", "under_investigation"]
```

#### **Methods**

##### **`validate(data: dict, require_all: bool = True) -> list[str]`**
Validates breach payload.

**Validates:**
- ✅ Title: 3-200 chars
- ✅ Description: max 5000 chars
- ✅ Dates: ISO 8601 format, breach_date ≤ discovery_date
- ✅ Severity: one of allowed values
- ✅ Status: one of allowed values
- ✅ Organisation: name, domain, industry, size
- ✅ Location: GeoJSON Point with valid coordinates
- ✅ Data types, actors, risk score (optional fields)

**Example:**
```python
from app.models.breach import BreachSchema

data = {
    "title": "Acme Corp Breach",
    "description": "SQL injection attack",
    "breach_date": "2024-01-15T10:00:00Z",
    "discovery_date": "2024-01-20T14:00:00Z",
    "severity": "critical",
    "status": "confirmed",
    "organisation": {
        "name": "Acme Corp",
        "domain": "acme.com",
        "industry": "technology",
        "size": "large"
    },
    "location": {
        "type": "Point",
        "coordinates": [-0.1278, 51.5074],
        "country": "United Kingdom",
        "city": "London"
    }
}

errors = BreachSchema.validate(data)
```

##### **`to_document(data: dict, created_by: str) -> dict`**
Builds MongoDB document with computed fields.

**Adds:**
- `created_by`: user ID
- `created_at`, `updated_at`: timestamps
- `risk_score`: computed from severity, data types, account count
- Sanitized HTML in text fields
- Empty arrays for sub-documents

---

### **2. AffectedAccountSchema**

Validates individual affected account records.

#### **Required Fields**
- `email` or `username` (at least one)
- `exposure_date`: ISO 8601 datetime
- `data_exposed`: array of strings (e.g., ["email", "password_hash"])

#### **Methods**

##### **`validate(data: dict, require_all: bool = True) -> list[str]`**

**Validates:**
- ✅ Email: valid format if provided
- ✅ Username: max 200 chars
- ✅ Exposure date: valid ISO 8601, not in future
- ✅ Data exposed: array of strings

**Example:**
```python
from app.models.breach import AffectedAccountSchema

account = {
    "email": "victim@example.com",
    "username": "victim123",
    "exposure_date": "2024-01-15T10:00:00Z",
    "data_exposed": ["email", "password_hash", "name", "phone"]
}

errors = AffectedAccountSchema.validate(account)
```

##### **`to_document(data: dict) -> dict`**
Builds account document with generated ID.

---

### **3. TimelineEventSchema**

Validates breach timeline events.

#### **Required Fields**
- `event_date`: ISO 8601 datetime
- `event_type`: enum value
- `description`: event details

#### **Allowed Event Types**
- `breach_occurred`
- `breach_discovered`
- `authorities_notified`
- `public_disclosure`
- `investigation_started`
- `investigation_closed`
- `remediation_started`
- `remediation_completed`
- `legal_action`

#### **Methods**

##### **`validate(data: dict, require_all: bool = True) -> list[str]`**

**Validates:**
- ✅ Event date: valid ISO 8601, not in future
- ✅ Event type: one of allowed values
- ✅ Description: 1-1000 chars
- ✅ Actor: max 200 chars (optional)
- ✅ Details: max 5000 chars (optional)

---

### **4. RemediationActionSchema**

Validates remediation actions.

#### **Required Fields**
- `action_type`: e.g., "password_reset", "patch_applied", "notification_sent"
- `description`: action details
- `status`: "pending", "in_progress", "completed", "failed"
- `due_date`: ISO 8601 datetime (optional)

#### **Methods**

##### **`validate(data: dict, require_all: bool = True) -> list[str]`**

**Validates:**
- ✅ Action type: 1-100 chars
- ✅ Description: 1-1000 chars
- ✅ Status: one of allowed values
- ✅ Due date: valid ISO 8601 if provided
- ✅ Assigned to: valid email format

---

### **5. MonitoringAlertSchema**

Validates monitoring/threat alerts.

#### **Required Fields**
- `alert_type`: "reputation_monitor", "dark_web_mention", "credential_sale", "similar_attack", "regulatory"
- `alert_date`: ISO 8601 datetime
- `source`: alert source/platform

#### **Methods**

##### **`validate(data: dict, require_all: bool = True) -> list[str]`**

**Validates:**
- ✅ Alert type: one of allowed values
- ✅ Alert date: valid ISO 8601, not in future
- ✅ Source: 1-200 chars
- ✅ Details: max 5000 chars (optional)
- ✅ URL: valid format if provided

---

## 🛡️ Security Features

### **Input Sanitization**

All schemas include built-in sanitization:

```python
from app.utils.validators import sanitize_html, sanitize_mongo_input

# Prevent NoSQL injection
data = sanitize_mongo_input(data)  # Removes $operators

# Prevent XSS
description = sanitize_html(data.get("description"))  # Strips dangerous HTML
```

### **Maximum Lengths**

Fields have maximum byte lengths to prevent DoS:

```python
_MAX_USERNAME_LEN = 200
_MAX_ACTOR_LEN = 200
_MAX_DETAILS_LEN = 5000
_MAX_PASSWORD_LEN = 128  # BCrypt DoS prevention
```

---

## 📊 Usage Patterns

### **In Routes (Validation)**

```python
from app.models.breach import BreachSchema
from app.utils.response import error_response, success_response

@breaches_bp.route("/", methods=["POST"])
@jwt_required
def create_breach():
    data = request.get_json()

    # Validate
    errors = BreachSchema.validate(data)
    if errors:
        return error_response("Validation failed", errors=errors), 422

    # Business logic in service
    breach = BreachService().create(data, g.user_id)
    return success_response(breach, "Breach created"), 201
```

### **In Services (Document Building)**

```python
from app.models.breach import BreachSchema

class BreachService:
    def create(self, data: dict, created_by: str) -> dict:
        # Build document
        document = BreachSchema.to_document(data, created_by)

        # Insert
        result = self.col.insert_one(document)
        document["_id"] = str(result.inserted_id)
        return document
```

---

## 🔍 Validation Constants

Centralized in [app/utils/validators.py](../utils/validators.py):

```python
ALLOWED_SEVERITIES = ["low", "medium", "high", "critical"]
ALLOWED_STATUSES = ["suspected", "confirmed", "resolved", "under_investigation"]
ALLOWED_INDUSTRIES = ["technology", "healthcare", "finance", "retail", "government", "education", "other"]
ALLOWED_ROLES = ["admin", "analyst", "guest"]
ALLOWED_EVENT_TYPES = ["breach_occurred", "breach_discovered", ...]
ALLOWED_REMEDIATION_STATUSES = ["pending", "in_progress", "completed", "failed"]
ALLOWED_ALERT_TYPES = ["reputation_monitor", "dark_web_mention", ...]
```

---

## 🧪 Testing Models

```python
from app.models.breach import BreachSchema

def test_breach_validation():
    # Valid data
    data = {...}
    errors = BreachSchema.validate(data)
    assert errors == []

    # Invalid severity
    data["severity"] = "invalid"
    errors = BreachSchema.validate(data)
    assert "Invalid severity" in errors[0]
```

---

## 📝 Adding a New Schema

1. **Define the schema class:**

```python
class MyNewSchema:
    REQUIRED_FIELDS = ["field1", "field2"]

    @classmethod
    def validate(cls, data: dict, require_all: bool = True) -> list[str]:
        errors = []
        # Validation logic
        return errors

    @classmethod
    def to_document(cls, data: dict) -> dict:
        return {
            "field1": data["field1"],
            "field2": data["field2"],
            "created_at": datetime.utcnow()
        }
```

2. **Add validators to utils/validators.py if needed**

3. **Write tests in tests/test_models.py**

---

## 📚 Related Documentation

- [Utils Documentation](../utils/README.md) - Validation helper functions
- [Services Documentation](../services/README.md) - Business logic layer
- [Routes Documentation](../routes/README.md) - API endpoints
