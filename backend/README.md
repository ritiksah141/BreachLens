# BreachLens Backend API

[![Tests](https://img.shields.io/badge/Tests-586%20passing-brightgreen.svg)](tests/)
[![Coverage](https://img.shields.io/badge/Coverage-88%25-brightgreen.svg)](htmlcov/)
[![Python](https://img.shields.io/badge/Python-3.14-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)

**RESTful API for breach intelligence tracking (COM661 coursework).**

---

## 🚀 Quick Start

### **1. Setup Environment**
```bash
# From project root
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

cd backend
pip install -r requirements.txt
```

### **2. Configure Environment**
```bash
# Copy example environment file
cp .env.example .env

# Edit .env with your settings
nano .env
```

**Required Variables:**
```bash
MONGO_URI=mongodb://localhost:27017/breachlens
SECRET_KEY=your-secret-key-min-32-chars
PASSWORD_RESET_SECRET=another-secret-key
```

### **3. Seed Database**
```bash
python seed/seed_data.py --reset
```

### **4. Run API**
```bash
python run.py
# API: http://localhost:5001
# Docs: http://localhost:5001/api/docs
```

---

## 📂 Project Structure

```
backend/
├── app/                          # Application package
│   ├── __init__.py               # Flask app factory
│   ├── config.py                 # Configuration classes
│   ├── extensions.py             # Flask extensions
│   ├── swagger_spec.py           # API documentation
│   ├── routes/                   # REST endpoints
│   │   ├── auth.py               # Authentication (8 endpoints)
│   │   ├── breaches.py           # Breach CRUD (32 endpoints)
│   │   ├── analytics.py          # Aggregations (10 endpoints)
│   │   ├── users.py              # User management (4 endpoints)
│   │   ├── admin.py              # Admin operations (6 endpoints)
│   │   └── health.py             # Health checks (3 endpoints)
│   ├── services/                 # Business logic layer
│   │   ├── auth_service.py       # Authentication logic
│   │   ├── breach_service.py     # Breach operations
│   │   ├── analytics_service.py  # Aggregation pipelines
│   │   └── user_service.py       # User management
│   ├── middleware/               # Request/response handling
│   │   ├── auth_middleware.py    # JWT + RBAC decorators
│   │   ├── request_logging.py    # Request logging
│   │   └── security_headers.py   # Security headers
│   └── utils/                    # Helper functions
│       ├── validators.py         # Input validation
│       ├── response.py           # Response builders
│       ├── geo_utils.py          # GeoJSON utilities
│       ├── audit.py              # Audit logging
│       └── email.py              # Email utilities
├── tests/                        # Test suite (586 tests)
│   ├── conftest.py               # pytest fixtures
│   ├── test_auth.py              # Auth endpoint tests (11)
│   ├── test_breaches.py          # Breach CRUD route tests (21)
│   ├── test_subdocuments.py      # Sub-document route tests (31)
│   ├── test_security.py          # Security feature tests (40)
│   ├── test_analytics.py         # Analytics endpoint tests (~10)
│   ├── test_breach_service.py    # BreachService mock tests (~50)
│   ├── test_models.py            # Schema & validator tests (~140)
│   ├── test_services_integration.py # Service layer integration tests (~200)
│   ├── test_admin.py             # Admin route tests (~25)
│   ├── test_users.py             # User route tests (~30)
│   └── test_performance.py       # Performance benchmarks (14, deselected)
├── seed/                         # Database seeding
│   ├── seed_data.py              # Seed script (25+ breaches)
│   └── breaches_hybrid.json      # Sample data
├── postman/                      # API testing
│   ├── BreachLens.postman_collection.json
│   └── BreachLens.postman_environment.json
├── logs/                         # Application logs
├── run.py                        # App entry point
├── requirements.txt              # Python dependencies
├── pytest.ini                    # pytest configuration
└── .env                          # Environment variables (gitignored)
```

---

## 🧪 Testing

### **Run All Tests**
```bash
source ../venv/bin/activate
pytest tests/ -v

# Expected: 586 passed, 2 skipped, 14 deselected, 1 warning in ~5s
```

### **Test Breakdown**
| Module | Tests | Focus |
|--------|-------|-------|
| test_auth.py | 11 | Authentication & JWT endpoints |
| test_breaches.py | 21 | Breach CRUD route operations |
| test_subdocuments.py | 31 | All 4 sub-document arrays |
| test_security.py | 40 | NoSQL injection, XSS, lockout |
| test_analytics.py | ~10 | Aggregation pipeline endpoints |
| test_breach_service.py | ~50 | BreachService logic (mock-based) |
| test_models.py | ~140 | Schema validators + utility functions |
| test_services_integration.py | ~200 | All services via mongomock (no mocks) |
| test_admin.py | ~25 | Admin routes & RBAC |
| test_users.py | ~30 | User profile & management routes |
| test_performance.py | 14 | Integration benchmarks (deselected) |

### **Generate Coverage Report**
```bash
pytest tests/ --cov=app --cov-report=html --cov-report=term
open htmlcov/index.html
```

### **Run Specific Test Modules**
```bash
pytest tests/test_auth.py -v              # Auth only
pytest tests/test_breaches.py -v          # Breaches only
pytest tests/test_security.py -v          # Security only
pytest tests/ -m integration              # Integration tests
```

---

## 📡 API Endpoints (63 Total)

### **Base URL**: `http://localhost:5001/api/v1`

### **Authentication** (8 endpoints)
```
GET    /login                  # Login via HTTP Basic Auth (module requirement)
POST   /auth/register          # Register new user
POST   /auth/login             # Login with JSON body
POST   /auth/logout            # Logout (blacklist token in MongoDB)
GET    /auth/me                # Get current user profile
```

### **Breaches** (32 endpoints)
```
GET    /breaches               # List breaches (paginated, filtered)
POST   /breaches               # Create breach [Analyst/Admin]
GET    /breaches/{id}          # Get single breach
PUT    /breaches/{id}          # Full update [Analyst/Admin]
PATCH  /breaches/{id}          # Partial update [Analyst/Admin]
DELETE /breaches/{id}          # Delete breach [Admin]
GET    /breaches/exposure-check # Check email/domain exposure

# Sub-documents (20 endpoints):
# - /breaches/{id}/accounts/* (5 endpoints)
# - /breaches/{id}/timeline/* (5 endpoints)
# - /breaches/{id}/remediation/* (5 endpoints)
# - /breaches/{id}/alerts/* (5 endpoints)

# Geospatial (3 endpoints):
GET    /breaches/geo/near      # Find breaches near coordinates
GET    /breaches/geo/within-bounds # Bounding box search
GET    /breaches/geo/geojson   # GeoJSON FeatureCollection
```

### **Analytics** (10 endpoints)
```
GET    /analytics/risk-by-industry      # Risk scores per industry
GET    /analytics/severity-breakdown    # Breaches by severity
GET    /analytics/monthly-trend         # Time series data
GET    /analytics/top-organisations     # Most affected orgs
GET    /analytics/data-types-frequency  # Exposed data types
GET    /analytics/remediation-rate      # Completion rates
GET    /analytics/alert-acknowledgement # Alert stats
GET    /analytics/summary               # Dashboard summary
```

### **Users** (4 endpoints)
```
GET    /users                  # List all users [Admin]
GET    /users/me               # Current user profile
PATCH  /users/me               # Update profile
PATCH  /users/{id}/role        # Change role [Admin]
PATCH  /users/{id}/activate    # Activate user [Admin]
PATCH  /users/{id}/deactivate  # Deactivate user [Admin]
DELETE /users/{id}             # Delete user [Admin]
```

### **Admin** (6 endpoints)
```
GET    /admin/stats            # System statistics [Admin]
GET    /admin/users            # User management [Admin]
GET    /admin/audit-logs       # Audit trail [Admin]
POST   /admin/cache/clear      # Clear cache [Admin]
POST   /admin/indexes/rebuild  # Rebuild indexes [Admin]
GET    /admin/health/detailed  # Detailed health check [Admin]
```

### **Health** (3 endpoints)
```
GET    /health                 # Basic health check
GET    /health/ready           # Readiness check (DB + Redis)
GET    /health/live            # Liveness check
```

📖 **Full API Documentation**: [../docs/API_SPEC.md](../docs/API_SPEC.md)

---

## 🔐 Authentication

### **JWT Token Flow**
```
1. GET  /api/v1/login with Basic Auth header → Returns {"token": "...", "token_type": "JWT"}
2. Use token in header: x-access-token: <token>
3. Token expires in 1 hour
4. POST /auth/logout → Token added to MongoDB blacklist collection
5. No refresh tokens — re-login required after expiry
```

### **Role-Based Access Control**
| Role | Access Level | Can Create | Can Update | Can Delete |
|------|-------------|------------|------------|------------|
| **Admin** | Full | ✅ All | ✅ All | ✅ All |
| **Analyst** | Read + Write | ✅ Breaches | ✅ Own records | ❌ No |
| **Guest** | Read-only (limited) | ❌ No | ❌ No | ❌ No |

### **Default Test Credentials**
```
Admin:   admin@breachlens.io   / Admin@123
Analyst: priya@breachlens.io   / Analyst@123
Guest:   marcus@example.com    / Guest@123
```

---

## 🗄️ Database Schema

### **Collections**
1. **breaches** - Breach records with sub-documents
2. **users** - User accounts and roles

### **Indexes**
```python
# breaches collection:
location: 2dsphere                           # Geospatial queries
(severity, status, industry): compound       # Filtering
(title, description): text                   # Full-text search
risk_score: descending                       # Sorting
breach_date: descending                      # Sorting
organisation.domain: ascending               # Lookups

# users collection:
email: unique                                # Authentication
username: unique                             # Registration
(email, locked_until): compound              # Account lockout
(email, failed_login_attempts): compound     # Security
password_reset_token: sparse                 # Reset flow
```

### **Sub-documents**
Each breach contains 4 embedded arrays:
- **affected_accounts[]** - Exposed email/username records
- **timeline[]** - Breach lifecycle events
- **remediation[]** - Response actions
- **monitoring_alerts[]** - Automated threat signals

---

## 🔧 Configuration

### **Environment Variables**
```bash
# Database (local MongoDB only)
MONGO_URI=mongodb://localhost:27017/breachlens

# Security
SECRET_KEY=your-secret-key                  # Flask + JWT signing
JWT_ACCESS_TOKEN_EXPIRES=3600               # 1 hour
PASSWORD_RESET_SECRET=reset-secret

# Security
MAX_LOGIN_ATTEMPTS=5                        # Account lockout
ACCOUNT_LOCKOUT_DURATION=900                # 15 minutes

# Email (for password reset)
EMAIL_ENABLED=false                         # Enable email
EMAIL_BACKEND=console                       # console for development

# Application
FLASK_ENV=development
PORT=5001                                   # API port
CORS_ORIGINS=http://localhost:4200          # Frontend URL
LOG_LEVEL=INFO
```

See `.env.example` for complete list.

---

## 📊 Health Checks

```bash
# Basic health
curl http://localhost:5001/health

# Readiness (DB)
curl http://localhost:5001/health/ready

# Liveness
curl http://localhost:5001/health/live
```

### **Structured Logging**
```bash
# Logs output to:
logs/breachlens.log               # Application logs
logs/audit.log                    # Audit trail (security events)
```

---

## 🛡️ Security Features

- ✅ **JWT (raw PyJWT)** - 1-hour access tokens, x-access-token header
- ✅ **Token Blacklist** - MongoDB-based revocation (blacklist collection)
- ✅ **Account Lockout** - 5 failed attempts = 15 min lockout
- ✅ **Password Reset** - Secure token-based flow
- ✅ **BCrypt Hashing** - 12 salt rounds
- ✅ **Input Validation** - All fields validated server-side
- ✅ **NoSQL Injection Protection** - Query parameter sanitization
- ✅ **XSS Protection** - HTML content sanitization
- ✅ **Security Headers** - CSP, X-Frame-Options, X-Content-Type-Options
- ✅ **Rate Limiting** - 100 req/min on auth endpoints
- ✅ **Audit Logging** - All auth events logged
- ✅ **CORS** - Configured per environment

---

## 🚀 Running Locally

### **Local MongoDB**
```bash
# macOS (Homebrew)
brew tap mongodb/brew
brew install mongodb-community
brew services start mongodb-community

# Verify
mongosh --eval "db.version()"

# Connection string (already set in .env.example)
MONGO_URI=mongodb://localhost:27017/breachlens
```

---

## 🐛 Troubleshooting

### **MongoDB Connection Failed**
```bash
# Check mongod is running:
brew services list | grep mongodb
# or
pgrep mongod

# Check MONGO_URI in .env:
cat .env | grep MONGO_URI
# Should be: mongodb://localhost:27017/breachlens

# Test connection:
python -c "from pymongo import MongoClient; MongoClient('mongodb://localhost:27017').server_info()"
```

### **Tests Failing**
```bash
# Ensure venv is activated:
source ../venv/bin/activate

# Update dependencies:
pip install -r requirements.txt

# Run without integration tests:
pytest tests/ -m "not integration"
```

---

## 📚 Additional Resources

- **API Reference**: [../docs/API_SPEC.md](../docs/API_SPEC.md)
- **Testing Guide**: [tests/README.md](tests/README.md)

---


**Status**: ✅ 586/586 tests passing | 88% code coverage
**API Version**: v1.0.0
