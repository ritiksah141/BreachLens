# BreachLens API Routes

**REST API blueprints for all BreachLens endpoints.**

---

## 📁 Structure

```
routes/
├── __init__.py       # Package marker
├── auth.py           # Authentication endpoints (5 routes)
├── breaches.py       # Breach CRUD + geospatial (22 routes)
├── analytics.py      # Aggregation pipelines (10 routes)
├── users.py          # User management (7 routes)
├── admin.py          # Admin operations (6 routes)
└── health.py         # Health checks (3 routes)
```

---

## 🎯 Route Modules

### **1. Authentication Routes** ([auth.py](auth.py))

**Blueprint**: `auth_bp` + `login_bp`
**Prefix**: `/api/v1/auth`, `/api/v1`

**8 endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | None |
| POST | `/auth/login` | Login with JSON body | None |
| GET | `/auth/login` | Login via Basic Auth (alias) | Basic |
| POST | `/auth/logout` | Logout (blacklist token) | JWT |
| GET | `/auth/me` | Get current user profile | JWT |
| POST | `/auth/request-password-reset` | Request password reset | None |
| POST | `/auth/reset-password` | Reset password with token | None |
| GET | `/login` | Login via HTTP Basic Auth | Basic |

**Key Features:**
- JWT token generation and validation
- Password hashing with BCrypt
- Account lockout after 5 failed attempts
- Token blacklisting on logout
- HTTP Basic Auth support (COM661 requirement)

---

### **2. Breach Routes** ([breaches.py](breaches.py))

**Blueprint**: `breaches_bp`
**Prefix**: `/api/v1/breaches`

**32 endpoints total:**

#### **Main CRUD Operations** (7 endpoints)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/` | List all breaches (paginated) | None | Public |
| POST | `/` | Create breach | JWT | Analyst/Admin |
| GET | `/{id}` | Get single breach | None | Public |
| PUT | `/{id}` | Full update breach | JWT | Analyst/Admin |
| PATCH | `/{id}` | Partial update breach | JWT | Analyst/Admin |
| DELETE | `/{id}` | Delete breach | JWT | Admin |
| GET | `/exposure-check` | Check email/domain exposure | None | Public |

#### **Sub-document Routes (20 endpoints)**

**Affected Accounts** (`/breaches/{id}/accounts/*`)
- GET - List all accounts
- GET `/{account_id}` - Get single account
- POST - Add account
- PATCH `/{account_id}` - Update account
- DELETE `/{account_id}` - Delete account

**Timeline Events** (`/breaches/{id}/timeline/*`)
- GET - List all events
- GET `/{event_id}` - Get single event
- POST - Add event
- PATCH `/{event_id}` - Update event
- DELETE `/{event_id}` - Delete event

**Remediation Actions** (`/breaches/{id}/remediation/*`)
- GET - List all actions
- GET `/{action_id}` - Get single action
- POST - Add action
- PATCH `/{action_id}` - Update action
- DELETE `/{action_id}` - Delete action

**Monitoring Alerts** (`/breaches/{id}/alerts/*`)
- GET - List all alerts
- GET `/{alert_id}` - Get single alert
- POST - Create alert
- PATCH `/{alert_id}` - Update alert
- DELETE `/{alert_id}` - Delete alert

#### **Geospatial Routes**

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/geo/near` | Find breaches near coordinates | `lng`, `lat`, `radius` (meters) |
| GET | `/geo/within-bounds` | Bounding box search | `min_lng`, `min_lat`, `max_lng`, `max_lat` |
| GET | `/geo/geojson` | GeoJSON FeatureCollection | `severity`, `industry` (optional filters) |

**Key Features:**
- Pagination support (default: 20 per page)
- Filtering by severity, status, industry
- Text search on title/description
- Date range filtering
- Ownership checks (analysts can only modify own breaches)
- MongoDB geospatial queries (2dsphere index)

---

### **3. Analytics Routes** ([analytics.py](analytics.py))

**Blueprint**: `analytics_bp`
**Prefix**: `/api/v1/analytics`

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| GET | `/risk-by-industry` | Risk scores grouped by industry | Array of {industry, avg_risk, breach_count} |
| GET | `/severity-breakdown` | Breaches grouped by severity | Array of {severity, count, percentage} |
| GET | `/monthly-trend` | Time series of breaches | Array of {month, year, count} |
| GET | `/top-organisations` | Most affected organizations | Array of {org, count, industries} |
| GET | `/data-types-frequency` | Most exposed data types | Array of {data_type, count} |
| GET | `/remediation-rate` | Completion rate of actions | Array of {status, count, percentage} |
| GET | `/alert-acknowledgement` | Alert statistics | Array of {type, total, acknowledged} |
| GET | `/industry-year-trend` | Industry trends over time | Array of {industry, year, count} |
| GET | `/risk-scores` | Risk score distribution | Array of {range, count} |
| GET | `/summary` | Dashboard summary | Object with all key metrics |

**Key Features:**
- MongoDB aggregation pipelines
- Real-time calculations (no caching)
- Optional filtering by year, industry
- Percentages automatically calculated

---

### **4. User Routes** ([users.py](users.py))

**Blueprint**: `users_bp`
**Prefix**: `/api/v1/users`

**4 endpoints:**

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/` | List all users | JWT | Admin |
| GET | `/{user_id}` | Get user profile | JWT | Self/Admin |
| PATCH | `/{user_id}` | Update user profile | JWT | Self/Admin |
| DELETE | `/{user_id}` | Delete user account | JWT | Self/Admin |

**Key Features:**
- Users can only view/edit their own profile
- Admins can manage all users
- Cannot delete last active admin
- Cannot change own role (prevents privilege escalation)
- Password updates require current password

---

### **5. Admin Routes** ([admin.py](admin.py))

**Blueprint**: `admin_bp`
**Prefix**: `/api/v1/admin`

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| GET | `/stats` | System statistics | User counts, breach counts, storage |
| PATCH | `/users/{user_id}/role` | Change user role | Updated user object |
| GET | `/users` | List all users (admin view) | Paginated user list |
| PATCH | `/users/{user_id}/activate` | Activate user account | Updated user object |
| PATCH | `/users/{user_id}/deactivate` | Deactivate user account | Updated user object |
| DELETE | `/breaches/bulk` | Bulk delete breaches | {deleted_count, failed_ids} |

**Key Features:**
- All routes require admin role
- Cannot demote last active admin
- Cannot deactivate last active admin
- Atomic operations for safety
- Audit logging for all admin actions

---

### **6. Health Routes** ([health.py](health.py))

**Blueprint**: `health_bp`
**Prefix**: `/api/v1/health`

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| GET | `/` | Basic health check | {status: "ok"} |
| GET | `/ready` | Readiness probe (DB check) | {status, db} |
| GET | `/live` | Liveness probe | {status: "ok"} |

**Key Features:**
- Kubernetes-compatible health checks
- Database connectivity validation
- 503 status on DB unavailable

---

## 🔒 Authentication & Authorization

### **Authentication Decorators**

```python
from app.middleware.auth_middleware import jwt_required, admin_required, require_role

@breaches_bp.route("/", methods=["POST"])
@jwt_required
@require_role("analyst", "admin")
def create_breach():
    # Only analysts and admins can create breaches
    pass
```

### **Available Decorators**
- `@jwt_required` - Requires valid JWT token
- `@admin_required` - Requires JWT + admin role
- `@require_role(*roles)` - Requires JWT + one of specified roles

### **Current User Context**

```python
from flask import g

@jwt_required
def my_route():
    user_id = g.user_id        # MongoDB ObjectId string
    user_role = g.user_role    # "admin", "analyst", or "guest"
    username = g.username      # Username string
```

---

## 📊 Response Format

### **Success Response**
```json
{
  "status": "success",
  "data": { ... },
  "message": "Operation completed successfully",
  "metadata": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

### **Error Response**
```json
{
  "status": "error",
  "message": "Invalid input",
  "errors": ["Field 'email' is required", "Invalid severity value"]
}
```

---

## 🛡️ Security Features

### **Rate Limiting**

Routes are protected with Flask-Limiter:

```python
@auth_bp.route("/login", methods=["POST"])
@limiter.limit("5 per 15 minutes")
def login():
    # Limited to 5 login attempts per 15 minutes
    pass
```

### **Input Sanitization**

All user input is sanitized in services:
- NoSQL injection prevention (strip `$` operators)
- HTML/XSS sanitization via Bleach
- Regex escaping for text search

### **CORS**

Configured for Angular frontend:
- Allowed origins: `http://localhost:4200`
- Methods: GET, POST, PUT, PATCH, DELETE
- Headers: Content-Type, Authorization, x-access-token

---

## 🧪 Testing Routes

### **Using cURL**

```bash
# Public endpoint (no auth)
curl http://localhost:5001/api/v1/breaches

# Authenticated endpoint
TOKEN="your-jwt-token"
curl -H "x-access-token: $TOKEN" http://localhost:5001/api/v1/auth/me

# Create breach
curl -X POST http://localhost:5001/api/v1/breaches \
  -H "x-access-token: $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"title": "Test Breach", "severity": "high", ...}'
```

### **Using Postman**

Import collection from: `backend/postman/BreachLens.postman_collection.json`

---

## 📝 Adding a New Route

1. **Define the route in appropriate blueprint:**

```python
@breaches_bp.route("/my-endpoint", methods=["GET"])
@jwt_required
def my_endpoint():
    # Implementation
    pass
```

2. **Add business logic to service:**

```python
# In services/breach_service.py
def my_service_method(self, param):
    result = self.col.find_one({"field": param})
    return result
```

3. **Add tests:**

```python
# In tests/test_breaches.py
def test_my_endpoint(client, auth_admin_headers):
    response = client.get("/api/v1/breaches/my-endpoint", headers=auth_admin_headers)
    assert response.status_code == 200
```

4. **Update Swagger documentation:**

```python
"""
My Endpoint
---
tags:
  - breaches
responses:
  200:
    description: Success
"""
```

---

## 🔍 Route Discovery

To see all registered routes:

```bash
# From backend directory
python -c "from app import create_app; app = create_app(); print('\\n'.join(str(rule) for rule in app.url_map.iter_rules()))"
```

---

## 📚 Related Documentation

- [Services Documentation](../services/README.md) - Business logic layer
- [Models Documentation](../models/README.md) - Validation schemas
- [Middleware Documentation](../middleware/README.md) - Auth & logging
- [API Specification](../../../docs/API_SPEC.md) - Complete API docs
