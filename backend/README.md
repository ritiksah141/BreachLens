# BreachLens Backend API

[![Tests](https://img.shields.io/badge/Tests-586%20passing-brightgreen.svg)](tests/)
[![Coverage](https://img.shields.io/badge/Coverage-88%25-brightgreen.svg)](htmlcov/)
[![CI/CD](https://github.com/ritiksah/BreachLens/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/ritiksah/BreachLens/actions)
[![Python](https://img.shields.io/badge/Python-3.14-blue.svg)](https://www.python.org/)

**Production-grade RESTful API for breach intelligence tracking.**

---

## 🚀 Production Features

### **Scalable Data Intelligence**
- **Bloom Filter Architecture**: High-speed, in-memory filter (`seed/breaches.bloom`) for millions of email signatures. Bypasses database constraints for instant exposure checks.
- **k-Anonymity Security**: Privacy-preserving password exposure checking using the Pwned Passwords API (SHA-1 range hashing).
- **OSINT ETL Pipeline**: Automated data ingestion and Bloom Filter generation via `seed/pipeline.py`.

### **Enterprise Security**
- **Bearer Token Auth**: Standard `Authorization: Bearer <token>` support.
- **Automated Revocation**: MongoDB TTL index on the `blacklist` collection for zero-maintenance token lifecycle.
- **Cloud Rate Limiting**: Distributed rate limiting wired to Upstash Redis for brute-force protection.
- **Security Headers**: Strict CSP, HSTS, and X-Frame-Options enforced via `Flask-Talisman`.

---

## 🚀 Quick Start

### **1. Setup Environment**
```bash
# From project root
python3 -m venv venv
source venv/bin/activate

cd backend
pip install -r requirements.txt
cp .env.example .env
```

### **2. Build & Seed**
```bash
# Generate Bloom Filter and sync OSINT data
bash build.sh
```

### **3. Run API**
```bash
python run.py
# API: http://localhost:5001
# Docs: http://localhost:5001/api/docs
```

---

## 🧪 Testing

```bash
# Run full suite
pytest tests/ -v

# Generate coverage report
pytest tests/ --cov=app --cov-report=html
```

---

## 📡 API Authentication

BreachLens uses industry-standard JWT Bearer tokens.

1. **Login**: `POST /api/v1/auth/login` → Returns `{"token": "...", "token_type": "JWT"}`.
2. **Authorize**: Add header `Authorization: Bearer <YOUR_TOKEN>`.
3. **Logout**: `POST /api/v1/auth/logout` → Token is blacklisted in MongoDB.

---

## 🛠️ Development Credentials (Local Only)

**⚠️ WARNING**: These credentials are for local testing only. **Do not use in production.**

| Role | Email | Password |
|------|-------|----------|
| Admin | admin@breachlens.io | *Auto-generated* |
| Analyst | priya@breachlens.io | *Auto-generated* |
| Guest | marcus@example.com | *Auto-generated* |

*Seeded accounts are guaranteed to be unlocked (`failed_login_attempts: 0`) upon initialization. Secure random passwords are automatically generated and printed to your terminal when running the seed script for the first time.*

---

## 📂 Project Structure

```
backend/
├── app/                          # Application package
│   ├── routes/                   # REST endpoints (68 total)
│   ├── services/                 # Business logic layer
│   ├── middleware/               # Auth, logging, security
│   └── utils/                    # Helper functions (Pwned Passwords, Bloom, etc.)
├── tests/                        # Test suite (586 tests)
├── seed/                         # OSINT ETL Pipeline & Bloom Filter
├── build.sh                      # Production build script
├── run.py                        # App entry point
└── requirements.txt              # Python dependencies
```

---

## 🔧 Configuration

All configuration is managed via environment variables. See `.env.example` for the complete list.

- `MONGO_URI`: MongoDB connection string.
- `SECRET_KEY`: Secret used for signing JWT tokens.
- `REDIS_URL`: Optional Redis connection for distributed rate limiting.
- `MAX_LOGIN_ATTEMPTS`: Failed attempts before account lockout (default: 5).

---

**API Version**: v2.1.0 (Production Ready)
