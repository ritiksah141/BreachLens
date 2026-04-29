# BreachLens Services

**Business logic layer for BreachLens API.**

---

## 📁 Structure

```
services/
├── auth_service.py       # Authentication & user management
├── breach_service.py     # Breach CRUD & geospatial operations
├── user_service.py       # User profile management
└── analytics_service.py  # Aggregation pipelines & statistics
```

---

## 🎯 Overview

Services contain all business logic and database operations. Routes are thin controllers that:
1. Validate input (using models)
2. Call service methods
3. Format responses

**Design Philosophy:**
- ✅ **Single Responsibility**: Each service handles one domain
- ✅ **Testable**: Services can be tested with mock databases
- ✅ **Reusable**: Shared logic across multiple routes
- ✅ **Database Abstraction**: MongoDB operations isolated in services

---

## 🔐 AuthService ([auth_service.py](auth_service.py))

Handles authentication, user registration, and account security.

### **Key Methods**

#### **`register(username, email, password, role) -> tuple[dict, str | None]`**
Register a new user.

**Features:**
- Password hashing with BCrypt (12 rounds)
- Duplicate email/username detection
- Role validation (guest/analyst only for self-registration)
- Returns: `(user_dict, error_message)`

#### **`login(email, password) -> tuple[dict, str | None]`**
Authenticate user and generate JWT token.

**Features:**
- Account lockout check (5 attempts, 15 min lockout)
- Password verification with BCrypt
- JWT token generation (1 hour expiry)
- Failed login tracking
- Audit logging

---

## 📊 BreachService ([breach_service.py](breach_service.py))

Handles all breach-related operations including CRUD, geospatial queries, and sub-documents.

### **Core CRUD Methods**

#### **`list_breaches(page, limit, filters, sort) -> tuple[list, int]`**
List breaches with pagination and filtering.

#### **`advanced_search(filters, page, limit, sort) -> tuple[list, int]`**
Advanced multi-criteria search supporting text search, ranges, and sub-document patterns.

#### **`get_filter_options() -> dict`**
Retrieve available values for filters (unique industries, severities, etc) to populate UI selectors.

#### **`get_by_id(breach_id) -> dict | None`**
Get single breach by ID.

#### **`create(data, created_by) -> dict`**
Create new breach.

#### **`bulk_create(breaches, created_by) -> tuple[int, list]`**
Bulk import multiple breach records.

#### **`update(breach_id, data, user_id, user_role) -> tuple[dict, str | None]`**
Full update (replaces entire document).

#### **`patch(breach_id, data, user_id, user_role) -> tuple[dict, str | None]`**
Partial update (updates specific fields).

#### **`delete(breach_id) -> tuple[bool, str | None]`**
Delete breach.

#### **`bulk_delete(breach_ids) -> tuple[int, list]`**
Delete multiple breaches.

---

### **Sub-document Methods**

#### **Affected Accounts**
- `list_affected_accounts(breach_id)`
- `get_affected_account(breach_id, account_id)`
- `add_affected_account(breach_id, data)`
- `update_affected_account(breach_id, account_id, data)`
- `delete_affected_account(breach_id, account_id)`

#### **Timeline Events**
- `list_timeline(breach_id)`
- `get_timeline_event(breach_id, event_id)`
- `add_timeline_event(breach_id, data)`
- `update_timeline_event(breach_id, event_id, data)`
- `delete_timeline_event(breach_id, event_id)`

#### **Remediation Actions**
- `list_remediation(breach_id)`
- `get_remediation_action(breach_id, action_id)`
- `add_remediation_action(breach_id, data)`
- `update_remediation_action(breach_id, action_id, data)`
- `delete_remediation_action(breach_id, action_id)`

#### **Monitoring Alerts**
- `list_alerts(breach_id)`
- `get_alert(breach_id, alert_id)`
- `create_alert(breach_id, data)`
- `update_alert(breach_id, alert_id, data)`
- `delete_alert(breach_id, alert_id)`

---

### **Geospatial Methods**

#### **`find_near(longitude, latitude, radius) -> list[dict]`**
Find breaches near coordinates using `$geoNear`.

#### **`find_within_bounds(min_lng, min_lat, max_lng, max_lat) -> list[dict]`**
Find breaches within bounding box using `$geoWithin`.

#### **`get_geojson(severity, industry) -> list[dict]`**
Get breaches as GeoJSON features for mapping.

---

### **Utility Methods**

#### **`check_exposure(email, domain) -> dict`**
Check if email or domain appears in any breach.

#### **`compute_risk_score(base_severity, data_types, account_count) -> float`**
Calculate risk score (0-100) based on severity and exposure scale.

---

## 👤 UserService ([user_service.py](user_service.py))

Handles user profile management (non-auth operations).

### **Key Methods**

#### **`get_all(page, limit) -> tuple[list[dict], int]`**
List all users (admin only).

#### **`get_by_id(user_id) -> dict | None`**
Get user by ID.

#### **`update_user(user_id, updates) -> dict | None`**
Update user profile.

#### **`demote_admin_atomically(user_id, new_role) -> tuple[dict, str | None]`**
Safely demote admin to analyst/guest.

#### **`deactivate_admin_atomically(user_id) -> tuple[dict, str | None]`**
Safely deactivate admin account.

---

## 📈 AnalyticsService ([analytics_service.py](analytics_service.py))

Handles aggregation pipelines and dashboard statistics.

### **Key Methods**

#### **`risk_by_industry() -> list[dict]`**
Average risk score per industry.

#### **`severity_breakdown() -> list[dict]`**
Breaches grouped by severity.

#### **`monthly_trend(year) -> list[dict]`**
Time series of breaches per month.

#### **`top_organisations(limit) -> list[dict]`**
Most affected organizations.

#### **`data_types_frequency() -> list[dict]`**
Most commonly exposed data types.

#### **`remediation_rate() -> list[dict]`**
Completion rate of remediation actions.

#### **`alert_acknowledgement() -> list[dict]`**
Alert acknowledgement statistics.

#### **`industry_year_trend() -> list[dict]`**
Sector-specific trends mapped over time.

#### **`risk_scores() -> list[dict]`**
Risk score distribution histogram data.

#### **`attack_surface_profile(industry) -> dict`**
Faceted profile of the attack surface (data types, alert pressure, etc).

#### **`summary() -> dict`**
Dashboard summary with all key metrics.

---

## 🧪 Testing Services

### **Unit Tests (with mocks)**
Services are tested in isolation by mocking the MongoDB collection.

### **Integration Tests (with mongomock)**
Integration tests use `mongomock` to verify end-to-end service logic with a real (in-memory) database.

---

## 📝 Error Handling Pattern

Services return tuples for explicit error handling: `(result, error_message)`.
- `(result, None)` on success
- `(None, error_message)` on failure

---

## 📚 Related Documentation

- [Routes Documentation](../routes/README.md) - API endpoints
- [Models Documentation](../models/README.md) - Validation schemas
- [Utils Documentation](../utils/README.md) - Helper functions
