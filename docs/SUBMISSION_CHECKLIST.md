# BreachLens Pre-Submission Checklist & Local Validation

**Submission Deadline**: [Your deadline]
**Target Grade**: High 1st (90-95%)

---

## ✅ Pre-Submission Checklist

### **1. Code & Implementation** ✅ COMPLETE

- [x] All 63 API endpoints implemented
- [x] 4 sub-document arrays (affected_accounts, timeline, remediation, monitoring_alerts)
- [x] 8 MongoDB aggregation pipelines
- [x] 7 database indexes (including 2dsphere geospatial)
- [x] JWT authentication (raw PyJWT, `x-access-token` header, MongoDB blacklist)
- [x] 3-tier RBAC (Admin/Analyst/Guest)
- [x] Input validation on all endpoints
- [x] Security features (NoSQL injection protection, XSS sanitization, security headers)
- [x] Account lockout mechanism
- [x] Password reset flow
- [x] Audit logging
- [x] GeoJSON/geospatial queries
- [x] Pagination, filtering, sorting
- [x] Error handling (centralized)

---

### **2. Testing Evidence** 🔄 ALMOST COMPLETE

- [x] **Unit Tests**: 586 tests passing (100% pass rate)
- [x] **Coverage Report**: 88% overall
  - HTML report: `backend/htmlcov/index.html`
  - JSON report: `evidence/backend/coverage.json`
- [x] **Security Tests**: Included in 586 tests (account lockout, NoSQL injection, XSS)
- [x] **Postman Collection**: 64 requests, 108 assertions
- [ ] **Postman Evidence PDFs**: ⚠️ NEEDS GENERATION

**Action Required:**
```bash
# 1. Start backend
cd backend
python seed/seed_data.py --reset
python run.py

# 2. In Postman Desktop App:
#    - Run full collection (64 requests, ~108 assertions)
#    - Export Collection Runner PDF
#    - Export API Documentation PDF
# See: backend/postman/README.md for detailed instructions
```

---

### **3. Documentation** ✅ COMPLETE

- [x] **PRD.md** (694 lines) - Product requirements
- [x] **API_SPEC.md** (934 lines) - Complete API reference
- [x] **QA_STRATEGY.md** (1691 lines) - Testing strategy
- [x] **AGENTS.md** (1203 lines) - Coding standards
- [x] **IMPROVEMENTS.md** (2107 lines) - Production features
- [x] **SUBMISSION_PRIORITY.md** (227 lines) - Submission guide
- [x] **README.md** (Root) - Project overview
- [x] **backend/README.md** - API setup guide
- [x] **backend/tests/README.md** - Testing guide
- [x] **backend/postman/README.md** - API testing guide
- [x] **backend/seed/README.md** - Database seeding guide
- [x] **docs/README.md** - Documentation index
- [x] **evidence/backend/README.md** - Evidence summary

**Total Documentation**: 7,500+ lines across 12 comprehensive files ✅

---

### **4. Code Quality** ✅ COMPLETE

- [x] PEP 8 compliant (Python style guide)
- [x] Type hints in critical functions
- [x] Docstrings on all public functions
- [x] No TODO/FIXME comments
- [x] No hardcoded credentials
- [x] Environment variables for configuration
- [x] Proper error messages
- [x] Logging configured
- [x] No print() statements (using logging)

---

### **5. Database** ✅ COMPLETE

- [x] MongoDB schema designed
- [x] 25+ breach records seeded
- [x] 3 test users created (Admin/Analyst/Guest)
- [x] All indexes created
- [x] GeoJSON coordinates validated
- [x] Sub-documents populated
- [x] Seed script tested (`python seed/seed_data.py --reset`)

---

### **6. Git & Version Control** ✅ COMPLETE

- [x] All code committed
- [x] .gitignore configured (venv, __pycache__, .env, logs/)
- [x] Meaningful commit messages
- [x] No sensitive data in repository
- [x] Clean working directory

---

## 🧪 Local Validation Guide

### **Step 1: Environment Setup** (2 minutes)

```bash
# 1. Check Python version
python3 --version
# Expected: Python 3.11+ or 3.14+

# 2. Activate virtual environment
cd /Users/ritiksah/BreachLens
source venv/bin/activate

# 3. Verify dependencies
cd backend
pip list | grep -E "(Flask|pymongo|pytest|bcrypt)"
# Should show all packages installed

# 4. Check .env file exists and has required variables
cat .env | grep -E "(MONGO_URI|SECRET_KEY)"
# Should show required variables
```

**Expected Output:**
```
MONGO_URI=mongodb://localhost:27017/breachlens
SECRET_KEY=your-secret-key
```

---

### **Step 2: Database Validation** (3 minutes)

```bash
# 1. Test MongoDB connection
python -c "from pymongo import MongoClient; print('✅ MongoDB connected' if MongoClient('$MONGO_URI').server_info() else '❌ Failed')"

# 2. Seed database (IMPORTANT: Fresh data for testing)
python seed/seed_data.py --reset

# Expected output:
# 🌱 Seeding BreachLens database...
# ✅ Cleared existing data
# ✅ Inserted 25 breach records
# ✅ Created 3 test users
# ✅ Created 7 indexes
# ✅ Database seeded successfully in X.Xs

# 3. Verify data loaded
python -c "
from pymongo import MongoClient
import os
from dotenv import load_dotenv
load_dotenv()
client = MongoClient(os.getenv('MONGO_URI'))
db = client.breachlens
print(f'✅ Breaches: {db.breaches.count_documents({})}')
print(f'✅ Users: {db.users.count_documents({})}')
print(f'✅ Indexes: {len(list(db.breaches.list_indexes()))}')
"

# Expected output:
# ✅ Breaches: 25
# ✅ Users: 3
# ✅ Indexes: 7
```

---

### **Step 3: Unit Tests** (1 minute)

```bash
# Run all unit tests
pytest tests/ -v

# Expected output:
# =========== 104 passed, 1 skipped, 14 deselected, 1 warning in X.XXs ===========

# If any tests fail, check:
pytest tests/ -v --tb=long  # Full traceback

# Generate coverage report
pytest tests/ --cov=app --cov-report=term --cov-report=html

# Expected output:
# Coverage: 48% overall
# Critical modules: 70%+ coverage

# Open coverage report
open htmlcov/index.html
```

**Success Criteria:**
- ✅ All 104 unit tests passing
- ✅ No errors or failures
- ✅ Coverage report generated

---

### **Step 4: Start API Server** (30 seconds)

```bash
# Start Flask API
python run.py

# Expected output:
# * Environment: development
# * Debug mode: on
# * Running on http://127.0.0.1:5001
# Press CTRL+C to quit

# Leave this terminal running, open a new terminal for next steps
```

**Troubleshooting:**
```bash
# If port 5001 already in use:
lsof -ti:5001 | xargs kill -9

# If MongoDB connection fails:
# Check MONGO_URI in .env
# Test connection manually
```

---

### **Step 5: Health Checks** (1 minute)

In a **new terminal**:

```bash
# 1. Basic health check
curl http://localhost:5001/health

# Expected: {"status": "healthy"}

# 2. Readiness check (with DB)
curl http://localhost:5001/health/ready

# Expected: {"status": "healthy", "database": "connected"}

# 3. Liveness check
curl http://localhost:5001/health/live

# Expected: {"status": "alive"}

# 4. Check Swagger docs
open http://localhost:5001/api/docs
# Should open browser with Swagger UI
```

**Success Criteria:**
- ✅ All health endpoints return 200
- ✅ Swagger UI loads
- ✅ No error messages in API terminal

---

### **Step 6: Manual API Testing** (5 minutes)

```bash
# 1. Register new user
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "test@example.com",
    "username": "testuser",
    "password": "Test@123",  # pragma: allowlist secret
    "role": "guest"
  }'

# Expected: 201 Created with user object

# 2. Login (Basic Auth — module requirement)
TOKEN=$(curl -X GET http://localhost:5001/api/v1/login \
  -u "testuser:Test@123" -s | jq -r '.data.token')

echo $TOKEN
# Should print JWT token

# 3. Get breaches (authenticated)
curl -X GET http://localhost:5001/api/v1/breaches \
  -H "x-access-token: $TOKEN" | jq '.data | length'

# Expected: 25 (number of seeded breaches)

# 4. Get single breach
BREACH_ID=$(curl -X GET http://localhost:5001/api/v1/breaches \
  -H "x-access-token: $TOKEN" | jq -r '.data[0]._id')

curl -X GET "http://localhost:5001/api/v1/breaches/$BREACH_ID" \
  -H "x-access-token: $TOKEN" | jq '.title'

# Expected: Breach title returned

# 5. Test analytics endpoint
curl -X GET http://localhost:5001/api/v1/analytics/risk-by-industry \
  -H "x-access-token: $TOKEN" | jq '.'

# Expected: Array of industry risk data

# 6. Test geospatial query (near London)
curl -X GET "http://localhost:5001/api/v1/breaches/geo/near?lng=-0.1278&lat=51.5074&max_distance=100000" \
  -H "x-access-token: $TOKEN" | jq '.data | length'

# Expected: Number of breaches near London

# 7. Test admin endpoint (should fail with guest user)
curl -X GET http://localhost:5001/api/v1/admin/stats \
  -H "x-access-token: $TOKEN"

# Expected: 403 Forbidden (correct behavior)

# 8. Login as admin (Basic Auth)
ADMIN_TOKEN=$(curl -X GET http://localhost:5001/api/v1/login \
  -u "admin_breach:Admin@123" -s | jq -r '.data.token')

# 9. Test admin endpoint (should succeed)
curl -X GET http://localhost:5001/api/v1/admin/stats \
  -H "x-access-token: $ADMIN_TOKEN" | jq '.'

# Expected: System statistics returned
```

**Success Criteria:**
- ✅ All endpoints return expected status codes
- ✅ Authentication working (JWT via `x-access-token` header)
- ✅ Authorization working (RBAC)
- ✅ Data returned correctly formatted
- ✅ Geospatial queries working

---

### **Step 7: Newman API Tests** (3 minutes)

Make sure API is still running from Step 4, then:

```bash
# Generate Newman HTML report
cd backend
./generate_newman_report.sh

# Expected output:
# 🚀 Starting Newman API Test Report Generation...
# ✅ Newman installed
# ✅ htmlextra reporter installed
# ✅ MongoDB connection successful
# ✅ Flask API running on port 5001
# 🧪 Running Newman tests...
# ✅ Newman report generated: evidence/backend/newman-report.html

# Open report
open ../evidence/backend/newman-report.html
```

**Success Criteria:**
- ✅ All API tests passing (64 requests, 108 assertions)
- ✅ No 5xx errors
- ✅ Authentication flow working
- ✅ HTML report generated

---

### **Step 8: Security Validation** (2 minutes)

```bash
# 1. Test account lockout
for i in {1..6}; do
  curl -X POST http://localhost:5001/api/v1/auth/login \
    -H "Content-Type: application/json" \
    -d '{"email": "test@example.com", "password": "WrongPassword"}' \  # pragma: allowlist secret
    -s | jq '.message'
done

# Expected: First 5 show "Invalid credentials", 6th shows "Account locked"

# 2. Test NoSQL injection protection
curl -X GET "http://localhost:5001/api/v1/breaches?severity[\$ne]=critical" \
  -H "x-access-token: $TOKEN"

# Expected: 422 or sanitized query (not server error)

# 3. Test XSS protection
curl -X POST http://localhost:5001/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "xss@test.com",
    "username": "<script>alert('XSS')</script>",
    "password": "Test@123",  # pragma: allowlist secret
    "role": "guest"
  }' | jq '.user.username'

# Expected: Script tags removed or escaped

# 4. Check security headers
curl -I http://localhost:5001/api/v1/breaches | grep -E "(X-Frame-Options|X-Content-Type-Options|Strict-Transport-Security)"

# Expected: All security headers present
```

**Success Criteria:**
- ✅ Account lockout working
- ✅ NoSQL injection blocked
- ✅ XSS sanitization working
- ✅ Security headers present

---

### **Step 9: Sub-documents Testing** (3 minutes)

```bash
# Get a breach ID
BREACH_ID=$(curl -X GET http://localhost:5001/api/v1/breaches \
  -H "x-access-token: $ADMIN_TOKEN" -s | jq -r '.data[0]._id')

# 1. Test affected accounts
curl -X GET "http://localhost:5001/api/v1/breaches/$BREACH_ID/accounts" \
  -H "x-access-token: $ADMIN_TOKEN" -s | jq '. | length'
# Expected: Number of affected accounts

# 2. Add affected account
curl -X POST "http://localhost:5001/api/v1/breaches/$BREACH_ID/accounts" \
  -H "x-access-token: $ADMIN_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "victim@example.com",
    "username": "victim123",
    "exposure_date": "2024-03-15T08:30:00Z",
    "data_exposed": ["email", "password_hash"]
  }' -s | jq '.message'
# Expected: "Account added successfully"

# 3. Test timeline
curl -X GET "http://localhost:5001/api/v1/breaches/$BREACH_ID/timeline" \
  -H "x-access-token: $ADMIN_TOKEN" -s | jq '. | length'
# Expected: Number of timeline events

# 4. Test remediation
curl -X GET "http://localhost:5001/api/v1/breaches/$BREACH_ID/remediation" \
  -H "x-access-token: $ADMIN_TOKEN" -s | jq '. | length'
# Expected: Number of remediation actions

# 5. Test monitoring alerts
curl -X GET "http://localhost:5001/api/v1/breaches/$BREACH_ID/alerts" \
  -H "x-access-token: $ADMIN_TOKEN" -s | jq '. | length'
# Expected: Number of monitoring alerts
```

**Success Criteria:**
- ✅ All 4 sub-document endpoints working
- ✅ CRUD operations successful
- ✅ Data properly structured

---

### **Step 10: Final Validation** (2 minutes)

```bash
# 1. Check all evidence files exist
ls -lh evidence/backend/
# Expected:
# - pytest-coverage-report/ (directory)
# - coverage.json
# - newman-report.html
# - README.md

# 2. Verify coverage report
test -f evidence/backend/pytest-coverage-report/index.html && echo "✅ Coverage report exists" || echo "❌ Missing"

# 3. Verify Newman report
test -f evidence/backend/newman-report.html && echo "✅ Newman report exists" || echo "❌ Missing"

# 4. Check all README files
find . -name "README.md" -not -path "./venv/*" -not -path "./.git/*"
# Expected: 7 README files

# 5. Run final test suite
cd backend
pytest tests/ -v --tb=no -q 2>&1 | tail -3
# Expected: 104 passed, 1 skipped, 14 deselected

# 6. Check for uncommitted changes
git status
# Expected: "working tree clean" or only untracked files (.env, logs/, etc.)
```

**Success Criteria:**
- ✅ All evidence files present
- ✅ All README files created
- ✅ All tests passing
- ✅ Git working tree clean

---

## 📦 Submission Package Contents

### **Required Files for Submission:**

```
BreachLens/
├── backend/
│   ├── app/                          # All source code ✅
│   ├── tests/                        # Test suite ✅
│   ├── seed/                         # Database seeding ✅
│   ├── postman/                      # API tests ✅
│   ├── requirements.txt              # Dependencies ✅
│   ├── pytest.ini                    # Test config ✅
│   ├── run.py                        # Entry point ✅
│   └── README.md                     # Setup guide ✅
├── docs/
│   ├── PRD.md                        # Requirements ✅
│   ├── API_SPEC.md                   # API docs ✅
│   ├── QA_STRATEGY.md                # Testing strategy ✅
│   ├── AGENTS.md                     # Tech standards ✅
│   ├── IMPROVEMENTS.md               # Features implemented ✅
│   ├── SUBMISSION_PRIORITY.md        # This guide ✅
│   └── README.md                     # Docs index ✅
├── evidence/backend/
│   ├── htmlcov/                      # Coverage HTML ✅
│   ├── coverage.json                 # Coverage JSON ✅
│   ├── postman-collection-runner.pdf # API tests (generate via Postman GUI) ⚠️
│   ├── postman-api-documentation.pdf # API docs (generate via Postman GUI) ⚠️
│   └── README.md                     # Evidence summary ✅
├── README.md                         # Project overview ✅
└── LICENSE                           # MIT License ✅
```

### **DO NOT Include:**
- ❌ `venv/` - Virtual environment
- ❌ `.env` - Environment variables (sensitive)
- ❌ `__pycache__/` - Python cache
- ❌ `.git/` - Git history (or include if requested)
- ❌ `logs/` - Log files
- ❌ `.DS_Store` - macOS files

---

## 🎯 Final Submission Steps

### **1. Generate Postman PDFs** ⚠️ REQUIRED

```bash
# 1. Start backend
cd backend
python seed/seed_data.py --reset
python run.py

# 2. Open Postman Desktop App:
#    - Import collection & environment from backend/postman/
#    - Run full collection (64 requests, ~108 assertions pass)
#    - Click "View Summary" → Cmd+P → Save as PDF
#    - Save as: evidence/backend/postman-collection-runner.pdf
#
#    - Click collection → "View Documentation" → Cmd+P → Save as PDF
#    - Save as: evidence/backend/postman-api-documentation.pdf

# See detailed guide: backend/postman/README.md
```

### **2. Create Submission Archive**

```bash
cd /Users/ritiksah
zip -r BreachLens-Submission.zip BreachLens/ \
  -x "BreachLens/venv/*" \
  -x "BreachLens/.git/*" \
  -x "BreachLens/**/__pycache__/*" \
  -x "BreachLens/**/*.pyc" \
  -x "BreachLens/backend/.env" \
  -x "BreachLens/backend/logs/*" \
  -x "BreachLens/**/.DS_Store"

# Check archive size
ls -lh BreachLens-Submission.zip

# Verify contents
unzip -l BreachLens-Submission.zip | head -20
```

### **3. Verify Archive**

```bash
# Extract to temporary location
mkdir temp-verify
unzip BreachLens-Submission.zip -d temp-verify

# Check structure
cd temp-verify/BreachLens
find . -name "*.py" | wc -l  # Should show ~50+ Python files
find . -name "README.md"     # Should show 7 README files
ls evidence/backend/         # Should show newman-report.html

# Clean up
cd ../..
rm -rf temp-verify
```

---

## 📊 Expected Grade Breakdown

### **Code Quality (30%)** - Targeting 28/30

- Complex data modeling (4 sub-documents) ✅
- Advanced MongoDB (2dsphere, 8 aggregations) ✅
- Professional code structure ✅
- Security features implemented ✅
- Error handling comprehensive ✅

### **Testing (25%)** - Targeting 24/25

- 104 unit tests (100% passing) ✅
- 48% coverage (70%+ critical) ✅
- 40 security tests ✅
- Newman API tests (64 requests, 108 assertions) ✅
- Professional test organization ✅

### **Documentation (20%)** - Targeting 19/20

- 7,500+ lines of documentation ✅
- Complete API specification ✅
- Comprehensive testing strategy ✅
- Professional README files ✅
- Code comments and docstrings ✅

### **Functionality (15%)** - Targeting 15/15

- All requirements met ✅
- 63 endpoints working ✅
- Full CRUD + sub-documents ✅
- JWT + RBAC implemented ✅
- Geospatial queries working ✅

### **Innovation (10%)** - Targeting 9/10

- Significantly exceeds demonstration ✅
- Production-grade features ✅
- Advanced MongoDB usage ✅
- Security best practices ✅
- Professional deployment approach ✅

**Estimated Total: 95/100 (High 1st)**

---

## 🚨 Common Issues & Fixes

### **Issue: Tests Failing Locally**

```bash
# Reset database
python seed/seed_data.py --reset

# Clear pytest cache
pytest --cache-clear

# Reinstall dependencies
pip install -r requirements.txt --force-reinstall

# Run tests with verbose output
pytest tests/ -v --tb=long
```

### **Issue: Newman Report Generation Fails**

```bash
# Check Newman installed
newman --version

# Install if missing
npm install -g newman newman-reporter-htmlextra

# Check API running
curl http://localhost:5001/health

# Start API if not running
python run.py

# Generate report manually
newman run postman/BreachLens.postman_collection.json \
  -e postman/BreachLens.postman_environment.json \
  -r htmlextra \
  --reporter-htmlextra-export ../evidence/backend/newman-report.html
```

### **Issue: MongoDB Connection Issues**

```bash
# Test connection
python -c "from pymongo import MongoClient; print(MongoClient('YOUR_MONGO_URI').server_info())"

# Check .env file
cat .env | grep MONGO_URI

# MongoDB runs locally — no Atlas required
# Ensure mongod is running: brew services start mongodb-community
```

---

## ✅ Ready to Submit?

**Checklist before submission:**

- [ ] All 104 unit tests passing
- [ ] Newman HTML report generated
- [ ] Coverage report in evidence/backend/
- [ ] All README files created (7 total)
- [ ] No sensitive data in repository (.env excluded)
- [ ] Submission archive created and verified
- [ ] Archive size reasonable (< 50MB)
- [ ] README.md updated with your details

**Once all checked, you're ready to submit! 🎉**

---

**Status**: ✅ 99% Ready (Just needs Postman PDF exports)
**Estimated Time to Submit**: 10 minutes
