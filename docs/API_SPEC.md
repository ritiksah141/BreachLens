# BreachLens – RESTful API Specification
## API_SPEC.md
**Version:** 2.1.0
**Base URL:** `http://localhost:5001/api/v1`
**Module:** COM661 – Full Stack Strategies and Development

---

> **Design Principles**
> All endpoints follow strict REST conventions: noun-based URIs, correct HTTP verbs, appropriate status codes, versioned under `/api/v1/`, and a uniform JSON response envelope. Authentication uses industry-standard JWT tokens sent via the `Authorization: Bearer <token>` header (raw PyJWT). Legacy support for `x-access-token` is maintained for backward compatibility. Login supports HTTP Basic Authentication (`GET /api/v1/login`). Role hierarchy: `admin > analyst > guest (unauthenticated)`.

---

## Table of Contents

1. [Authentication Endpoints](#1-authentication-endpoints)
2. [Breach Record Endpoints (CRUD)](#2-breach-record-endpoints-crud)
3. [Affected Accounts Sub-document Endpoints](#3-affected-accounts-sub-document-endpoints)
4. [Timeline Sub-document Endpoints](#4-timeline-sub-document-endpoints)
5. [Remediation Sub-document Endpoints](#5-remediation-sub-document-endpoints)
6. [Monitoring Alerts Sub-document Endpoints](#6-monitoring-alerts-sub-document-endpoints)
7. [Geospatial Endpoints](#7-geospatial-endpoints)
8. [Analytics & Aggregation Endpoints](#8-analytics--aggregation-endpoints)
9. [Exposure Check Endpoint](#9-exposure-check-endpoint)
10. [User Management Endpoints](#10-user-management-endpoints)
11. [Admin Endpoints](#11-admin-endpoints)
12. [Standard Response Schemas](#12-standard-response-schemas)
13. [Validation Error Detail Schema](#13-validation-error-detail-schema)

---

## 1. Authentication Endpoints

| # | Method | Endpoint | Description | Auth Required | Role Required | Request Body | Success Code | Error Codes |
|---|--------|----------|-------------|:---:|:---:|---|:---:|---|
| 1.0 | `GET` | `/login` | Authenticate via HTTP Basic Auth and receive JWT | ❌ (Basic Auth) | None | None (credentials in `Authorization: Basic` header) | `200` | `400`, `401` |
| 1.1 | `POST` | `/auth/register` | Register a new user account | ❌ | None | `{username, email, password, role?}` | `201` | `400`, `409`, `422` |
| 1.2 | `POST` | `/auth/login` | Authenticate via JSON body and receive JWT | ❌ | None | `{email/username, password}` | `200` | `400`, `401`, `422` |
| 1.3 | `POST` | `/auth/logout` | Invalidate the current session (token blacklist) | ✅ | Any authenticated | None | `204` | `401` |
| 1.4 | `GET` | `/auth/me` | Return the current authenticated user's profile | ✅ | Any authenticated | None | `200` | `401` |

### Endpoint Detail: GET `/login` (Module-Required Basic Auth)

> This is the **module-required** login endpoint. Credentials are sent via the `Authorization: Basic base64(username:password)` header.

**Request Headers:**
```
Authorization: Basic base64(username:password)
```

**Request Body:** None

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "JWT",
    "expires_in": 3600,
    "user": {
      "_id": "64ab1234...",
      "username": "priya_analyst",
      "email": "priya@example.com",
      "role": "analyst"
    }
  }
}
```

> The returned `token` must be sent in subsequent requests via the `Authorization: Bearer <token>` header.

### Endpoint Detail: POST `/auth/register`

**Request Body:**
```json
{
  "username": "string (required, 3–30 chars, alphanumeric + underscore)",
  "email": "string (required, valid email format)",
  "password": "string (required, min 8 chars, must contain uppercase + digit)",  // pragma: allowlist secret
  "role": "string (optional, default: 'guest', enum: guest | analyst)"
}
```
> Note: `admin` role cannot be self-assigned. Admins are elevated by existing admins only.

**Success Response `201`:**
```json
{
  "status": "success",
  "data": {
    "_id": "64ab1234...",
    "username": "priya_analyst",
    "email": "priya@example.com",
    "role": "analyst",
    "created_at": "2026-02-19T10:00:00Z"
  }
}
```

### Endpoint Detail: POST `/auth/login`

**Request Body:**
```json
{
  "email": "string (required, or use 'username' instead)",
  "password": "string (required)"  // pragma: allowlist secret
}
```

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIs...",
    "token_type": "JWT",
    "expires_in": 3600,
    "user": {
      "_id": "64ab1234...",
      "username": "priya_analyst",
      "role": "analyst"
    }
  }
}
```
> The token expires in **3600 seconds (1 hour)**. Send it in subsequent requests via the `Authorization: Bearer <token>` header.

### Endpoint Detail: POST `/auth/logout`

**Request Headers:**
```
Authorization: Bearer <token>
```

**Request Body:** None

**Success Response `204`:** Empty body. The **full token** is stored in the MongoDB `blacklist` collection and immediately invalidated. The `@jwt_required` decorator checks for blacklisted tokens via `find_one({"token": token})` on every protected request.

### Endpoint Detail: GET `/auth/me`

**Request Headers:**
```
Authorization: Bearer <token>
```

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "_id": "64ab1234...",
    "username": "priya_analyst",
    "email": "priya@example.com",
    "role": "analyst",
    "is_active": true,
    "created_at": "2026-02-19T10:00:00Z"
  }
}
```

---

## 2. Breach Record Endpoints (CRUD)

| # | Method | Endpoint | Description | Auth Required | Role Required | Query Parameters | Success Code | Error Codes |
|---|--------|----------|-------------|:---:|:---:|---|:---:|---|
| 2.1 | `GET` | `/breaches` | List all breaches (paginated, filtered, sorted) | ❌ | Guest+ | `page`, `limit`, `sort_by`, `order`, `severity`, `status`, `industry`, `search` | `200` | `400` |
| 2.2 | `GET` | `/breaches/{id}` | Retrieve a single breach by ID | ❌ | Guest+ | None | `200` | `400`, `404` |
| 2.3 | `POST` | `/breaches` | Create a new breach record | ✅ | `analyst`, `admin` | None | `201` | `400`, `401`, `403`, `422` |
| 2.4 | `PUT` | `/breaches/{id}` | Full replacement update of a breach record | ✅ | `analyst` (own), `admin` | None | `200` | `400`, `401`, `403`, `404`, `422` |
| 2.5 | `PATCH` | `/breaches/{id}` | Partial update of specific breach fields | ✅ | `analyst` (own), `admin` | None | `200` | `400`, `401`, `403`, `404`, `422` |
| 2.6 | `DELETE` | `/breaches/{id}` | Permanently delete a breach record | ✅ | `admin` only | None | `204` | `401`, `403`, `404` |

### Resource Ownership Model

> **`(own)`** in the Role Required column means the authenticated analyst may only perform that operation on breach records they originally created. Admins bypass this restriction and may operate on any record.

| Concept | Detail |
|---------|--------|
| **`created_by` field** | Every breach document stores `created_by: ObjectId` — the `_id` of the user who submitted the `POST /breaches` request. This field is set server-side at creation time and is **not user-editable**. |
| **Ownership check** | Before executing `PUT /breaches/{id}` or `PATCH /breaches/{id}`, the service compares `breach.created_by` against `g.current_user_id`. A mismatch for an `analyst` role returns `403 Forbidden`. |
| **Admin override** | Users with `role: admin` pass the ownership check unconditionally. |
| **Ownership transfer** | There is no API endpoint to transfer `created_by`. An admin must update the field directly via the admin interface if re-assignment is required (e.g. after an analyst departs). |
| **Departed analysts** | Breach records created by a deactivated analyst remain in the database. Only an admin can modify or delete those records. |

### Query Parameter Reference for GET `/breaches`

| Parameter | Type | Allowed Values | Default | Description |
|-----------|------|----------------|---------|-------------|
| `page` | integer | ≥ 1 | `1` | Page number |
| `limit` | integer | 1–100 | `20` | Records per page |
| `sort_by` | string | `breach_date`, `risk_score`, `affected_records_count`, `title`, `created_at` | `created_at` | Sort field |
| `order` | string | `asc`, `desc` | `desc` | Sort direction |
| `severity` | string | `critical`, `high`, `medium`, `low`, `informational` | — | Filter by severity |
| `status` | string | `active`, `contained`, `investigating`, `resolved` | — | Filter by status |
| `industry` | string | `finance`, `healthcare`, `retail`, `government`, `technology`, `education`, `energy`, `other` | — | Filter by industry |
| `search` | string | Any text | — | Full-text search on `title` and `description` |
| `min_risk` | float | 0.0–10.0 | — | Minimum risk score filter |
| `max_risk` | float | 0.0–10.0 | — | Maximum risk score filter |

### Success Response `200` for GET `/breaches` (List):
```json
{
  "status": "success",
  "data": [
    {
      "_id": "64ab1234...",
      "title": "LinkedIn Credential Dump 2025",
      "severity": "critical",
      "status": "active",
      "industry": "technology",
      "affected_records_count": 2400000,
      "risk_score": 9.2,
      "breach_date": "2025-11-15T00:00:00Z",
      "organisation": { "name": "LinkedIn Corp", "domain": "linkedin.com", "country": "USA", "size": "enterprise" },
      "location": { "type": "Point", "coordinates": [-122.4194, 37.7749] },
      "created_at": "2026-01-10T08:00:00Z",
      "updated_at": "2026-01-10T08:00:00Z"
    }
  ],
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 147,
    "total_pages": 8
  }
}
```
> **Guest note:** `affected_accounts` array is **omitted** from all Guest/unauthenticated responses.

### POST `/breaches` — Required Request Body Fields:

```json
{
  "title": "string (required, 5–200 chars)",
  "description": "string (required, min 20 chars)",
  "source_url": "string (optional, valid URL)",
  "breach_date": "ISO 8601 date string (required)",
  "discovered_date": "ISO 8601 date string (required, >= breach_date)",
  "severity": "critical | high | medium | low | informational (required)",
  "status": "active | contained | investigating | resolved (required)",
  "industry": "finance | healthcare | retail | government | technology | education | energy | other (required)",
  "affected_records_count": "integer >= 0 (required)",
  "data_types_exposed": ["email", "password_hash", "ssn", ...],
  "organisation": {
    "name": "string (required)",
    "domain": "string (required, valid domain format)",
    "country": "string (required)",
    "size": "small | medium | large | enterprise (required)"
  },
  "location": {
    "type": "Point",
    "coordinates": [-122.4194, 37.7749]
  }
}
```

---

## 3. Affected Accounts Sub-document Endpoints

> Sub-documents are nested inside breach documents. All affected account endpoints operate on the `affected_accounts[]` array within a parent breach document using MongoDB `$push`, `$set`, and `$pull` operators.

| # | Method | Endpoint | Description | Auth Required | Role Required | Success Code | Error Codes |
|---|--------|----------|-------------|:---:|:---:|:---:|---|
| 3.1 | `GET` | `/breaches/{breach_id}/affected-accounts` | List all affected accounts for a breach | ✅ | `analyst`, `admin` | `200` | `401`, `403`, `404` |
| 3.2 | `GET` | `/breaches/{breach_id}/affected-accounts/{account_id}` | Retrieve a single affected account | ✅ | `analyst`, `admin` | `200` | `401`, `403`, `404` |
| 3.3 | `POST` | `/breaches/{breach_id}/affected-accounts` | Add a new affected account to a breach | ✅ | `analyst`, `admin` | `201` | `400`, `401`, `403`, `404`, `422` |
| 3.4 | `PATCH` | `/breaches/{breach_id}/affected-accounts/{account_id}` | Update a specific affected account (e.g. mark notified) | ✅ | `analyst`, `admin` | `200` | `400`, `401`, `403`, `404`, `422` |
| 3.5 | `DELETE` | `/breaches/{breach_id}/affected-accounts/{account_id}` | Remove an affected account from a breach | ✅ | `admin` | `204` | `401`, `403`, `404` |

### POST `/breaches/{breach_id}/affected-accounts` — Request Body:
```json
{
  "email": "user@example.com (required, valid email)",
  "username": "string (optional)",
  "data_exposed": ["email", "password_hash", "phone"],
  "notified": false
}
```

**MongoDB Operation:**
```python
db.breaches.update_one(
    {"_id": ObjectId(breach_id)},
    {
        "$push": {"affected_accounts": {**account_data, "_id": ObjectId()}},
        "$set": {"updated_at": datetime.utcnow()}
    }
)
```

### PATCH `/breaches/{breach_id}/affected-accounts/{account_id}` — Request Body:
```json
{
  "notified": true,
  "notification_date": "2026-02-19T12:00:00Z"
}
```

**MongoDB Operation (positional `$` operator):**
```python
db.breaches.update_one(
    {"_id": ObjectId(breach_id), "affected_accounts._id": ObjectId(account_id)},
    {"$set": {"affected_accounts.$.notified": True, "affected_accounts.$.notification_date": dt, "updated_at": now}}
)
```

---

## 4. Timeline Sub-document Endpoints

| # | Method | Endpoint | Description | Auth Required | Role Required | Success Code | Error Codes |
|---|--------|----------|-------------|:---:|:---:|:---:|---|
| 4.1 | `GET` | `/breaches/{breach_id}/timeline` | List all timeline events for a breach | ✅ | Any authenticated | `200` | `401`, `404` |
| 4.2 | `GET` | `/breaches/{breach_id}/timeline/{event_id}` | Retrieve a single timeline event | ✅ | Any authenticated | `200` | `401`, `404` |
| 4.3 | `POST` | `/breaches/{breach_id}/timeline` | Add a new event to the breach timeline | ✅ | `analyst`, `admin` | `201` | `400`, `401`, `403`, `404`, `422` |
| 4.4 | `PATCH` | `/breaches/{breach_id}/timeline/{event_id}` | Update an existing timeline event | ✅ | `analyst`, `admin` | `200` | `400`, `401`, `403`, `404`, `422` |
| 4.5 | `DELETE` | `/breaches/{breach_id}/timeline/{event_id}` | Remove a timeline event | ✅ | `admin` | `204` | `401`, `403`, `404` |

### POST `/breaches/{breach_id}/timeline` — Request Body:
```json
{
  "event_date": "ISO 8601 date string (required)",
  "event_type": "breach_occurred | discovered | disclosed | contained | resolved (required)",
  "description": "string (required, min 10 chars)",
  "actor": "string (optional)"
}
```

### Timeline Events — Validation Rules:
| Field | Rule |
|-------|------|
| `event_date` | Required. Must be a valid ISO 8601 datetime. Future dates are **only permitted** for forward-looking `event_type` values (`contained`, `resolved`). Historical types (`breach_occurred`, `discovered`, `disclosed`) must not be in the future. |
| `event_type` | Required. Must be one of the 5 defined enum values. `breach_occurred`, `discovered`, `disclosed` are historical (past only). `contained`, `resolved` are forward-looking (future dates permitted). |
| `description` | Required. Minimum 10 characters. |
| `actor` | Optional. Max 100 characters if provided. |

---

## 5. Remediation Sub-document Endpoints

| # | Method | Endpoint | Description | Auth Required | Role Required | Success Code | Error Codes |
|---|--------|----------|-------------|:---:|:---:|:---:|---|
| 5.1 | `GET` | `/breaches/{breach_id}/remediation` | List all remediation actions for a breach | ✅ | Any authenticated | `200` | `401`, `404` |
| 5.2 | `GET` | `/breaches/{breach_id}/remediation/{action_id}` | Retrieve a specific remediation action | ✅ | Any authenticated | `200` | `401`, `404` |
| 5.3 | `POST` | `/breaches/{breach_id}/remediation` | Add a new remediation action | ✅ | `analyst`, `admin` | `201` | `400`, `401`, `403`, `404`, `422` |
| 5.4 | `PATCH` | `/breaches/{breach_id}/remediation/{action_id}` | Update remediation action status or details | ✅ | `analyst`, `admin` | `200` | `400`, `401`, `403`, `404`, `422` |
| 5.5 | `DELETE` | `/breaches/{breach_id}/remediation/{action_id}` | Remove a remediation action | ✅ | `admin` | `204` | `401`, `403`, `404` |

### POST `/breaches/{breach_id}/remediation` — Request Body:
```json
{
  "action": "string (required, 5–500 chars)",
  "status": "pending | in_progress | completed (required)",
  "assigned_to": "string (optional)",
  "due_date": "ISO 8601 date string (required)"
}
```

---

## 6. Monitoring Alerts Sub-document Endpoints

| # | Method | Endpoint | Description | Auth Required | Role Required | Success Code | Error Codes |
|---|--------|----------|-------------|:---:|:---:|:---:|---|
| 6.1 | `GET` | `/breaches/{breach_id}/alerts` | List all monitoring alerts for a breach | ✅ | Any authenticated | `200` | `401`, `404` |
| 6.2 | `GET` | `/breaches/{breach_id}/alerts/{alert_id}` | Retrieve a specific alert | ✅ | Any authenticated | `200` | `401`, `404` |
| 6.3 | `POST` | `/breaches/{breach_id}/alerts` | Create a new monitoring alert | ✅ | `analyst`, `admin` | `201` | `400`, `401`, `403`, `404`, `422` |
| 6.4 | `PATCH` | `/breaches/{breach_id}/alerts/{alert_id}` | Acknowledge or update an alert | ✅ | `analyst`, `admin` | `200` | `400`, `401`, `403`, `404`, `422` |
| 6.5 | `DELETE` | `/breaches/{breach_id}/alerts/{alert_id}` | Delete an alert | ✅ | `admin` | `204` | `401`, `403`, `404` |

### POST `/breaches/{breach_id}/alerts` — Request Body:
```json
{
  "alert_type": "new_exposure | credential_stuffing | dark_web_mention | domain_squatting (required)",
  "severity": "critical | high | medium | low (required)",
  "details": "string (required, min 10 chars)",
  "triggered_at": "ISO 8601 datetime (optional, defaults to now)"
}
```

### PATCH `/breaches/{breach_id}/alerts/{alert_id}` — Acknowledge Alert:
```json
{
  "acknowledged": true
}
```

---

## 7. Geospatial Endpoints

> All geospatial endpoints require a valid 2dsphere index on the `breaches.location` field. Input coordinates are validated server-side: longitude ∈ [-180, 180], latitude ∈ [-90, 90].

| # | Method | Endpoint | Description | Auth Required | Role Required | Query Parameters | Success Code | Error Codes |
|---|--------|----------|-------------|:---:|:---:|---|:---:|---|
| 7.1 | `GET` | `/breaches/geo/near` | Find breaches within a radius of given coordinates | ❌ | Guest+ | `longitude`, `latitude`, `radius` (metres, default 50000, max 500000) | `200` | `400` |
| 7.2 | `GET` | `/breaches/geo/within-bounds` | Find breaches within a geographic bounding box | ❌ | Guest+ | `min_lng`, `min_lat`, `max_lng`, `max_lat` | `200` | `400` |
| 7.3 | `GET` | `/breaches/geo/geojson` | Return all breach locations as a GeoJSON FeatureCollection for Leaflet | ❌ | Guest+ | `severity` (optional filter), `industry` (optional filter) | `200` | `400` |

### GET `/breaches/geo/near` — Query Parameters:

| Parameter | Type | Required | Validation | Description |
|-----------|------|:---:|---|---|
| `longitude` | float | ✅ | -180 to 180 | Origin longitude |
| `latitude` | float | ✅ | -90 to 90 | Origin latitude |
| `radius` | integer | ❌ | 1–500000 (default: 50000) | Search radius in metres |

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "type": "FeatureCollection",
    "features": [
      {
        "type": "Feature",
        "geometry": { "type": "Point", "coordinates": [-0.1276, 51.5074] },
        "properties": {
          "id": "64ab1234...",
          "title": "NHS Email Breach 2025",
          "severity": "critical",
          "risk_score": 8.9,
          "affected_records_count": 780000,
          "industry": "healthcare",
          "distance_metres": 12450
        }
      }
    ]
  },
  "meta": { "total": 1, "radius_metres": 50000, "centre": [-0.1276, 51.5074] }
}
```

### GET `/breaches/geo/geojson` — GeoJSON FeatureCollection Response:

Used by Angular Leaflet component to render all breach markers on the map. Properties included per feature:

| Property | Type | Description |
|----------|------|-------------|
| `id` | string | Breach `_id` as string |
| `title` | string | Breach title |
| `severity` | string | Severity level (for marker colour) |
| `risk_score` | float | Risk score (0.0–10.0) |
| `affected_records_count` | integer | Records exposed |
| `industry` | string | Industry sector |
| `status` | string | Breach status |

---

## 8. Analytics & Aggregation Endpoints

> All analytics endpoints execute MongoDB aggregation pipelines server-side. No computation is done in Python. Results are consumed by Angular Chart.js components. All analytics endpoints are read-only (`GET`).

| # | Method | Endpoint | Description | Auth Required | Role Required | Query Parameters | Pipeline Stages | Success Code |
|---|--------|----------|-------------|:---:|:---:|---|---|:---:|
| 8.1 | `GET` | `/analytics/risk-by-industry` | Average, max, min risk score per industry | ✅ | `analyst`, `admin` | None | `$match`, `$group`, `$project`, `$sort` | `200` |
| 8.2 | `GET` | `/analytics/severity-breakdown` | Breach count and total records exposed per severity level | ❌ | Guest+ | None | `$group`, `$project`, `$sort` | `200` |
| 8.3 | `GET` | `/analytics/monthly-trend` | Monthly breach discovery count (12-month window) | ❌ | Guest+ | `year` (optional, default: current) | `$project` (date parts), `$group`, `$sort` | `200` |
| 8.4 | `GET` | `/analytics/top-organisations` | Top N organisations by total affected record count | ✅ | `analyst`, `admin` | `limit` (default: 10, max: 25) | `$group`, `$sort`, `$limit`, `$project` | `200` |
| 8.5 | `GET` | `/analytics/data-types-frequency` | Frequency count of each exposed data type across all breaches | ❌ | Guest+ | None | `$unwind`, `$group`, `$sort` | `200` |
| 8.6 | `GET` | `/analytics/remediation-rate` | Remediation completion rate per breach | ✅ | `analyst`, `admin` | None | `$unwind`, `$group`, `$project` | `200` |
| 8.7 | `GET` | `/analytics/alert-acknowledgement` | Alert acknowledgement rate per severity level | ✅ | `analyst`, `admin` | None | `$unwind`, `$match`, `$group`, `$project` | `200` |
| 8.8 | `GET` | `/analytics/industry-year-trend` | Breach count by industry and year (heatmap data) | ✅ | `analyst`, `admin` | None | `$project`, `$group`, `$sort` | `200` |
| 8.9 | `GET` | `/analytics/risk-scores` | Risk score distribution across all breaches (histogram data) | ❌ | Guest+ | `bins` (default: 10) | `$bucket`, `$project` | `200` |
| 8.10 | `GET` | `/analytics/summary` | KPI summary: total breaches, total records exposed, avg risk score, open alerts count | ❌ | Guest+ | None | `$group`, `$unwind` | `200` |

### Endpoint Detail: GET `/analytics/risk-by-industry`

**MongoDB Pipeline:**
```python
[
    {"$match": {"risk_score": {"$exists": True, "$ne": None}}},
    {"$group": {
        "_id": "$industry",
        "avg_risk_score": {"$avg": "$risk_score"},
        "max_risk_score": {"$max": "$risk_score"},
        "min_risk_score": {"$min": "$risk_score"},
        "breach_count": {"$sum": 1},
        "total_records_exposed": {"$sum": "$affected_records_count"}
    }},
    {"$project": {
        "_id": 0, "industry": "$_id",
        "avg_risk_score": {"$round": ["$avg_risk_score", 2]},
        "max_risk_score": 1, "min_risk_score": 1,
        "breach_count": 1, "total_records_exposed": 1
    }},
    {"$sort": {"avg_risk_score": -1}}
]
```

**Success Response `200`:**
```json
{
  "status": "success",
  "data": [
    { "industry": "finance", "avg_risk_score": 8.4, "max_risk_score": 9.8, "min_risk_score": 6.1, "breach_count": 14, "total_records_exposed": 45000000 },
    { "industry": "healthcare", "avg_risk_score": 7.9, "max_risk_score": 9.5, "min_risk_score": 5.2, "breach_count": 11, "total_records_exposed": 18700000 }
  ]
}
```

### Endpoint Detail: GET `/analytics/summary`

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "total_breaches": 147,
    "total_records_exposed": 824000000,
    "avg_risk_score": 7.3,
    "open_alerts": 23,
    "active_breaches": 38,
    "resolved_breaches": 62,
    "industries_affected": 8
  }
}
```

### Endpoint Detail: GET `/analytics/data-types-frequency`

**MongoDB Pipeline:**
```python
[
    {"$unwind": "$data_types_exposed"},
    {"$group": {"_id": "$data_types_exposed", "count": {"$sum": 1}}},
    {"$project": {"_id": 0, "data_type": "$_id", "count": 1}},
    {"$sort": {"count": -1}}
]
```

---

## 9. Exposure Check Endpoint

> This is a public endpoint (no auth required) that checks whether a given email address or domain appears in any breach record's `data_types_exposed` or `affected_accounts`. Results for unauthenticated users are redacted (no account details returned).

| # | Method | Endpoint | Description | Auth Required | Role Required | Query Parameters | Success Code | Error Codes |
|---|--------|----------|-------------|:---:|:---:|---|:---:|---|
| 9.1 | `GET` | `/breaches/exposure-check` | Check if an email or domain appears in any breach | ❌ | Guest+ | `email` OR `domain` (one required) | `200` | `400`, `422` |

### GET `/breaches/exposure-check` — Query Parameters:

| Parameter | Type | Required | Validation | Description |
|-----------|------|:---:|---|---|
| `email` | string | Conditional | Valid email format | Email address to check |
| `domain` | string | Conditional | Valid domain format | Domain to check across `organisation.domain` field |

> At least one of `email` or `domain` must be provided. If both are provided, both are checked independently and results are merged. **Breaches that match both the email and domain are deduplicated by `_id`** — each breach appears at most once in the returned `breaches` array.

### Success Response `200` (email found, unauthenticated):
```json
{
  "status": "success",
  "data": {
    "email": "user@example.com",
    "exposed": true,
    "breach_count": 3,
    "breaches": [
      {
        "_id": "64ab1234...",
        "title": "LinkedIn Credential Dump 2025",
        "breach_date": "2025-11-15T00:00:00Z",
        "severity": "critical",
        "data_types_exposed": ["email", "password_hash"],
        "industry": "technology"
      }
    ]
  },
  "meta": {
    "note": "Authenticate as Analyst or Admin to view full affected account details."
  }
}
```

### Success Response `200` (email not found):
```json
{
  "status": "success",
  "data": {
    "email": "clean@example.com",
    "exposed": false,
    "breach_count": 0,
    "breaches": []
  }
}
```

### Success Response `200` (both `email` and `domain` provided):
```json
{
  "status": "success",
  "data": {
    "email": "user@example.com",
    "domain": "example.com",
    "email_exposed": true,
    "domain_exposed": true,
    "breach_count": 4,
    "breaches": [
      {
        "_id": "64ab1234...",
        "title": "LinkedIn Credential Dump 2025",
        "breach_date": "2025-11-15T00:00:00Z",
        "severity": "critical",
        "data_types_exposed": ["email", "password_hash"],
        "industry": "technology",
        "matched_by": ["email", "domain"]
      },
      {
        "_id": "64ab5678...",
        "title": "Example.com Config Exposure",
        "breach_date": "2024-06-01T00:00:00Z",
        "severity": "high",
        "data_types_exposed": ["api_keys", "config"],
        "industry": "technology",
        "matched_by": ["domain"]
      }
    ]
  },
  "meta": {
    "note": "Authenticate as Analyst or Admin to view full affected account details.",
    "dedup_note": "Breaches matching both email and domain are deduplicated by _id and appear once with matched_by listing all match sources."
  }
}
```
> `email_exposed` / `domain_exposed` — boolean flags indicating which input matched at least one breach. `matched_by` on each breach is an array of `"email"` and/or `"domain"` indicating the source(s) that triggered the match for that record.

### Error Response `400` (no parameters):
```json
{
  "status": "error",
  "message": "At least one of 'email' or 'domain' query parameters is required.",
  "code": 400
}
```

---

## 10. User Management Endpoints

| # | Method | Endpoint | Description | Auth Required | Role Required | Success Code | Error Codes |
|---|--------|----------|-------------|:---:|:---:|:---:|---|
| 10.1 | `GET` | `/users` | List all registered users (paginated) | ✅ | `admin` | `200` | `401`, `403` |
| 10.2 | `GET` | `/users/{user_id}` | Retrieve a user's profile | ✅ | `admin`, or own account | `200` | `401`, `403`, `404` |
| 10.3 | `PATCH` | `/users/{user_id}` | Update user profile fields (username, email) | ✅ | `admin`, or own account | `200` | `400`, `401`, `403`, `404`, `422` |
| 10.4 | `DELETE` | `/users/{user_id}` | Deactivate (soft-delete) a user account | ✅ | `admin` | `204` | `401`, `403`, `404` |

### PATCH `/users/{user_id}` — Allowed Fields:

| Field | Updatable By | Validation |
|-------|-------------|------------|
| `username` | Own account, Admin | 3–30 chars, alphanumeric + underscore, unique |
| `email` | Own account, Admin | Valid email format, unique |
| `role` | Admin only | `guest`, `analyst`, `admin` |
| `is_active` | Admin only | boolean |
| `password` | Own account only | Min 8 chars, uppercase + digit required |

---

## 11. Admin Endpoints

| # | Method | Endpoint | Description | Auth Required | Role Required | Success Code | Error Codes |
|---|--------|----------|-------------|:---:|:---:|:---:|---|
| 11.1 | `GET` | `/admin/stats` | System-wide statistics (users by role, breach counts, alert counts) | ✅ | `admin` | `200` | `401`, `403` |
| 11.2 | `PATCH` | `/admin/users/{user_id}/role` | Change a user's role | ✅ | `admin` | `200` | `400`, `401`, `403`, `404`, `422` |
| 11.3 | `PATCH` | `/admin/users/{user_id}/activate` | Activate a deactivated user account | ✅ | `admin` | `200` | `401`, `403`, `404` |
| 11.4 | `PATCH` | `/admin/users/{user_id}/deactivate` | Deactivate an active user account | ✅ | `admin` | `200` | `401`, `403`, `404` |
| 11.5 | `DELETE` | `/admin/breaches/bulk` | Bulk delete breach records by IDs | ✅ | `admin` | `200` | `400`, `401`, `403`, `422` |

### GET `/admin/stats` — Response `200`:
```json
{
  "status": "success",
  "data": {
    "users": {
      "total": 24,
      "by_role": { "admin": 2, "analyst": 14, "guest": 8 },
      "active": 22,
      "inactive": 2
    },
    "breaches": {
      "total": 147,
      "by_status": { "active": 38, "investigating": 21, "contained": 26, "resolved": 62 },
      "by_severity": { "critical": 19, "high": 43, "medium": 52, "low": 28, "informational": 5 }
    },
    "alerts": {
      "total": 89,
      "unacknowledged": 23
    }
  }
}
```

### PATCH `/admin/users/{user_id}/role` — Request Body:
```json
{
  "role": "analyst"
}
```

### DELETE `/admin/breaches/bulk` — Request & Response Contract

> Permanently deletes multiple breach records in a single operation. This is a **best-effort, non-atomic** delete — valid IDs are deleted even if some IDs in the payload are invalid or not found. No rollback occurs on partial failure.

**⚠️ Non-Atomic Behavior:**
This endpoint validates all IDs first, then deletes valid ones sequentially. If a partial failure occurs (e.g., network interruption, database error mid-delete), some records may be deleted while others remain. Clients must handle partial success by checking the `deleted` and `failed` counts. For atomic behavior, use single-record `DELETE /admin/breaches/{id}` in a client-side transaction.

**Batch Strategy:**
- Maximum 100 IDs per request (enforced by validation)
- For larger batches, split into multiple requests with 100 IDs each
- Recommended: implement exponential backoff retry for failed batches
- Monitor `partial_failure` flag to detect incomplete operations

**Request Body:**
```json
{
  "ids": [
    "64ab1234cdef567890abcdef",  // pragma: allowlist secret
    "64ab5678cdef567890abcdef",  // pragma: allowlist secret
    "64ab9012cdef567890abcdef"   // pragma: allowlist secret
  ]
}
```

**Request Body Schema:**

| Field | Type | Required | Validation |
|-------|------|:---:|---|
| `ids` | array of strings | ✅ | Non-empty array. Each element must be a valid 24-character MongoDB ObjectId hex string. Maximum **100 IDs** per request. |

**Success Response `200`:**
```json
{
  "status": "success",
  "data": {
    "requested": 3,
    "deleted": 2,
    "failed": 1,
    "partial_failure": true,
    "invalid_ids": ["64ab9012cdef567890abcdef"]
  }
}
```

**Response Fields:**

| Field | Type | Description |
|-------|------|-------------|
| `requested` | integer | Total number of IDs submitted in the request |
| `deleted` | integer | Number of breach records successfully removed from the database |
| `failed` | integer | Number of IDs that failed (invalid format, not found, or delete error). Always equals `requested - deleted` |
| `partial_failure` | boolean | `true` if `deleted < requested` (some IDs failed), `false` if all succeeded |
| `invalid_ids` | array | IDs that were skipped — either invalid ObjectId format, not found, or delete operation failed |

**Recovery Semantics:**
- `deleted == requested` → Full success, all records deleted
- `deleted > 0 && deleted < requested` → Partial success (check `invalid_ids` for failures)
- `deleted == 0` → Complete failure (all IDs invalid or not found)
- Clients should retry failed IDs from `invalid_ids` array with exponential backoff

**Error Responses:**

| Code | Cause |
|------|-------|
| `400` | `ids` field missing or not an array |
| `401` | Missing or invalid JWT token |
| `403` | Caller does not have `admin` role |
| `409` | Conflict during deletion (race condition or database constraint violation) |
| `422` | `ids` array is empty, or contains more than 100 entries, or at least one entry is not a valid ObjectId string |
| `207` | Multi-Status (partial success) — some IDs deleted, others failed. Check response body for `deleted`, `failed`, and `invalid_ids` counts |

---

## 12. Standard Response Schemas

### Success Response Envelope
```json
{
  "status": "success",
  "data": "<object or array>",
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 147,
    "total_pages": 8
  }
}
```
> `meta` only present for paginated list responses.
> `data` is absent for `204 No Content` responses (DELETE operations — empty body).

### Error Response Envelope
```json
{
  "status": "error",
  "message": "Human-readable description of the error.",
  "code": 422,
  "details": {
    "title": "Must be between 5 and 200 characters.",
    "severity": "Must be one of: critical, high, medium, low, informational.",
    "location.coordinates": "Longitude must be between -180 and 180."
  }
}
```
> `details` only present for `422 Unprocessable Entity` validation errors.

### HTTP Status Code Reference

| Code | Name | When Used |
|------|------|----------|
| `200` | OK | Successful GET, PUT, PATCH response with body |
| `201` | Created | Successful POST — resource created; `Location` header included |
| `204` | No Content | Successful DELETE — no response body |
| `400` | Bad Request | Malformed JSON, missing Content-Type, invalid ObjectId format |
| `401` | Unauthorized | Missing, expired, or invalid JWT token |
| `403` | Forbidden | Valid token but insufficient role for this resource |
| `404` | Not Found | Resource with given ID does not exist |
| `405` | Method Not Allowed | HTTP verb not supported on this endpoint |
| `409` | Conflict | Duplicate unique field (email, username already registered) |
| `422` | Unprocessable Entity | Request body parsed but field-level validation failed |
| `429` | Too Many Requests | Rate limit exceeded — see [Rate Limiting](#rate-limiting) section below |
| `500` | Internal Server Error | Unhandled server exception |

### Rate Limiting

BreachLens applies request rate limiting via **Flask-Limiter** with in-memory storage. Limits are enforced **per IP address and per user ID** (for authenticated requests).

#### Rate Limit Table

| Endpoint | Per-IP Limit | Per-User Limit | Notes |
|----------|--------------|----------------|-------|
| `POST /auth/login` | 5/min, 20/hour | N/A | Unauthenticated |
| `POST /auth/register` | 3/min, 10/hour | N/A | Unauthenticated |
| `POST /auth/forgot-password` | N/A | 3/hour per email | Email-based limit |
| `GET /breaches`, `GET /analytics/*` (public read) | 100/hour | N/A | Public endpoints |
| `POST /breaches`, `PATCH /breaches/*` (write ops) | N/A | 50/hour | Authenticated users |
| `DELETE /admin/*`, `PATCH /admin/*` (admin ops) | N/A | 20/hour | Admin users only |
| `DELETE /admin/breaches/bulk` | N/A | 5/hour | Admin bulk delete |
| **Default (all other endpoints)** | 200/day, 50/hour | N/A | Global fallback |

#### Security Mitigations

| Mitigation | Implementation |
|------------|----------------|
| **Exponential Backoff** | After 3 failed `POST /auth/login` attempts, enforce 2^n second delays (2s, 4s, 8s, ...) |
| **CAPTCHA** | Require CAPTCHA after 5 failed login attempts from same IP |
| **Account Lockout** | Lock account after 5 failed attempts (15-minute lockout, already implemented) |

**Response when limit exceeded — `429 Too Many Requests`:**
```json
{
  "status": "error",
  "message": "Rate limit exceeded. Please slow down your requests.",
  "code": 429
}
```

**Response Headers (included on all responses):**

| Header | Description |
|--------|-------------|
| `X-RateLimit-Limit` | Maximum number of requests permitted in the current window |
| `X-RateLimit-Remaining` | Requests remaining in the current window |
| `X-RateLimit-Reset` | UTC epoch timestamp when the current window resets |
| `Retry-After` | Seconds to wait before retrying (only present on `429` responses) |

> Rate limit headers reflect the most restrictive applicable limit for the endpoint being accessed.

---

## 13. Validation Error Detail Schema

Every `422` response includes a `details` object with field-level error messages.

### Example: POST `/breaches` with multiple validation errors

**Request Body (invalid):**
```json
{
  "title": "Hi",
  "severity": "extreme",
  "affected_records_count": -500,
  "location": { "type": "Point", "coordinates": [200, 95] }
}
```

**Response `422`:**
```json
{
  "status": "error",
  "message": "Validation failed. Please correct the highlighted fields.",
  "code": 422,
  "details": {
    "title": "Must be between 5 and 200 characters. Received 2 characters.",
    "description": "This field is required.",
    "breach_date": "This field is required.",
    "discovered_date": "This field is required.",
    "severity": "Must be one of: critical, high, medium, low, informational. Received: 'extreme'.",
    "status": "This field is required.",
    "industry": "This field is required.",
    "affected_records_count": "Must be a non-negative integer. Received: -500.",
    "location.coordinates[0]": "Longitude must be between -180 and 180. Received: 200.",
    "location.coordinates[1]": "Latitude must be between -90 and 90. Received: 95.",
    "organisation": "This field is required."
  }
}
```

---

## Appendix A: Complete Endpoint Summary

| # | Method | Endpoint | Auth | Role |
|---|--------|----------|:----:|------|
| 1.0 | GET | `/login` | Basic Auth | — |
| 1.1 | POST | `/auth/register` | ❌ | — |
| 1.2 | POST | `/auth/login` | ❌ | — |
| 1.3 | POST | `/auth/logout` | ✅ | Any |
| 1.4 | GET | `/auth/me` | ✅ | Any |
| 2.1 | GET | `/breaches` | ❌ | — |
| 2.2 | GET | `/breaches/{id}` | ❌ | — |
| 2.3 | POST | `/breaches` | ✅ | analyst, admin |
| 2.4 | PUT | `/breaches/{id}` | ✅ | analyst (own), admin |
| 2.5 | PATCH | `/breaches/{id}` | ✅ | analyst (own), admin |
| 2.6 | DELETE | `/breaches/{id}` | ✅ | admin |
| 3.1 | GET | `/breaches/{id}/affected-accounts` | ✅ | analyst, admin |
| 3.2 | GET | `/breaches/{id}/affected-accounts/{aid}` | ✅ | analyst, admin |
| 3.3 | POST | `/breaches/{id}/affected-accounts` | ✅ | analyst, admin |
| 3.4 | PATCH | `/breaches/{id}/affected-accounts/{aid}` | ✅ | analyst, admin |
| 3.5 | DELETE | `/breaches/{id}/affected-accounts/{aid}` | ✅ | admin |
| 4.1 | GET | `/breaches/{id}/timeline` | ✅ | Any |
| 4.2 | GET | `/breaches/{id}/timeline/{eid}` | ✅ | Any |
| 4.3 | POST | `/breaches/{id}/timeline` | ✅ | analyst, admin |
| 4.4 | PATCH | `/breaches/{id}/timeline/{eid}` | ✅ | analyst, admin |
| 4.5 | DELETE | `/breaches/{id}/timeline/{eid}` | ✅ | admin |
| 5.1 | GET | `/breaches/{id}/remediation` | ✅ | Any |
| 5.2 | GET | `/breaches/{id}/remediation/{rid}` | ✅ | Any |
| 5.3 | POST | `/breaches/{id}/remediation` | ✅ | analyst, admin |
| 5.4 | PATCH | `/breaches/{id}/remediation/{rid}` | ✅ | analyst, admin |
| 5.5 | DELETE | `/breaches/{id}/remediation/{rid}` | ✅ | admin |
| 6.1 | GET | `/breaches/{id}/alerts` | ✅ | Any |
| 6.2 | GET | `/breaches/{id}/alerts/{aid}` | ✅ | Any |
| 6.3 | POST | `/breaches/{id}/alerts` | ✅ | analyst, admin |
| 6.4 | PATCH | `/breaches/{id}/alerts/{aid}` | ✅ | analyst, admin |
| 6.5 | DELETE | `/breaches/{id}/alerts/{aid}` | ✅ | admin |
| 7.1 | GET | `/breaches/geo/near` | ❌ | — |
| 7.2 | GET | `/breaches/geo/within-bounds` | ❌ | — |
| 7.3 | GET | `/breaches/geo/geojson` | ❌ | — |
| 8.1 | GET | `/analytics/risk-by-industry` | ✅ | analyst, admin |
| 8.2 | GET | `/analytics/severity-breakdown` | ❌ | — |
| 8.3 | GET | `/analytics/monthly-trend` | ❌ | — |
| 8.4 | GET | `/analytics/top-organisations` | ✅ | analyst, admin |
| 8.5 | GET | `/analytics/data-types-frequency` | ❌ | — |
| 8.6 | GET | `/analytics/remediation-rate` | ✅ | analyst, admin |
| 8.7 | GET | `/analytics/alert-acknowledgement` | ✅ | analyst, admin |
| 8.8 | GET | `/analytics/industry-year-trend` | ✅ | analyst, admin |
| 8.9 | GET | `/analytics/risk-scores` | ❌ | — |
| 8.10 | GET | `/analytics/summary` | ❌ | — |
| 9.1 | GET | `/breaches/exposure-check` | ❌ | — |
| 10.1 | GET | `/users` | ✅ | admin |
| 10.2 | GET | `/users/{id}` | ✅ | admin / own |
| 10.3 | PATCH | `/users/{id}` | ✅ | admin / own |
| 10.4 | DELETE | `/users/{id}` | ✅ | admin |
| 11.1 | GET | `/admin/stats` | ✅ | admin |
| 11.2 | PATCH | `/admin/users/{id}/role` | ✅ | admin |
| 11.3 | PATCH | `/admin/users/{id}/activate` | ✅ | admin |
| 11.4 | PATCH | `/admin/users/{id}/deactivate` | ✅ | admin |
| 11.5 | DELETE | `/admin/breaches/bulk` | ✅ | admin |

**Total Endpoints: 63**

---

*API_SPEC.md v1.0.0 – BreachLens
