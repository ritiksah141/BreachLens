# BreachLens Test Suite

[![Tests](https://img.shields.io/badge/Tests-634%20passing-brightgreen.svg)](.)
[![Coverage](https://img.shields.io/badge/Coverage-84%25-brightgreen.svg)](../htmlcov/)
[![CI](https://img.shields.io/badge/CI-optimized-blue.svg)](.)

**Comprehensive test suite covering all API endpoints, service layer, model validation, and security features.**

---

## 📊 Test Summary

### **Current Status**
```bash
✅ 634 tests passing (100% pass rate)
⏭️ 2 tests skipped (rate limiting — requires Redis)
📊 84% code coverage (Target: >80%)
⚡ Optimized CI: < 2 minutes (parallelized with pytest-xdist)
```

### **Test Breakdown**
| Module | Tests | Status | Focus |
|--------|-------|--------|-------|
| test_auth.py | 11 | ✅ All passing | Auth endpoints & JWT |
| test_breaches.py | 21 | ✅ All passing | Breach CRUD routes |
| test_subdocuments.py | 31 | ✅ All passing | 4 sub-document arrays |
| test_security.py | 40 | ✅ All passing | Security features |
| test_analytics.py | ~10 | ✅ All passing | Aggregation pipelines |
| test_breach_service.py | ~50 | ✅ All passing | BreachService mock-based tests |
| test_models.py | ~140 | ✅ All passing | Schema validators + utilities |
| test_services_integration.py | ~210 | ✅ All passing | All 4 services via mongomock |
| test_admin.py | ~25 | ✅ All passing | Admin routes & RBAC |
| test_users.py | ~30 | ✅ All passing | User management routes |
| test_exposure_logic.py | 5 | ✅ All passing | Phase 1 exposure algorithms |
| test_performance.py | 14 | ⏭️ Integration | Performance benchmarks |
| **TOTAL** | **634** | **✅ 100%** | **Unit + API + Integration** |

---

## 🚀 Quick Start

### **Essential Tests (Recommended for Local Dev)**
Runs fast functional and unit tests (~2 seconds).
```bash
# From backend directory
source ../venv/bin/activate
pytest tests/ -n auto -m "not slow and not integration"
```

### **Full Test Suite (CI Equivalent)**
```bash
pytest tests/ -n auto
```

### **Run With Coverage**
```bash
pytest tests/ --cov=app --cov-report=html --cov-report=term
open htmlcov/index.html
```

---

## 📂 Optimization & CI (Definition of Done)

The test suite is optimized to meet a **10-minute Definition of Done** for production-ready deployments:

1.  **Parallel Execution**: Uses `pytest-xdist` (`-n auto`) to run tests across multiple CPU cores, reducing total execution time by ~70%.
2.  **Strict Pruning**: The standard CI workflow strictly excludes `slow` and heavy `integration` suites (e.g., `test_performance.py`) to provide rapid feedback under 2 minutes.
3.  **Isolation & Stability**:
    *   **Function-Scoped Client**: The `client` fixture is function-scoped to prevent state leakage and CSRF interference between tests.
    *   **Environment Parity**: Standardized on **Python 3.12** to align local development with production (Render) and CI (GitHub Actions).
    *   **Dependency Management**: Fixed library incompatibilities by pinning stable `setuptools` versions.

---

## 📊 Coverage Metrics

### **Overall Coverage: 84%**
| Module | Coverage | Status |
|--------|----------|--------|
| app/services/analytics_service.py | 98% | ✅ |
| app/services/breach_service.py | 92% | ✅ |
| app/services/auth_service.py | 82% | ✅ |
| app/routes/users.py | 98% | ✅ |
| app/routes/admin.py | 94% | ✅ |
| app/routes/analytics.py | 85% | ✅ |
| app/routes/breaches.py | 81% | ✅ |
| app/models/user.py | 100% | ✅ |
| app/models/breach.py | 98% | ✅ |
| app/utils/validators.py | 95% | ✅ |
| **Average Service Coverage** | **91%** | **✅ High** |

---

## 🎓 Academic Submission

### **Evidence for Submission**
*   **Unit Tests**: 633 passing tests (includes service integration via mongomock).
*   **Coverage**: 84% code coverage (exceeds 80% requirement).
*   **Postman**: 64 requests with 108 assertions (100% pass rate).
*   **CI Status**: GitHub Actions green for both Backend (Render-bound) and Frontend (Vercel-bound).

---

## 📂 Test Files

### **test_auth.py** (11 tests)
Tests authentication endpoints and JWT flow.

**Coverage:**
- ✅ User registration (success, validation, duplicates)
- ✅ Login (success, invalid credentials, account lockout)
- ✅ JWT token generation and validation
- ✅ Token refresh flow
- ✅ Logout and token revocation
- ✅ Current user profile retrieval

**Key Tests:**
```python
test_register_success()                    # 201 with user data
test_register_invalid_email()              # 422 validation error
test_register_weak_password()              # 422 password requirements
test_register_admin_role_rejected()        # 422 role restriction
test_login_success()                       # 200 with tokens
test_login_invalid_credentials()           # 401 unauthorized
```

---

### **test_breaches.py** (21 tests)
Tests full CRUD operations on breach records.

**Coverage:**
- ✅ List breaches (pagination, filtering, sorting)
- ✅ Get single breach
- ✅ Create breach (with validation)
- ✅ Update breach (full and partial)
- ✅ Delete breach (role-based)
- ✅ Search breaches (text search)
- ✅ Filter by severity, status, industry
- ✅ Geospatial queries (near, within bounds, GeoJSON)
- ✅ Exposure check (email/domain lookup)

**Key Tests:**
```python
test_list_breaches_no_auth()               # 200 public access
test_list_breaches_pagination()            # Pagination metadata
test_list_breaches_filter_by_severity()    # Query params
test_get_breach_valid_id()                 # 200 single record
test_create_breach_analyst()               # 201 created
test_create_breach_missing_fields()        # 422 validation
test_update_breach_analyst_own()           # 200 allowed
test_update_breach_analyst_other()         # 403 forbidden
test_delete_breach_admin()                 # 204 deleted
test_delete_breach_analyst()               # 403 forbidden
```

---

### **test_subdocuments.py** (31 tests)
Tests CRUD operations on all 4 sub-document arrays.

**Sub-documents Tested:**
1. **affected_accounts** — Email/username exposure records
2. **timeline** — Breach lifecycle events
3. **remediation** — Response actions (full CRUD + status transitions)
4. **monitoring_alerts** — Automated threat signals

**MongoDB Operators Tested:**
- ✅ `$push` - Add sub-document to array
- ✅ `$pull` - Remove sub-document from array
- ✅ `$set` with positional operator - Update specific sub-document
- ✅ Array element retrieval and validation

**Key Tests:**
```python
# Affected Accounts
test_list_accounts_requires_auth()         # 401 no token
test_add_account_success()                 # 201 with $push
test_add_account_invalid_email()           # 422 validation
test_delete_account_admin_ok()             # 204 with $pull

# Timeline
test_add_timeline_success()                # 201 event added
test_add_timeline_invalid_event_type()     # 422 enum validation
test_add_timeline_future_date()            # 422 date validation

# Remediation
test_add_remediation_success()             # 201 action added
test_update_remediation_status()           # 200 with $set

# Monitoring Alerts
test_create_alert_success()                # 201 alert added
test_acknowledge_alert()                   # 200 acknowledged
test_delete_alert_admin_only()             # 403 for non-admin
```

---

### **test_security.py** (40 tests)
Tests security features and protection mechanisms.

**Coverage:**
- ✅ NoSQL injection protection (12 tests)
- ✅ HTML/XSS sanitization (8 tests)
- ✅ Password reset flow (7 tests)
- ✅ Account lockout mechanism (4 tests)
- ✅ Audit logging (4 tests)
- ✅ Role-based access control (5 tests)

**Key Tests:**
```python
# NoSQL Injection
test_sanitize_dict_with_operators()        # Remove $ne, $gt, etc.
test_sanitize_nested_dict()                # Recursive sanitization
test_safe_regex_query()                    # Escape regex chars

# XSS Protection
test_sanitize_html_basic_xss()             # Strip <script>
test_sanitize_html_preserves_safe()        # Keep safe HTML
test_sanitize_breach_payload_html()        # Full payload sanitization

# Password Reset
test_request_password_reset_success()      # Token generation
test_reset_password_with_valid_token()     # Password update
test_reset_password_expired_token()        # Token expiry

# Account Lockout (Fixed on 27 Feb 2026)
test_check_lockout_nonexistent_user()      # False for unknown user
test_record_failed_login_increments()      # Counter increase
test_account_locks_after_max_attempts()    # Lockout triggered
test_reset_failed_attempts()               # Counter reset

# Audit Logging
test_log_auth_event()                      # Auth events logged
test_log_security_event()                  # Security events logged
```

---

### **test_breach_service.py** (~50 tests)
Mock-based unit tests for BreachService business logic through routes.

**Coverage:**
- ✅ `compute_risk_score` static method (pure logic, no DB)
- ✅ Create / Update / Patch / Delete via route mocking
- ✅ Bulk operations (import, delete)
- ✅ Exposure check (email & domain)
- ✅ Geospatial endpoints (near, within-bounds, GeoJSON)

---

### **test_models.py** (~140 tests)
Unit tests for schema validators AND standalone utility functions.

**Schema Validators Tested:**
- ✅ `BreachSchema` — Title, description, severity, status, industry, dates, risk score, organisation
- ✅ `AffectedAccountSchema` — Email, username, data_exposed, notified, notification_date
- ✅ `TimelineEventSchema` — Event date, type, description, actor
- ✅ `RemediationActionSchema` — Action, status, due_date, assigned_to, completed_date
- ✅ `MonitoringAlertSchema` — Alert type, severity, details, triggered_at, acknowledged

**Standalone Validator Functions Tested:**
- ✅ `validate_breach_payload()` — Full & partial validation
- ✅ `validate_geojson_point()` — GeoJSON Point structure & coordinate ranges
- ✅ `validate_affected_account()` — Email, username, data_exposed, notified
- ✅ `validate_timeline_event()` — Event date, type, description, actor
- ✅ `validate_remediation_action()` — Action, status, due_date
- ✅ `validate_monitoring_alert()` — Alert type, severity, details
- ✅ `sanitize_mongo_input()` — Recursive `$`-operator stripping
- ✅ `sanitize_query_params()` — URL parameter sanitization
- ✅ `safe_regex_query()` — Special character escaping
- ✅ `sanitize_html()` — Script/event handler/JS URL removal
- ✅ `sanitize_breach_payload_html()` — Full payload HTML sanitization

---

### **test_services_integration.py** (~200 tests)
Integration tests for all 4 service classes using **mongomock** (in-memory MongoDB). No mocks — exercises real service code paths.

**Services Tested:**
- ✅ **BreachService** — Full CRUD, bulk ops, listing/filtering/pagination/search, exposure check, all 4 sub-document types (affected accounts, timeline, remediation, alerts), GeoJSON
- ✅ **UserService** — `get_all()`, `get_by_id()`, `update_user()`, `delete_user()`, `count_users_with_role()`, `count_active_admins()`, `get_user()` (safe-field projection)
- ✅ **AuthService** — `register()`, `login()` (by email/username), `get_user_by_id()`, account lockout (`check_account_lockout`, `record_failed_login`, `reset_failed_attempts`)
- ✅ **AnalyticsService** — All 10 aggregation pipelines: risk_by_industry, severity_breakdown, monthly_trend, top_organisations, data_types_frequency, remediation_rate, alert_acknowledgement, industry_year_trend, risk_score_distribution, summary

**Model Validation Tested:**
- ✅ **UserSchema** — `validate_registration()`, `validate_update()`, `validate_role()`, `sanitize()`, `to_document()`, `to_safe_dict()`

---

### **test_admin.py** (~25 tests)
Admin route tests with RBAC enforcement.

**Coverage:**
- ✅ System statistics endpoint
- ✅ User management (listing, role changes)
- ✅ Bulk breach operations (import, delete)
- ✅ Cache clearing
- ✅ Index rebuilding
- ✅ Detailed health check
- ✅ Audit log retrieval
- ✅ Role enforcement (admin-only access)

---

### **test_users.py** (~30 tests)
User management route tests.

**Coverage:**
- ✅ List users (admin-only, pagination)
- ✅ Get user profile (own, other, admin override)
- ✅ Update profile (username, email, validation)
- ✅ Password change (own, strength requirements)
- ✅ Role change (admin-only, invalid roles)
- ✅ Activate / deactivate users (admin-only)
- ✅ Delete user (admin-only, soft-delete)

---

### **test_analytics.py** (~10 tests)
Tests MongoDB aggregation pipeline endpoints.

**Aggregation Pipelines Tested:**
- ✅ Risk by industry (`$group`, `$avg`, `$project`)
- ✅ Severity breakdown (`$group`, `$sum`)
- ✅ Monthly trend (`$match`, `$project`, `$group`)
- ✅ Top organisations (`$sort`, `$limit`)
- ✅ Data types frequency (`$unwind`, `$group`)
- ✅ Remediation rate (`$unwind`, `$cond`)
- ✅ Alert acknowledgement (`$unwind`, `$group`)

**MongoDB Operators Tested:**
- `$match`, `$group`, `$project`, `$sort`, `$limit`
- `$unwind`, `$lookup`, `$addFields`
- `$avg`, `$sum`, `$max`, `$min`, `$round`
- `$cond`, `$divide`, `$multiply`

---

### **test_performance.py** (14 integration tests)
Performance and load tests requiring running infrastructure.

**⚠️ These tests are marked with `@pytest.mark.integration` and skipped by default.**

**Why Skipped:**
- Require running MongoDB with seeded data
- Test actual response times (hardware-dependent)
- Test concurrent requests (thread-based)
- Not required for academic submission

**What They Test:**
- ✅ API response times (< 500ms targets)
- ✅ Pagination performance across pages
- ✅ Concurrent read/write handling
- ✅ Database connection pool exhaustion
- ✅ Caching improvements
- ✅ Large result set handling
- ✅ Filter and search performance

**To Run Integration Tests:**
```bash
# Requires running MongoDB + seeded database
pytest tests/test_performance.py -v -m ""  # Include all tests
```

---

## 🔧 Test Configuration

### **pytest.ini**
```ini
[pytest]
testpaths = tests
python_files = test_*.py
python_classes = Test*
python_functions = test_*
addopts = -v --tb=short --strict-markers -m "not integration"
filterwarnings =
    ignore::DeprecationWarning
markers =
    integration: Integration tests requiring running database
    slow: Slow-running tests
    security: Security-focused tests
```

### **Key Settings:**
- **Default behavior**: Skip integration tests (`-m "not integration"`)
- **Strict markers**: Prevents typos in test markers
- **Verbose output**: `-v` flag for detailed test names
- **Short traceback**: `--tb=short` for cleaner output

---

## 🎯 Testing Strategy

### **1. Unit Tests (586 tests)**
- ✅ Test business logic in isolation (mock-based route tests)
- ✅ Test service layer with mongomock (real code paths, in-memory DB)
- ✅ Test model/schema validation (pure functions)
- ✅ Test sanitization utilities (NoSQL injection, XSS)
- ✅ Fast execution (~5 seconds total)
- ✅ Run on every commit
- ✅ Perfect for CI/CD

### **2. Integration Tests (14 tests)**
- ✅ Test with real infrastructure
- ✅ Validate system behavior end-to-end
- ✅ Performance benchmarks
- ✅ Run manually with real database
- ⏭️ Optional for academic submission

### **3. API Contract Tests (Postman)**
- ✅ 64 requests in Postman collection (108 assertions)
- ✅ Test HTTP semantics and status codes
- ✅ Validate response schemas
- ✅ Test authentication flow
- ✅ Run via Postman Collection Runner → export PDF

---

## 📋 Test Fixtures

### **Core Fixtures** (conftest.py)
```python
@pytest.fixture(scope="session")
def app():
    """Flask application configured for testing."""
    # Returns app with mocked MongoDB

@pytest.fixture
def client(app):
    """Flask test client."""
    # New client per test

@pytest.fixture
def admin_headers(app):
    """Authorization headers for admin role."""
    # Real JWT token with admin role

@pytest.fixture
def analyst_headers(app):
    """Authorization headers for analyst role."""
    # Real JWT token with analyst role

@pytest.fixture
def auth_service(app):
    """Auth service instance."""
    # For direct service testing

@pytest.fixture
def create_test_user(app):
    """Helper to create test users."""
    # Returns function to generate user dicts

@pytest.fixture
def sample_breach_payload():
    """Valid breach record payload."""
    # For create/update tests

@pytest.fixture
def analyst_token(app):
    """Raw JWT token for analyst."""
    # For integration tests

@pytest.fixture
def admin_token(app):
    """Raw JWT token for admin."""
    # For integration tests
```

---

## 🐛 Debugging Tests

### **Run Single Test**
```bash
pytest tests/test_auth.py::TestRegister::test_register_success -v
```

### **Show Print Statements**
```bash
pytest tests/ -v -s
```

### **Stop on First Failure**
```bash
pytest tests/ -v -x
```

### **Run Last Failed Tests**
```bash
pytest tests/ --lf
```

### **Full Traceback**
```bash
pytest tests/ -v --tb=long
```

---

## 📊 Coverage Targets

### **Current Coverage: 88%**
| Module | Coverage | Status |
|--------|----------|--------|
| app/config.py | 100% | ✅ |
| app/models/user.py | 100% | ✅ |
| app/services/analytics_service.py | 100% | ✅ |
| app/services/auth_service.py | 99% | ✅ |
| app/models/breach.py | 98% | ✅ |
| app/routes/admin.py | 98% | ✅ |
| app/utils/validators.py | 97% | ✅ |
| app/utils/response.py | 96% | ✅ |
| app/services/breach_service.py | 93% | ✅ |
| app/middleware/request_logging.py | 92% | ✅ |
| app/__init__.py | 85% | ✅ |
| app/routes/analytics.py | 84% | ✅ |
| app/routes/breaches.py | 84% | ✅ |
| app/utils/audit.py | 81% | ✅ |
| app/routes/auth.py | 79% | ✅ |
| app/routes/users.py | 100% | ✅ |
| app/extensions.py | 100% | ✅ |
| app/middleware/security_headers.py | 100% | ✅ |
| **Overall** | **88%** | **✅** |

---

## 🎓 Academic Submission

### **What's Required**
- ✅ All unit tests passing (586/586)
- ✅ 88% code coverage
- ✅ Coverage report generated (`htmlcov/`)
- ✅ Postman collection with 64 requests / 108 assertions (run via Postman Collection Runner)

### **What's Optional**
- ⏭️ Integration tests (marked, not required)
- ⏭️ Performance benchmarks
- ⏭️ Load testing

### **Evidence for Submission**
```
backend/
├── htmlcov/                    # HTML coverage report (88%) ✅
│   └── index.html
└── tests/                     # 586 passing tests ✅
```

---

## 🚀 CI/CD Integration

### **GitHub Actions Example**
```yaml
name: Tests
on: [push, pull_request]
jobs:
  test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - uses: actions/setup-python@v2
        with:
          python-version: '3.11'
      - run: pip install -r requirements.txt
      - run: pytest tests/ --cov=app --cov-report=xml
      - uses: codecov/codecov-action@v2
```

---

## 📚 Additional Resources

- **Backend README**: [../README.md](../README.md) - Complete API specification, authentication, database architecture, testing strategy
- **Postman Guide**: [../postman/README.md](../postman/README.md) - API testing with Postman/Newman
- **Seeding Guide**: [../seed/README.md](../seed/README.md) - Database setup and data generation

---

**Test Fixes**: All 4 account lockout tests fixed
**Status**: ✅ 586/586 passing (100% pass rate) | 88% coverage
**Integration Tests**: 14 marked for infrastructure validation
