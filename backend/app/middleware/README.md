# BreachLens Middleware

**Request/response middleware for authentication, logging, and security.**

---

## 📁 Structure

```
middleware/
├── auth_middleware.py     # JWT authentication & RBAC decorators
├── request_logging.py     # Request/response logging
└── security_headers.py    # Security headers (CSP, HSTS, etc.)
```

---

## 🎯 Overview

Middleware handles cross-cutting concerns that apply to multiple routes:

- **Authentication**: JWT token validation
- **Authorization**: Role-based access control (RBAC)
- **Logging**: Request/response logging with audit trail
- **Security**: HTTP security headers

---

## 🔐 Authentication Middleware ([auth_middleware.py](auth_middleware.py))

### **JWT Authentication**

Provides decorators for protecting routes with JWT tokens.

#### **`@jwt_required`**

Requires a valid JWT token in the request.

**Token Sources** (checked in order):
1. `x-access-token` header (primary)
2. HTTP Basic Auth (fallback for COM661 requirement)

**Usage:**
```python
from app.middleware.auth_middleware import jwt_required

@breaches_bp.route("/", methods=["POST"])
@jwt_required
def create_breach():
    # Access current user via Flask g object
    user_id = g.user_id        # MongoDB ObjectId string
    user_role = g.user_role    # "admin", "analyst", or "guest"
    username = g.username      # Username string
```

**Features:**
- Token validation with PyJWT
- Token blacklist check (supports logout)
- Expired token detection (401 response)
- Invalid token detection (401 response)
- Populates Flask `g` object with user context

**Response on Failure:**
```json
{
    "status": "error",
    "message": "Missing or invalid token"
}
```
**HTTP Status:** 401 Unauthorized

---

#### **`@admin_required`**

Requires JWT token + admin role.

**Usage:**
```python
from app.middleware.auth_middleware import admin_required

@admin_bp.route("/stats", methods=["GET"])
@admin_required
def get_admin_stats():
    # Only admins can access
    pass
```

**Features:**
- Combines JWT validation + role check
- Returns 403 if user is not admin
- Automatically includes `@jwt_required`

**Response on Failure:**
```json
{
    "status": "error",
    "message": "Admin access required"
}
```
**HTTP Status:** 403 Forbidden

---

#### **`@require_role(*roles)`**

Requires JWT token + one of specified roles.

**Usage:**
```python
from app.middleware.auth_middleware import require_role

@breaches_bp.route("/", methods=["POST"])
@jwt_required
@require_role("analyst", "admin")
def create_breach():
    # Both analysts and admins can create breaches
    pass
```

**Parameters:**
- `*roles`: Variable number of allowed roles (e.g., "admin", "analyst", "guest")

**Response on Failure:**
```json
{
    "status": "error",
    "message": "Insufficient permissions. Required roles: analyst, admin"
}
```
**HTTP Status:** 403 Forbidden

---

### **HTTP Basic Auth (Fallback)**

Supports HTTP Basic Authentication for COM661 module requirement.

**How it works:**
1. If no JWT token found, attempt Basic Auth
2. Extract credentials from `Authorization: Basic <base64>` header
3. Verify email + password against database
4. Populate `g` object same as JWT

**Usage:**
```bash
# Using cURL
curl -u "user@example.com:password123" http://localhost:5001/api/v1/login
```

**Note:** Basic Auth is only checked if JWT token is missing. JWT is preferred.

---

### **Token Blacklisting**

Supports logout functionality by blacklisting tokens.

**How it works:**
1. On logout, token added to `blacklist` collection in MongoDB
2. On subsequent requests, middleware checks if token is blacklisted
3. Blacklisted tokens return 401 Unauthorized

**Implementation:**
```python
def _check_blacklist(token: str) -> bool:
    """Check if token has been blacklisted (logout)."""
    from app.extensions import mongo
    return mongo.db.blacklist.find_one({"token": token}) is not None
```

---

### **Utility Functions**

#### **`is_valid_object_id(value: str) -> bool`**

Validate MongoDB ObjectId format.

**Usage:**
```python
from app.middleware.auth_middleware import is_valid_object_id

if not is_valid_object_id(breach_id):
    return error_response("Invalid breach ID"), 400
```

---

## 📊 Request Logging Middleware ([request_logging.py](request_logging.py))

Logs all incoming requests and outgoing responses.

### **Initialization**

```python
from app.middleware.request_logging import init_request_logging

app = Flask(__name__)
init_request_logging(app)
```

### **Logged Information**

#### **Before Request:**
- HTTP method (GET, POST, etc.)
- Request path
- Client IP address (anonymized by default)
- User agent
- Request ID (UUID)

#### **After Request:**
- Response status code
- Response size (bytes)
- Request duration (milliseconds)

### **Log Format (JSON)**

```json
{
    "timestamp": "2024-03-15T10:30:45.123Z",
    "level": "INFO",
    "request_id": "550e8400-e29b-41d4-a716-446655440000",
    "method": "POST",
    "path": "/api/v1/breaches",
    "ip": "a1b2c3d4e5f6g7h8i9j0",
    "user_agent": "Mozilla/5.0...",
    "status": 201,
    "duration_ms": 45,
    "size_bytes": 1234
}
```

### **IP Anonymization**

Protects user privacy by hashing IP addresses.

**Configuration:**
```python
# config.py
REQUEST_IP_POLICY = "anonymize"  # Options: "full", "anonymize", "none"
IP_ANONYMIZATION_SALT = "your-secret-salt"
```

**How it works:**
```python
import hashlib

def anonymize_ip(ip: str) -> str:
    """Hash IP address for privacy."""
    salt = app.config.get("IP_ANONYMIZATION_SALT", "")
    return hashlib.sha256(f"{ip}{salt}".encode()).hexdigest()[:32]
```

---

## 🛡️ Security Headers Middleware ([security_headers.py](security_headers.py))

Adds HTTP security headers to all responses.

### **Initialization**

```python
from app.middleware.security_headers import init_security_headers

app = Flask(__name__)
init_security_headers(app)
```

### **Headers Added**

| Header | Value | Purpose |
|--------|-------|---------|
| `Content-Security-Policy` | `default-src 'self'` | Prevent XSS attacks |
| `X-Content-Type-Options` | `nosniff` | Prevent MIME type sniffing |
| `X-Frame-Options` | `DENY` | Prevent clickjacking |
| `X-XSS-Protection` | `1; mode=block` | Enable browser XSS filter |
| `Strict-Transport-Security` | `max-age=31536000; includeSubDomains` | Force HTTPS (production) |
| `Referrer-Policy` | `no-referrer` | Protect referrer information |
| `Permissions-Policy` | `geolocation=(), microphone=(), camera=()` | Disable unnecessary APIs |

### **Implementation**

```python
def init_security_headers(app: Flask) -> None:
    """Add security headers to all responses."""

    @app.after_request
    def add_security_headers(response):
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "no-referrer"

        # HSTS only in production
        if not app.debug:
            response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"

        return response
```

---

## 🔍 Middleware Execution Order

1. **Security Headers** - Applied to all responses
2. **Request Logging (Before)** - Log incoming request
3. **Authentication** - Validate JWT token (if decorator present)
4. **Authorization** - Check user role (if decorator present)
5. **Route Handler** - Execute route function
6. **Request Logging (After)** - Log response
7. **Security Headers (After)** - Add headers to response

---

## 🧪 Testing Middleware

### **Testing JWT Authentication**

```python
def test_jwt_required(client):
    # Without token
    response = client.get("/api/v1/auth/me")
    assert response.status_code == 401

    # With valid token
    headers = {"x-access-token": "valid-jwt-token"}
    response = client.get("/api/v1/auth/me", headers=headers)
    assert response.status_code == 200
```

### **Testing RBAC**

```python
def test_admin_required(client, auth_analyst_headers):
    # Analyst trying to access admin endpoint
    response = client.get("/api/v1/admin/stats", headers=auth_analyst_headers)
    assert response.status_code == 403
    assert "Admin access required" in response.json["message"]
```

### **Testing Security Headers**

```python
def test_security_headers(client):
    response = client.get("/health")
    assert response.headers["X-Content-Type-Options"] == "nosniff"
    assert response.headers["X-Frame-Options"] == "DENY"
    assert "Content-Security-Policy" in response.headers
```

---

## 📝 Customization

### **Adding a New Decorator**

```python
from functools import wraps
from flask import g

def require_self_or_admin(f):
    """Require user to be accessing own resource or be admin."""
    @wraps(f)
    def decorated_function(*args, **kwargs):
        target_user_id = kwargs.get("user_id")

        if g.user_role != "admin" and g.user_id != target_user_id:
            return jsonify({
                "status": "error",
                "message": "You can only access your own data"
            }), 403

        return f(*args, **kwargs)
    return decorated_function
```

**Usage:**
```python
@users_bp.route("/<user_id>", methods=["GET"])
@jwt_required
@require_self_or_admin
def get_user(user_id):
    # User can only view own profile unless admin
    pass
```

---

## 🔒 Security Best Practices

### **✅ DO:**
- Always use `@jwt_required` for protected routes
- Use `@require_role(...)` for fine-grained access control
- Check ownership in routes (analysts can only edit own breaches)
- Log security events (failed logins, unauthorized access)
- Sanitize user input before processing

### **❌ DON'T:**
- Don't store sensitive data in JWT payload
- Don't hardcode secret keys
- Don't skip token validation for "trusted" clients
- Don't expose error details in production
- Don't trust client-provided user IDs without verification

---

## 📚 Related Documentation

- [Routes Documentation](../routes/README.md) - API endpoints using middleware
- [Services Documentation](../services/README.md) - Business logic layer
- [Utils Documentation](../utils/README.md) - Helper functions
- [Backend README](../../README.md) - Complete API specification, authentication flow, database architecture
