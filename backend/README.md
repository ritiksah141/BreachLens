# BreachLens Backend API

[![Tests](https://img.shields.io/badge/Tests-104%20passing-brightgreen.svg)](tests/)
[![Coverage](https://img.shields.io/badge/Coverage-48%25-yellow.svg)](../evidence/backend/pytest-coverage-report/)
[![Python](https://img.shields.io/badge/Python-3.11+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)

**Production-grade RESTful API for breach intelligence tracking.**

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
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/breachlens 
JWT_SECRET_KEY=your-secret-key-min-32-chars
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
│   │   ├── auth.py               # Authentication (5 endpoints)
│   │   ├── breaches.py           # Breach CRUD (22 endpoints)
│   │   ├── analytics.py          # Aggregations (10 endpoints)
│   │   ├── users.py              # User management (7 endpoints)
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
├── tests/                        # Test suite (104 tests)
│   ├── conftest.py               # pytest fixtures
│   ├── test_auth.py              # Auth tests (11)
│   ├── test_breaches.py          # Breach CRUD tests (21)
│   ├── test_subdocuments.py      # Sub-document tests (17)
│   ├── test_security.py          # Security tests (40)
│   ├── test_analytics.py         # Analytics tests
│   └── test_performance.py       # Integration tests (14)
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
├── .env                          # Environment variables (gitignored)
└── generate_newman_report.sh    # Automated Newman testing
```

---

## 🧪 Testing

### **Run All Tests**
```bash
source ../venv/bin/activate
pytest tests/ -v

# Expected: 104 passed, 1 skipped, 14 deselected, 1 warning
```

### **Test Breakdown**
| Module | Tests | Coverage |
|--------|-------|----------|
| test_auth.py | 11 | Authentication & JWT |
| test_breaches.py | 21 | Breach CRUD operations |
| test_subdocuments.py | 17 | Sub-document arrays |
| test_security.py | 40 | Security features |
| test_analytics.py | ~10 | Aggregation pipelines |
| test_performance.py | 14 | Integration tests (optional) |

### **Generate Coverage Report**
```bash
pytest tests/ --cov=app --cov-report=html --cov-report=json
open htmlcov/index.html
```

### **Run Newman API Tests**
```bash
./generate_newman_report.sh
# Generates: ../evidence/backend/newman-report.html
```

### **Run Specific Test Modules**
```bash
pytest tests/test_auth.py -v              # Auth only
pytest tests/test_breaches.py -v          # Breaches only
pytest tests/test_security.py -v          # Security only
pytest tests/ -m integration              # Integration tests
```

---

## 📡 API Endpoints (51 Total)

### **Base URL**: `http://localhost:5001/api/v1`

### **Authentication** (5 endpoints)
```
POST   /auth/register          # Register new user
POST   /auth/login             # Login with JWT
POST   /auth/refresh           # Refresh access token
POST   /auth/logout            # Logout (revoke token)
GET    /auth/me                # Get current user profile
```

### **Breaches** (22 endpoints)
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

### **Users** (7 endpoints)
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
1. POST /auth/login → Returns access_token + refresh_token
2. Use access_token in header: Authorization: Bearer <token>
3. Access token expires in 1 hour
4. POST /auth/refresh with refresh_token → Get new access_token
5. POST /auth/logout → Revoke tokens (Redis blacklist)
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
# Database
MONGO_URI=mongodb+srv://...                 # MongoDB connection
MONGO_MAX_POOL_SIZE=50                      # Connection pool
MONGO_MIN_POOL_SIZE=10

# Security
SECRET_KEY=your-secret-key                  # Flask secret
JWT_SECRET_KEY=jwt-secret-key               # JWT signing
JWT_ACCESS_TOKEN_EXPIRES=3600               # 1 hour
JWT_REFRESH_TOKEN_EXPIRES=2592000           # 30 days
PASSWORD_RESET_SECRET=reset-secret

# Redis (optional)
REDIS_URL=redis://localhost:6379/0          # Token blacklist + caching

# Security
MAX_LOGIN_ATTEMPTS=5                        # Account lockout
ACCOUNT_LOCKOUT_DURATION=900                # 15 minutes

# Observability
SENTRY_DSN=https://...                      # Error tracking
PROMETHEUS_ENABLED=true                     # Metrics endpoint
LOG_LEVEL=INFO                              # Logging level

# Email (for password reset)
EMAIL_ENABLED=false                         # Enable email
EMAIL_BACKEND=console                       # console|smtp|sendgrid
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USERNAME=your-email
SMTP_PASSWORD=your-password

# Application
FLASK_ENV=development                       # development|production
PORT=5001                                   # API port
CORS_ORIGINS=http://localhost:4200          # Frontend URL
```

See `.env.example` for complete list.

---

## 📊 Monitoring

### **Health Checks**
```bash
# Basic health
curl http://localhost:5001/health

# Readiness (DB + dependencies)
curl http://localhost:5001/health/ready

# Liveness
curl http://localhost:5001/health/live
```

### **Prometheus Metrics**
```bash
# Available at:
http://localhost:5001/metrics

# Metrics include:
# - Request count/rate by endpoint
# - Response times (percentiles)
# - Error rates
# - Active requests
# - Application info
```

### **Structured Logging**
```bash
# Logs output to:
logs/breachlens.log               # Application logs
logs/audit.log                    # Audit trail (security events)

# JSON format for CloudWatch/Datadog
{"timestamp": "...", "level": "INFO", "message": "..."}
```

---

## 🛡️ Security Features

- ✅ **JWT + Refresh Tokens** - 1-hour access tokens, 30-day refresh
- ✅ **Token Blacklist** - Redis-based revocation
- ✅ **Account Lockout** - 5 failed attempts = 15 min lockout
- ✅ **Password Reset** - Secure token-based flow
- ✅ **BCrypt Hashing** - 12 salt rounds
- ✅ **Input Validation** - All fields validated server-side
- ✅ **NoSQL Injection Protection** - Query parameter sanitization
- ✅ **XSS Protection** - HTML content sanitization
- ✅ **Security Headers** - CSP, X-Frame-Options, HSTS, X-Content-Type-Options
- ✅ **Rate Limiting** - 100 req/min on auth endpoints
- ✅ **Audit Logging** - All auth events logged
- ✅ **CORS** - Configured per environment

---

## 🚀 Deployment

### **MongoDB Atlas**
```bash
1. Create free tier cluster at mongodb.com/atlas
2. Create database user
3. Whitelist IP: 0.0.0.0/0
4. Get connection string
5. Set MONGO_URI in .env
```

### **Heroku**
```bash
heroku create breachlens-api
heroku addons:create mongolab:sandbox
heroku addons:create redistogo:nano
heroku config:set JWT_SECRET_KEY=$(openssl rand -hex 32)
heroku config:set PASSWORD_RESET_SECRET=$(openssl rand -hex 32)
git push heroku main
```

### **Docker** (Optional)
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
CMD ["gunicorn", "-b", "0.0.0.0:5001", "run:app"]
```

---

## 🐛 Troubleshooting

### **MongoDB Connection Failed**
```bash
# Check MONGO_URI format:
mongodb+srv://username:password@cluster.mongodb.net/breachlens

# Test connection:
python -c "from pymongo import MongoClient; MongoClient('YOUR_URI').server_info()"
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

### **Redis Warnings**
```bash
# Redis is optional - graceful degradation if unavailable
# Token blacklist and caching will be disabled

# To fix (optional):
brew install redis          # macOS
redis-server                # Start Redis
```

---

## 📚 Additional Resources

- **API Reference**: [../docs/API_SPEC.md](../docs/API_SPEC.md)
- **Testing Guide**: [tests/README.md](tests/README.md)
- **Production Guide**: [../docs/IMPROVEMENTS.md](../docs/IMPROVEMENTS.md)
- **Submission Checklist**: [SUBMISSION_READY.md](SUBMISSION_READY.md)

---


**Status**: ✅ Production Ready | 104/104 tests passing
**API Version**: v1.0.0
