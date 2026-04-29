# BreachLens API Routes

**REST API blueprints for all BreachLens endpoints.**

---

## 📁 Structure

```
routes/
├── __init__.py       # Package marker
├── auth.py           # Authentication endpoints (8 routes)
├── breaches.py       # Breach CRUD + geospatial + tactical (35 routes)
├── analytics.py      # Aggregation pipelines (11 routes)
├── users.py          # User management (4 routes)
├── admin.py          # Admin operations (7 routes)
└── health.py         # Health checks (3 routes)
```

---

## 🎯 Route Modules

### **1. Authentication Routes** ([auth.py](auth.py))

**Blueprint**: `auth_bp` + `login_bp`
**Prefix**: `/api/v1/auth`, `/api/v1`

**8 endpoints:**

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| POST | `/auth/register` | Register new user | None |
| POST | `/auth/login` | Login with JSON body | None |
| GET | `/auth/login` | Login via Basic Auth (alias) | Basic |
| POST | `/auth/logout` | Logout (blacklist token) | JWT |
| GET | `/auth/me` | Get current user profile | JWT |
| POST | `/auth/forgot-password` | Request password reset token | None |
| POST | `/auth/reset-password` | Reset password with token | None |
| GET | `/login` | Login via HTTP Basic Auth | Basic |

**Key Features:**
- JWT token generation and validation
- Password hashing with BCrypt
- Account lockout after 5 failed attempts
- Token blacklisting on logout
- HTTP Basic Auth support (COM661 requirement)

---

### **2. Breach Routes** ([breaches.py](breaches.py))

**Blueprint**: `breaches_bp`
**Prefix**: `/api/v1/breaches`

**35 endpoints total:**

#### **Main CRUD & Tactical Operations** (12 endpoints)

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/` | List all breaches (paginated) | None | Public |
| POST | `/` | Create breach | JWT | Analyst/Admin |
| GET | `/{id}` | Get single breach | None | Public |
| PUT | `/{id}` | Full update breach | JWT | Analyst/Admin |
| PATCH | `/{id}` | Partial update breach | JWT | Analyst/Admin |
| DELETE | `/{id}` | Delete breach | JWT | Admin |
| GET | `/advanced-search` | Multi-criteria tactical search | None | Public |
| GET | `/filter-options` | Get available filter values | None | Public |
| GET | `/subdocuments/query` | Cross-subdocument pattern matching | None | Public |
| GET | `/exposure-check` | Check email/domain exposure | None | Public |
| POST | `/bulk` | Bulk create/import breaches | JWT | Admin |
| DELETE | `/bulk` | Bulk delete breaches | JWT | Admin |

#### **Sub-document Routes (20 endpoints)**

**Affected Accounts** (`/breaches/{id}/accounts/*`)
- GET - List all accounts
- GET `/{account_id}` - Get single account
- POST - Add account
- PATCH `/{account_id}` - Update account
- DELETE `/{account_id}` - Delete account

**Timeline Events** (`/breaches/{id}/timeline/*`)
- GET - List all events
- GET `/{event_id}` - Get single event
- POST - Add event
- PATCH `/{event_id}` - Update event
- DELETE `/{event_id}` - Delete event

**Remediation Actions** (`/breaches/{id}/remediation/*`)
- GET - List all actions
- GET `/{action_id}` - Get single action
- POST - Add action
- PATCH `/{action_id}` - Update action
- DELETE `/{action_id}` - Delete action

**Monitoring Alerts** (`/breaches/{id}/alerts/*`)
- GET - List all alerts
- GET `/{alert_id}` - Get single alert
- POST - Create alert
- PATCH `/{alert_id}` - Update alert
- DELETE `/{alert_id}` - Delete alert

#### **Geospatial Routes**

| Method | Endpoint | Description | Parameters |
|--------|----------|-------------|------------|
| GET | `/geo/near` | Find breaches near coordinates | `lng`, `lat`, `radius` (meters) |
| GET | `/geo/within-bounds` | Bounding box search | `min_lng`, `min_lat`, `max_lng`, `max_lat` |
| GET | `/geo/geojson` | GeoJSON FeatureCollection | `severity`, `industry` (optional filters) |

**Key Features:**
- Pagination support (default: 20 per page)
- Filtering by severity, status, industry
- Text search on title/description
- Date range filtering
- Ownership checks (analysts can only modify own breaches)
- MongoDB geospatial queries (2dsphere index)

---

### **3. Analytics Routes** ([analytics.py](analytics.py))

**Blueprint**: `analytics_bp`
**Prefix**: `/api/v1/analytics`

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| GET | `/risk-by-industry` | Risk scores grouped by industry | Array of {industry, avg_risk, breach_count} |
| GET | `/severity-breakdown` | Breaches grouped by severity | Array of {severity, count, percentage} |
| GET | `/monthly-trend` | Time series of breaches | Array of {month, year, count} |
| GET | `/top-organisations` | Most affected organizations | Array of {org, count, industries} |
| GET | `/data-types-frequency` | Most exposed data types | Array of {data_type, count} |
| GET | `/remediation-rate` | Completion rate of actions | Array of {status, count, percentage} |
| GET | `/alert-acknowledgement` | Alert statistics | Array of {type, total, acknowledged} |
| GET | `/industry-year-trend` | Industry trends over time | Array of {industry, year, count} |
| GET | `/risk-scores` | Risk score distribution | Array of {range, count} |
| GET | `/attack-surface-profile` | Attack surface metrics | Object with profile data |
| GET | `/summary` | Dashboard summary | Object with all key metrics |

**Key Features:**
- MongoDB aggregation pipelines
- Real-time calculations (no caching)
- Optional filtering by year, industry
- Percentages automatically calculated

---

### **4. User Routes** ([users.py](users.py))

**Blueprint**: `users_bp`
**Prefix**: `/api/v1/users`

**4 endpoints:**

| Method | Endpoint | Description | Auth | Role |
|--------|----------|-------------|------|------|
| GET | `/` | List all users | JWT | Admin |
| GET | `/{user_id}` | Get user profile | JWT | Self/Admin |
| PATCH | `/{user_id}` | Update user profile | JWT | Self/Admin |
| DELETE | `/{user_id}` | Delete user account | JWT | Admin |

**Key Features:**
- Users can only view/edit their own profile
- Admins can manage all users
- Cannot delete last active admin
- Cannot change own role (prevents privilege escalation)
- Password updates require current password

---

### **5. Admin Routes** ([admin.py](admin.py))

**Blueprint**: `admin_bp`
**Prefix**: `/api/v1/admin`

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| GET | `/stats` | System statistics | User counts, breach counts, storage |
| PATCH | `/users/{user_id}/role` | Change user role | Updated user object |
| GET | `/users` | List all users (admin view) | Paginated user list |
| PATCH | `/users/{user_id}/activate` | Activate user account | Updated user object |
| PATCH | `/users/{user_id}/deactivate` | Deactivate user account | Updated user object |
| DELETE | `/breaches/bulk` | Bulk delete breaches | {deleted_count, failed_ids} |
| GET | `/audit-logs` | System audit trail | Array of audit events |

**Key Features:**
- All routes require admin role
- Cannot demote last active admin
- Cannot deactivate last active admin
- Atomic operations for safety
- Audit logging for all admin actions

---

### **6. Health Routes** ([health.py](health.py))

**Blueprint**: `health_bp`
**Prefix**: `/api/v1/health`

| Method | Endpoint | Description | Returns |
|--------|----------|-------------|---------|
| GET | `/` | Basic health check | {status: "ok"} |
| GET | `/ready` | Readiness probe (DB check) | {status, db} |
| GET | `/live` | Liveness probe | {status: "ok"} |
| GET | `/info` | Service metadata | {version, environment, ...} |

**Key Features:**
- Kubernetes-compatible health checks
- Database connectivity validation
- 503 status on DB unavailable
