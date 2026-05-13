# BreachLens

> **Enterprise-Grade Cyber Threat Intelligence Platform** - High-performance full-stack application for tracking data breaches, mapping cyber-attacks, and monitoring compromised assets.

[![Backend Tests](https://img.shields.io/badge/Backend_Tests-586%20passing-brightgreen.svg)](backend/tests/)
[![Frontend Tests](https://img.shields.io/badge/Frontend_Tests-249%20passing-brightgreen.svg)](frontend/src/app/)
[![Coverage](https://img.shields.io/badge/Coverage-88%25-brightgreen.svg)](backend/htmlcov/)
[![CI/CD](https://github.com/ritiksah/BreachLens/actions/workflows/backend-ci.yml/badge.svg)](https://github.com/ritiksah/BreachLens/actions)
[![Python](https://img.shields.io/badge/Python-3.14-blue.svg)](https://www.python.org/)
[![Angular](https://img.shields.io/badge/Angular-17.3-red.svg)](https://angular.dev/)

---

## 🎯 Overview

BreachLens is a production-ready cyber threat intelligence platform designed to track and analyze data breaches at scale. The platform provides:

- **Scalable Exposure Checks**: High-speed email exposure detection using an in-memory **Bloom Filter** architecture.
- **Privacy-First Security**: k-Anonymity password checking via the Pwned Passwords API.
- **Geospatial Mapping**: Visualize breach origins and affected regions globally.
- **Risk Analytics**: Aggregated insights on industry risks, severity trends, and exposure metrics.
- **Enterprise Auth**: Industry-standard Bearer Token (JWT) authentication with automated TTL-based revocation.

---

## ✨ Features

### **Production-Grade Infrastructure**
- ✅ **Bloom Filter Architecture** - High-speed scalable gate for millions of exposed email signatures (1.7MB footprint).
- ✅ **k-Anonymity Password Checker** - Privacy-preserving exposure checks using SHA-1 range hashing.
- ✅ **Standard Bearer Auth** - Migrated to `Authorization: Bearer <token>` for industry compatibility.
- ✅ **Automated TTL Revocation** - MongoDB TTL indexes automatically purge expired tokens from the blacklist.
- ✅ **CI/CD Pipeline** - Automated quality gates (Linting, Security Scanning, Testing) via GitHub Actions.
- ✅ **Cloud Rate Limiting** - Production-grade brute-force protection using Upstash Redis.

### **Core Functionality**
- ✅ **65 REST API Endpoints** - Complete CRUD operations for breaches, users, and analytics.
- ✅ **Role-Based Access Control (RBAC)** - Admin, Analyst, and Guest roles with structural directives.
- ✅ **Geospatial Mapping** - Leaflet-js tactical map with GeoJSON telemetry.
- ✅ **Advanced Analytics** - 11 aggregation endpoints for industry-year trends and risk distribution.
- ✅ **Exposure Scanner** - Real-time identity and domain exposure intelligence scanner.
- ✅ **Dark/Light Themes** - System-aware theming with CSS custom properties.
- ✅ **Comprehensive Testing** - 835 tests across backend (586) and frontend (249).

---

## 🛠 Technology Stack

### **Backend** (Flask + MongoDB)
- **Database**: MongoDB 7.0 (Atlas) with TTL indexes.
- **Caching/Rate-Limit**: Upstash Redis (Production) / In-memory (Dev).
- **Security**: Flask-Talisman (CSP/HSTS), Flask-Limiter, BCrypt (12 rounds).
- **Architecture**: Layered Service Pattern with OSINT ETL Pipeline.

### **Frontend** (Angular 17)
- **Framework**: Angular 17.3 (Standalone components, Signals).
- **Mapping**: Leaflet.js with Stadia Maps + OpenStreetMap tiles.
- **Charts**: Chart.js 4.4 (Theme-reactive).

---

## 🚀 Quick Start

### **1. Setup Backend**
```bash
cd backend
pip install -r requirements.txt
cp .env.example .env
# Build production assets (Bloom Filter + OSINT Sync)
bash build.sh
# Start API
python run.py
```

### **2. Setup Frontend**
```bash
cd frontend
npm install
npm start
```

---

## 🔌 API & Authentication

### **Authentication**
BreachLens uses standard Bearer Token authentication.

```bash
# Login to get JWT
POST /api/v1/auth/login
{
  "email": "<your-email>",
  "password": "<your-password>"
}

# Use token in headers
Authorization: Bearer <YOUR_TOKEN>
```

📖 **Full API Reference**: [docs/API_SPEC.md](docs/API_SPEC.md)

---

## 🛡️ Security & CI/CD

### **Continuous Integration**
Our GitHub Actions pipeline ensures code quality on every push:
- **Linting**: Style enforcement via `flake8`.
- **Security**: Automated vulnerability scanning via `Bandit`.
- **Testing**: Full `PyTest` suite with coverage tracking.

### **Cloud Deployment**
- **Backend**: Hosted on **Render** (Blue/Green deployment from `main`).
- **Frontend**: Hosted on **Vercel** with SPA routing logic.
- **Data**: **MongoDB Atlas** (Primary) + **Upstash Redis** (Rate Limiting).

---

## 🎨 Frontend Highlights

Angular 17 single-page application with **14 standalone components** and full backend integration.

- 🗺️ **Interactive Breach Map**: Leaflet.js with GeoJSON markers and severity coloring.
- 📊 **Analytics Dashboard**: 6 Chart.js visualizations (bar, line, doughnut, etc.).
- 🔍 **Advanced Search**: Multi-criteria filtering and auto-suggestions.
- 📋 **Breach Management**: Full CRUD with sub-document management.
- 👤 **Admin Panel**: User management, role changes, and audit trail.
- 🎨 **Theme-Aware**: System preference detection (Dark/Light).

---

## 🧪 Testing

The project has comprehensive test coverage: **835 total tests**.

```bash
# Backend tests
cd backend && pytest tests/ -v

# Frontend tests
cd frontend && npx ng test --watch=false --browsers=ChromeHeadless
```

---

## 🛠️ Development & Local Testing

### **⚠️ Security Warning**
The following credentials are provided **exclusively for local development and initial testing**. They are automatically created by the `seed/seed_data.py` script. **Do not use these in a production environment.**

| Role | Default Email | Password | Permissions |
|------|---------------|----------|-------------|
| Admin | admin@breachlens.io | *Auto-generated* | Full system access |
| Analyst | priya@breachlens.io | *Auto-generated* | Read + Write access |
| Guest | marcus@example.com | *Auto-generated* | Limited read-only access |

**Note:** All seeded accounts are initialized in an **unlocked** state (`failed_login_attempts: 0`). During initial seeding via `seed_data.py` or `build.sh`, secure random passwords will be generated and printed to your terminal. Please save these securely. You can override these defaults by setting `ADMIN_PASSWORD`, `ANALYST_PASSWORD`, and `GUEST_PASSWORD` in your `.env` file.

---

## 📝 License

This project is licensed under the **MIT License**. See [LICENSE](LICENSE) for details.

---

## 👥 Authors

**Ritik Sah**
Student ID: B00925357
Course: COM661 Full Stack Development
Institution: Ulster University

**Last Updated**: May 2026
**Version**: v2.1.0 (Production Ready)
