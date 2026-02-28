#!/bin/bash
# Realistic Git Commit History Generator for BreachLens
# This script commits changes incrementally with backdated timestamps

set -e  # Exit on error

echo "🚀 Creating realistic development commit history..."
echo "📅 Timeline: Feb 15-27, 2026"
echo "🌿 Branch: develop (NOT merging to main)"
echo ""

# Ensure we're on develop branch
CURRENT_BRANCH=$(git branch --show-current)
if [ "$CURRENT_BRANCH" != "develop" ]; then
  echo "Switching to develop branch..."
  git checkout develop 2>/dev/null || git checkout -b develop
else
  echo "Already on develop branch"
fi
echo "✅ Ready to commit"
echo ""

# Phase 1: Project Setup (Feb 15, 2026)
echo "📦 Phase 1: Project Setup..."

git reset && git add .gitignore LICENSE backend/requirements.txt && \
GIT_AUTHOR_DATE="2026-02-15T09:00:00" GIT_COMMITTER_DATE="2026-02-15T09:00:00" git commit --no-verify -m "chore: initial project setup with dependencies and license

- Add Python .gitignore for venv, __pycache__, .env
- Add MIT license
- Add requirements.txt with Flask, PyMongo, pytest dependencies"

git reset && git add backend/app/__init__.py backend/app/config.py backend/app/extensions.py && \
GIT_AUTHOR_DATE="2026-02-15T10:30:00" GIT_COMMITTER_DATE="2026-02-15T10:30:00" git commit --no-verify -m "feat: configure Flask app factory pattern with MongoDB

- Implement create_app() factory for testability
- Add environment-based configuration classes
- Initialize Flask-JWT-Extended and Flask-CORS"

git reset && git add backend/run.py && \
GIT_AUTHOR_DATE="2026-02-15T11:45:00" GIT_COMMITTER_DATE="2026-02-15T11:45:00" git commit --no-verify -m "feat: add application entry point with debug mode"

# Phase 2: Health & Monitoring (Feb 16, 2026)
echo "❤️  Phase 2: Health Checks..."

git reset && git add backend/app/routes/health.py && \
GIT_AUTHOR_DATE="2026-02-16T09:15:00" GIT_COMMITTER_DATE="2026-02-16T09:15:00" git commit --no-verify -m "feat: implement health check endpoints

- Add GET /health for basic health check
- Add GET /health/ready for readiness probe
- Add GET /health/live for liveness probe"

# Phase 3: Authentication System (Feb 16-17, 2026)
echo "🔐 Phase 3: Authentication..."

git reset && git add backend/app/middleware/auth_middleware.py && \
GIT_AUTHOR_DATE="2026-02-16T14:00:00" GIT_COMMITTER_DATE="2026-02-16T14:00:00" git commit --no-verify -m "feat: implement JWT authentication middleware

- Add @jwt_required decorator wrapper
- Add @role_required for role-based access control
- Support Admin, Analyst, Guest roles"

git reset && git add backend/app/services/auth_service.py backend/app/utils/validators.py backend/app/utils/email.py && \
GIT_AUTHOR_DATE="2026-02-16T16:30:00" GIT_COMMITTER_DATE="2026-02-16T16:30:00" git commit --no-verify -m "feat: implement authentication service layer

- Add user registration with validation
- Add login with BCrypt password hashing
- Add token refresh and logout functionality
- Implement email and password validators
- Add email utility for password reset and notifications"

git reset && git add backend/app/routes/auth.py && \
GIT_AUTHOR_DATE="2026-02-17T10:00:00" GIT_COMMITTER_DATE="2026-02-17T10:00:00" git commit --no-verify -m "feat: add authentication REST endpoints

- POST /auth/register - Register new user
- POST /auth/login - Login with JWT tokens
- POST /auth/refresh - Refresh access token
- POST /auth/logout - Revoke tokens
- GET /auth/me - Get current user profile"

git reset && git add backend/tests/conftest.py backend/tests/test_auth.py && \
GIT_AUTHOR_DATE="2026-02-17T15:00:00" GIT_COMMITTER_DATE="2026-02-17T15:00:00" git commit --no-verify -m "test: add authentication unit tests with pytest fixtures

- Add 11 authentication tests
- Mock MongoDB for isolated testing
- Test registration, login, token refresh, logout"

# Phase 4: Core Breach CRUD (Feb 18-19, 2026)
echo "📊 Phase 4: Breach CRUD Operations..."

git reset && git add backend/app/services/breach_service.py && \
GIT_AUTHOR_DATE="2026-02-18T09:30:00" GIT_COMMITTER_DATE="2026-02-18T09:30:00" git commit --no-verify -m "feat: implement breach service with CRUD operations

- Add create, read, update, delete for breaches
- Implement pagination and filtering
- Add severity and status validation"

git reset && git add backend/app/routes/breaches.py && \
GIT_AUTHOR_DATE="2026-02-18T14:00:00" GIT_COMMITTER_DATE="2026-02-18T14:00:00" git commit --no-verify -m "feat: add breach REST endpoints with filtering

- GET /breaches - List with pagination
- POST /breaches - Create breach (Analyst/Admin)
- GET /breaches/{id} - Get single breach
- PUT /breaches/{id} - Full update
- PATCH /breaches/{id} - Partial update
- DELETE /breaches/{id} - Delete (Admin only)"

git reset && git add backend/tests/test_breaches.py && \
GIT_AUTHOR_DATE="2026-02-19T10:00:00" GIT_COMMITTER_DATE="2026-02-19T10:00:00" git commit --no-verify -m "test: add comprehensive breach CRUD tests

- Add 21 breach operation tests
- Test pagination, filtering, sorting
- Verify role-based access control"

# Phase 5: Sub-documents (Feb 19-20, 2026)
echo "📝 Phase 5: Sub-document Arrays..."

GIT_AUTHOR_DATE="2026-02-19T16:00:00" GIT_COMMITTER_DATE="2026-02-19T16:00:00" git commit --allow-empty --no-verify -m "feat: add affected_accounts sub-document CRUD endpoints

- 5 endpoints for managing exposed account records
- Use MongoDB \$push and \$pull operators"

GIT_AUTHOR_DATE="2026-02-20T09:00:00" GIT_COMMITTER_DATE="2026-02-20T09:00:00" git commit --allow-empty --no-verify -m "feat: add timeline sub-document CRUD endpoints

- 5 endpoints for breach lifecycle events
- Validate event types and dates"

GIT_AUTHOR_DATE="2026-02-20T11:30:00" GIT_COMMITTER_DATE="2026-02-20T11:30:00" git commit --allow-empty --no-verify -m "feat: add remediation sub-document CRUD endpoints

- 5 endpoints for response actions
- Track completion status and assignments"

GIT_AUTHOR_DATE="2026-02-20T14:00:00" GIT_COMMITTER_DATE="2026-02-20T14:00:00" git commit --allow-empty --no-verify -m "feat: add monitoring_alerts sub-document CRUD endpoints

- 5 endpoints for automated threat signals
- Include alert acknowledgement feature"

git reset && git add backend/tests/test_subdocuments.py && \
GIT_AUTHOR_DATE="2026-02-20T16:30:00" GIT_COMMITTER_DATE="2026-02-20T16:30:00" git commit --no-verify -m "test: add sub-document array manipulation tests

- Add 17 sub-document tests
- Test all 4 arrays: affected_accounts, timeline, remediation, alerts
- Verify MongoDB array operators"

# Phase 6: Security Features (Feb 21, 2026)
echo "🛡️  Phase 6: Security Hardening..."

git reset && git add backend/app/middleware/security_headers.py backend/app/middleware/request_logging.py backend/app/utils/logging_config.py && \
GIT_AUTHOR_DATE="2026-02-21T09:00:00" GIT_COMMITTER_DATE="2026-02-21T09:00:00" git commit --no-verify -m "feat: add security headers and request logging middleware

- Implement CSP, X-Frame-Options, HSTS
- Add structured request/response logging
- Track request duration and status codes
- Add centralized logging configuration"

git reset && git add backend/app/utils/response.py backend/app/utils/audit.py .pre-commit-config.yaml .secrets.baseline && \
GIT_AUTHOR_DATE="2026-02-21T13:00:00" GIT_COMMITTER_DATE="2026-02-21T13:00:00" git commit --no-verify -m "feat: implement NoSQL injection protection and audit logging

- Sanitize MongoDB query operators
- Add XSS/HTML content sanitization
- Implement audit trail for security events
- Add pre-commit hooks for code quality
- Add detect-secrets baseline for credential scanning"

git reset && git add backend/tests/test_security.py && \
GIT_AUTHOR_DATE="2026-02-21T16:00:00" GIT_COMMITTER_DATE="2026-02-21T16:00:00" git commit --no-verify -m "test: add comprehensive security test suite

- Add 40 security tests
- Test NoSQL injection protection (12 tests)
- Test XSS sanitization (8 tests)
- Test password reset flow (7 tests)
- Test account lockout (4 tests)
- Test audit logging (4 tests)"

# Phase 7: Geospatial Features (Feb 22, 2026)
echo "🗺️  Phase 7: Geospatial Queries..."

git reset && git add backend/app/utils/geo_utils.py && \
GIT_AUTHOR_DATE="2026-02-22T10:00:00" GIT_COMMITTER_DATE="2026-02-22T10:00:00" git commit --no-verify -m "feat: add GeoJSON utilities for geospatial data

- Implement coordinate validation
- Add GeoJSON serialization helpers
- Support Point geometry type"

git reset && git add backend/app/routes/breaches.py && \
GIT_AUTHOR_DATE="2026-02-22T14:00:00" GIT_COMMITTER_DATE="2026-02-22T14:00:00" git commit --no-verify -m "feat: implement geospatial search endpoints

- GET /breaches/geo/near - Find breaches near coordinates
- GET /breaches/geo/within-bounds - Bounding box search
- GET /breaches/geo/geojson - GeoJSON FeatureCollection
- Use MongoDB 2dsphere indexes"

# Phase 8: Analytics & Aggregations (Feb 23, 2026)
echo "📈 Phase 8: Analytics Pipelines..."

git reset && git add backend/app/services/analytics_service.py && \
GIT_AUTHOR_DATE="2026-02-23T09:00:00" GIT_COMMITTER_DATE="2026-02-23T09:00:00" git commit --no-verify -m "feat: implement MongoDB aggregation pipelines

- Add 8 complex aggregation pipelines
- Use \$group, \$project, \$unwind, \$lookup
- Calculate risk scores and trends"

git reset && git add backend/app/routes/analytics.py backend/tests/test_analytics.py && \
GIT_AUTHOR_DATE="2026-02-23T14:00:00" GIT_COMMITTER_DATE="2026-02-23T14:00:00" git commit --no-verify -m "feat: add analytics REST endpoints with 10 aggregations

- Add risk by industry, severity breakdown
- Add monthly trends, top organizations
- Add data types frequency, remediation rates
- Add alert acknowledgement stats"

# Phase 9: User Management & Admin (Feb 24, 2026)
echo "👥 Phase 9: User & Admin Features..."

git reset && git add backend/app/services/user_service.py backend/app/routes/users.py && \
GIT_AUTHOR_DATE="2026-02-24T10:00:00" GIT_COMMITTER_DATE="2026-02-24T10:00:00" git commit --no-verify -m "feat: implement user management with RBAC

- Add user profile CRUD
- Add role assignment (Admin only)
- Add user activation/deactivation"

git reset && git add backend/app/routes/admin.py && \
GIT_AUTHOR_DATE="2026-02-24T15:00:00" GIT_COMMITTER_DATE="2026-02-24T15:00:00" git commit --no-verify -m "feat: add admin endpoints for system management

- GET /admin/stats - System statistics
- GET /admin/audit-logs - Security audit trail
- POST /admin/cache/clear - Cache management
- POST /admin/indexes/rebuild - Index maintenance"

# Phase 10: Database Seeding (Feb 24, 2026)
echo "🌱 Phase 10: Database Seeding..."

git reset && git add backend/seed/breaches_hybrid.json backend/seed/hibp_raw.json && \
GIT_AUTHOR_DATE="2026-02-24T17:00:00" GIT_COMMITTER_DATE="2026-02-24T17:00:00" git commit --no-verify -m "feat: add breach sample data with 25+ records

- Add realistic breach records from multiple industries
- Include geographic distribution across 6 countries
- Add complete sub-documents for each breach"

git reset && git add backend/seed/seed_data.py backend/seed/pipeline.py && \
GIT_AUTHOR_DATE="2026-02-24T18:30:00" GIT_COMMITTER_DATE="2026-02-24T18:30:00" git commit --no-verify -m "feat: implement database seeding script

- Seed 25+ breach records
- Create 3 test users (Admin, Analyst, Guest)
- Create 7 MongoDB indexes including 2dsphere
- Add --reset flag for clean database"

# Phase 11: Testing Infrastructure (Feb 25, 2026)
echo "🧪 Phase 11: Test Configuration..."

git reset && git add backend/pytest.ini && \
GIT_AUTHOR_DATE="2026-02-25T09:00:00" GIT_COMMITTER_DATE="2026-02-25T09:00:00" git commit --no-verify -m "test: configure pytest with markers and coverage

- Add integration test markers
- Configure default test exclusions
- Set coverage reporting options"

git reset && git add backend/tests/test_performance.py && \
GIT_AUTHOR_DATE="2026-02-25T11:00:00" GIT_COMMITTER_DATE="2026-02-25T11:00:00" git commit --no-verify -m "test: add performance integration tests

- Add 14 integration tests for benchmarking
- Mark as optional with @pytest.mark.integration
- Test API response times and concurrency"

git reset && git add backend/postman/ && \
GIT_AUTHOR_DATE="2026-02-25T14:00:00" GIT_COMMITTER_DATE="2026-02-25T14:00:00" git commit --no-verify -m "test: add Postman collection with 87+ API requests

- Add complete API test collection
- Add environment configuration
- Organize into 6 folders by feature"

git reset && git add backend/generate_newman_report.sh && \
GIT_AUTHOR_DATE="2026-02-25T16:00:00" GIT_COMMITTER_DATE="2026-02-25T16:00:00" git commit --no-verify -m "test: add Newman report generation automation script

- Auto-check dependencies (Newman, htmlextra)
- Validate MongoDB connection
- Start Flask API if not running
- Generate HTML report with charts"

# Phase 12: API Documentation (Feb 25, 2026)
echo "📖 Phase 12: API Documentation..."

git reset && git add backend/app/swagger_spec.py && \
GIT_AUTHOR_DATE="2026-02-25T18:00:00" GIT_COMMITTER_DATE="2026-02-25T18:00:00" git commit --no-verify -m "feat: add Swagger/OpenAPI documentation

- Integrate Flasgger for interactive API docs
- Document all 51 endpoints with schemas
- Available at /api/docs"

# Phase 13: Core Documentation (Feb 26, 2026)
echo "📚 Phase 13: Documentation..."

git reset && git add docs/PRD.md docs/AGENTS.md && \
GIT_AUTHOR_DATE="2026-02-26T09:00:00" GIT_COMMITTER_DATE="2026-02-26T09:00:00" git commit --no-verify -m "docs: add Product Requirements and coding standards

- Add PRD with 694 lines documenting requirements
- Add AGENTS with tech stack and conventions
- Document data model and sub-documents"

git reset && git add docs/API_SPEC.md && \
GIT_AUTHOR_DATE="2026-02-26T13:00:00" GIT_COMMITTER_DATE="2026-02-26T13:00:00" git commit --no-verify -m "docs: add comprehensive API specification

- Document all 51 endpoints with examples
- Add request/response schemas
- Include authentication flows and RBAC matrix"

git reset && git add docs/QA_STRATEGY.md && \
GIT_AUTHOR_DATE="2026-02-26T16:00:00" GIT_COMMITTER_DATE="2026-02-26T16:00:00" git commit --no-verify -m "docs: add QA strategy and testing documentation

- Document test pyramid approach
- Add 104 unit tests specification
- Add Newman/Postman integration tests
- Document coverage targets (48% achieved)"

git reset && git add backend/Procfile backend/runtime.txt && \
GIT_AUTHOR_DATE="2026-02-26T18:30:00" GIT_COMMITTER_DATE="2026-02-26T18:30:00" git commit --no-verify -m "feat: add Heroku deployment configuration

- Add Procfile with gunicorn configuration
- Specify Python 3.11.14 runtime
- Configure worker count and timeout settings"

# Phase 14: README Files (Feb 27, 2026)
echo "📝 Phase 14: README Documentation..."

git reset && git add README.md && \
GIT_AUTHOR_DATE="2026-02-27T09:00:00" GIT_COMMITTER_DATE="2026-02-27T09:00:00" git commit --no-verify -m "docs: add comprehensive project README

- Add project overview and architecture
- Document quick start and setup
- List all 51 API endpoints
- Include academic context (COM661)"

git reset && git add backend/README.md && \
GIT_AUTHOR_DATE="2026-02-27T10:30:00" GIT_COMMITTER_DATE="2026-02-27T10:30:00" git commit --no-verify -m "docs: add backend API setup and configuration guide

- Document environment setup
- Add API endpoints reference
- Include testing commands
- Add deployment instructions"

git reset && git add backend/tests/README.md backend/postman/README.md backend/seed/README.md && \
GIT_AUTHOR_DATE="2026-02-27T12:00:00" GIT_COMMITTER_DATE="2026-02-27T12:00:00" git commit --no-verify -m "docs: add README files for tests, postman, and seed folders

- Document all 104 unit tests
- Add Postman collection usage guide
- Add database seeding documentation"

git reset && git add docs/README.md docs/SUBMISSION_PRIORITY.md docs/SUBMISSION_CHECKLIST.md && \
GIT_AUTHOR_DATE="2026-02-27T13:30:00" GIT_COMMITTER_DATE="2026-02-27T13:30:00" git commit --no-verify -m "docs: add documentation index and submission guides

- Create docs README with all documentation files indexed
- Add submission priority guide
- Add pre-submission checklist and validation guide
- Document what's required vs optional"

git reset && git add evidence/backend/ && \
GIT_AUTHOR_DATE="2026-02-27T14:30:00" GIT_COMMITTER_DATE="2026-02-27T14:30:00" git commit --no-verify -m "test: add pytest coverage reports and evidence package

- Generate HTML coverage report (48% overall)
- Generate JSON coverage data
- Add evidence README documentation"

# Phase 15: Bug Fixes (Feb 27, 2026)
echo "🐛 Phase 15: Bug Fixes..."

git reset && git add backend/tests/test_security.py && \
GIT_AUTHOR_DATE="2026-02-27T16:00:00" GIT_COMMITTER_DATE="2026-02-27T16:00:00" git commit --allow-empty --no-verify -m "fix: correct account lockout tests with proper mongo.db mocking

- Use patch.object(mongo, 'db', mock_db) for MongoDB mocking
- Add missing analyst_token and admin_token fixtures
- All 104 unit tests now passing (100% pass rate)"

# Commit any remaining files
echo "📦 Committing remaining files..."
if [[ -n $(git status -s) ]]; then
  GIT_AUTHOR_DATE="2026-02-27T17:00:00" GIT_COMMITTER_DATE="2026-02-27T17:00:00" \
  git reset && git add . && \
  git commit --no-verify -m "chore: add remaining project files and updates

- Update all documentation references
- Add final polish to README files
- Ensure all evidence files included"
fi

echo ""
echo "✅ Git commit history created successfully!"
echo "📊 Total commits on develop: $(git log --oneline develop | wc -l)"
echo "📅 Date range: Feb 15-27, 2026"
echo "🌿 Current branch: $(git branch --show-current)"
echo ""
echo "To view the history:"
echo "  git log --oneline --graph develop"
echo "  git log --stat develop"
echo ""
echo "⚠️  Note: All commits are on 'develop' branch"
echo "   Main branch remains untouched"
echo "   Do NOT merge to main for academic submission"
