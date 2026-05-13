# BreachLens – Dark Web Breach Intelligence Tracker
## Product Requirements Document (PRD)
**Version:** 2.1.0
**Module:** COM661 – Full Stack Strategies and Development
**Author:** Individual Coursework Submission
**Classification:** Academic – Internal Use Only

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Problem Statement](#2-problem-statement)
3. [Application Purpose & Vision](#3-application-purpose--vision)
4. [Target Users & Personas](#4-target-users--personas)
5. [Core Feature Epics](#5-core-feature-epics)
   - 5.1 [Backend Epics](#51-backend-epics)
   - 5.2 [Frontend Epics](#52-frontend-epics)
6. [Data Architecture](#6-data-architecture)
7. [Non-Functional Requirements](#7-non-functional-requirements)
8. [COM661 High 1st Alignment Matrix](#8-com661-high-1st-alignment-matrix)
9. [Project Constraints & Assumptions](#9-project-constraints--assumptions)
10. [Glossary](#10-glossary)

---

## 1. Executive Summary

**BreachLens** is a production-grade, full-stack cybersecurity intelligence platform designed to ingest, analyse, and visualise dark web data breach records at scale. Transitioned from a local prototype to a high-performance system, it now features an **in-memory Bloom Filter architecture** for millions of email signatures, **k-Anonymity password security**, and **distributed rate limiting** via Upstash Redis.

Built on a Python Flask RESTful API backend, a MongoDB document store with advanced geospatial and aggregation capabilities, and an Angular 17+ reactive frontend, BreachLens is architected to demonstrate mastery of every dimension examined in the COM661 CW1 and CW2 rubrics — from schema design and complex query construction through to role-based access, professional UI, and automated testing.

The application is purposefully scoped to **significantly exceed** the complexity of the Biz Directory demonstration system across every assessed dimension: data model depth, query sophistication, API strictness, frontend interactivity, and quality assurance rigour.

---

## 2. Problem Statement

### 2.1 The Cybersecurity Landscape

Data breaches are accelerating in frequency and scale. In 2025 alone, over 5,500 publicly disclosed breaches exposed more than 40 billion records globally. Security teams lack consolidated tooling to:

- Track breach origin, timeline, and severity in a single pane of glass.
- Quantify organisational risk exposure across multiple incidents.
- Monitor remediation progress against individual breach events.
- Visualise geospatial patterns of attack origin and victim geography.
- Set automated monitoring alerts for newly surfaced credentials.

### 2.2 Existing Tool Gaps

| Gap | Impact |
|-----|--------|
| Disparate data sources (CSV exports, email alerts, manual spreadsheets) | Slow incident response, missed exposures |
| No unified risk scoring across incident types | Inability to prioritise remediation effort |
| No geospatial view of breach origin patterns | Missed threat intelligence correlations |
| No role-differentiated access to sensitive breach data | Data governance and compliance failures |
| Manual Postman or curl-based API testing | Unreliable regression coverage |

### 2.3 Why BreachLens

BreachLens directly addresses each gap above by providing a purpose-built, API-first intelligence platform that unifies breach ingestion, risk analytics, geospatial mapping, and remediation tracking in one cohesive, role-secured application.

---

## 3. Application Purpose & Vision

### 3.1 Mission Statement

> To empower security teams with a professional, data-driven platform that transforms raw breach intelligence into actionable, risk-prioritised insight — accessible through a secure, role-aware web application.

### 3.2 Core Application Objectives

| # | Objective | Priority |
|---|-----------|----------|
| O1 | Provide a complete breach record management system (full CRUD + sub-document CRUD) | Critical |
| O2 | Deliver complex aggregation analytics: risk scoring, industry trends, severity breakdowns | Critical |
| O3 | Enable geospatial breach mapping with MongoDB 2dsphere and Leaflet.js | Critical |
| O4 | Enforce role-based access control (Admin / Analyst / Guest) via JWT | Critical |
| O5 | Expose a strictly RESTful API with correct HTTP semantics and centralised error handling | Critical |
| O6 | Present an Angular 17+ frontend exceeding the Biz Directory in every capability dimension | Critical |
| O7 | Deliver automated Postman/Newman test coverage with collection runner evidence | High |
| O8 | Support email exposure lookup against the breach dataset | High |
| O9 | Provide pagination, multi-field filtering, and sorting on all collection endpoints | High |
| O10 | Maintain a professional, submission-ready codebase with structured documentation | High |

### 3.3 Scope Boundaries

**In Scope:**
- Full breach record lifecycle management
- User authentication and role management
- Analytics dashboard (Chart.js)
- Geospatial visualisation (Leaflet.js)
- Automated testing (Postman/Newman + Angular Jasmine/Karma)
- Sub-document management (affected_accounts, monitoring_alerts, timeline, remediation)

**Out of Scope:**
- Live dark web scraping or OSINT integration (data seeded via fixtures)
- Payment processing or commercial SaaS features
- Mobile native applications

---

## 4. Target Users & Personas

### 4.1 Role Matrix

| Role | Access Level | JWT Required | Description |
|------|-------------|--------------|-------------|
| **Admin** | Full system access | Yes | Manages users, all breach records, system configuration. Full CRUD on all resources. |
| **Analyst** | Read + Create + Limited Update | Yes | Security professional. Can create and update breach records, manage sub-documents, view analytics. Cannot delete users or system configs. |
| **Guest** | Read-only (restricted fields) | No | Unauthenticated visitor. Can browse public breach summaries and query the exposure check endpoint. Sensitive fields (affected_accounts, raw_data) are redacted. |

### 4.2 User Personas

#### Persona 1 – Alex Chen (Admin)
- **Role:** Head of Security Operations
- **Goals:** Maintain system integrity, manage analyst access, audit all breach records, generate executive-level risk reports.
- **Pain Points:** Fragmented tooling, no unified dashboard, manual reporting cycle.
- **BreachLens Value:** Single-platform management, full data access, aggregation-powered reports.

#### Persona 2 – Priya Sharma (Security Analyst)
- **Role:** Threat Intelligence Analyst
- **Goals:** Log new breach records quickly, track remediation status, identify high-risk industry sectors, monitor client email exposure.
- **Pain Points:** Slow data entry across multiple tools, no risk scoring, no visualisation of breach geography.
- **BreachLens Value:** Fast record creation with validation, risk scoring dashboard, Leaflet map of breach origins, sub-document timeline tracking.

#### Persona 3 – Marcus Webb (Guest)
- **Role:** Member of the public / potential client
- **Goals:** Check whether a known email address or domain has appeared in a breach, understand the platform's capability before registering.
- **Pain Points:** Uncertainty about personal exposure, no accessible tooling without registration.
- **BreachLens Value:** Unauthenticated exposure check endpoint, public breach summary list, clear call-to-action for registration.

---

## 5. Core Feature Epics

### 5.1 Backend Epics

---

#### EPIC-BE-01: Data Model & Schema Design

**Description:** Design and implement a comprehensive MongoDB document schema that supports all application features, including nested sub-documents, GeoJSON, and all required indexing.

**Stories:**

| Story ID | Description | Acceptance Criteria |
|----------|-------------|---------------------|
| BE-01-01 | Define `breaches` collection schema with all required fields | Schema includes: `_id`, `title`, `description`, `source_url`, `breach_date`, `discovered_date`, `severity`, `status`, `industry`, `affected_records_count`, `data_types_exposed[]`, `location` (GeoJSON), `organisation`, `risk_score`, `affected_accounts[]`, `timeline[]`, `remediation[]`, `monitoring_alerts[]`, `created_at`, `updated_at`, `created_by` |
| BE-01-02 | Define `users` collection schema | Fields: `_id`, `username`, `email`, `password_hash`, `role`, `created_at`, `last_login`, `is_active` |
| BE-01-03 | Implement 2dsphere index on `location` field | Index confirmed via `db.breaches.getIndexes()` |
| BE-01-04 | Implement compound indexes on `severity`, `industry`, `status` | Query performance validated |
| BE-01-05 | Implement text index on `title` and `description` | Full-text search functional |
| BE-01-06 | Seed database with minimum 25 realistic breach records across 5+ industries | Fixture file `seed_data.py` included in codebase |

**Breach Document Schema (Canonical):**
```json
{
  "_id": "ObjectId",
  "title": "string (required, 5-200 chars)",
  "description": "string (required, min 20 chars)",
  "source_url": "string (URL format, optional)",
  "breach_date": "ISODate (required)",
  "discovered_date": "ISODate (required)",
  "severity": "enum: critical | high | medium | low | informational",
  "status": "enum: active | contained | investigating | resolved",
  "industry": "enum: finance | healthcare | retail | government | technology | education | energy | other",
  "affected_records_count": "integer (>= 0)",
  "data_types_exposed": ["string"],
  "risk_score": "float (0.0 – 10.0, computed via aggregation)",
  "organisation": {
    "name": "string",
    "domain": "string (domain format)",
    "country": "string",
    "size": "enum: small | medium | large | enterprise"
  },
  "location": {
    "type": "Point",
    "coordinates": ["longitude (-180 to 180)", "latitude (-90 to 90)"]
  },
  "affected_accounts": [
    {
      "_id": "ObjectId",
      "email": "string (valid email)",
      "username": "string",
      "data_exposed": ["string"],
      "notified": "boolean",
      "notification_date": "ISODate (nullable)"
    }
  ],
  "timeline": [
    {
      "_id": "ObjectId",
      "event_date": "ISODate",
      "event_type": "enum: breach_occurred | discovered | disclosed | contained | resolved",
      "description": "string",
      "actor": "string"
    }
  ],
  "remediation": [
    {
      "_id": "ObjectId",
      "action": "string",
      "status": "enum: pending | in_progress | completed",
      "assigned_to": "string",
      "due_date": "ISODate",
      "completed_date": "ISODate (nullable)"
    }
  ],
  "monitoring_alerts": [
    {
      "_id": "ObjectId",
      "alert_type": "enum: new_exposure | credential_stuffing | dark_web_mention | domain_squatting",
      "triggered_at": "ISODate",
      "severity": "enum: critical | high | medium | low",
      "details": "string",
      "acknowledged": "boolean"
    }
  ],
  "created_at": "ISODate",
  "updated_at": "ISODate",
  "created_by": "ObjectId (ref: users)"
}
```

---

#### EPIC-BE-02: RESTful API Architecture

**Description:** Implement a Flask RESTful API using Blueprints with strict REST conventions, centralised error handling, and correct HTTP verb/status code usage.

**Stories:**

| Story ID | Description | Acceptance Criteria |
|----------|-------------|---------------------|
| BE-02-01 | Implement Flask application factory pattern | `create_app()` in `app/__init__.py`, Blueprints registered |
| BE-02-02 | Register Blueprints: `auth`, `breaches`, `analytics`, `admin`, `users` | Each Blueprint in its own module under `app/routes/` |
| BE-02-03 | Implement centralised error handlers for all required HTTP codes | All errors return `{"status": "error", "message": "...", "code": N}` |
| BE-02-04 | Implement request logging middleware | Structured log output: method, path, status, response time |
| BE-02-05 | All collection endpoints support pagination (`page`, `limit`), sorting (`sort_by`, `order`), and multi-field filtering | Validated via Postman collection |
| BE-02-06 | Implement CORS with configurable origins | `flask-cors` configured per environment |

**Blueprint Structure:**
```
app/
├── __init__.py          # create_app() factory
├── config.py            # Config classes (Dev/Prod/Test)
├── extensions.py        # PyMongo, CORS, Limiter instances
├── routes/
│   ├── auth.py          # /api/v1/auth/*
│   ├── breaches.py      # /api/v1/breaches/*
│   ├── analytics.py     # /api/v1/analytics/*
│   ├── admin.py         # /api/v1/admin/*
│   └── users.py         # /api/v1/users/*
├── models/
│   ├── breach.py        # Validation schemas (Marshmallow/manual)
│   └── user.py
├── services/
│   ├── breach_service.py  # Business logic layer
│   ├── analytics_service.py
│   └── auth_service.py
├── middleware/
│   └── auth_middleware.py  # JWT decode + RBAC decorators
└── utils/
    ├── validators.py    # Input validation helpers
    ├── geo_utils.py     # GeoJSON helpers
    └── response.py      # Standard response builders
```

---

#### EPIC-BE-03: Authentication & Role-Based Access Control

**Description:** Implement JWT-based authentication with raw PyJWT (`jwt.encode`/`jwt.decode`), HTTP Basic Auth login, `x-access-token` header, route-level RBAC, and secure password management.

**Stories:**

| Story ID | Description | Acceptance Criteria |
|----------|-------------|---------------------|
| BE-03-01 | Implement user registration with BCrypt password hashing | `POST /api/v1/auth/register` returns 201, password never stored in plaintext |
| BE-03-02 | Implement login with JWT token issuance (Basic Auth + JSON) | `GET /api/v1/login` (Basic Auth) and `POST /api/v1/auth/login` (JSON) return `{"token": "...", "token_type": "JWT", "expires_in": 3600}` |
| BE-03-03 | Implement `@jwt_required` and `@require_auth` decorators | 401 returned for missing/invalid/blacklisted token |
| BE-03-04 | Implement `@admin_required` and `@require_role(*roles)` decorators | 403 returned for insufficient role |
| BE-03-05 | Implement token blacklist via MongoDB `blacklist` collection | Full token stored and checked via `find_one({"token": token})` |
| BE-03-06 | All protected routes enforce role correctly | Validated in Postman collection across all three roles |

**Guest Authentication Model:**

Guest is an **unauthenticated state** (no JWT token), not a role in the token payload. Unauthenticated users can access specific public endpoints without authentication. The `@jwt_required` decorator is bypassed for these endpoints by omitting the decorator entirely from the route handler.

**Important:** "Guest" does not appear in JWT role claims. It represents the absence of authentication, detected by checking `g.current_user_id` (present = authenticated, absent/None = guest).

**Public Endpoints** (no `@require_auth` decorator):
- `GET /api/v1/breaches` — List breaches with field redaction for unauthenticated requests (sensitive fields like `affected_accounts`, `raw_data` are excluded from the response).
- `GET /api/v1/breaches/exposure-check` — Check email/domain exposure.

**Protected Endpoints** (require `@require_auth` or `@require_role` decorators):
- All `POST`, `PUT`, `PATCH`, `DELETE` operations on breach records.
- All user management and admin routes.
- Analytics endpoints.

The implementation distinguishes public vs. protected routes by checking for authenticated user identity in the global request context (`g.current_user_id`). If `None` or missing, sensitive fields are redacted; if present, full data is returned based on role permissions.

---

#### EPIC-BE-04: Breach Record CRUD

**Description:** Full CRUD operations on the `breaches` top-level collection with strict validation and correct HTTP semantics.

| Story ID | Description | HTTP Method | Status Codes |
|----------|-------------|-------------|--------------|
| BE-04-01 | List all breaches (paginated, filtered, sorted) | GET | 200 |
| BE-04-02 | Get single breach by ID | GET | 200, 404 |
| BE-04-03 | Create new breach record | POST | 201, 400, 401, 422 |
| BE-04-04 | Full update of breach record | PUT | 200, 400, 401, 403, 404, 422 |
| BE-04-05 | Partial update of breach record | PATCH | 200, 400, 401, 403, 404 |
| BE-04-06 | Delete breach record | DELETE | 204, 401, 403, 404 |
| BE-04-07 | Search breaches by text query | GET | 200 |
| BE-04-08 | Filter breaches by severity, status, industry (query params) | GET | 200 |
| BE-04-09 | Check email/domain exposure across all breach records | GET | 200, 400 |

---

#### EPIC-BE-05: Sub-document CRUD

**Description:** Full CRUD on all four sub-document arrays using MongoDB positional operators.

**Affected Accounts (`affected_accounts[]`):**

| Story ID | Description | HTTP Method | MongoDB Operator |
|----------|-------------|-------------|-----------------|
| BE-05-01 | List affected accounts for a breach | GET | N/A |
| BE-05-02 | Add affected account to breach | POST | `$push` |
| BE-05-03 | Update specific affected account | PATCH | `$set` + positional `$` |
| BE-05-04 | Remove affected account from breach | DELETE | `$pull` |

**Timeline Events (`timeline[]`):**

| Story ID | Description | HTTP Method | MongoDB Operator |
|----------|-------------|-------------|-----------------|
| BE-05-05 | List timeline for a breach | GET | N/A |
| BE-05-06 | Add timeline event | POST | `$push` |
| BE-05-07 | Update timeline event | PATCH | `$set` + positional `$` |
| BE-05-08 | Delete timeline event | DELETE | `$pull` |

**Remediation Actions (`remediation[]`):**

| Story ID | Description | HTTP Method | MongoDB Operator |
|----------|-------------|-------------|-----------------|
| BE-05-09 | List remediation actions | GET | N/A |
| BE-05-10 | Add remediation action | POST | `$push` |
| BE-05-11 | Update remediation action | PATCH | `$set` + positional `$` |
| BE-05-12 | Delete remediation action | DELETE | `$pull` |

**Monitoring Alerts (`monitoring_alerts[]`):**

| Story ID | Description | HTTP Method | MongoDB Operator |
|----------|-------------|-------------|-----------------|
| BE-05-13 | List monitoring alerts for a breach | GET | N/A |
| BE-05-14 | Create monitoring alert | POST | `$push` |
| BE-05-15 | Acknowledge / update alert | PATCH | `$set` + positional `$` |
| BE-05-16 | Delete alert | DELETE | `$pull` |

---

#### EPIC-BE-06: Geospatial Queries

**Description:** Leverage MongoDB's 2dsphere index to provide geospatial breach queries exposed via REST endpoints.

| Story ID | Description | Implementation |
|----------|-------------|----------------|
| BE-06-01 | Find breaches within radius of coordinates | `$near` with `$maxDistance` in metres |
| BE-06-02 | Find breaches within a bounding box | `$geoWithin` + `$geometry` with GeoJSON Polygon (closed ring from min/max lng/lat corners). **Note:** `$box` is for legacy 2d indexes only; use `type: "Polygon"` for 2dsphere indexes. |
| BE-06-03 | Return GeoJSON FeatureCollection for Leaflet consumption | Endpoint transforms breach docs to GeoJSON |

---

#### EPIC-BE-07: Aggregation Pipeline Analytics

**Description:** Implement complex MongoDB aggregation pipelines serving the analytics dashboard.

| Story ID | Pipeline Description | Stages Used |
|----------|---------------------|-------------|
| BE-07-01 | Risk score summary: avg, max, min by industry | `$match` → `$group` → `$project` → `$sort` |
| BE-07-02 | Breach count and record exposure by severity | `$group` → `$project` → `$sort` |
| BE-07-03 | Industry trend: breaches per industry per year | `$project` (year extract) → `$group` → `$sort` |
| BE-07-04 | Remediation completion rate by breach | `$unwind` → `$group` → `$project` |
| BE-07-05 | Top 10 most affected organisations by record count | `$group` → `$sort` → `$limit` → `$project` |
| BE-07-06 | Alert acknowledgement rate per severity | `$unwind` → `$match` → `$group` → `$project` |
| BE-07-07 | Monthly breach discovery trend (time series) | `$project` (month/year) → `$group` → `$sort` |
| BE-07-08 | Data types exposure frequency heatmap data | `$unwind` → `$group` → `$sort` |

---

#### EPIC-BE-08: Input Validation

**Description:** All POST and PUT/PATCH endpoints enforce strict server-side validation.

| Validation Type | Fields | Error Response |
|----------------|--------|----------------|
| Required field presence | `title`, `severity`, `breach_date`, `status`, `industry` | 422 |
| String length range | `title` (5–200), `description` (min 20) | 422 |
| Enum validation | `severity`, `status`, `industry`, `org.size` | 422 |
| Email format | `affected_accounts[].email` | 422 |
| URL format | `source_url` | 422 |
| GeoJSON coordinate bounds | `location.coordinates[0]` ∈ [-180,180], `[1]` ∈ [-90,90] | 422 |
| Date ordering | `breach_date` must be ≤ `discovered_date` | 422 |
| Integer range | `affected_records_count` ≥ 0 | 422 |
| Float range | `risk_score` ∈ [0.0, 10.0] | 422 |

---

### 5.2 Frontend Epics

---

#### EPIC-FE-01: Project Architecture

**Description:** Angular 17+ project with strict mode, standalone components, feature modules, and routing configuration.

| Story ID | Description | Acceptance Criteria |
|----------|-------------|---------------------|
| FE-01-01 | Angular 17 project with `--strict` flag enabled | `strictTemplates`, `strictNullChecks` active |
| FE-01-02 | Feature module structure: `AuthModule`, `BreachesModule`, `AnalyticsModule`, `AdminModule` | Lazy-loaded via `loadChildren` |
| FE-01-03 | Global HTTP Interceptor for JWT auto-attachment | Token injected from localStorage on all requests |
| FE-01-04 | Global HTTP Interceptor for error handling | 401 redirects to login, 403 shows permission denied toast |
| FE-01-05 | Environment configuration: `environment.ts`, `environment.prod.ts` | `apiUrl` configured per environment |

**Angular Project Structure:**
```
src/
├── app/
│   ├── core/
│   │   ├── guards/
│   │   │   ├── auth.guard.ts
│   │   │   └── role.guard.ts
│   │   ├── interceptors/
│   │   │   ├── auth.interceptor.ts
│   │   │   └── error.interceptor.ts
│   │   ├── services/
│   │   │   ├── auth.service.ts
│   │   │   ├── breach.service.ts
│   │   │   ├── analytics.service.ts
│   │   │   └── notification.service.ts
│   │   └── models/
│   │       ├── breach.model.ts
│   │       ├── user.model.ts
│   │       └── api-response.model.ts
│   ├── features/
│   │   ├── auth/
│   │   │   ├── login/
│   │   │   └── register/
│   │   ├── breaches/
│   │   │   ├── breach-list/
│   │   │   ├── breach-detail/
│   │   │   ├── breach-form/
│   │   │   └── exposure-check/
│   │   ├── analytics/
│   │   │   ├── dashboard/
│   │   │   ├── risk-score-chart/
│   │   │   ├── industry-chart/
│   │   │   └── breach-map/
│   │   └── admin/
│   │       ├── user-management/
│   │       └── system-stats/
│   └── shared/
│       ├── components/
│       │   ├── navbar/
│       │   ├── pagination/
│       │   ├── loading-spinner/
│       │   ├── error-alert/
│       │   ├── severity-badge/
│       │   └── confirm-dialog/
│       └── pipes/
│           ├── severity-color.pipe.ts
│           └── relative-date.pipe.ts
```

---

#### EPIC-FE-02: Authentication & Route Guards

| Story ID | Description | Acceptance Criteria |
|----------|-------------|---------------------|
| FE-02-01 | Login form with email/password Reactive Form | Validators: required, email format, minLength |
| FE-02-02 | Register form with role selection (Guest default) | Full validation, password confirmation field |
| FE-02-03 | `AuthGuard` blocks unauthenticated access to protected routes | Redirects to `/login` with return URL preserved |
| FE-02-04 | `RoleGuard` blocks insufficient-role access | Redirects to `/forbidden` with role context |
| FE-02-05 | JWT stored in localStorage, decoded for role/expiry | `AuthService.currentUser$` observable |
| FE-02-06 | Auto-logout on token expiry | `AuthInterceptor` detects 401, clears token, redirects |

---

#### EPIC-FE-03: Breach Management UI

| Story ID | Description | Acceptance Criteria |
|----------|-------------|---------------------|
| FE-03-01 | Breach list with server-side pagination (10/20/25/50 per page), sorting (column headers), and filtering (severity, status, industry dropdowns) | All parameters reflected in URL query params. UI max 50 per page; API max `limit=100` (API-only). |
| FE-03-02 | Real-time search bar with debounce (300ms) | `Subject` + `debounceTime` + `switchMap` |
| FE-03-03 | Breach detail page with full record display including all sub-document sections | Tabbed layout: Overview, Affected Accounts, Timeline, Remediation, Alerts |
| FE-03-04 | Breach create/edit Reactive Form | Full field validation mirroring API validation rules |
| FE-03-05 | Sub-document management panels (inline CRUD for each array) | Modals or inline expansion panels |
| FE-03-06 | Email/domain exposure check form with results display | `GET /api/v1/breaches/exposure-check?email=...` |
| FE-03-07 | Severity badge component with colour coding | Critical=red, High=orange, Medium=amber, Low=green, Info=blue |
| FE-03-08 | Loading skeleton states for all async data | `ngIf` with loading boolean, skeleton placeholder components |
| FE-03-09 | Confirm dialog before delete operations | Reusable `ConfirmDialogComponent` |

---

#### EPIC-FE-04: Analytics Dashboard

| Story ID | Description | Chart Type | Data Source |
|----------|-------------|------------|-------------|
| FE-04-01 | Risk score by industry (bar chart) | Chart.js Bar | `/api/v1/analytics/risk-by-industry` |
| FE-04-02 | Breach severity distribution (doughnut chart) | Chart.js Doughnut | `/api/v1/analytics/severity-breakdown` |
| FE-04-03 | Monthly breach discovery trend (line chart) | Chart.js Line | `/api/v1/analytics/monthly-trend` |
| FE-04-04 | Top 10 most affected organisations (horizontal bar) | Chart.js Bar | `/api/v1/analytics/top-organisations` |
| FE-04-05 | Data types exposure frequency (radar chart) | Chart.js Radar | `/api/v1/analytics/data-types-frequency` |
| FE-04-06 | Remediation completion rate gauge (per breach) | Chart.js Doughnut | `/api/v1/analytics/remediation-rate` |
| FE-04-07 | Summary KPI tiles: total breaches, total records exposed, avg risk score, open alerts | Computed from analytics endpoints | Multiple endpoints |

---

#### EPIC-FE-05: Geospatial Visualisation

| Story ID | Description | Acceptance Criteria |
|----------|-------------|---------------------|
| FE-05-01 | Full-screen Leaflet.js map embedded in analytics dashboard | OpenStreetMap tile layer, responsive |
| FE-05-02 | Breach origin markers with severity-coloured pins | Dynamic icon colour based on `severity` field |
| FE-05-03 | Marker click popups with breach summary | Title, severity badge, date, record count, link to detail page |
| FE-05-04 | Cluster markers when zoom level is low | `leaflet.markercluster` plugin |
| FE-05-05 | Radius search on map: user draws circle, API returns breaches within | `$near` query triggered on circle draw event |

---

#### EPIC-FE-06: Admin Panel

| Story ID | Description | Role Required |
|----------|-------------|--------------|
| FE-06-01 | User list with role badges, activation status | Admin |
| FE-06-02 | Change user role (Admin / Analyst / Guest) | Admin |
| FE-06-03 | Activate / deactivate user accounts | Admin |
| FE-06-04 | System statistics: total users by role, total breaches, total alerts | Admin |

---

## 6. Data Architecture

### 6.1 Collections Summary

| Collection | Documents | Indexes |
|-----------|-----------|---------|
| `breaches` | Breach records with sub-documents | 2dsphere(location), compound(severity, industry, status), text(title, description) |
| `users` | User accounts | unique(email), unique(username) |

### 6.2 Risk Score Calculation

Risk score is computed via MongoDB aggregation pipeline using a normalized weighted-average formula:

$$
\text{RiskScore} = \frac{(\text{SeverityWeight} \times 4) + (\min(\log_{10}(\text{RecordCount} + 1), 10) \times 3) + (\text{DataSensitivityScore} \times 3)}{10}
$$

**Bounds:** This formula produces a range of **[0.4, 10.0]**.
- **Minimum (0.4):** Occurs when SeverityWeight = 1.0 (informational), RecordCount = 0, DataSensitivityScore = 0 → (1.0×4 + 0×3 + 0×3)/10 = 0.4
- **Maximum (10.0):** Occurs when SeverityWeight = 10.0 (critical), RecordCount ≥ 10^10, DataSensitivityScore = 10.0 → (10×4 + 10×3 + 10×3)/10 = 10.0

**Validation:** The API accepts `risk_score` in the range [0.0, 10.0] to allow manual overrides below the calculated minimum (0.4) if needed (e.g., for imported data or special cases). Calculated scores will always fall within [0.4, 10.0].

#### 6.2.1 Severity Weights

| Severity | Weight |
|----------|--------|
| critical | 10 |
| high | 7.5 |
| medium | 5.0 |
| low | 2.5 |
| informational | 1.0 |

#### 6.2.2 DataSensitivityScore Definition

DataSensitivityScore is a numeric value in the range [0, 10] derived from the `data_types_exposed[]` array. It represents the weighted average severity of exposed data types:

**High-Sensitivity Data Types** (weight = 10):
- `passwords`, `password_hashes`, `SSN`, `national_id`, `financial_data`, `credit_card`, `bank_account`, `medical_records`, `biometric_data`

**Medium-Sensitivity Data Types** (weight = 5):
- `email_addresses`, `phone_numbers`, `physical_addresses`, `IP_addresses`, `dates_of_birth`, `employment_info`

**Low-Sensitivity Data Types** (weight = 2.5):
- `usernames`, `names`, `genders`, `geographic_data`, `social_media_profiles`

**Calculation:**

$$
\text{DataSensitivityScore} = \frac{\sum (\text{weight}_i)}{\text{count}(\text{data\_types\_exposed})} \times \frac{1}{10} \times 10
$$

Simplified: compute the average weight across all data types in the array, then normalize to [0, 10]. If no data types are present, DataSensitivityScore = 0.

---

## 7. Non-Functional Requirements

### 7.1 Security

| Requirement | Implementation |
|-------------|----------------|
| Password hashing | BCrypt with salt rounds ≥ 12 |
| JWT signing | HS256 algorithm, 1-hour expiry for access token |
| Role enforcement | Server-side on every protected route, never trust client-supplied role |
| Input sanitisation | All string inputs stripped of leading/trailing whitespace; HTML entities not accepted |
| HTTPS | Not enforced in local development; documented for future deployment |
| Sensitive field redaction | Guest role: `affected_accounts` array omitted from responses |
| Rate limiting | `flask-limiter`: 100 req/min per IP on auth endpoints |

### 7.2 Performance

| Requirement | Target |
|-------------|--------|
| API response time (p95) | < 200ms for simple CRUD |
| API response time (aggregation) | < 800ms for complex pipelines |
| Pagination | All list endpoints paginated, default `limit=20`, max `limit=100` |
| MongoDB indexes | All query fields indexed; query plans validated via `explain()` |
| Angular lazy loading | All feature modules lazy-loaded; initial bundle < 500KB gzipped |

### 7.3 Scalability

| Requirement | Implementation |
|-------------|----------------|
| Stateless API | JWT-based; no server-side session state |
| Database indexing strategy | All filter, sort, and geospatial query fields indexed |
| Aggregation pipeline optimisation | `$match` and `$sort` placed before `$unwind` and `$lookup` to minimise document set |
| Environment configuration | 12-factor app config via environment variables |

### 7.4 Usability

| Requirement | Implementation |
|-------------|----------------|
| Responsive design | Angular Material / Tailwind CSS, mobile-first breakpoints |
| Loading states | Skeleton loaders on all async data, spinner on form submission |
| Error messaging | Toast notifications for all API errors with actionable messages |
| Form validation feedback | Inline validation messages, red border on invalid fields |
| Empty states | Descriptive empty state components when lists return zero results |
| Accessibility | ARIA labels, keyboard navigation support on all interactive elements |

---

## 8. COM661 High 1st Alignment Matrix

| Rubric Criterion | BreachLens Implementation | Evidence Location |
|-----------------|--------------------------|-------------------|
| **Database complexity exceeds demonstration** | 4 sub-document arrays, 2dsphere index, 8 aggregation pipeline endpoints, compound indexes | `seed_data.py`, `analytics_service.py` |
| **Complex queries demonstrated** | `$near`, `$unwind`, `$lookup`, `$group`, `$project`, `$sort` across 8+ pipeline endpoints | `app/routes/analytics.py`, `app/services/analytics_service.py` |
| **Strict RESTful API** | Noun-based URIs, correct HTTP verbs, all 9 required status codes, versioned (`/api/v1/`) | `API_SPEC.md`, Postman collection |
| **Full CRUD + Sub-document CRUD** | Top-level breach CRUD + CRUD on all 4 sub-document arrays with `$push`, `$pull`, `$set`, positional `$` | `app/routes/breaches.py` |
| **Robust validation** | Type, range, enum, email, URL, GeoJSON, date ordering validation on all mutation endpoints | `app/utils/validators.py` |
| **JWT + RBAC** | Admin/Analyst/Guest roles, `@jwt_required`, `@admin_required`, `@require_role`, raw PyJWT, `x-access-token` header, MongoDB blacklist | `app/middleware/auth_middleware.py` |
| **Centralised error handling** | All errors via registered error handlers, uniform JSON schema | `app/__init__.py` error handlers |
| **Angular exceeds demonstration** | Route Guards, HTTP Interceptors, Reactive Forms, Chart.js (6 chart types), Leaflet map, lazy loading | `src/app/` |
| **Automated testing** | Postman collection with pre-request scripts, schema assertions, Newman CI runner | `postman/`, `QA_STRATEGY.md` |
| **Professional documentation** | PRD, AGENTS, API_SPEC, QA_STRATEGY, inline code comments, README | Repository root |

---

## 9. Project Constraints & Assumptions

| Constraint | Detail |
|-----------|--------|
| Database | MongoDB 7.x (local instance only — no Atlas) |
| Backend runtime | Python 3.11+ |
| Frontend runtime | Node.js 20+, Angular CLI 17+ |
| Auth | JWT only (no OAuth2/OIDC in scope) |
| Testing | Postman/Newman for backend; Jasmine/Karma for Angular unit tests |
| Data seeding | Synthetic breach data only (no real PII) |
| Deployment | Local development only (not required for submission) |

---

## 10. Glossary

| Term | Definition |
|------|-----------|
| **Breach** | A confirmed or suspected incident in which sensitive data was accessed without authorisation |
| **Affected Account** | An individual user record (email/username) confirmed as exposed in a specific breach |
| **Risk Score** | A computed 0.0–10.0 numerical rating of a breach's severity, scale, and data sensitivity |
| **Monitoring Alert** | An automated signal indicating a new dark web mention, credential dump, or domain event related to a tracked organisation |
| **Remediation** | A discrete action taken to contain, mitigate, or recover from a breach event |
| **Timeline** | An ordered sequence of events documenting the lifecycle of a breach from occurrence to resolution |
| **GeoJSON** | An open standard format for encoding geographic data structures, used here to represent breach origin coordinates |
| **2dsphere Index** | MongoDB index type supporting geospatial queries on GeoJSON data |
| **Aggregation Pipeline** | MongoDB's declarative data processing framework using ordered stage operators |
| **RBAC** | Role-Based Access Control – restricting system access based on the authenticated user's assigned role |
| **JWT** | JSON Web Token – a compact, digitally signed token used for stateless authentication |

---

*BreachLens PRD v1.0.0 – COM661 Individual Coursework – Confidential*
