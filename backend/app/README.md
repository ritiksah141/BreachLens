# BreachLens Application Package

**Core Flask application package for BreachLens API.**

---

## 📁 Structure

```
app/
├── __init__.py           # Flask application factory
├── config.py             # Configuration classes (Development, Testing)
├── extensions.py         # Flask extension instances (MongoDB, CORS, etc.)
├── swagger_spec.py       # Swagger/OpenAPI documentation template
├── routes/               # REST API blueprints (6 modules)
├── services/             # Business logic layer (4 services)
├── models/               # Data validation schemas (2 modules)
├── middleware/           # Request/response middleware (3 modules)
└── utils/                # Helper functions (6 modules)
```

---

## 🏗️ Application Factory

The application uses the **Factory Pattern** via `create_app()` in [__init__.py](__init__.py).

### **Usage**
```python
from app import create_app

app = create_app("development")  # or "testing"
```

### **Initialization Flow**
1. Load configuration from `config.py`
2. Initialize Flask extensions (MongoDB, CORS, rate limiting, caching)
3. Configure Swagger UI at `/api/docs`
4. Register blueprints from `routes/`
5. Create database indexes
6. Register error handlers
7. Initialize middleware (logging, security headers)

---

## ⚙️ Configuration (`config.py`)

### **Available Configurations**

#### **Development (`DevelopmentConfig`)**
- Debug mode enabled
- Local MongoDB: `mongodb://localhost:27017/breachlens`
- CORS: `http://localhost:4200`
- Rate limiting: 200/day, 50/hour

#### **Testing (`TestingConfig`)**
- Testing mode enabled
- Test database: `mongodb://localhost:27017/breachlens_test`
- Rate limiting disabled
- JWT expires in 1 hour

### **Environment Variables**
```bash
# Required
SECRET_KEY=your-secret-key-min-32-chars
MONGO_URI=mongodb://localhost:27017/breachlens

# Optional
JWT_ACCESS_TOKEN_EXPIRES=3600  # seconds
CORS_ORIGINS=http://localhost:4200,http://localhost:8080
RATELIMIT_STORAGE_URL=redis://localhost:6379
RATELIMIT_ENABLED=true
MAX_LOGIN_ATTEMPTS=5
LOCKOUT_DURATION_MINUTES=15
```

---

## 🔌 Extensions (`extensions.py`)

Centralized Flask extension instances:

| Extension | Purpose | Import |
|-----------|---------|--------|
| **mongo** | MongoDB connection via PyMongo | `from app.extensions import mongo` |
| **cors** | Cross-Origin Resource Sharing | `from app.extensions import cors` |
| **limiter** | Rate limiting | `from app.extensions import limiter` |
| **cache** | Response caching | `from app.extensions import cache` |

**Note:** JWT authentication uses raw `PyJWT` library (no Flask-JWT extension).

---

## 🗺️ Architecture

### **Layered Design**

```
Request → Middleware → Routes → Services → Models → MongoDB
                ↓
           Response ← Utils ←────────┘
```

1. **Routes** (`routes/`) - HTTP endpoints, request validation, response formatting
2. **Services** (`services/`) - Business logic, database operations
3. **Models** (`models/`) - Data validation schemas
4. **Middleware** (`middleware/`) - Authentication, logging, security
5. **Utils** (`utils/`) - Reusable helper functions

### **Key Principles**
- ✅ **Separation of Concerns**: Routes handle HTTP, services handle logic
- ✅ **Thin Routes**: All business logic lives in services
- ✅ **Schema Validation**: Centralized in models, not scattered across routes
- ✅ **Error Handling**: Consistent JSON error responses
- ✅ **Security First**: Input sanitization, NoSQL injection prevention, RBAC

---

## 📡 API Documentation

### **Swagger UI**
- **URL**: `http://localhost:5001/api/docs`
- **Spec**: Defined in [swagger_spec.py](swagger_spec.py)
- **Format**: OpenAPI 3.0
- **Interactive**: Test endpoints directly from browser

### **Endpoint Summary**
- **Authentication**: 8 endpoints
- **Breaches**: 35 endpoints (CRUD + geospatial + sub-documents + tactical)
- **Analytics**: 11 endpoints (aggregation pipelines + trends)
- **Users**: 4 endpoints (profile management)
- **Admin**: 7 endpoints (user management, bulk operations, audit)
- **Health**: 3 endpoints (liveness, readiness)

---

## 🔒 Security Features

### **Authentication & Authorization**
- JWT-based authentication
- Role-based access control (RBAC): `admin`, `analyst`, `guest`
- Token blacklisting on logout
- HTTP Basic Auth support (for COM661 module requirement)

### **Input Validation & Sanitization**
- NoSQL injection prevention (strip `$` operators)
- HTML/XSS sanitization via Bleach
- Regex escaping for text search
- Strict schema validation

### **Rate Limiting**
- Global: 200 requests/day, 50/hour
- Sensitive endpoints: 5 requests/15 minutes
- Storage: In-memory or Redis

### **Account Protection**
- Account lockout after 5 failed login attempts
- 15-minute lockout duration
- Failed attempt counter per user

### **Audit Logging**
- All authentication events logged
- Security events tracked (failed logins, lockouts)
- IP anonymization option (GDPR compliance)

---

## 🚀 Running the Application

### **Development Server**
```bash
# From backend directory
source ../venv/bin/activate
python run.py
```

**API available at:** `http://localhost:5001`
**Docs available at:** `http://localhost:5001/api/docs`

### **Testing**
```bash
pytest tests/ -v
```

### **With Custom Configuration**
```bash
FLASK_ENV=testing python run.py
```

---

## 📚 Module Reference

| Module | Description | README |
|--------|-------------|--------|
| [routes/](routes/) | REST API endpoints (blueprints) | [README](routes/README.md) |
| [services/](services/) | Business logic layer | [README](services/README.md) |
| [models/](models/) | Data validation schemas | [README](models/README.md) |
| [middleware/](middleware/) | Request/response middleware | [README](middleware/README.md) |
| [utils/](utils/) | Helper functions | [README](utils/README.md) |

---

## 🔧 Development Guidelines

### **Adding a New Endpoint**
1. Define route in `routes/` (thin controller)
2. Implement logic in `services/` (business logic)
3. Add validation schema in `models/` (if needed)
4. Write tests in `tests/`
5. Update Swagger documentation

### **Adding a New Service Method**
1. Add method to appropriate service class
2. Keep MongoDB operations in service layer
3. Return tuples for error handling: `(result, error_message)`
4. Use dependency injection (pass collections as needed)

### **Security Checklist**
- [ ] Validate all user input
- [ ] Sanitize HTML/text fields
- [ ] Check authentication with `@jwt_required`
- [ ] Check authorization with `@admin_required` or `@require_role(...)`
- [ ] Add rate limiting for sensitive endpoints
- [ ] Log security-relevant events

---

## 📊 Statistics

- **Total Endpoints**: 68
- **Test Coverage**: 88%
- **Services**: 4 (Auth, Breach, User, Analytics)
- **Routes**: 6 blueprints
- **Middleware**: 3 modules
- **Utils**: 6 modules

---

## 🐛 Troubleshooting

### **MongoDB Connection Errors**
```bash
# Check MongoDB is running
brew services list  # macOS
sudo systemctl status mongod  # Linux

# Test connection
mongosh --eval "db.adminCommand('ping')"
```

### **Import Errors**
```bash
# Ensure virtual environment is activated
source ../venv/bin/activate

# Reinstall dependencies
pip install -r requirements.txt
```

### **Port Already in Use**
```bash
# Kill process on port 5001
lsof -ti:5001 | xargs kill -9
```

---

## 📝 Notes

- All datetime values use ISO 8601 format (UTC)
- MongoDB ObjectIds automatically serialized to strings in JSON responses
- Rate limiting uses in-memory storage by default (Redis recommended for production)
- CORS configured for `http://localhost:4200` (Angular dev server)
