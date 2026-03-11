# BreachLens System Architecture
## **How Everything is Connected**

**Module:** COM661 Full Stack Strategies and Development
**Purpose:** Academic Presentation - System Integration & Architecture
**Author:** Ritik Sah
**Date:** March 11, 2026

---

## 📋 Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [System Architecture Overview](#2-system-architecture-overview)
3. [Layered Architecture Pattern](#3-layered-architecture-pattern)
4. [Request-Response Flow](#4-request-response-flow)
5. [Component Integration Map](#5-component-integration-map)
6. [Data Flow Architecture](#6-data-flow-architecture)
7. [Design Patterns & Principles](#7-design-patterns--principles)
8. [Security Architecture](#8-security-architecture)
9. [Database Integration](#9-database-integration)
10. [API Communication Layer](#10-api-communication-layer)
11. [Testing Integration](#11-testing-integration)
12. [Coursework Alignment](#12-coursework-alignment)

---

## 1. Executive Summary

BreachLens is a **full-stack RESTful API system** built using a **layered architecture pattern** that ensures:
- **Separation of concerns** between HTTP handling, business logic, and data access
- **Dependency injection** for testability and maintainability
- **Security-by-design** with middleware-based authentication/authorization
- **Scalable architecture** following industry best practices

The system demonstrates mastery of:
- ✅ **N-Tier Architecture** (Presentation → Business Logic → Data Access)
- ✅ **MVC Pattern Adaptation** (Routes as Controllers, Services as Models, MongoDB as Data Store)
- ✅ **Factory Pattern** (Application creation)
- ✅ **Dependency Injection** (Extension initialization)
- ✅ **Middleware Pipeline** (Security, logging, authentication)
- ✅ **Repository Pattern** (Service layer abstracts database operations)

---

## 2. System Architecture Overview

### 2.1 High-Level System Diagram

```
┌─────────────────────────────────────────────────────────────────────┐
│                          CLIENT LAYER                                │
│                                                                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐             │
│  │   Postman    │  │   Angular    │  │  Mobile App  │             │
│  │   (Testing)  │  │   Frontend   │  │   (Future)   │             │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘             │
│         └─────────────────┼─────────────────┘                       │
└───────────────────────────┼─────────────────────────────────────────┘
                            │ HTTP/HTTPS
                            │ JSON Payloads
                            │ JWT Tokens
┌───────────────────────────▼─────────────────────────────────────────┐
│                     PRESENTATION LAYER                                │
│                                                                       │
│  ┌─────────────────────────────────────────────────────────────┐   │
│  │                    Flask Application                         │   │
│  │                   (Application Factory)                      │   │
│  │                    app/__init__.py                           │   │
│  └─────────────────────────────────────────────────────────────┘   │
│                            │                                          │
│              ┌─────────────┴─────────────┐                          │
│              ▼                           ▼                          │
│  ┌───────────────────────┐   ┌───────────────────────┐            │
│  │   Middleware Layer    │   │   Extensions Layer    │            │
│  │  - Request Logging    │   │  - MongoDB (PyMongo)  │            │
│  │  - Auth Middleware    │   │  - CORS               │            │
│  │  - Security Headers   │   │  - Rate Limiter       │            │
│  └───────────┬───────────┘   │  - Cache              │            │
│              │                └───────────────────────┘            │
└──────────────┼──────────────────────────────────────────────────────┘
               │
┌──────────────▼──────────────────────────────────────────────────────┐
│                         ROUTES LAYER                                 │
│                      (Blueprint Controllers)                         │
│                                                                      │
│  ┌─────────┐ ┌──────────┐ ┌──────────┐ ┌────────┐ ┌──────────┐  │
│  │  Auth   │ │ Breaches │ │Analytics │ │ Users  │ │  Admin   │  │
│  │ Routes  │ │  Routes  │ │  Routes  │ │ Routes │ │  Routes  │  │
│  │ auth.py │ │breaches  │ │analytics │ │users.py│ │ admin.py │  │
│  └────┬────┘ └────┬─────┘ └────┬─────┘ └───┬────┘ └────┬─────┘  │
└───────┼───────────┼────────────┼────────────┼───────────┼─────────┘
        │           │            │            │           │
        │           └────────────┼────────────┘           │
        │                        │                        │
┌───────▼────────────────────────▼────────────────────────▼───────────┐
│                      BUSINESS LOGIC LAYER                            │
│                         (Service Classes)                            │
│                                                                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐            │
│  │ AuthService  │  │BreachService │  │ UserService  │            │
│  │              │  │              │  │              │            │
│  │ - login()    │  │ - create()   │  │ - get_user() │            │
│  │ - register() │  │ - get_all()  │  │ - update()   │            │
│  │ - logout()   │  │ - update()   │  │ - delete()   │            │
│  │ - verify_jwt │  │ - delete()   │  └──────────────┘            │
│  └──────┬───────┘  │ - geo_query()│                               │
│         │          │ - calc_risk()│  ┌──────────────────┐         │
│         │          └──────┬───────┘  │ AnalyticsService │         │
│         │                 │          │                  │         │
│         │                 │          │ - risk_by_ind()  │         │
│         │                 │          │ - trend_over()   │         │
│         │                 │          │ - geo_summary()  │         │
│         │                 │          └──────────────────┘         │
└─────────┼─────────────────┼────────────────────────────────────────┘
          │                 │
          │  ┌──────────────▼──────────────┐
          │  │    VALIDATION LAYER         │
          │  │      (Model Schemas)        │
          │  │                             │
          │  │  ┌────────────────────┐    │
          │  │  │  BreachSchema      │    │
          │  │  │  - validate()      │    │
          │  │  │  - to_document()   │    │
          │  │  └────────────────────┘    │
          │  │                             │
          │  │  ┌────────────────────┐    │
          │  │  │  UserSchema        │    │
          │  │  │  - validate()      │    │
          │  │  └────────────────────┘    │
          │  └─────────────────────────────┘
          │
┌─────────▼───────────────────────────────────────────────────────────┐
│                       DATA ACCESS LAYER                              │
│                                                                      │
│  ┌────────────────────────────────────────────────────────────┐   │
│  │                      MongoDB Database                       │   │
│  │                                                             │   │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐    │   │
│  │  │  breaches    │  │    users     │  │  blacklist   │    │   │
│  │  │  collection  │  │  collection  │  │  collection  │    │   │
│  │  │              │  │              │  │              │    │   │
│  │  │ - Documents  │  │ - Documents  │  │ - Tokens     │    │   │
│  │  │ - Indexes    │  │ - Indexes    │  │ - Expiry TTL │    │   │
│  │  │ - 2dsphere   │  │ - Unique     │  │              │    │   │
│  │  └──────────────┘  └──────────────┘  └──────────────┘    │   │
│  └────────────────────────────────────────────────────────────┘   │
└──────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────────┐
│                        UTILITY LAYER                                  │
│                     (Cross-Cutting Concerns)                          │
│                                                                       │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐   │
│  │ Validators │  │  Response  │  │   Audit    │  │  Geo Utils │   │
│  │            │  │  Helpers   │  │  Logger    │  │            │   │
│  │ - sanitize │  │ - success()│  │ - log()    │  │ - distance │   │
│  │ - validate │  │ - error()  │  │            │  │            │   │
│  └────────────┘  └────────────┘  └────────────┘  └────────────┘   │
└──────────────────────────────────────────────────────────────────────┘
```

---

## 3. Layered Architecture Pattern

### 3.1 Architecture Layers Explained

BreachLens follows a **5-layer architecture** that ensures clean separation of concerns:

| Layer | Purpose | Components | Responsibility |
|-------|---------|------------|----------------|
| **1. Presentation** | HTTP request/response handling | Flask App, Blueprints, Middleware | Receive HTTP requests, validate input format, send JSON responses |
| **2. Routes** | Endpoint definitions & routing | 6 Blueprint files (`auth.py`, `breaches.py`, etc.) | Map URLs to handler functions, extract request data, call services |
| **3. Business Logic** | Core application logic | 4 Service classes (`AuthService`, `BreachService`, etc.) | Implement business rules, orchestrate data operations, calculate risk scores |
| **4. Validation** | Data validation & schemas | 2 Model files (`breach.py`, `user.py`) | Validate payloads, sanitize inputs, define document schemas |
| **5. Data Access** | Database operations | PyMongo extension, MongoDB collections | Store/retrieve data, execute queries, manage indexes |

### 3.2 Why Layered Architecture?

This architecture provides:

✅ **Separation of Concerns**: Each layer has a single, well-defined responsibility
✅ **Testability**: Each layer can be tested independently (unit tests for services, integration tests for routes)
✅ **Maintainability**: Changes to one layer don't ripple through the entire system
✅ **Scalability**: Layers can be scaled independently (e.g., add caching at service layer)
✅ **Reusability**: Services can be called from multiple routes

**Academic Principle**: This follows **Martin Fowler's "Patterns of Enterprise Application Architecture"** - specifically the **Service Layer Pattern** and **Repository Pattern**.

---

## 4. Request-Response Flow

### 4.1 Complete Request Lifecycle

Let's trace a **POST /api/v1/breaches** request through the entire system:

```
┌─────────────────────────────────────────────────────────────────────┐
│ STEP 1: CLIENT REQUEST                                               │
└─────────────────────────────────────────────────────────────────────┘

POST /api/v1/breaches HTTP/1.1
Host: localhost:5001
Content-Type: application/json
x-access-token: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

{
  "title": "Major Social Media Breach 2026",
  "severity": "critical",
  "affected_records_count": 500000000,
  ...
}

                                ▼

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 2: MIDDLEWARE PIPELINE (app/middleware/)                        │
└─────────────────────────────────────────────────────────────────────┘

2a. Request Logging Middleware
    ├── Logs incoming request (IP, method, path, timestamp)
    └── Creates request ID for tracing

2b. Security Headers Middleware
    ├── Adds CSP headers
    ├── Sets X-Frame-Options: DENY
    └── Configures CORS headers

2c. Rate Limiting
    ├── Checks request count against limits
    └── Blocks if exceeded (429 Too Many Requests)

2d. Authentication Middleware (@require_auth decorator)
    ├── Extracts x-access-token from headers
    ├── Validates JWT signature using SECRET_KEY
    ├── Checks token not in blacklist collection
    ├── Decodes user_id from payload
    ├── Stores user info in `g.current_user_id`
    └── If invalid → 401 Unauthorized

2e. Authorization Middleware (@require_role decorator)
    ├── Checks user role from decoded token
    ├── Verifies user has required role (admin/analyst)
    └── If unauthorized → 403 Forbidden

                                ▼

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 3: ROUTES LAYER (app/routes/breaches.py)                       │
└─────────────────────────────────────────────────────────────────────┘

@breaches_bp.post("/")
@require_auth
@require_role("analyst", "admin")
def create_breach():

    3a. Extract Request Data
        ├── request.json → raw payload
        └── g.current_user_id → authenticated user

    3b. Input Sanitization
        ├── sanitize_mongo_input() → Remove NoSQL injection ($, regex)
        └── sanitize_breach_payload_html() → Clean XSS from text fields

    3c. Validation
        ├── Call validate_breach_payload(data)
        ├── Uses BreachSchema.validate()
        ├── Checks: required fields, data types, enum values
        └── If invalid → 400 Bad Request with error details

    3d. Service Call
        ├── Creates BreachService instance
        ├── Calls breach_service.create_breach(data, user_id)
        └── Receives: (breach_doc, error) tuple

    3e. Response Formatting
        ├── If error → error_response(msg, status_code)
        └── If success → success_response(data, 201)

                                ▼

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 4: BUSINESS LOGIC LAYER (app/services/breach_service.py)       │
└─────────────────────────────────────────────────────────────────────┘

BreachService.create_breach(data, user_id):

    4a. Schema Validation (Redundant Check)
        ├── BreachSchema.validate(data)
        └── Returns error list if invalid

    4b. Document Preparation
        ├── BreachSchema.to_document(data, user_id)
        ├── Adds timestamps (created_at, updated_at)
        ├── Adds creator (created_by: user_id)
        └── Converts GeoJSON for location field

    4c. Risk Score Calculation
        ├── calculate_risk_score(document)
        ├── Formula: severity_weight + data_sensitivity + scale_factor
        ├── Weights: critical=10, high=7.5, etc.
        └── Clamps result to 0-100 range

    4d. Database Insertion
        ├── mongo.db["breaches"].insert_one(document)
        ├── Gets inserted_id from result
        └── Catches DuplicateKeyError (409 Conflict)

    4e. Return Result
        ├── Fetch inserted document by ID
        ├── Serialize ObjectId → string
        └── Return (document, None) or (None, error_msg)

                                ▼

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 5: DATA ACCESS LAYER (MongoDB via PyMongo)                     │
└─────────────────────────────────────────────────────────────────────┘

mongo.db["breaches"].insert_one(document):

    5a. Connection Management
        ├── PyMongo connection pool (configured in extensions.py)
        └── Connection string from MONGO_URI env variable

    5b. Document Validation
        ├── MongoDB schema validation (if configured)
        └── Checks data types and required fields

    5c. Index Updates
        ├── Updates 2dsphere index for location field
        ├── Updates text index for full-text search
        └── Updates compound indexes (status, severity)

    5d. Write Concern
        ├── Default: w=1 (acknowledged write)
        └── Returns InsertOneResult with inserted_id

    5e. Audit Trail (Optional)
        └── Triggers audit log if configured

                                ▼

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 6: RESPONSE SERIALIZATION                                      │
└─────────────────────────────────────────────────────────────────────┘

6a. Service Returns to Route
    ├── Returns tuple: (breach_doc, None)
    └── breach_doc contains _id, title, severity, etc.

6b. Response Helper (utils/response.py)
    ├── success_response(breach_doc, 201)
    ├── Converts ObjectId fields to strings
    ├── Wraps in envelope: {"status": "success", "data": {...}}
    └── Sets Content-Type: application/json

6c. Flask Sends Response
    HTTP/1.1 201 Created
    Content-Type: application/json

    {
      "status": "success",
      "data": {
        "_id": "65f1a2b3c4d5e6f7g8h9i0j1",
        "title": "Major Social Media Breach 2026",
        "severity": "critical",
        "risk_score": 95.5,
        "created_at": "2026-03-11T10:30:00Z",
        ...
      }
    }

                                ▼

┌─────────────────────────────────────────────────────────────────────┐
│ STEP 7: AUDIT LOGGING (app/utils/audit.py)                          │
└─────────────────────────────────────────────────────────────────────┘

7a. Log to audit.log
    {
      "timestamp": "2026-03-11T10:30:00Z",
      "event_type": "breach_created",
      "user_id": "65abc123...",
      "breach_id": "65f1a2b3c4d5e6f7g8h9i0j1",
      "ip_address": "192.168.1.100",
      "user_agent": "PostmanRuntime/7.32.3"
    }

7b. Security Event (if configured)
    └── Triggers SIEM integration or monitoring alert
```

### 4.2 Error Handling Flow

If any step fails, the error is propagated backwards through the layers:

```
Database Error (Step 5)
        ▼
Service Returns (None, "Database error")
        ▼
Route Calls error_response("Database error", 500)
        ▼
Middleware Adds Error Headers
        ▼
Client Receives:
{
  "status": "error",
  "message": "Database error",
  "code": 500
}
```

---

## 5. Component Integration Map

### 5.1 How Components Work Together

```
┌──────────────────────────────────────────────────────────────────┐
│                    FLASK APPLICATION FACTORY                      │
│                       (app/__init__.py)                           │
│                                                                   │
│  create_app(config_name):                                        │
│      1. Load configuration from config.py                        │
│      2. Initialize extensions (mongo, cors, limiter, cache)      │
│      3. Configure Swagger UI                                     │
│      4. Register blueprints (routes)                             │
│      5. Create database indexes                                  │
│      6. Register error handlers                                  │
│      7. Initialize middleware                                    │
│                                                                   │
└──────────────────────┬───────────────────────────────────────────┘
                       │
          ┌────────────┼────────────┐
          ▼            ▼            ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Extensions  │ │  Blueprints │ │ Middleware  │
│             │ │             │ │             │
│ mongo       │ │ auth_bp     │ │ request_log │
│ cors        │ │ breaches_bp │ │ auth_mw     │
│ limiter     │ │ analytics_bp│ │ security_hdr│
│ cache       │ │ admin_bp    │ │             │
└─────┬───────┘ └──────┬──────┘ └──────┬──────┘
      │                │                │
      │         ┌──────┴──────┐        │
      │         ▼             ▼        │
      │  ┌──────────┐  ┌──────────┐   │
      │  │ Services │  │  Models  │   │
      │  │          │  │          │   │
      │  │ Auth     │  │ Breach   │   │
      │  │ Breach   │  │ User     │   │
      │  │ User     │  │ Schemas  │   │
      │  │ Analytics│  │          │   │
      │  └────┬─────┘  └────┬─────┘   │
      │       │             │          │
      └───────┴─────────────┴──────────┘
                    │
                    ▼
          ┌─────────────────┐
          │    MongoDB      │
          │                 │
          │  Collections:   │
          │  - breaches     │
          │  - users        │
          │  - blacklist    │
          └─────────────────┘
```

### 5.2 Inter-Component Communication

#### **Routes ↔ Services**

```python
# routes/breaches.py (Route Layer)
from app.services.breach_service import BreachService

breach_service = BreachService()  # Instantiate service

@breaches_bp.post("/")
def create_breach():
    data = request.json
    breach, error = breach_service.create_breach(data, g.current_user_id)
    #                └─── Service call ───┘
    if error:
        return error_response(error, 400)
    return success_response(breach, 201)
```

#### **Services ↔ Models**

```python
# services/breach_service.py (Business Logic Layer)
from app.models.breach import BreachSchema

class BreachService:
    def create_breach(self, data, user_id):
        # Validate using model schema
        errors = BreachSchema.validate(data)
        #        └─── Model validation ───┘

        if errors:
            return None, errors

        # Convert to MongoDB document
        document = BreachSchema.to_document(data, user_id)
        #          └─── Model transformation ───┘

        result = mongo.db["breaches"].insert_one(document)
        return self.get_by_id(str(result.inserted_id))
```

#### **Services ↔ Database**

```python
# services/breach_service.py (Business Logic Layer)
from app.extensions import mongo

class BreachService:
    @property
    def col(self):
        return mongo.db["breaches"]  # Access MongoDB collection

    def get_all(self, filters):
        query = self._build_query(filters)
        cursor = self.col.find(query).sort("created_at", -1)
        #        └─── Direct MongoDB query ───┘
        return list(cursor)
```

#### **Middleware ↔ Services**

```python
# middleware/auth_middleware.py
from app.services.auth_service import AuthService

auth_service = AuthService()

def require_auth(f):
    @wraps(f)
    def decorated(*args, **kwargs):
        token = request.headers.get("x-access-token")

        # Service validates token
        user_id = auth_service.verify_token(token)
        #         └─── Service call ───┘

        if not user_id:
            return error_response("Invalid token", 401)

        g.current_user_id = user_id
        return f(*args, **kwargs)
    return decorated
```

---

## 6. Data Flow Architecture

### 6.1 Authentication Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ AUTHENTICATION & AUTHORIZATION FLOW                              │
└─────────────────────────────────────────────────────────────────┘

1. USER REGISTRATION
   ┌──────────┐
   │  Client  │ POST /api/v1/auth/register
   └────┬─────┘ {username, email, password, role}
        │
        ▼
   ┌──────────────────┐
   │  auth.py Route   │ Validates input format
   └────┬─────────────┘
        │
        ▼
   ┌──────────────────┐
   │  AuthService     │ 1. Hash password (bcrypt, 12 rounds)
   └────┬─────────────┘ 2. Check email uniqueness
        │              3. Create user document
        ▼              4. Insert into users collection
   ┌──────────────────┐
   │  MongoDB users   │ Store: {username, email, password_hash,
   │   collection     │         role, created_at, is_active}
   └──────────────────┘

2. USER LOGIN
   ┌──────────┐
   │  Client  │ POST /api/v1/auth/login
   └────┬─────┘ {email, password}
        │
        ▼
   ┌──────────────────┐
   │  auth.py Route   │ Extracts credentials
   └────┬─────────────┘
        │
        ▼
   ┌──────────────────┐
   │  AuthService     │ 1. Find user by email
   └────┬─────────────┘ 2. Verify password (bcrypt.checkpw)
        │              3. Check account lockout
        │              4. Generate JWT token
        │              5. Update last_login timestamp
        │
        ├─── If password incorrect ───┐
        │                              │
        ▼                              ▼
   Increment failed_attempts    Return 401 Unauthorized
   Lock account after 5 fails
        │
        ├─── If password correct ─────┐
        │                              │
        ▼                              ▼
   Generate JWT:                 Return to client:
   {                             {
     "user_id": "65abc...",        "token": "eyJhbGci...",
     "role": "analyst",            "expires_in": 3600,
     "exp": 1710163800             "user": {...}
   }                             }
   signed with SECRET_KEY

3. AUTHENTICATED REQUEST
   ┌──────────┐
   │  Client  │ GET /api/v1/breaches
   └────┬─────┘ Headers: x-access-token: eyJhbGci...
        │
        ▼
   ┌──────────────────┐
   │  Middleware      │ @require_auth decorator
   │  auth_middleware │
   └────┬─────────────┘
        │
        ├─── Extract token from headers
        ├─── Decode JWT using SECRET_KEY
        ├─── Verify signature
        ├─── Check expiration (exp claim)
        │
        ▼
   ┌──────────────────┐
   │  AuthService     │ Check token not in blacklist
   │                  │ mongo.db["blacklist"].find_one({"token": ...})
   └────┬─────────────┘
        │
        ├─── Token valid ───┐
        │                   │
        ▼                   ▼
   Store user info     Allow request to proceed
   in g.current_user_id   to route handler
        │
        ├─── Token invalid ───┐
        │                      │
        ▼                      ▼
   Return 401 Unauthorized

4. AUTHORIZATION CHECK
   ┌──────────────────┐
   │  Middleware      │ @require_role("admin", "analyst")
   │  auth_middleware │
   └────┬─────────────┘
        │
        ├─── Fetch user from database by g.current_user_id
        ├─── Check user.role in allowed_roles
        │
        ├─── Role authorized ───┐
        │                        │
        ▼                        ▼
   Allow request          Proceed to route handler
        │
        ├─── Role not authorized ───┐
        │                            │
        ▼                            ▼
   Return 403 Forbidden

5. LOGOUT
   ┌──────────┐
   │  Client  │ POST /api/v1/auth/logout
   └────┬─────┘ Headers: x-access-token: eyJhbGci...
        │
        ▼
   ┌──────────────────┐
   │  AuthService     │ Add token to blacklist collection
   │                  │ mongo.db["blacklist"].insert_one({
   └────┬─────────────┘   "token": token,
        │                  "created_at": now,
        │                  "expires_at": exp_from_jwt
        ▼                })
   Token invalidated
   (TTL index auto-deletes after expiry)
```

### 6.2 Breach Creation Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ BREACH CREATION DATA FLOW                                        │
└─────────────────────────────────────────────────────────────────┘

   ┌──────────┐
   │  Client  │ POST /api/v1/breaches
   └────┬─────┘ Headers: x-access-token, Content-Type: application/json
        │      Body: {title, severity, breach_date, ...}
        │
        ▼
┌────────────────────────────────────────────────────────────────┐
│ LAYER 1: MIDDLEWARE PIPELINE                                    │
└────────────────────────────────────────────────────────────────┘
        │
        ├─── @require_auth: Verify JWT, extract user_id
        ├─── @require_role("analyst", "admin"): Check authorization
        └─── Rate limiter: Check request quota
        │
        ▼
┌────────────────────────────────────────────────────────────────┐
│ LAYER 2: ROUTES (breaches.py)                                  │
└────────────────────────────────────────────────────────────────┘
        │
        ├─── Extract request.json → raw_data
        ├─── sanitize_mongo_input(raw_data) → Remove $, regex
        ├─── sanitize_breach_payload_html(raw_data) → Clean XSS
        └─── validate_breach_payload(raw_data) → Check schema
        │
        ▼
┌────────────────────────────────────────────────────────────────┐
│ LAYER 3: MODELS (breach.py) - Validation                       │
└────────────────────────────────────────────────────────────────┘
        │
        ├─── BreachSchema.validate(raw_data):
        │    ├─── Check required fields present
        │    ├─── Validate data types (str, int, date)
        │    ├─── Validate enum values (severity, status, industry)
        │    ├─── Validate min/max constraints
        │    ├─── Validate GeoJSON format
        │    └─── Validate URLs, emails, dates
        │
        ├─── If validation errors → Return 400 Bad Request
        │
        ▼
┌────────────────────────────────────────────────────────────────┐
│ LAYER 4: SERVICES (breach_service.py) - Business Logic         │
└────────────────────────────────────────────────────────────────┘
        │
        ├─── BreachService.create_breach(data, user_id):
        │    │
        │    ├─── BreachSchema.to_document(data, user_id):
        │    │    ├─── Add created_at: datetime.utcnow()
        │    │    ├─── Add updated_at: datetime.utcnow()
        │    │    ├─── Add created_by: user_id
        │    │    ├─── Convert dates to ISO 8601 format
        │    │    └─── Format GeoJSON for location field
        │    │
        │    ├─── calculate_risk_score(document):
        │    │    ├─── severity_weight = {"critical": 10, "high": 7.5, ...}
        │    │    ├─── data_sensitivity = sum(weights for data_types_exposed)
        │    │    ├─── scale_factor = log10(affected_records_count)
        │    │    └─── risk_score = clamp(severity + sensitivity + scale, 0, 100)
        │    │
        │    └─── Add risk_score to document
        │
        ▼
┌────────────────────────────────────────────────────────────────┐
│ LAYER 5: DATABASE (MongoDB)                                    │
└────────────────────────────────────────────────────────────────┘
        │
        ├─── mongo.db["breaches"].insert_one(document)
        │    ├─── Validate document against schema (if configured)
        │    ├─── Assign _id (ObjectId)
        │    ├─── Update indexes:
        │    │    ├─── 2dsphere index on location field
        │    │    ├─── Text index on title, description
        │    │    └─── Compound index on (status, severity)
        │    └─── Return InsertOneResult
        │
        ├─── Fetch inserted document: find_one({"_id": inserted_id})
        │
        ▼
┌────────────────────────────────────────────────────────────────┐
│ RETURN PATH: Services → Routes → Client                        │
└────────────────────────────────────────────────────────────────┘
        │
        ├─── Service returns (breach_doc, None)
        │
        ├─── Route calls success_response(breach_doc, 201)
        │    ├─── Convert ObjectId to string
        │    ├─── Wrap in envelope: {"status": "success", "data": {...}}
        │    └─── Set HTTP status 201 Created
        │
        ▼
   ┌──────────┐
   │  Client  │ Receives:
   └──────────┘ {
                  "status": "success",
                  "data": {
                    "_id": "65f1a2b3...",
                    "title": "...",
                    "risk_score": 95.5,
                    ...
                  }
                }
```

---

## 7. Design Patterns & Principles

### 7.1 Design Patterns Used

| Pattern | Location | Purpose | Example |
|---------|----------|---------|---------|
| **Factory Pattern** | `app/__init__.py` | Create Flask app with different configs | `create_app("development")` |
| **Repository Pattern** | `app/services/` | Abstract database access | Service methods hide MongoDB details |
| **Dependency Injection** | `app/extensions.py` | Inject MongoDB, CORS, limiter | `mongo.init_app(app)` |
| **Decorator Pattern** | `app/middleware/` | Add authentication/authorization | `@require_auth`, `@require_role` |
| **Strategy Pattern** | `app/services/` | Different risk calculation strategies | `calculate_risk_score()` |
| **Builder Pattern** | `app/models/` | Build validated documents | `BreachSchema.to_document()` |
| **Singleton Pattern** | `app/extensions.py` | Single instance of extensions | `mongo = PyMongo()` |

### 7.2 SOLID Principles

#### **S - Single Responsibility Principle**

Each component has one reason to change:

- **Routes**: HTTP handling only (no business logic)
- **Services**: Business logic only (no HTTP handling)
- **Models**: Validation only (no database operations)
- **Middleware**: Cross-cutting concerns only

```python
# ✅ GOOD: Route only handles HTTP
@breaches_bp.post("/")
def create_breach():
    data = request.json  # Extract HTTP data
    breach, error = breach_service.create_breach(data)  # Delegate to service
    return success_response(breach, 201)  # Format HTTP response

# ✅ GOOD: Service only handles business logic
class BreachService:
    def create_breach(self, data, user_id):
        document = BreachSchema.to_document(data, user_id)  # Build document
        document["risk_score"] = self.calculate_risk_score(document)  # Business rule
        result = self.col.insert_one(document)  # Persist
        return self.get_by_id(str(result.inserted_id))
```

#### **O - Open/Closed Principle**

System is open for extension, closed for modification:

- New routes can be added without modifying existing ones
- New validation rules added to schemas without changing services
- New middleware can be registered without touching routes

```python
# ✅ Extend functionality by adding new blueprint
from app.routes.reports import reports_bp
app.register_blueprint(reports_bp)  # No existing code modified
```

#### **L - Liskov Substitution Principle**

Subclasses can replace base classes without breaking functionality:

```python
# All services follow same interface contract
class BaseService:
    def get_by_id(self, id): ...
    def get_all(self, filters): ...

class BreachService(BaseService): ...
class UserService(BaseService): ...
```

#### **I - Interface Segregation Principle**

Clients depend only on methods they use:

```python
# Routes only use methods they need
# breaches.py only imports BreachService, not AuthService
from app.services.breach_service import BreachService

# auth.py only imports AuthService, not BreachService
from app.services.auth_service import AuthService
```

#### **D - Dependency Inversion Principle**

High-level modules don't depend on low-level modules; both depend on abstractions:

```python
# Routes depend on Service abstraction, not MongoDB directly
from app.services.breach_service import BreachService  # Abstract interface

# Services depend on mongo extension, not raw PyMongo
from app.extensions import mongo  # Abstract interface
```

### 7.3 RESTful API Principles

BreachLens follows strict REST conventions:

| Principle | Implementation | Example |
|-----------|----------------|---------|
| **Resource-based URLs** | Nouns, not verbs | `/api/v1/breaches` (not `/api/v1/getBreaches`) |
| **HTTP verbs** | GET, POST, PUT, PATCH, DELETE | `GET /breaches` (list), `POST /breaches` (create) |
| **Status codes** | Semantic HTTP codes | 200 OK, 201 Created, 400 Bad Request, 401 Unauthorized, 404 Not Found |
| **Stateless** | No server-side sessions | JWT tokens carry all auth state |
| **Uniform interface** | Consistent response format | `{"status": "success/error", "data": {...}}` |
| **HATEOAS** | Hypermedia links | Pagination links in response headers |

---

## 8. Security Architecture

### 8.1 Security Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ SECURITY ARCHITECTURE - Defense in Depth                        │
└─────────────────────────────────────────────────────────────────┘

LAYER 1: NETWORK SECURITY
├── HTTPS (TLS) encryption (production)
├── CORS policy (restricted origins)
└── Rate limiting (prevent DDoS)

LAYER 2: AUTHENTICATION
├── JWT token-based authentication (raw PyJWT)
├── HTTP Basic Auth for /login endpoint (module requirement)
├── BCrypt password hashing (12 rounds)
├── Account lockout (5 failed attempts → 15 min lockout)
└── Token blacklist (logout invalidates token)

LAYER 3: AUTHORIZATION
├── Role-Based Access Control (RBAC)
│   ├── admin: Full system access
│   ├── analyst: Read + Create + Update
│   └── guest: Read-only (unauthenticated)
├── @require_role decorator enforces permissions
└── Resource-level checks (can only edit own breaches)

LAYER 4: INPUT VALIDATION
├── Schema validation (BreachSchema, UserSchema)
├── NoSQL injection prevention (strip $, regex)
├── XSS sanitization (Bleach library)
├── HTML entity encoding
└── Regex escaping for text search

LAYER 5: DATA PROTECTION
├── Password hashing (never store plaintext)
├── Sensitive field redaction for guests
├── Audit logging (all security events)
└── IP anonymization (GDPR compliance)

LAYER 6: OUTPUT SECURITY
├── Security headers:
│   ├── Content-Security-Policy
│   ├── X-Frame-Options: DENY
│   ├── X-Content-Type-Options: nosniff
│   └── X-XSS-Protection: 1; mode=block
└── JSON escaping (prevent JSON injection)

LAYER 7: MONITORING & AUDIT
├── Request logging (all API calls)
├── Security event logging (failed logins, lockouts)
├── Audit trail (who, what, when)
└── Error logging (without sensitive data)
```

### 8.2 Security Implementation Example

```python
# LAYER 2: Authentication
@require_auth  # Middleware decorator
def create_breach():
    # Extract and verify JWT
    token = request.headers.get("x-access-token")
    payload = pyjwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    user_id = payload["user_id"]

    # Check token not blacklisted
    blacklisted = mongo.db["blacklist"].find_one({"token": token})
    if blacklisted:
        return error_response("Token has been revoked", 401)

# LAYER 3: Authorization
@require_role("analyst", "admin")  # RBAC decorator
def create_breach():
    user = mongo.db["users"].find_one({"_id": ObjectId(g.current_user_id)})
    if user["role"] not in ["analyst", "admin"]:
        return error_response("Insufficient permissions", 403)

# LAYER 4: Input Validation
def create_breach():
    data = request.json

    # NoSQL injection prevention
    data = sanitize_mongo_input(data)  # Removes $, regex operators

    # XSS sanitization
    data["title"] = sanitize_html(data["title"])  # Bleach library

    # Schema validation
    errors = BreachSchema.validate(data)
    if errors:
        return error_response(errors, 400)

# LAYER 5: Password Hashing
class AuthService:
    def register(self, username, email, password):
        # Hash password with BCrypt (12 rounds)
        password_hash = bcrypt.hashpw(
            password.encode("utf-8"),
            bcrypt.gensalt(rounds=12)
        )

        user_doc = {
            "username": username,
            "email": email,
            "password_hash": password_hash,  # Store hash, never plaintext
            "created_at": datetime.utcnow()
        }

        self.col.insert_one(user_doc)
```

---

## 9. Database Integration

### 9.1 MongoDB Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│ MONGODB DATABASE ARCHITECTURE                                    │
└─────────────────────────────────────────────────────────────────┘

DATABASE: breachlens
├── COLLECTION: breaches
│   ├── Documents: ~25 (seeded from HIBP data)
│   ├── Indexes:
│   │   ├── _id (default, unique)
│   │   ├── location (2dsphere) → Geospatial queries
│   │   ├── (title, description) text → Full-text search
│   │   ├── status, severity → Query optimization
│   │   └── created_at → Sorting
│   └── Schema:
│       {
│         "_id": ObjectId,
│         "title": String,
│         "description": String,
│         "severity": Enum["critical", "high", "medium", "low"],
│         "status": Enum["active", "contained", "remediated"],
│         "industry": Enum[...],
│         "affected_records_count": Int32,
│         "breach_date": ISODate,
│         "discovered_date": ISODate,
│         "location": {
│           "type": "Point",
│           "coordinates": [longitude, latitude]
│         },
│         "affected_accounts": [
│           {
│             "account_id": String,
│             "email": String,
│             "username": String,
│             "credentials_exposed": Boolean,
│             "data_exposed": [String]
│           }
│         ],
│         "timeline": [
│           {
│             "event_type": Enum["initial_breach", ...],
│             "timestamp": ISODate,
│             "description": String,
│             "actor": String
│           }
│         ],
│         "remediation": [
│           {
│             "action": String,
│             "status": Enum["planned", "in_progress", ...],
│             "assigned_to": String,
│             "due_date": ISODate,
│             "completed_at": ISODate
│           }
│         ],
│         "monitoring_alerts": [
│           {
│             "alert_type": Enum["credential_reuse", ...],
│             "triggered_at": ISODate,
│             "details": String
│           }
│         ],
│         "risk_score": Double (0-100),
│         "created_at": ISODate,
│         "updated_at": ISODate,
│         "created_by": ObjectId (ref: users)
│       }
│
├── COLLECTION: users
│   ├── Documents: ~50 (admins, analysts)
│   ├── Indexes:
│   │   ├── _id (default, unique)
│   │   ├── email (unique)
│   │   └── username (unique)
│   └── Schema:
│       {
│         "_id": ObjectId,
│         "username": String (unique),
│         "email": String (unique),
│         "password_hash": String,
│         "role": Enum["admin", "analyst", "guest"],
│         "created_at": ISODate,
│         "last_login": ISODate,
│         "is_active": Boolean,
│         "failed_attempts": Int32,
│         "locked_until": ISODate
│       }
│
└── COLLECTION: blacklist
    ├── Documents: JWT tokens (invalidated on logout)
    ├── Indexes:
    │   ├── token (unique)
    │   └── expires_at (TTL index, auto-delete)
    └── Schema:
        {
          "token": String (unique),
          "created_at": ISODate,
          "expires_at": ISODate  # TTL index deletes after expiry
        }
```

### 9.2 Database Queries by Type

#### **1. CRUD Operations**

```python
# CREATE
result = mongo.db["breaches"].insert_one(document)
breach_id = str(result.inserted_id)

# READ (single)
breach = mongo.db["breaches"].find_one({"_id": ObjectId(breach_id)})

# READ (list with filters)
cursor = mongo.db["breaches"].find({
    "severity": "critical",
    "status": "active"
}).sort("risk_score", -1)

# UPDATE
mongo.db["breaches"].update_one(
    {"_id": ObjectId(breach_id)},
    {"$set": {"status": "contained", "updated_at": datetime.utcnow()}}
)

# DELETE
mongo.db["breaches"].delete_one({"_id": ObjectId(breach_id)})
```

#### **2. Geospatial Queries**

```python
# Find breaches near a location (using 2dsphere index)
cursor = mongo.db["breaches"].find({
    "location": {
        "$near": {
            "$geometry": {
                "type": "Point",
                "coordinates": [longitude, latitude]
            },
            "$maxDistance": max_distance_meters
        }
    }
})
```

#### **3. Aggregation Pipelines**

```python
# Risk by industry (GROUP BY)
pipeline = [
    {"$group": {
        "_id": "$industry",
        "avg_risk": {"$avg": "$risk_score"},
        "total_breaches": {"$sum": 1},
        "total_records": {"$sum": "$affected_records_count"}
    }},
    {"$sort": {"avg_risk": -1}}
]
results = list(mongo.db["breaches"].aggregate(pipeline))
```

#### **4. Sub-document Operations**

```python
# Add affected account (array push)
mongo.db["breaches"].update_one(
    {"_id": ObjectId(breach_id)},
    {
        "$push": {
            "affected_accounts": {
                "account_id": str(uuid.uuid4()),
                "email": "victim@example.com",
                "credentials_exposed": True
            }
        }
    }
)

# Update specific sub-document (positional operator)
mongo.db["breaches"].update_one(
    {"_id": ObjectId(breach_id), "affected_accounts.account_id": account_id},
    {
        "$set": {
            "affected_accounts.$.credentials_exposed": False,
            "updated_at": datetime.utcnow()
        }
    }
)

# Remove sub-document (array pull)
mongo.db["breaches"].update_one(
    {"_id": ObjectId(breach_id)},
    {"$pull": {"affected_accounts": {"account_id": account_id}}}
)
```

---

## 10. API Communication Layer

### 10.1 Request/Response Envelope

All API responses follow a consistent envelope format:

#### **Success Response**

```json
{
  "status": "success",
  "data": {
    // Resource data here
  },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 100
  }
}
```

#### **Error Response**

```json
{
  "status": "error",
  "message": "Validation failed",
  "code": 400,
  "errors": [
    {
      "field": "severity",
      "message": "Must be one of: critical, high, medium, low"
    }
  ]
}
```

### 10.2 HTTP Status Codes

| Code | Meaning | When Used |
|------|---------|-----------|
| 200 | OK | Successful GET, PUT, PATCH |
| 201 | Created | Successful POST (resource created) |
| 204 | No Content | Successful DELETE (no body) |
| 400 | Bad Request | Validation error, malformed JSON |
| 401 | Unauthorized | Missing/invalid JWT token |
| 403 | Forbidden | Valid token but insufficient permissions |
| 404 | Not Found | Resource doesn't exist |
| 409 | Conflict | Duplicate key (email, username) |
| 422 | Unprocessable Entity | Semantic validation error |
| 429 | Too Many Requests | Rate limit exceeded |
| 500 | Internal Server Error | Unexpected server error |
| 503 | Service Unavailable | Database down |

---

## 11. Testing Integration

### 11.1 Testing Pyramid

```
                  ▲
                 ╱│╲
                ╱ │ ╲
               ╱  │  ╲
              ╱   │   ╲
             ╱    │    ╲
            ╱  E2E│     ╲      ← Postman/Newman (87 tests)
           ╱   Tests     ╲       Full API workflows
          ╱───────────────╲
         ╱       │         ╲
        ╱  Integration      ╲   ← pytest (200 tests)
       ╱     Tests           ╲    Routes + Services + DB
      ╱─────────────────────  ╲
     ╱          │              ╲
    ╱      Unit Tests           ╲ ← pytest (386 tests)
   ╱    Services, Models, Utils  ╲  Business logic in isolation
  ╱_______________________________╲

Total: 586 automated tests, 88% coverage
```

### 11.2 Test Integration with System

```python
# Unit Test (Service Layer)
def test_calculate_risk_score():
    service = BreachService()

    document = {
        "severity": "critical",
        "affected_records_count": 1000000,
        "data_types_exposed": ["password", "email"]
    }

    score = service.calculate_risk_score(document)
    assert 90 <= score <= 100  # Critical breach = high score

# Integration Test (Route + Service + DB)
def test_create_breach_endpoint(client, admin_token):
    payload = {
        "title": "Test Breach",
        "severity": "high",
        ...
    }

    response = client.post(
        "/api/v1/breaches",
        json=payload,
        headers={"x-access-token": admin_token}
    )

    assert response.status_code == 201
    assert "breach_id" in response.json["data"]

# E2E Test (Postman Collection)
POST {{base_url}}/api/v1/auth/login
{
  "email": "admin@breachlens.com",
  "password": "Admin123!"  # pragma: allowlist secret
}

# Extract token
pm.environment.set("token", pm.response.json().data.token);

POST {{base_url}}/api/v1/breaches
Headers: x-access-token: {{token}}
{...breach payload...}

# Verify response
pm.test("Status code is 201", function() {
  pm.response.to.have.status(201);
});
```

---

## 12. Coursework Alignment

### 12.1 COM661 Requirements Mapping

| COM661 Requirement | BreachLens Implementation | Evidence |
|-------------------|---------------------------|----------|
| **RESTful API Design** | 63 endpoints, strict REST conventions | [API_SPEC.md](API_SPEC.md) |
| **HTTP Basic Auth** | `GET /login` endpoint | [auth.py](../backend/app/routes/auth.py#L15-L45) |
| **JWT Authentication** | Token-based auth, blacklist on logout | [auth_middleware.py](../backend/app/middleware/auth_middleware.py) |
| **MongoDB Integration** | PyMongo, 3 collections, indexes | [breach_service.py](../backend/app/services/breach_service.py) |
| **CRUD Operations** | Full CRUD on breaches, users | All routes |
| **Complex Queries** | Geospatial, aggregation, full-text search | [analytics_service.py](../backend/app/services/analytics_service.py) |
| **Sub-documents** | 4 nested arrays (accounts, timeline, etc.) | [breaches.py](../backend/app/routes/breaches.py#L400-L700) |
| **Input Validation** | Schema validation, sanitization | [breach.py](../backend/app/models/breach.py) |
| **Error Handling** | Consistent JSON errors, status codes | [response.py](../backend/app/utils/response.py) |
| **Testing** | 586 tests, 88% coverage | [tests/](../backend/tests/) |
| **Documentation** | Swagger UI, README files | `/api/docs` |

### 12.2 Design Principles for Academic Assessment

**1. Layered Architecture** ✅
- Clear separation: Routes → Services → Models → Database
- Each layer has single responsibility
- Promotes maintainability and testability

**2. Factory Pattern** ✅
- `create_app()` function dynamically creates Flask app
- Different configs for development/testing
- Centralizes initialization logic

**3. Dependency Injection** ✅
- Extensions (mongo, cors) injected via `init_app()`
- Services receive database connection, not hardcoded
- Mocking easy for unit tests

**4. Middleware Pipeline** ✅
- Authentication, authorization, logging as decorators
- Separates cross-cutting concerns from business logic
- Reusable across all routes

**5. Repository Pattern** ✅
- Services abstract database operations
- Routes never touch MongoDB directly
- Database can be swapped (PostgreSQL, etc.) without changing routes

**6. Schema Validation** ✅
- Centralized in Model layer
- Single source of truth for validation rules
- Used by both routes and services

**7. Error Handling Strategy** ✅
- Consistent error response format
- Proper HTTP status codes
- Security-aware (don't leak internal details)

---

## 13. Conclusion: System Integration Summary

### 13.1 How It All Connects

```
1. CLIENT sends HTTP request
        ▼
2. FLASK APP receives at endpoint (routes)
        ▼
3. MIDDLEWARE pipeline processes request (auth, rate limit)
        ▼
4. ROUTE extracts data, validates input
        ▼
5. MODEL validates schema, sanitizes data
        ▼
6. SERVICE applies business logic, calculates risk
        ▼
7. DATABASE stores/retrieves data
        ▼
8. SERVICE returns result to route
        ▼
9. ROUTE formats response envelope
        ▼
10. FLASK APP sends HTTP response to client
```

### 13.2 Key Integration Points

| Integration | Mechanism | Purpose |
|-------------|-----------|---------|
| **Client ↔ Flask** | HTTP/JSON | Communication protocol |
| **Flask ↔ Routes** | Blueprint registration | Endpoint routing |
| **Routes ↔ Services** | Direct function calls | Business logic delegation |
| **Services ↔ Models** | Schema validation | Data validation |
| **Services ↔ Database** | PyMongo | Data persistence |
| **Middleware ↔ Routes** | Decorators | Cross-cutting concerns |
| **Extensions ↔ App** | Factory pattern | Dependency injection |

### 13.3 Why This Architecture?

✅ **Scalability**: Each layer can scale independently
✅ **Maintainability**: Changes isolated to specific layers
✅ **Testability**: Each component tested in isolation
✅ **Security**: Defense-in-depth across all layers
✅ **Reusability**: Services reused across multiple routes
✅ **Academic Rigor**: Demonstrates mastery of software engineering principles

---

## 14. Further Reading

- **Flask Documentation**: https://flask.palletsprojects.com/
- **MongoDB PyMongo**: https://pymongo.readthedocs.io/
- **RESTful API Design**: https://restfulapi.net/
- **SOLID Principles**: https://en.wikipedia.org/wiki/SOLID
- **Martin Fowler - Layered Architecture**: https://martinfowler.com/bliki/PresentationDomainDataLayering.html

---

**For Questions or Clarifications:**
This document serves as a comprehensive guide to BreachLens system architecture. For specific implementation details, refer to inline code comments and module-level README files.

---

**Document Version**: 1.0
**Last Updated**: March 11, 2026
**Author**: Ritik Sah
**Module**: COM661 Full Stack Strategies and Development
