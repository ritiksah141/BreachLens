# BreachLens Backend - How It Works
## **Simple Summary for Quick Understanding**

---

## 🎯 The Big Picture

**BreachLens backend is a Flask REST API that follows a 5-layer architecture:**

```
Client (Postman/Browser)
        ↓
Flask App (Entry Point)
        ↓
Routes (URL Handlers)
        ↓
Services (Business Logic)
        ↓
MongoDB (Data Storage)
```

---

## 🏗️ Architecture Layers

### **Layer 1: Flask Application** (`app/__init__.py`)
- **What it does:** Creates and configures the entire application
- **Key function:** `create_app()` - Factory pattern that initializes everything
- **Initializes:**
  - MongoDB connection
  - CORS (cross-origin requests)
  - Rate limiting
  - Swagger API docs at `/api/docs`
  - All route blueprints

```python
def create_app(config_name="development"):
    app = Flask(__name__)
    mongo.init_app(app)        # Connect to database
    cors.init_app(app)         # Enable CORS
    limiter.init_app(app)      # Rate limiting (Disable for Testing)

    # Register all route blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(breaches_bp)
    # ... more blueprints

    return app
```

---

### **Layer 2: Routes** (`app/routes/`)
- **What it does:** Defines API endpoints and handles HTTP requests
- **6 Blueprint files:**
  - `auth.py` - Login, register, logout
  - `breaches.py` - CRUD operations on breaches
  - `analytics.py` - Statistics and aggregations
  - `users.py` - User profile management
  - `admin.py` - Admin operations
  - `health.py` - Health checks

**Example Route:**
```python
@breaches_bp.post("/")              # POST /api/v1/breaches
@require_auth                       # Must be logged in
@require_role("analyst", "admin")   # Must have analyst/admin role
def create_breach():
    data = request.json             # Get JSON from request

    # Validate and sanitize
    errors = validate_breach_payload(data)
    if errors:
        return error_response(errors, 400)

    # Call service to handle business logic
    breach, error = breach_service.create_breach(data, g.current_user_id)

    if error:
        return error_response(error, 400)

    return success_response(breach, 201)  # Return JSON response
```

**Routes are thin** - they only:
1. Extract data from HTTP request
2. Validate input format
3. Call service layer
4. Format HTTP response

---

### **Layer 3: Services** (`app/services/`)
- **What it does:** Contains all business logic and database operations
- **4 Service classes:**
  - `AuthService` - Authentication, JWT tokens, password hashing
  - `BreachService` - Breach operations, risk calculation
  - `UserService` - User management
  - `AnalyticsService` - Aggregation queries, statistics

**Example Service Method:**
```python
class BreachService:
    def create_breach(self, data, user_id):
        # 1. Validate using schema
        errors = BreachSchema.validate(data)
        if errors:
            return None, errors

        # 2. Build MongoDB document
        document = BreachSchema.to_document(data, user_id)

        # 3. Business logic: Calculate risk score
        document["risk_score"] = self.calculate_risk_score(document)

        # 4. Add timestamps
        document["created_at"] = datetime.utcnow()
        document["updated_at"] = datetime.utcnow()

        # 5. Insert into database
        result = mongo.db["breaches"].insert_one(document)

        # 6. Return the created breach
        return self.get_by_id(str(result.inserted_id))
```

**Services handle:**
- Business rules (risk calculation, validation)
- Database queries (CRUD, aggregations)
- Data transformations

---

### **Layer 4: Models** (`app/models/`)
- **What it does:** Validates data and defines schemas
- **2 Schema files:**
  - `breach.py` - Breach validation rules
  - `user.py` - User validation rules

**Example Model:**
```python
class BreachSchema:
    REQUIRED_FIELDS = ["title", "severity", "breach_date", ...]
    ALLOWED_SEVERITIES = ["critical", "high", "medium", "low"]

    @classmethod
    def validate(cls, data):
        errors = []

        # Check required fields
        for field in cls.REQUIRED_FIELDS:
            if field not in data:
                errors.append(f"Missing field: {field}")

        # Check severity value
        if data["severity"] not in cls.ALLOWED_SEVERITIES:
            errors.append(f"Invalid severity")

        # Check data types
        if not isinstance(data["affected_records_count"], int):
            errors.append("affected_records_count must be integer")

        return errors
```

---

### **Layer 5: MongoDB Database**
- **What it does:** Stores all application data
- **3 Collections:**

```
breaches collection
├── Main breach documents
├── Nested sub-documents:
│   ├── affected_accounts[]
│   ├── timeline[]
│   ├── remediation[]
│   └── monitoring_alerts[]
└── Indexes:
    ├── 2dsphere (geospatial)
    ├── text (full-text search)
    └── compound (status, severity)

users collection
├── User accounts
├── password_hash (BCrypt)
└── Unique indexes: email, username

blacklist collection
└── Invalidated JWT tokens (logout)
```

---

## 🔄 How a Request Flows Through the System

### **Example: Creating a New Breach**

```
1️⃣ CLIENT SENDS REQUEST
   POST /api/v1/breaches
   Headers: x-access-token: eyJhbGci...
   Body: {title: "Data Breach 2026", severity: "critical", ...}
          ↓

2️⃣ MIDDLEWARE CHECKS AUTHENTICATION
   ├─ Extract JWT token from headers
   ├─ Decode token using SECRET_KEY
   ├─ Verify signature is valid
   ├─ Check token not in blacklist
   ├─ Extract user_id from token
   └─ Store user info in g.current_user_id
          ↓

3️⃣ MIDDLEWARE CHECKS AUTHORIZATION
   ├─ Fetch user from database
   ├─ Check user.role in ["analyst", "admin"]
   └─ Allow or deny (403 if insufficient permissions)
          ↓

4️⃣ ROUTE HANDLER PROCESSES REQUEST
   ├─ Extract request.json
   ├─ Sanitize input (remove NoSQL injection attempts)
   ├─ Validate schema
   └─ Call service: breach_service.create_breach(data)
          ↓

5️⃣ SERVICE EXECUTES BUSINESS LOGIC
   ├─ Validate data with BreachSchema
   ├─ Calculate risk score:
   │  risk = severity_weight + data_sensitivity + scale_factor
   ├─ Add timestamps
   ├─ Add created_by: user_id
   └─ Insert into MongoDB
          ↓

6️⃣ DATABASE STORES DATA
   ├─ mongo.db["breaches"].insert_one(document)
   ├─ Assign _id (ObjectId)
   ├─ Update indexes
   └─ Return InsertOneResult
          ↓

7️⃣ SERVICE RETURNS TO ROUTE
   └─ Return (breach_document, None)
          ↓

8️⃣ ROUTE FORMATS RESPONSE
   └─ success_response(breach, 201)
          ↓

9️⃣ CLIENT RECEIVES RESPONSE
   HTTP/1.1 201 Created
   {
     "status": "success",
     "data": {
       "_id": "65f1a2b3...",
       "title": "Data Breach 2026",
       "severity": "critical",
       "risk_score": 95.5,
       "created_at": "2026-03-11T10:30:00Z"
     }
   }
```

---

## 🔒 Authentication System

### **How JWT Authentication Works:**

```
1. LOGIN
   ├─ User sends email + password
   ├─ System checks password with BCrypt
   ├─ If correct: Generate JWT token
   │  token = jwt.encode({
   │    "user_id": "65abc123...",
   │    "role": "analyst",
   │    "exp": timestamp
   │  }, SECRET_KEY)
   └─ Return token to client

2. AUTHENTICATED REQUESTS
   ├─ Client sends token in headers: x-access-token
   ├─ Middleware decodes token
   ├─ Verifies signature with SECRET_KEY
   ├─ Checks expiration time
   ├─ Checks not in blacklist
   └─ Allows request if valid

3. LOGOUT
   ├─ Add token to blacklist collection
   └─ Token can't be used anymore
```

---

## 🗄️ Database Operations

### **4 Types of Queries:**

**1. Simple CRUD**
```python
# Create
result = mongo.db["breaches"].insert_one(document)

# Read
breach = mongo.db["breaches"].find_one({"_id": ObjectId(id)})

# Update
mongo.db["breaches"].update_one(
    {"_id": ObjectId(id)},
    {"$set": {"status": "contained"}}
)

# Delete
mongo.db["breaches"].delete_one({"_id": ObjectId(id)})
```

**2. Geospatial Queries** (Find breaches near a location)
```python
breaches = mongo.db["breaches"].find({
    "location": {
        "$near": {
            "$geometry": {"type": "Point", "coordinates": [lon, lat]},
            "$maxDistance": 500000  # 500km radius
        }
    }
})
```

**3. Aggregation Pipelines** (Statistics)
```python
# Group by industry, calculate average risk
pipeline = [
    {"$group": {
        "_id": "$industry",
        "avg_risk": {"$avg": "$risk_score"},
        "total": {"$sum": 1}
    }},
    {"$sort": {"avg_risk": -1}}
]
results = mongo.db["breaches"].aggregate(pipeline)
```

**4. Sub-document Operations** (Nested arrays)
```python
# Add to nested array
mongo.db["breaches"].update_one(
    {"_id": ObjectId(id)},
    {"$push": {"affected_accounts": new_account}}
)

# Update specific array element
mongo.db["breaches"].update_one(
    {"_id": ObjectId(id), "affected_accounts.account_id": acc_id},
    {"$set": {"affected_accounts.$.email": new_email}}
)
```

---

## 🔧 Key Components Connection

### **Extensions** (`app/extensions.py`)
Shared instances used across the app:

```python
from flask_pymongo import PyMongo
from flask_cors import CORS
from flask_limiter import Limiter
from flask_caching import Cache

mongo = PyMongo()      # MongoDB connection
cors = CORS()          # Cross-Origin Resource Sharing
limiter = Limiter()    # Rate limiting
cache = Cache()        # Response caching
```

All initialized in `create_app()`:
```python
mongo.init_app(app)    # Connect to MongoDB
cors.init_app(app)     # Enable CORS
limiter.init_app(app)  # Setup rate limits
```

### **Middleware** (`app/middleware/`)
Decorators that wrap route functions:

```python
@require_auth           # Check JWT token
@require_role("admin")  # Check user role
def admin_function():
    # Only executes if auth + role checks pass
    pass
```

### **Utilities** (`app/utils/`)
Helper functions used everywhere:

```python
# Response formatting
success_response(data, status_code)  # {"status": "success", "data": ...}
error_response(message, status_code) # {"status": "error", "message": ...}

# Input sanitization
sanitize_mongo_input(data)  # Remove NoSQL injection ($, regex)
sanitize_html(text)         # Clean XSS attacks

# Validation
is_valid_email(email)
is_valid_object_id(id)
```

---

## 📊 Example: Complete Data Flow

**User wants to see breach risk by industry:**

```
GET /api/v1/analytics/risk-by-industry
    ↓
analytics.py route
    ├─ Check authentication
    ├─ Call analytics_service.get_risk_by_industry()
    ↓
analytics_service.py
    ├─ Build aggregation pipeline:
    │  [
    │    {$group: {_id: "$industry", avg_risk: {$avg: "$risk_score"}}},
    │    {$sort: {avg_risk: -1}}
    │  ]
    ├─ Execute: mongo.db["breaches"].aggregate(pipeline)
    ├─ Format results
    └─ Return data
    ↓
Route formats response:
    {
      "status": "success",
      "data": [
        {"industry": "Finance", "avg_risk": 87.5},
        {"industry": "Healthcare", "avg_risk": 82.3},
        ...
      ]
    }
```

---

## 🎯 Why This Architecture?

✅ **Separation of Concerns:** Each layer has one job
✅ **Easy Testing:** Test each layer independently
✅ **Maintainable:** Change database without touching routes
✅ **Scalable:** Add new endpoints without breaking existing ones
✅ **Secure:** Security checks at multiple layers
✅ **Reusable:** Services used by multiple routes

---

## 📝 Quick Reference

| Component | Location | Purpose |
|-----------|----------|---------|
| **App Factory** | `app/__init__.py` | Creates and configures Flask app |
| **Routes** | `app/routes/*.py` | Handle HTTP requests/responses |
| **Services** | `app/services/*.py` | Business logic + database operations |
| **Models** | `app/models/*.py` | Data validation schemas |
| **Extensions** | `app/extensions.py` | Shared instances (mongo, cors, etc.) |
| **Middleware** | `app/middleware/*.py` | Auth, logging, security headers |
| **Utils** | `app/utils/*.py` | Helper functions |

---

## 🚀 The Bottom Line

**BreachLens backend is like a production line:**

1. **Request arrives** at Flask
2. **Middleware checks** authentication & authorization
3. **Routes extract** data from request
4. **Services process** business logic
5. **MongoDB stores** or retrieves data
6. **Response travels back** through the layers
7. **Client receives** formatted JSON

Each layer only talks to the layer directly below it. This makes the code organized, testable, and professional.

---

**That's it!** The backend is a well-organized system where each component has a clear job, and they all work together smoothly. 🎯
