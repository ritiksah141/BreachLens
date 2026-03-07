# BreachLens Utilities

**Helper functions and utilities for BreachLens API.**

---

## 📁 Structure

```
utils/
├── validators.py      # Input validation & sanitization
├── response.py        # Response formatting helpers
├── geo_utils.py       # GeoJSON utilities
├── audit.py           # Audit logging
├── email.py           # Email sending utilities
└── logging_config.py  # Logging configuration
```

---

## 🎯 Overview

Utilities provide reusable helper functions used across routes, services, and models. They handle:

- Input validation and sanitization
- Response formatting
- GeoJSON transformations
- Audit logging
- Email notifications
- Logging configuration

---

## ✅ Validators ([validators.py](validators.py))

### **Validation Constants**

```python
ALLOWED_SEVERITIES = ["low", "medium", "high", "critical"]
ALLOWED_STATUSES = ["suspected", "confirmed", "resolved", "under_investigation"]
ALLOWED_INDUSTRIES = ["technology", "healthcare", "finance", "retail", "government", "education", "other"]
ALLOWED_ORG_SIZES = ["startup", "small", "medium", "large", "enterprise"]
ALLOWED_ROLES = ["admin", "analyst", "guest"]
ALLOWED_EVENT_TYPES = [
    "breach_occurred", "breach_discovered", "authorities_notified",
    "public_disclosure", "investigation_started", "investigation_closed",
    "remediation_started", "remediation_completed", "legal_action"
]
ALLOWED_REMEDIATION_STATUSES = ["pending", "in_progress", "completed", "failed"]
ALLOWED_ALERT_TYPES = [
    "reputation_monitor", "dark_web_mention", "credential_sale",
    "similar_attack", "regulatory"
]

MAX_RISK_SCORE = 100.0
MIN_RISK_SCORE = 0.0
```

### **Basic Validators**

#### **`is_valid_object_id(value: str) -> bool`**
Check if string is valid MongoDB ObjectId format (24 hex chars).

```python
from app.utils.validators import is_valid_object_id

if not is_valid_object_id(breach_id):
    return error_response("Invalid breach ID"), 400
```

#### **`is_valid_email(value: str) -> bool`**
Validate email format using regex.

```python
from app.utils.validators import is_valid_email

if not is_valid_email(email):
    errors.append("Invalid email format")
```

#### **`is_valid_domain(value: str) -> bool`**
Validate domain name format.

#### **`is_valid_url(value: str) -> bool`**
Validate URL format (http/https only).

#### **`is_valid_iso_date(value: Any) -> bool`**
Check if value is valid ISO 8601 datetime string.

#### **`parse_iso_date(value: str) -> datetime`**
Parse ISO 8601 string to Python datetime object.

```python
from app.utils.validators import parse_iso_date

breach_date = parse_iso_date("2024-03-15T10:30:00Z")
```

### **Complex Validators**

#### **`validate_breach_payload(data: dict, require_all: bool = True) -> list[str]`**
Validate complete breach document.

**Validates:**
- Title (3-200 chars)
- Description (max 5000 chars)
- Dates (ISO 8601, breach_date ≤ discovery_date)
- Severity, status, industry (enum values)
- Organisation (name, domain, size)
- Location (GeoJSON Point)
- Risk score (0-100)

**Returns:** List of error messages (empty = valid)

#### **`validate_geojson_point(location: Any) -> list[str]`**
Validate GeoJSON Point object.

**Example:**
```python
location = {
    "type": "Point",
    "coordinates": [-0.1278, 51.5074]  # [longitude, latitude]
}
errors = validate_geojson_point(location)
```

#### **`validate_affected_account(data: dict, require_all: bool = True) -> list[str]`**
Validate affected account sub-document.

#### **`validate_timeline_event(data: dict, require_all: bool = True) -> list[str]`**
Validate timeline event sub-document.

#### **`validate_remediation_action(data: dict, require_all: bool = True) -> list[str]`**
Validate remediation action sub-document.

#### **`validate_monitoring_alert(data: dict, require_all: bool = True) -> list[str]`**
Validate monitoring alert sub-document.

---

### **Security Functions**

#### **`sanitize_mongo_input(data: Any) -> Any`**
Remove MongoDB operators to prevent NoSQL injection.

**Removes:** `$ne`, `$gt`, `$gte`, `$lt`, `$lte`, `$in`, `$nin`, `$regex`, `$where`, `$exists`, etc.

```python
from app.utils.validators import sanitize_mongo_input

user_input = {"email": {"$ne": None}}  # Malicious input
sanitized = sanitize_mongo_input(user_input)
# Result: {"email": {}}
```

#### **`sanitize_query_params(params: dict) -> dict`**
Sanitize URL query parameters.

```python
from app.utils.validators import sanitize_query_params

params = {"severity": "critical", "page": "1"}
safe_params = sanitize_query_params(params)
```

#### **`safe_regex_query(pattern: str, field: str) -> dict`**
Escape regex special characters for safe text search.

```python
from app.utils.validators import safe_regex_query

search_term = "user@example.com"  # Contains special chars
query = safe_regex_query(search_term, "title")
# Result: {"title": {"$regex": "user@example\\.com", "$options": "i"}}
```

#### **`sanitize_html(value: str, strip_tags: bool = False) -> str`**
Sanitize HTML to prevent XSS attacks using Bleach library.

**Parameters:**
- `strip_tags=False`: Allow safe HTML tags (b, i, u, p, br, a)
- `strip_tags=True`: Strip all HTML tags

```python
from app.utils.validators import sanitize_html

unsafe = "<script>alert('XSS')</script><p>Safe content</p>"
safe = sanitize_html(unsafe)
# Result: "<p>Safe content</p>"
```

#### **`sanitize_breach_payload_html(data: dict) -> dict`**
Sanitize all text fields in breach payload.

**Fields sanitized:**
- title, description, notes
- Organisation.name
- Timeline event descriptions
- Remediation action descriptions

---

## 📄 Response Helpers ([response.py](response.py))

### **`success_response(data, message, metadata) -> dict`**
Build standardized success response.

```python
from app.utils.response import success_response

return success_response(
    data=breach_list,
    message="Breaches retrieved successfully",
    metadata={"page": 1, "limit": 20, "total": 100}
), 200
```

**Output:**
```json
{
    "status": "success",
    "data": [...],
    "message": "Breaches retrieved successfully",
    "metadata": {
        "page": 1,
        "limit": 20,
        "total": 100
    }
}
```

### **`error_response(message, errors, status_code) -> dict`**
Build standardized error response.

```python
from app.utils.response import error_response

return error_response(
    message="Validation failed",
    errors=["Field 'email' is required", "Invalid severity value"],
    status_code=422
), 422
```

**Output:**
```json
{
    "status": "error",
    "message": "Validation failed",
    "errors": [
        "Field 'email' is required",
        "Invalid severity value"
    ]
}
```

### **`MongoJSONEncoder`**
Custom JSON encoder for MongoDB ObjectIds and datetime objects.

**Features:**
- Converts `ObjectId` to string
- Converts `datetime` to ISO 8601 string
- Handles nested documents

```python
from app.utils.response import MongoJSONEncoder
import json

document = {"_id": ObjectId("507f1f77bcf86cd799439011"), "date": datetime.utcnow()}
json_str = json.dumps(document, cls=MongoJSONEncoder)
```

---

## 🗺️ GeoJSON Utilities ([geo_utils.py](geo_utils.py))

### **`validate_coordinates(lng: float, lat: float) -> list[str]`**
Validate longitude and latitude values.

**Validates:**
- Longitude: -180 to 180
- Latitude: -90 to 90
- Both are numeric

```python
from app.utils.geo_utils import validate_coordinates

errors = validate_coordinates(-0.1278, 51.5074)
if errors:
    return error_response("Invalid coordinates", errors), 400
```

### **`breach_to_geojson_feature(breach: dict) -> dict`**
Convert breach document to GeoJSON Feature.

```python
from app.utils.geo_utils import breach_to_geojson_feature

breach = {
    "_id": "507f...",
    "title": "Acme Breach",
    "severity": "critical",
    "location": {"type": "Point", "coordinates": [-0.1278, 51.5074]}
}

feature = breach_to_geojson_feature(breach)
```

**Output:**
```json
{
    "type": "Feature",
    "geometry": {
        "type": "Point",
        "coordinates": [-0.1278, 51.5074]
    },
    "properties": {
        "breach_id": "507f...",
        "title": "Acme Breach",
        "severity": "critical",
        "status": "confirmed",
        "breach_date": "2024-01-15T10:00:00Z"
    }
}
```

### **`breaches_to_feature_collection(breaches: list[dict]) -> dict`**
Convert list of breaches to GeoJSON FeatureCollection.

```python
from app.utils.geo_utils import breaches_to_feature_collection

breaches = [breach1, breach2, breach3]
collection = breaches_to_feature_collection(breaches)
```

**Output:**
```json
{
    "type": "FeatureCollection",
    "features": [
        {"type": "Feature", ...},
        {"type": "Feature", ...}
    ]
}
```

---

## 📝 Audit Logging ([audit.py](audit.py))

### **`AuditLogger`**

Structured logging for security and compliance.

#### **Methods**

##### **`log(action, user_id, target, details, metadata, level)`**
Log an audit event.

```python
from app.utils.audit import AuditLogger

logger = AuditLogger()
logger.log(
    action="breach_created",
    user_id=g.user_id,
    target="breach:507f...",
    details="Created new breach: Acme Corp",
    metadata={"severity": "critical"},
    level="INFO"
)
```

**Log Output (JSON):**
```json
{
    "timestamp": "2024-03-15T10:30:45Z",
    "level": "INFO",
    "action": "breach_created",
    "user_id": "user123",
    "username": "john_doe",
    "user_role": "analyst",
    "target": "breach:507f...",
    "details": "Created new breach: Acme Corp",
    "metadata": {"severity": "critical"},
    "request_id": "550e8400-..."
}
```

### **Decorator Functions**

#### **`@audit_log(action, include_response=False)`**
Decorator to automatically log route actions.

```python
from app.utils.audit import audit_log

@breaches_bp.route("/<breach_id>", methods=["DELETE"])
@jwt_required
@admin_required
@audit_log("breach_deleted", include_response=True)
def delete_breach(breach_id):
    # Automatically logs action
    pass
```

#### **`log_auth_event(action, user_id, success, details, metadata)`**
Log authentication event.

```python
from app.utils.audit import log_auth_event

log_auth_event(
    action="login",
    user_id=user["_id"],
    success=True,
    details=f"User {email} logged in",
    metadata={"ip": request.remote_addr}
)
```

#### **`log_security_event(action, severity, details, metadata)`**
Log security event (failed logins, lockouts, etc.).

```python
from app.utils.audit import log_security_event

log_security_event(
    action="account_locked",
    severity="WARNING",
    details=f"Account {email} locked after 5 failed attempts",
    metadata={"email": email}
)
```

---

## 📧 Email Utilities ([email.py](email.py))

### **`send_email(to, subject, html_body, plain_body) -> bool`**
Send email via SMTP.

**Configuration (environment variables):**
```bash
SMTP_SERVER=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email@gmail.com
SMTP_PASSWORD=your-app-password
```

```python
from app.utils.email import send_email

success = send_email(
    to="user@example.com",
    subject="Password Reset",
    html_body="<p>Click link to reset: ...</p>",
    plain_body="Click link to reset: ..."
)
```

### **`send_password_reset_email(to, reset_token, base_url) -> bool`**
Send password reset email with link.

```python
from app.utils.email import send_password_reset_email

success = send_password_reset_email(
    to="user@example.com",
    reset_token="abc123...",
    base_url="http://localhost:4200"
)
```

### **`send_breach_alert_email(to, breach_title, breach_id, severity) -> bool`**
Send breach notification email.

```python
from app.utils.email import send_breach_alert_email

success = send_breach_alert_email(
    to="admin@example.com",
    breach_title="Acme Corp Data Breach",
    breach_id="507f...",
    severity="critical"
)
```

---

## 🔧 Logging Configuration ([logging_config.py](logging_config.py))

### **`configure_logging(app_config)`**
Configure structured JSON logging.

**Features:**
- JSON format for log aggregation
- Request ID tracking
- File and console outputs
- Configurable log levels

```python
from app.utils.logging_config import configure_logging

configure_logging(app.config)
```

**Log Files:**
- `logs/app.log` - Application logs
- `logs/audit.log` - Audit trail

---

## 🧪 Testing Utilities

```python
from app.utils.validators import sanitize_mongo_input

def test_sanitize_mongo_input():
    malicious = {"email": {"$ne": None}}
    sanitized = sanitize_mongo_input(malicious)
    assert "$ne" not in str(sanitized)

def test_validate_email():
    assert is_valid_email("valid@example.com") == True
    assert is_valid_email("invalid") == False
```

---

## 📚 Related Documentation

- [Models Documentation](../models/README.md) - Uses validators extensively
- [Services Documentation](../services/README.md) - Uses response helpers
- [Middleware Documentation](../middleware/README.md) - Uses audit logging
- [Routes Documentation](../routes/README.md) - Uses all utilities
