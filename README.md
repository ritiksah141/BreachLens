# BreachLens

> **Cyber Threat Intelligence Platform** - Full-stack application for tracking data breaches, mapping cyber-attacks, and monitoring compromised assets.

[![Tests](https://img.shields.io/badge/Tests-586%20passing-brightgreen.svg)](backend/tests/)
[![Coverage](https://img.shields.io/badge/Coverage-88%25-brightgreen.svg)](backend/htmlcov/)
[![Python](https://img.shields.io/badge/Python-3.14-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)
[![MongoDB](https://img.shields.io/badge/MongoDB-7.0-green.svg)](https://www.mongodb.com/)

**COM661 Full Stack Development - Ulster University**
**Coursework 1**: Backend API Development ✅
**Coursework 2**: Frontend Development (Planned)

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
- ✅ **63 REST API Endpoints** - Complete CRUD operations for breaches, users, and analytics
- ✅ **JWT Authentication** - Secure token-based authentication with blacklist support
- ✅ **Role-Based Access Control (RBAC)** - Admin, Analyst, and Guest roles
- ✅ **Geospatial Queries** - Find breaches by location using MongoDB 2dsphere indexes
- ✅ **Advanced Analytics** - 10 aggregation endpoints for risk assessment and trends
- ✅ **Sub-document Management** - Track accounts, timelines, remediation, and alerts
- ✅ **Exposure Checking** - Check if email/domain appears in breach data
- ✅ **Comprehensive Testing** - 586 tests with 88% code coverage

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

### **Frontend** (Coursework 2 - 📅 Planned)
- **Framework**: Angular 17+ (planned)
- **UI Library**: Angular Material (planned)
- **Mapping**: Leaflet.js for geospatial visualization (planned)
- **Charts**: Chart.js for analytics dashboards (planned)
- **State Management**: NgRx or RxJS (planned)

### **Development Tools**
- **API Testing**: Postman (87 test requests)
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
├── frontend/                         # Frontend (Coursework 2)
│   └── [To be implemented]
├── .pre-commit-config.yaml           # Git hooks configuration
├── LICENSE                           # MIT License
└── README.md                         # This file
```

**Detailed module structure**: See [backend/README.md](backend/README.md) for complete backend architecture.

---

## 🚀 Quick Start

### **Prerequisites**
- Python 3.11 or higher
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

### **6. Test API**
```bash
# Run test suite
pytest tests/ -v

# Expected: 586 passed, 2 skipped, 14 deselected
```

### **7. Test with cURL**
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

### **Status**: 📅 Planned for Coursework 2

The frontend will be developed as part of **COM661 Coursework 2** and will include:

#### **Planned Features**
- 🖥️ **Angular 17+ Single-Page Application**
- 🗺️ **Interactive Breach Map** - Geospatial visualization with Leaflet.js
- 📊 **Analytics Dashboard** - Charts and metrics using Chart.js
- 🔍 **Advanced Filtering** - Multi-criteria search and filtering
- 📋 **Breach Management** - CRUD interface for analysts and admins
- 👤 **User Management** - Admin panel for user and role management
- 🔐 **Authentication UI** - Login, registration, password reset flows
- 📱 **Responsive Design** - Mobile-friendly Angular Material components
- 🔔 **Real-time Alerts** - WebSocket notifications (planned)

#### **Development Timeline** (Coursework 2)
- Week 1-2: Angular project setup and routing
- Week 3-4: Authentication and state management
- Week 5-6: Breach listing and detail views
- Week 7-8: Interactive map integration
- Week 9-10: Analytics dashboard and charts
- Week 11-12: Admin panel and final testing

**Frontend documentation will be added in**: `frontend/README.md` (Coursework 2)

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

The backend has comprehensive test coverage with **586 passing tests** and **88% code coverage**.

| Test Module | Tests | Coverage |
|-------------|-------|----------|
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

### **Running Tests**

```bash
# Activate virtual environment
cd backend
source ../venv/bin/activate

# Run all tests
pytest tests/ -v

# Run specific test modules
pytest tests/test_auth.py -v
pytest tests/test_breaches.py -v
pytest tests/test_security.py -v

# Generate coverage report
pytest tests/ --cov=app --cov-report=html --cov-report=term
open htmlcov/index.html
```

### **API Testing with Postman**

The [`backend/postman/`](backend/postman/) directory contains a complete Postman collection with **87 test requests** covering all 63 endpoints.

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
| API Documentation | ✅ Complete | 100% |
| Testing | ✅ Complete | 586 tests, 88% coverage |
| Frontend | 📅 Planned | 0% (Coursework 2) |
| Deployment | 📅 Planned | TBD |

**Last Updated**: March 2026
**Version**: v1.0.0 (Backend API)

---

**Built for COM661 Full Stack Development**
