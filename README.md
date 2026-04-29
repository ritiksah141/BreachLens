# BreachLens

> **Cyber Threat Intelligence Platform** - Full-stack application for tracking data breaches, mapping cyber-attacks, and monitoring compromised assets.

[![Backend Tests](https://img.shields.io/badge/Backend_Tests-586%20passing-brightgreen.svg)](backend/tests/)
[![Frontend Tests](https://img.shields.io/badge/Frontend_Tests-249%20passing-brightgreen.svg)](frontend/src/app/)
[![Coverage](https://img.shields.io/badge/Coverage-88%25-brightgreen.svg)](backend/htmlcov/)
[![Python](https://img.shields.io/badge/Python-3.14-blue.svg)](https://www.python.org/)
[![Angular](https://img.shields.io/badge/Angular-17.3-red.svg)](https://angular.dev/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)

**COM661 Full Stack Development - Ulster University**
**Coursework 1**: Backend API Development ✅
**Coursework 2**: Frontend Development ✅

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Technology Stack](#-technology-stack)
- [Project Structure](#-project-structure)
- [Quick Start](#-quick-start)
- [Backend API](#-backend-api)
- [Frontend](#-frontend)
- [Documentation](#-documentation)
- [Testing](#-testing)
- [Security](#-security)
- [Contributing](#-contributing)

---

## 🎯 Overview

BreachLens is a comprehensive cyber threat intelligence platform designed to track and analyze data breaches from dark web sources. The platform provides:

- **Breach Tracking**: Monitor and catalog data breaches with detailed metadata
- **Geospatial Mapping**: Visualize breach origins and affected regions globally
- **Risk Analytics**: Aggregated insights on industry risks, severity trends, and exposure metrics
- **Compromise Monitoring**: Track affected accounts, timelines, and remediation efforts
- **Role-Based Access**: Multi-tier access control (Admin, Analyst, Guest)

The system is built with a RESTful API backend (Flask + MongoDB) designed for scalability and security, with a planned Angular frontend for data visualization and user interaction.

---

## ✨ Features

### **Core Functionality**
- ✅ **65 REST API Endpoints** - Complete CRUD operations for breaches, users, and analytics
- ✅ **JWT Authentication** - Secure token-based authentication with functional guards
- ✅ **Role-Based Access Control (RBAC)** - Admin, Analyst, and Guest roles with structural directives
- ✅ **Geospatial Mapping** - Leaflet-js tactical map with GeoJSON telemetry and geolocation
- ✅ **Advanced Analytics** - 11 aggregation endpoints for industry-year trends and risk distribution
- ✅ **Exposure Scanner** - Real-time identity and domain exposure intelligence scanner
- ✅ **Dark/Light Themes** - System-aware theming with CSS custom properties
- ✅ **Comprehensive Testing** - 835 tests across backend (586) and frontend (249)


### **Security Features**
- 🔐 JWT token authentication with MongoDB-based blacklist
- 🔐 Account lockout after failed login attempts
- 🔐 BCrypt password hashing (12 rounds)
- 🔐 NoSQL injection protection
- 🔐 XSS sanitization
- 🔐 Security headers (CSP, X-Frame-Options)
- 🔐 Rate limiting on sensitive endpoints
- 🔐 Audit logging for security events

### **Data Management**
- 📊 25+ seeded breach records from real-world sources
- 📊 Full-text search across breach titles and descriptions
- 📊 Pagination and filtering support
- 📊 GeoJSON export for mapping integrations
- 📊 Sub-document arrays for affected accounts and timelines

---

## 🛠 Technology Stack

### **Backend** (Coursework 1 - ✅ Complete)
- **Framework**: Flask 3.0.3
- **Database**: MongoDB 7.0 with PyMongo 4.6.3
- **Authentication**: PyJWT (raw JWT library)
- **Testing**: pytest 8.2.2 (586 tests)
- **API Documentation**: Swagger/OpenAPI
- **Security**: bcrypt, flask-limiter, bleach
- **Environment**: Python 3.11+

### **Frontend** (Coursework 2 - ✅ Complete)
- **Framework**: Angular 17.3 (standalone components, signals)
- **Language**: TypeScript 5.4
- **UI**: Bootstrap 5.3 with custom CSS variables (dark/light themes)
- **Mapping**: Leaflet.js 1.9.4 with GeoJSON, Stadia Maps + OpenStreetMap tiles
- **Charts**: Chart.js 4.4 (6 chart types, theme-reactive)
- **State Management**: Angular Signals (signal, computed, effect)
- **Testing**: Jasmine 5.1 + Karma 6.4 (249 tests)

### **Development Tools**
- **API Testing**: Postman (69 requests, 115+ test assertions)
- **Code Quality**: pytest, coverage.py, pre-commit hooks
- **Security Scanning**: detect-secrets
- **Version Control**: Git with branch protection

---

## 📂 Project Structure

```
BreachLens/
├── backend/                          # Backend API (Flask)
│   ├── app/                          # Application package
│   │   ├── routes/                   # REST API endpoints (63 endpoints)
│   │   ├── services/                 # Business logic layer
│   │   ├── models/                   # Data validation schemas
│   │   ├── middleware/               # Auth, logging, security
│   │   └── utils/                    # Helper functions
│   ├── tests/                        # Test suite (586 tests)
│   ├── seed/                         # Database seeding scripts
│   ├── postman/                      # API test collection
│   ├── logs/                         # Application logs
│   ├── htmlcov/                      # Coverage reports
│   ├── run.py                        # Application entry point
│   ├── requirements.txt              # Python dependencies
│   └── README.md                     # Backend documentation
├── docs/                             # Project documentation
│   ├── API_SPEC.md                   # Complete API reference
│   ├── PRD.md                        # Product requirements
│   ├── QA_STRATEGY.md                # Testing strategy
│   ├── SUBMISSION_CHECKLIST.md       # Coursework checklist
│   └── README.md                     # Documentation index
├── frontend/                         # Frontend (Angular 17 SPA)
│   ├── src/app/                      # Application source
│   │   ├── core/                     # Guards, interceptors, resolvers, services
for│   │   ├── features/                 # Lazy-loaded feature components (16)
│   │   └── shared/                   # Pipes, directives, shared components
│   ├── package.json                  # Node dependencies
│   └── README.md                     # Frontend documentation
├── .pre-commit-config.yaml           # Git hooks configuration
├── LICENSE                           # MIT License
└── README.md                         # This file
```

**Detailed module structure**: See [backend/README.md](backend/README.md) for complete backend architecture.

---

## 🚀 Quick Start

### **Prerequisites**
- Python 3.11 or higher
- Node.js 18+ and npm
- MongoDB 7.0 (local installation)
- Git

### **1. Clone Repository**
```bash
git clone https://github.com/yourusername/BreachLens.git
cd BreachLens
```

### **2. Setup Backend**
```bash
# Create virtual environment
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate

# Install dependencies
cd backend
pip install -r requirements.txt

# Configure environment
cp .env.example .env
# Edit .env with your MongoDB URI and secrets
```

### **3. Start MongoDB**
```bash
# macOS (Homebrew)
brew services start mongodb-community

# Verify MongoDB is running
mongosh --eval "db.version()"
```

### **4. Seed Database**
```bash
python seed/seed_data.py --reset
# Seeds 25+ breach records and default users
```

### **5. Run Backend API**
```bash
python run.py
# API available at: http://localhost:5001
# Swagger docs: http://localhost:5001/api/docs
```

### **6. Setup Frontend**
```bash
cd ../frontend
npm install
npm start
# App: http://localhost:4200
```

### **7. Test Both**
```bash
# Backend tests
cd backend && pytest tests/ -v
# Expected: 586 passed, 2 skipped, 14 deselected

# Frontend tests
cd ../frontend && npx ng test --watch=false --browsers=ChromeHeadless
# Expected: 247 passed
```

### **8. Test with cURL**
```bash
# Health check
curl http://localhost:5001/health

# Login (get JWT token)
curl -X POST http://localhost:5001/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "admin@breachlens.io", "password": "Admin@123"}'  # pragma: allowlist secret

# Use token for authenticated requests
curl http://localhost:5001/api/v1/breaches \
  -H "x-access-token: YOUR_TOKEN_HERE"
```

---

## 🔌 Backend API

### **API Endpoints (63 Total)**

| Category | Endpoints | Description |
|----------|-----------|-------------|
| **Authentication** | 8 | Registration, login, logout, profile |
| **Breaches** | 32 | CRUD operations, geospatial queries, sub-documents |
| **Analytics** | 10 | Risk assessment, trends, aggregations |
| **Users** | 4 | User management, profile updates |
| **Admin** | 6 | System stats, audit logs, cache management |
| **Health** | 3 | Health checks, readiness, liveness |

**Base URL**: `http://localhost:5001/api/v1`

### **Authentication**
```bash
# Login with credentials
POST /auth/login
{
  "email": "admin@breachlens.io",
  "password": "Admin@123"  # pragma: allowlist secret
}

# Returns JWT token valid for 1 hour
# Use in header: x-access-token: <token>
```

### **Example Requests**

**List All Breaches** (paginated, filtered):
```bash
GET /api/v1/breaches?page=1&limit=10&severity=Critical&status=Unresolved
```

**Create Breach** (Analyst/Admin):
```bash
POST /api/v1/breaches
Content-Type: application/json
x-access-token: YOUR_TOKEN

{
  "title": "DataCorp Security Incident",
  "description": "Payment system breach",
  "severity": "Critical",
  "breach_date": "2026-01-15",
  "records_exposed": 500000,
  ...
}
```

**Geospatial Search**:
```bash
GET /api/v1/breaches/geo/near?longitude=-0.1278&latitude=51.5074&max_distance=100000
```

**Analytics Dashboard**:
```bash
GET /api/v1/analytics/summary
```

📖 **Full API Documentation**: [docs/API_SPEC.md](docs/API_SPEC.md)
📦 **Postman Collection**: [backend/postman/](backend/postman/)

### **Default Test Accounts**

| Role | Email | Password | Permissions |
|------|-------|----------|-------------|
| Admin | admin@breachlens.io | Admin@123 | Full access | <!-- pragma: allowlist secret -->
| Analyst | priya@breachlens.io | Analyst@123 | Read + Create/Update | <!-- pragma: allowlist secret -->
| Guest | marcus@example.com | Guest@123 | Read-only (limited) | <!-- pragma: allowlist secret -->

### **Backend Architecture**

The backend follows a **layered architecture**:

1. **Routes Layer** (`app/routes/`) - HTTP request handling and validation
2. **Services Layer** (`app/services/`) - Business logic and MongoDB operations
3. **Models Layer** (`app/models/`) - Data validation schemas
4. **Middleware Layer** (`app/middleware/`) - Authentication, logging, security
5. **Utils Layer** (`app/utils/`) - Helper functions and utilities

**For complete backend documentation**: See [backend/README.md](backend/README.md)

---

## 🎨 Frontend

### **Status**: ✅ Complete (Coursework 2)

Angular 17 single-page application with **14 standalone components**, **247 passing tests**, and full backend integration.

#### **Key Features**
- 🖥️ **Angular 17 SPA** — Standalone components, signals, computed(), effect(), lazy-loaded routes
- 🗺️ **Interactive Breach Map** — Leaflet.js with GeoJSON markers, geolocation, severity coloring
- 📊 **Analytics Dashboard** — 6 Chart.js visualizations (bar, line, doughnut, histogram)
- 🔍 **Advanced Search** — Multi-criteria filtering, auto-suggestions, subdocument queries
- 📋 **Breach Management** — Full CRUD with sub-document management (timeline, remediation, alerts, accounts)
- 👤 **Admin Panel** — User management, role changes, bulk operations, audit trail
- 🔐 **Authentication** — JWT login/register/reset, functional guards, HTTP interceptor
- 🎨 **Dark/Light Theme** — System preference detection, CSS variables, theme-reactive maps/charts
- 📱 **Responsive Design** — Bootstrap 5 grid, mobile-friendly navigation
- 🔒 **Role-Based UI** — Custom `*appRequireRole` structural directive, 3 route guards

#### **Angular Highlights**
| Feature | Count |
|---------|-------|
| Components | 14 (all standalone) |
| Services | 7 |
| Custom Pipes | 3 (TimeAgo, RiskLevel, CompactNumber) |
| Custom Directives | 2 (CopyClipboard, RequireRole) |
| Route Guards | 3 (auth, admin, analyst) |
| Route Resolver | 1 (breach detail pre-fetch) |
| HTTP Interceptor | 1 (JWT + error handling) |
| Backend Endpoints Consumed | 65 |
| Tests | 249 passing |

**Frontend documentation**: [frontend/README.md](frontend/README.md)

---

## 📚 Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

| Document | Description |
|----------|-------------|
| [API_SPEC.md](docs/API_SPEC.md) | Complete API reference with request/response examples |
| [PRD.md](docs/PRD.md) | Product requirements and feature specifications |
| [QA_STRATEGY.md](docs/QA_STRATEGY.md) | Testing strategy and quality assurance plan |
| [SUBMISSION_CHECKLIST.md](docs/SUBMISSION_CHECKLIST.md) | Coursework requirements checklist |
| [backend/README.md](backend/README.md) | Backend architecture and development guide |
| [frontend/README.md](frontend/README.md) | Frontend architecture, components, and testing |

**Module-specific READMEs**:
- [backend/app/README.md](backend/app/README.md) - Application factory and configuration
- [backend/app/routes/README.md](backend/app/routes/README.md) - REST API endpoints reference
- [backend/app/models/README.md](backend/app/models/README.md) - Data validation schemas
- [backend/app/services/README.md](backend/app/services/README.md) - Business logic layer
- [backend/app/middleware/README.md](backend/app/middleware/README.md) - Authentication and security
- [backend/app/utils/README.md](backend/app/utils/README.md) - Helper functions
- [backend/tests/README.md](backend/tests/README.md) - Testing guidelines
- [backend/seed/README.md](backend/seed/README.md) - Database seeding guide
- [backend/postman/README.md](backend/postman/README.md) - API testing with Postman

---

## 🧪 Testing

### **Test Coverage**

The project has comprehensive test coverage across both backend and frontend: **833 total tests**.

#### **Backend Tests (586 passing, 88% coverage)**

| Test Module | Tests | Focus |
|-------------|-------|-------|
| Authentication | 11 | Auth endpoints, JWT validation |
| Breach CRUD | 21 | Create, read, update, delete operations |
| Sub-documents | 31 | Accounts, timeline, remediation, alerts |
| Security | 40 | NoSQL injection, XSS, rate limiting, lockout |
| Analytics | ~10 | Aggregation pipelines and reports |
| Breach Service | ~50 | Business logic with mocks |
| Models/Validation | ~140 | Schema validation and utilities |
| Services Integration | ~200 | End-to-end service layer tests |
| Admin Routes | ~25 | Admin operations and RBAC |
| User Management | ~30 | User profile and management |
| Performance | 14 | Benchmarks (deselected by default) |

#### **Frontend Tests (249 passing)**

| Test Module | Tests | Focus |
|-------------|-------|-------|
| Custom Pipes | 83 | TimeAgo, RiskLevel, CompactNumber |
| Custom Directives | 25 | CopyClipboard, RequireRole |
| Services | 33 | Auth, Breach, Notification, Theme |
| Guards & Interceptors | 19 | Auth guard signals, JWT interceptor |
| Resolver | 8 | Breach detail pre-fetch |
| Components | 70 | Profile, Pagination, SeverityBadge, BreachList, Dashboard |
| Integration | 9 | Service HTTP calls |

### **Running Tests**

```bash
# Backend tests
cd backend
source ../venv/bin/activate
pytest tests/ -v

# Frontend tests
cd frontend
npx ng test --watch=false --browsers=ChromeHeadless

# Backend coverage report
cd backend
pytest tests/ --cov=app --cov-report=html --cov-report=term
open htmlcov/index.html

# Frontend coverage report
cd frontend
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage
open coverage/breachlens-frontend/index.html
```

### **API Testing with Postman**

The [`backend/postman/`](backend/postman/) directory contains a complete Postman collection with **64 requests** and **108 test assertions** covering all major API endpoints.

```bash
# Import collection
backend/postman/BreachLens.postman_collection.json

# Import environment
backend/postman/BreachLens.postman_environment.json

# Run with Newman
npm install -g newman
newman run backend/postman/BreachLens.postman_collection.json \
  -e backend/postman/BreachLens.postman_environment.json
```

**Test Documentation**: [backend/tests/README.md](backend/tests/README.md)

---

## 🛡️ Security

BreachLens implements multiple layers of security:

### **Authentication & Authorization**
- ✅ JWT tokens with 1-hour expiration
- ✅ Token blacklist stored in MongoDB (logout support)
- ✅ Role-based access control (Admin, Analyst, Guest)
- ✅ Account lockout after 5 failed login attempts
- ✅ Password reset with secure token flow

### **Data Protection**
- ✅ BCrypt password hashing (12 rounds)
- ✅ NoSQL injection prevention
- ✅ XSS sanitization with bleach library
- ✅ Input validation on all endpoints
- ✅ Query parameter sanitization

### **Infrastructure Security**
- ✅ Security headers (CSP, X-Frame-Options, X-Content-Type-Options)
- ✅ CORS configuration per environment
- ✅ Rate limiting (100 req/min on auth endpoints)
- ✅ Audit logging for security events
- ✅ Git pre-commit hooks for secret detection

### **Security Testing**
- ✅ 40+ security-focused tests
- ✅ NoSQL injection test coverage
- ✅ XSS attack prevention tests
- ✅ Rate limiting validation
- ✅ Account lockout testing

**Security Documentation**: [backend/README.md#security-features](backend/README.md#security-features)

---

## 🤝 Contributing

### **Development Workflow**

1. **Clone and setup**:
   ```bash
   git clone https://github.com/yourusername/BreachLens.git
   cd BreachLens
   python3 -m venv venv
   source venv/bin/activate
   cd backend && pip install -r requirements.txt
   ```

2. **Create feature branch**:
   ```bash
   git checkout -b feature/your-feature-name
   ```

3. **Make changes and test**:
   ```bash
   pytest tests/ -v
   ```

4. **Commit with conventional commits**:
   ```bash
   git commit -m "feat: add new analytics endpoint"
   git commit -m "fix: resolve authentication issue"
   git commit -m "docs: update API documentation"
   ```

5. **Push and create PR**:
   ```bash
   git push origin feature/your-feature-name
   ```

### **Pre-commit Hooks**

The repository uses pre-commit hooks for code quality:
- ✅ Large file detection
- ✅ JSON/YAML validation
- ✅ Secret detection
- ✅ Python syntax validation
- ✅ Trailing whitespace removal
- ✅ Branch protection (main branch only)

Install hooks:
```bash
pip install pre-commit
pre-commit install
```

### **Coding Standards**
- Follow PEP 8 for Python code
- Write unit tests for new features
- Update documentation for API changes
- Add docstrings to all functions
- Use type hints where applicable

---

## 📝 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 👥 Authors

**Ritik Sah**
Student ID: B00925357
Course: COM661 Full Stack Development
Institution: Ulster University

---

## 📞 Support

For questions or issues:

- 📧 Email: [your.email@study.beds.ac.uk]
- 📖 Documentation: [docs/](docs/)
- 🐛 Issues: [GitHub Issues](https://github.com/yourusername/BreachLens/issues)

---

## 🗓️ Project Status

| Component | Status | Completion |
|-----------|--------|------------|
| Backend API | ✅ Complete | 100% (Coursework 1) |
| Frontend SPA | ✅ Complete | 100% (Coursework 2) |
| API Documentation | ✅ Complete | 100% |
| Backend Testing | ✅ Complete | 586 tests, 88% coverage |
| Frontend Testing | ✅ Complete | 249 tests across 16 components |

**Last Updated**: April 2026
**Version**: v2.0.0 (Full Stack)

---

**Built for COM661 Full Stack Development**
