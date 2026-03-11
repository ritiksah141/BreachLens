# BreachLens – Quality Assurance & Automated Testing Strategy
## QA_STRATEGY.md
**Version:** 1.0.0
**Project:** BreachLens – Dark Web Breach Intelligence Tracker
**Module:** COM661 – Full Stack Strategies and Development


---

## Table of Contents

1. [QA Philosophy & Objectives](#1-qa-philosophy--objectives)
2. [Testing Layers Overview](#2-testing-layers-overview)
3. [Backend – Postman Collection Architecture](#3-backend--postman-collection-architecture)
4. [Backend – Postman Pre-Request Scripts](#4-backend--postman-pre-request-scripts)
5. [Backend – Postman Test Scripts by Endpoint Group](#5-backend--postman-test-scripts-by-endpoint-group)
6. [Backend – Newman CLI Automation](#6-backend--newman-cli-automation)
7. [Backend – pytest Unit Tests](#7-backend--pytest-unit-tests)
8. [Frontend – Angular Unit Tests](#8-frontend--angular-unit-tests)
9. [Frontend – Component Tests](#9-frontend--component-tests)
10. [Frontend – Service Tests](#10-frontend--service-tests)
11. [Frontend – Guard Tests](#11-frontend--guard-tests)
12. [Frontend – Interceptor Tests](#12-frontend--interceptor-tests)
13. [Frontend – End-to-End Tests (Cypress)](#13-frontend--end-to-end-tests-cypress)
14. [Submission Evidence Pack](#14-submission-evidence-pack)
15. [Test Coverage Targets](#15-test-coverage-targets)

---

## 1. QA Philosophy & Objectives

### 1.1 Strategy Statement

BreachLens adopts a **multi-layer testing strategy** that mirrors professional software engineering practice. Testing is not performed as an afterthought; it is structured as a first-class deliverable integral to the submission pack. Every layer of the stack — MongoDB data integrity, Flask API contract, Angular component behaviour, and full user journey — is covered by a dedicated, automated, and evidence-producing test suite.

### 1.2 QA Objectives (COM661 High 1st Alignment)

| Objective | Target | Evidence Produced |
|-----------|--------|-------------------|
| All 63 API endpoints have automated Postman tests (108 assertions) | 100% endpoint coverage | Newman HTML report |
| All tests assert status codes, response schemas, and data correctness | Pass/fail per assertion | Postman test results |
| JWT injection fully automated — no manual token copy/paste | Pre-request scripts | Postman collection file |
| Angular services have ≥ 90% code coverage | >90% | Karma coverage report |
| Angular guards and interceptors fully tested | 100% branch coverage | Karma coverage report |
| End-to-end user journeys automated | Core flows covered | Cypress screenshots + video |
| All tests executable with a single command | CI-ready | `npm run test:coverage`, `newman run ...` |

### 1.3 Test Types Used

| Type | Tool | Layer | Purpose |
|------|------|-------|---------|
| API Integration | Postman + Newman | Backend REST API | Contract, auth, schema, status code testing |
| Python Unit | pytest + mongomock | Flask services | Business logic isolation |
| Angular Unit | Jasmine + Karma | Frontend services, guards, interceptors | Isolated unit behaviour |
| Angular Component | Jasmine + TestBed | Angular components | Template rendering, user interaction |
| End-to-End | Cypress | Full stack | User journey validation |

---

## 2. Testing Layers Overview

```
┌─────────────────────────────────────────────────────┐
│                  END-TO-END (Cypress)                │
│     Full browser → Angular → Flask → MongoDB         │
├─────────────────────────────────────────────────────┤
│           API INTEGRATION (Postman/Newman)            │
│        HTTP requests → Flask routes → MongoDB        │
├─────────────────────────────────────────────────────┤
│         ANGULAR UNIT (Jasmine/Karma + TestBed)        │
│  Components | Services | Guards | Interceptors        │
├─────────────────────────────────────────────────────┤
│            PYTHON UNIT (pytest + mongomock)           │
│     Services | Validators | Utilities | Middleware    │
└─────────────────────────────────────────────────────┘
```

---

## 3. Backend – Postman Collection Architecture

### 3.1 Collection Structure

The Postman collection is organised as a **hierarchical folder tree** matching the API Blueprint structure. Each folder corresponds to one Blueprint and contains all requests for that route group.

```
BreachLens API Tests (Collection)
│
├── 🔑 0 – Environment Setup
│   └── [Pre-collection script: set baseUrl, seed test credentials]
│
├── 1️⃣ Auth
│   ├── POST Register – Success (201)
│   ├── POST Register – Duplicate Email (409)
│   ├── POST Register – Missing Fields (422)
│   ├── POST Register – Weak Password (422)
│   ├── POST Login – Success (200)
│   ├── POST Login – Wrong Password (401)
│   ├── POST Login – Unknown Email (401)
│   ├── GET Login – Basic Auth (200)
│   ├── GET Me – Authenticated (200)
│   ├── GET Me – No Token (401)
│   └── POST Logout – Authenticated (204)
│
├── 2️⃣ Breaches – CRUD
│   ├── GET List Breaches – No Auth (200, guest view)
│   ├── GET List Breaches – Paginated (page=2&limit=5)
│   ├── GET List Breaches – Filter by Severity=critical
│   ├── GET List Breaches – Filter by Industry=finance
│   ├── GET List Breaches – Sort by risk_score desc
│   ├── GET List Breaches – Full-text Search
│   ├── GET Single Breach – Valid ID (200)
│   ├── GET Single Breach – Invalid ObjectId (400)
│   ├── GET Single Breach – Not Found (404)
│   ├── POST Create Breach – Analyst Token (201)
│   ├── POST Create Breach – Guest (No Token) (401)
│   ├── POST Create Breach – Missing Required Fields (422)
│   ├── POST Create Breach – Invalid Severity Enum (422)
│   ├── POST Create Breach – Invalid GeoJSON Coordinates (422)
│   ├── POST Create Breach – Invalid Date Ordering (422)
│   ├── PUT Full Update – Admin Token (200)
│   ├── PUT Full Update – Analyst Own Record (200)
│   ├── PUT Full Update – Analyst Another's Record (403)
│   ├── PATCH Partial Update – status field only (200)
│   ├── PATCH Partial Update – Invalid Enum Value (422)
│   └── DELETE Breach – Admin (204)
│       DELETE Breach – Analyst (403)
│
├── 3️⃣ Affected Accounts (Sub-document CRUD)
│   ├── GET List Accounts – Analyst Token (200)
│   ├── GET List Accounts – Guest Token (401)
│   ├── GET Single Account (200)
│   ├── GET Single Account – Not Found (404)
│   ├── POST Add Account – Valid (201)
│   ├── POST Add Account – Invalid Email (422)
│   ├── PATCH Update Account – Mark Notified (200)
│   └── DELETE Remove Account – Admin (204)
│
├── 4️⃣ Timeline (Sub-document CRUD)
│   ├── GET Timeline Events (200)
│   ├── POST Add Event – Valid (201)
│   ├── POST Add Event – Invalid event_type (422)
│   ├── POST Add Event – Future Date (422)
│   ├── PATCH Update Event (200)
│   └── DELETE Event – Admin (204)
│
├── 5️⃣ Remediation (Sub-document CRUD)
│   ├── GET Remediation Actions (200)
│   ├── POST Add Action – Valid (201)
│   ├── POST Add Action – Missing due_date (422)
│   ├── PATCH Update Action Status (200)
│   └── DELETE Action – Admin (204)
│
├── 6️⃣ Monitoring Alerts (Sub-document CRUD)
│   ├── GET Alerts (200)
│   ├── POST Create Alert – Valid (201)
│   ├── POST Create Alert – Invalid alert_type (422)
│   ├── PATCH Acknowledge Alert (200)
│   └── DELETE Alert – Admin (204)
│
├── 7️⃣ Geospatial
│   ├── GET Near – Valid Coordinates (200)
│   ├── GET Near – Missing Parameters (400)
│   ├── GET Near – Out-of-range Longitude (422)
│   ├── GET Within Bounds – Valid (200)
│   ├── GET Within Bounds – Invalid Bounding Box (422)
│   └── GET GeoJSON Feature Collection (200)
│
├── 8️⃣ Analytics
│   ├── GET Risk by Industry (200)
│   ├── GET Severity Breakdown (200)
│   ├── GET Monthly Trend (200)
│   ├── GET Top Organisations (200)
│   ├── GET Data Types Frequency (200)
│   ├── GET Remediation Rate (200)
│   ├── GET Alert Acknowledgement (200)
│   ├── GET Industry Year Trend (200)
│   ├── GET Risk Score Distribution (200)
│   └── GET Summary KPIs (200)
│
├── 9️⃣ Exposure Check
│   ├── GET Check – Email Found (200, exposed=true)
│   ├── GET Check – Email Not Found (200, exposed=false)
│   ├── GET Check – Domain Found (200)
│   ├── GET Check – Invalid Email Format (422)
│   └── GET Check – No Parameters (400)
│
├── 🔟 Users
│   ├── GET List Users – Admin (200)
│   ├── GET List Users – Analyst (403)
│   ├── GET Own Profile – Authenticated (200)
│   ├── PATCH Update Own Username (200)
│   ├── PATCH Update Role – Admin (200)
│   ├── PATCH Update Role – Analyst (403)
│   └── DELETE User – Admin (204)
│
└── 1️⃣1️⃣ Admin
    ├── GET System Stats – Admin (200)
    ├── GET System Stats – Analyst (403)
    ├── PATCH Change User Role (200)
    ├── PATCH Activate User (200)
    ├── PATCH Deactivate User (200)
    └── DELETE Bulk Breaches – Admin (200)
```

### 3.2 Postman Environment Variables

```json
{
  "id": "breachlens-env",
  "name": "BreachLens Local",
  "values": [
    { "key": "baseUrl",          "value": "http://localhost:5000/api/v1", "enabled": true },
    { "key": "adminEmail",       "value": "admin@breachlens.test",        "enabled": true },
    { "key": "adminPassword",    "value": "Admin@Secure99",               "enabled": true },
    { "key": "analystEmail",     "value": "analyst@breachlens.test",      "enabled": true },
    { "key": "analystPassword",  "value": "Analyst@Secure88",             "enabled": true },
    { "key": "adminToken",       "value": "",                             "enabled": true },
    { "key": "analystToken",     "value": "",                             "enabled": true },
    { "key": "testBreachId",     "value": "",                             "enabled": true },
    { "key": "testAccountId",    "value": "",                             "enabled": true },
    { "key": "testTimelineId",   "value": "",                             "enabled": true },
    { "key": "testRemediationId","value": "",                             "enabled": true },
    { "key": "testAlertId",      "value": "",                             "enabled": true },
    { "key": "testUserId",       "value": "",                             "enabled": true }
  ]
}
```

---

## 4. Backend – Postman Pre-Request Scripts

### 4.1 Collection-Level Pre-Request Script (Auto JWT Injection)

This script runs **before every request** in the collection that has `{{adminToken}}` or `{{analystToken}}` in its `x-access-token` header. It checks token presence and fetches a new one if absent.

```javascript
// Collection-level Pre-request Script
// Automatically obtains and caches JWT tokens for Admin and Analyst roles.

const baseUrl = pm.environment.get("baseUrl");

// --- Helper: Fetch and cache a token ---
function ensureToken(role, emailKey, passwordKey, tokenKey, callback) {
    const existingToken = pm.environment.get(tokenKey);
    if (existingToken && existingToken.length > 20) {
        // Token already present — decode and check expiry
        try {
            const payload = JSON.parse(atob(existingToken.split(".")[1]));
            const nowSeconds = Math.floor(Date.now() / 1000);
            if (payload.exp && payload.exp > nowSeconds + 60) {
                // Token valid for at least another 60 seconds — skip refresh
                if (typeof callback === "function") callback();
                return;
            }
        } catch (e) { /* malformed token — fall through to re-fetch */ }
    }

    // Token missing or expired — fetch a fresh one
    pm.sendRequest({
        url: `${baseUrl}/auth/login`,
        method: "POST",
        header: { "Content-Type": "application/json" },
        body: {
            mode: "raw",
            raw: JSON.stringify({
                email: pm.environment.get(emailKey),
                password: pm.environment.get(passwordKey)
            })
        }
    }, function (err, res) {
        if (err) {
            console.error(`[BreachLens QA] Failed to fetch ${role} token:`, err);
            return;
        }
        const json = res.json();
        if (json.status === "success" && json.data.token) {
            pm.environment.set(tokenKey, json.data.token);
            console.log(`[BreachLens QA] ${role} token refreshed.`);
        } else {
            console.error(`[BreachLens QA] Login failed for ${role}:`, json.message);
        }
        if (typeof callback === "function") callback();
    });
}

// Ensure both tokens are available before the request fires
ensureToken("Admin",   "adminEmail",   "adminPassword",   "adminToken");
ensureToken("Analyst", "analystEmail", "analystPassword", "analystToken");
```

### 4.2 Folder-Level Pre-Request Script: Capture Created Breach ID

Applied to the **POST Create Breach** request. Saves the returned `_id` for use in subsequent sub-document tests.

```javascript
// Pre-request: ensure analyst token is ready
// (Handled by collection-level script above)
```

```javascript
// POST /breaches — Tests script (after request):
// Capture breach ID for downstream tests
if (pm.response.code === 201) {
    const json = pm.response.json();
    pm.environment.set("testBreachId", json.data._id);
    console.log("[BreachLens QA] testBreachId set to:", json.data._id);
}
```

---

## 5. Backend – Postman Test Scripts by Endpoint Group

### 5.1 Standard Assertions (Applied to Every Request)

```javascript
// STANDARD TEST BLOCK — included in every Postman request's Tests tab

// 1. Response time SLA
pm.test("Response time is within SLA (< 500ms)", function () {
    pm.expect(pm.response.responseTime).to.be.below(500);
});

// 2. Content-Type header
pm.test("Content-Type is application/json", function () {
    pm.expect(pm.response.headers.get("Content-Type")).to.include("application/json");
});

// 3. Response envelope schema (success)
if (pm.response.code < 400) {
    pm.test("Response has 'status' field set to 'success'", function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property("status", "success");
    });
}

// 4. Error envelope schema (error responses)
if (pm.response.code >= 400) {
    pm.test("Error response has 'status', 'message', and 'code' fields", function () {
        const json = pm.response.json();
        pm.expect(json).to.have.property("status", "error");
        pm.expect(json).to.have.property("message").that.is.a("string").and.is.not.empty;
        pm.expect(json).to.have.property("code", pm.response.code);
    });
}
```

### 5.2 Auth – POST `/auth/login` (Success)

```javascript
pm.test("Status code is 200", () => pm.response.to.have.status(200));

pm.test("Response contains token", function () {
    const json = pm.response.json();
    pm.expect(json.data).to.have.property("token");
    pm.expect(json.data.token).to.be.a("string").and.to.have.lengthOf.above(50);
});

pm.test("token is a valid JWT (3 parts)", function () {
    const token = pm.response.json().data.token;
    const parts = token.split(".");
    pm.expect(parts).to.have.lengthOf(3);
});

pm.test("Response includes token_type JWT", function () {
    pm.expect(pm.response.json().data.token_type).to.equal("JWT");
});

pm.test("Response includes expires_in integer", function () {
    pm.expect(pm.response.json().data.expires_in).to.be.a("number").and.above(0);
});

pm.test("Response includes user object with role", function () {
    const user = pm.response.json().data.user;
    pm.expect(user).to.have.property("_id");
    pm.expect(user).to.have.property("role").that.is.oneOf(["admin", "analyst", "guest"]);
});

// Save token
pm.environment.set("adminToken", pm.response.json().data.token);
```

### 5.3 Breaches – GET `/breaches` (List)

```javascript
pm.test("Status code is 200", () => pm.response.to.have.status(200));

pm.test("Response data is an array", function () {
    pm.expect(pm.response.json().data).to.be.an("array");
});

pm.test("Pagination meta object is present", function () {
    const meta = pm.response.json().meta;
    pm.expect(meta).to.have.all.keys("page", "limit", "total", "total_pages");
    pm.expect(meta.page).to.be.a("number").and.above(0);
    pm.expect(meta.limit).to.be.a("number").and.above(0);
    pm.expect(meta.total).to.be.a("number").and.at.least(0);
    pm.expect(meta.total_pages).to.be.a("number").and.at.least(0);
});

pm.test("Each breach has required fields", function () {
    const breaches = pm.response.json().data;
    breaches.forEach(function (breach) {
        pm.expect(breach).to.have.property("_id");
        pm.expect(breach).to.have.property("title").that.is.a("string");
        pm.expect(breach).to.have.property("severity")
            .that.is.oneOf(["critical", "high", "medium", "low", "informational"]);
        pm.expect(breach).to.have.property("status")
            .that.is.oneOf(["active", "contained", "investigating", "resolved"]);
        pm.expect(breach).to.have.property("industry").that.is.a("string");
        pm.expect(breach).to.have.property("affected_records_count").that.is.a("number").and.at.least(0);
        pm.expect(breach).to.have.property("risk_score").that.is.a("number");
    });
});

pm.test("Guest response does NOT include affected_accounts", function () {
    // This test runs without auth token to verify guest data redaction
    const breaches = pm.response.json().data;
    breaches.forEach(function (breach) {
        pm.expect(breach).to.not.have.property("affected_accounts");
    });
});
```

### 5.4 Breaches – POST `/breaches` (Create – Success 201)

```javascript
pm.test("Status code is 201", () => pm.response.to.have.status(201));

pm.test("Response includes Location header", function () {
    pm.expect(pm.response.headers.has("Location")).to.be.true;
});

pm.test("Created breach has correct schema", function () {
    const breach = pm.response.json().data;
    pm.expect(breach).to.have.property("_id");
    pm.expect(breach).to.have.property("title");
    pm.expect(breach).to.have.property("severity");
    pm.expect(breach).to.have.property("created_at");
    pm.expect(breach).to.have.property("updated_at");
    pm.expect(breach).to.have.property("organisation").that.is.an("object");
});

pm.test("risk_score is a float between 0 and 10", function () {
    const score = pm.response.json().data.risk_score;
    pm.expect(score).to.be.a("number").and.at.least(0).and.at.most(10);
});

// Capture ID for sub-document tests
const breachId = pm.response.json().data._id;
pm.environment.set("testBreachId", breachId);
console.log("[BreachLens QA] testBreachId:", breachId);
```

### 5.5 Validation Failure – POST `/breaches` (422)

```javascript
pm.test("Status code is 422", () => pm.response.to.have.status(422));

pm.test("422 response includes details object", function () {
    const json = pm.response.json();
    pm.expect(json).to.have.property("details").that.is.an("object");
    pm.expect(Object.keys(json.details).length).to.be.above(0);
});

pm.test("Error details reference specific invalid fields", function () {
    const details = pm.response.json().details;
    // At least one field key should be present
    pm.expect(Object.keys(details).length).to.be.above(0);
    Object.values(details).forEach(function (msg) {
        pm.expect(msg).to.be.a("string").and.not.empty;
    });
});
```

### 5.6 Geospatial – GET `/breaches/geo/near`

```javascript
pm.test("Status code is 200", () => pm.response.to.have.status(200));

pm.test("Response is a GeoJSON FeatureCollection", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.have.property("type", "FeatureCollection");
    pm.expect(data).to.have.property("features").that.is.an("array");
});

pm.test("Each feature has correct GeoJSON structure", function () {
    const features = pm.response.json().data.features;
    features.forEach(function (feature) {
        pm.expect(feature).to.have.property("type", "Feature");
        pm.expect(feature).to.have.property("geometry").that.is.an("object");
        pm.expect(feature.geometry).to.have.property("type", "Point");
        pm.expect(feature.geometry).to.have.property("coordinates").that.is.an("array").with.lengthOf(2);
        pm.expect(feature).to.have.property("properties").that.is.an("object");
        pm.expect(feature.properties).to.have.property("id");
        pm.expect(feature.properties).to.have.property("severity");
    });
});

pm.test("All returned features are within requested radius", function () {
    const meta = pm.response.json().meta;
    const features = pm.response.json().data.features;
    features.forEach(function (feature) {
        if (feature.properties.distance_metres !== undefined) {
            pm.expect(feature.properties.distance_metres).to.be.at.most(meta.radius_metres);
        }
    });
});
```

### 5.7 Analytics – GET `/analytics/risk-by-industry`

```javascript
pm.test("Status code is 200", () => pm.response.to.have.status(200));

pm.test("Data is a non-empty array", function () {
    const data = pm.response.json().data;
    pm.expect(data).to.be.an("array").and.have.lengthOf.above(0);
});

pm.test("Each industry record has required aggregation fields", function () {
    const data = pm.response.json().data;
    data.forEach(function (record) {
        pm.expect(record).to.have.property("industry").that.is.a("string");
        pm.expect(record).to.have.property("avg_risk_score").that.is.a("number");
        pm.expect(record).to.have.property("max_risk_score").that.is.a("number");
        pm.expect(record).to.have.property("min_risk_score").that.is.a("number");
        pm.expect(record).to.have.property("breach_count").that.is.a("number");
        pm.expect(record.avg_risk_score).to.be.at.least(0).and.at.most(10);
    });
});

pm.test("Results are sorted by avg_risk_score descending", function () {
    const scores = pm.response.json().data.map(r => r.avg_risk_score);
    for (let i = 0; i < scores.length - 1; i++) {
        pm.expect(scores[i]).to.be.at.least(scores[i + 1]);
    }
});
```

### 5.8 Sub-document – POST Affected Account (201)

```javascript
pm.test("Status code is 201", () => pm.response.to.have.status(201));

pm.test("Affected account has _id and email", function () {
    const account = pm.response.json().data;
    pm.expect(account).to.have.property("_id");
    pm.expect(account).to.have.property("email");
});

pm.test("Email field is a valid format", function () {
    const email = pm.response.json().data.email;
    pm.expect(email).to.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/);
});

pm.test("notified defaults to false", function () {
    pm.expect(pm.response.json().data.notified).to.be.false;
});

// Capture account ID
const accountId = pm.response.json().data._id;
pm.environment.set("testAccountId", accountId);
```

### 5.9 RBAC Enforcement Tests

```javascript
// Applied to DELETE /breaches/{id} with ANALYST token
pm.test("Analyst receives 403 Forbidden on DELETE", () => pm.response.to.have.status(403));

pm.test("403 error message mentions permissions", function () {
    const msg = pm.response.json().message.toLowerCase();
    pm.expect(msg).to.include("permission").or.include("authoris").or.include("forbidden").or.include("role");
});
```

```javascript
// Applied to GET /breaches/{id}/affected-accounts with NO token
pm.test("Unauthenticated request returns 401", () => pm.response.to.have.status(401));

pm.test("401 message indicates authentication required", function () {
    const msg = pm.response.json().message.toLowerCase();
    pm.expect(msg).to.include("auth").or.include("token").or.include("unauthori");
});
```

---

## 6. Backend – Newman CLI Automation

### 6.1 Newman Installation & Run Commands

```bash
# Install Newman globally
npm install -g newman newman-reporter-htmlextra

# Run full collection with environment — produces terminal output
newman run postman/BreachLens.postman_collection.json \
  --environment postman/BreachLens.postman_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export reports/newman-report.html \
  --reporter-htmlextra-title "BreachLens API Test Report" \
  --reporter-htmlextra-browserTitle "BreachLens QA" \
  --color on

# Run specific folder only (e.g. Geospatial tests)
newman run postman/BreachLens.postman_collection.json \
  --environment postman/BreachLens.postman_environment.json \
  --folder "Geospatial" \
  --reporters cli

# Run with bail on first failure (CI mode)
newman run postman/BreachLens.postman_collection.json \
  --environment postman/BreachLens.postman_environment.json \
  --bail \
  --reporters cli,junit \
  --reporter-junit-export reports/newman-junit.xml
```

### 6.2 Newman Exit Codes (for CI Integration)

| Exit Code | Meaning |
|-----------|---------|
| `0` | All tests passed |
| `1` | One or more test assertions failed |
| `2` | Newman encountered a fatal error |

### 6.3 Pre-Run Setup Script

```bash
#!/bin/bash
# scripts/run_tests.sh — Run before Newman to ensure clean test state

echo "[BreachLens QA] Starting Flask test server..."
cd backend
source venv/bin/activate
FLASK_ENV=testing python run.py &
FLASK_PID=$!

echo "[BreachLens QA] Waiting for server to become ready..."
sleep 3

echo "[BreachLens QA] Seeding test database..."
python seed/seed_data.py --env testing

echo "[BreachLens QA] Running Postman collection via Newman..."
newman run ../postman/BreachLens.postman_collection.json \
  --environment ../postman/BreachLens.postman_environment.json \
  --reporters cli,htmlextra \
  --reporter-htmlextra-export ../reports/newman-report.html

echo "[BreachLens QA] Stopping Flask test server..."
kill $FLASK_PID
```

### 6.4 Expected Newman Summary Output (Pass State)

```
┌─────────────────────────┬───────────────────┬──────────────────┐
│                         │          executed │           failed │
├─────────────────────────┼───────────────────┼──────────────────┤
│              iterations │                 1 │                0 │
├─────────────────────────┼───────────────────┼──────────────────┤
│                requests │               112 │                0 │
├─────────────────────────┼───────────────────┼──────────────────┤
│            test-scripts │               112 │                0 │
├─────────────────────────┼───────────────────┼──────────────────┤
│      prerequest-scripts │                28 │                0 │
├─────────────────────────┼───────────────────┼──────────────────┤
│              assertions │               108 │                0 │
├─────────────────────────┼───────────────────┼──────────────────┤
│ total run duration: 8.4s│                   │                  │
│ total data received: 184│                   │                  │
│ average response time:  │            72ms   │                  │
└─────────────────────────┴───────────────────┴──────────────────┘
```

---

## 7. Backend – pytest Unit Tests

### 7.1 Test Configuration

```python
# backend/tests/conftest.py
import pytest
import mongomock
from unittest.mock import patch
from app import create_app

@pytest.fixture(scope="session")
def app():
    """Create application with testing configuration."""
    with patch("pymongo.MongoClient", mongomock.MongoClient):
        application = create_app("testing")
        yield application

@pytest.fixture(scope="session")
def client(app):
    return app.test_client()

@pytest.fixture
def admin_token(client):
    """Returns a JWT access token for an admin user."""
    # Register + login admin
    client.post("/api/v1/auth/register", json={
        "username": "testadmin",
        "email": "admin@test.com",
        "password": "Admin@Test99",  # pragma: allowlist secret
        "role": "admin"
    })
    response = client.post("/api/v1/auth/login", json={
        "email": "admin@test.com",
        "password": "Admin@Test99"  # pragma: allowlist secret
    })
    return response.json["data"]["token"]

@pytest.fixture
def analyst_token(client):
    """Returns a JWT access token for an analyst user."""
    # Register + login analyst
    client.post("/api/v1/auth/register", json={
        "username": "testanalyst",
        "email": "analyst@test.com",
        "password": "Analyst@Test99",  # pragma: allowlist secret
        "role": "analyst"
    })
    response = client.post("/api/v1/auth/login", json={
        "email": "analyst@test.com",
        "password": "Analyst@Test99"  # pragma: allowlist secret
    })
    return response.json["data"]["token"]

@pytest.fixture
def sample_breach():
    return {
        "title": "Test Data Breach 2026",
        "description": "A test breach record for automated testing purposes.",
        "breach_date": "2026-01-01T00:00:00Z",
        "discovered_date": "2026-01-10T00:00:00Z",
        "severity": "high",
        "status": "active",
        "industry": "technology",
        "affected_records_count": 50000,
        "data_types_exposed": ["email", "password_hash"],
        "organisation": {
            "name": "Test Corp",
            "domain": "testcorp.example.com",
            "country": "UK",
            "size": "medium"
        },
        "location": {
            "type": "Point",
            "coordinates": [-0.1276, 51.5074]
        }
    }
```

### 7.2 Validator Unit Tests

```python
# backend/tests/test_validators.py
import pytest
from app.utils.validators import (
    validate_breach_input, validate_email, validate_coordinates,
    validate_date_ordering, validate_enum
)

class TestEmailValidation:
    def test_valid_email_passes(self):
        assert validate_email("user@example.com") is True

    def test_email_missing_at_fails(self):
        assert validate_email("userexample.com") is False

    def test_email_missing_domain_fails(self):
        assert validate_email("user@") is False

    def test_email_with_subdomain_passes(self):
        assert validate_email("user@mail.example.co.uk") is True

class TestCoordinateValidation:
    def test_valid_coordinates_pass(self):
        assert validate_coordinates([0.0, 51.5]) is True

    def test_longitude_over_180_fails(self):
        errors = validate_breach_input({"location": {"type": "Point", "coordinates": [200, 51]}})
        assert "location.coordinates[0]" in errors

    def test_latitude_over_90_fails(self):
        errors = validate_breach_input({"location": {"type": "Point", "coordinates": [0, 95]}})
        assert "location.coordinates[1]" in errors

class TestDateOrdering:
    def test_discovered_after_breach_passes(self):
        errors = validate_date_ordering("2026-01-01", "2026-01-10")
        assert len(errors) == 0

    def test_discovered_before_breach_fails(self):
        errors = validate_date_ordering("2026-01-10", "2026-01-01")
        assert len(errors) > 0

class TestEnumValidation:
    def test_valid_severity_passes(self):
        assert validate_enum("critical", ["critical", "high", "medium", "low", "informational"]) is True

    def test_invalid_severity_fails(self):
        assert validate_enum("extreme", ["critical", "high", "medium", "low", "informational"]) is False
```

### 7.3 Breach Service Unit Tests

```python
# backend/tests/test_breach_service.py
import pytest
from unittest.mock import MagicMock, patch
from bson import ObjectId

class TestBreachService:
    def test_get_by_id_returns_breach(self, client, admin_token, sample_breach):
        """Creates a breach, then retrieves it by ID and asserts data integrity."""
        # Create
        create_response = client.post(
            "/api/v1/breaches",
            json=sample_breach,
            headers={"x-access-token": admin_token},
        )
        assert create_response.status_code == 201
        breach_id = create_response.json["data"]["_id"]

        # Retrieve
        get_response = client.get(f"/api/v1/breaches/{breach_id}")
        assert get_response.status_code == 200
        assert get_response.json["data"]["title"] == sample_breach["title"]

    def test_invalid_object_id_returns_400(self, client):
        response = client.get("/api/v1/breaches/not-a-valid-id")
        assert response.status_code == 400

    def test_not_found_returns_404(self, client):
        fake_id = str(ObjectId())
        response = client.get(f"/api/v1/breaches/{fake_id}")
        assert response.status_code == 404

    def test_create_without_auth_returns_401(self, client, sample_breach):
        response = client.post("/api/v1/breaches", json=sample_breach)
        assert response.status_code == 401

    def test_create_with_invalid_severity_returns_422(self, client, admin_token, sample_breach):
        sample_breach["severity"] = "extreme"
        response = client.post(
            "/api/v1/breaches",
            json=sample_breach,
            headers={"x-access-token": admin_token},
        )
        assert response.status_code == 422
        assert "severity" in response.json.get("details", {})

    def test_delete_by_analyst_returns_403(self, client, admin_token, analyst_token, sample_breach):
        """Analyst should not be able to delete breach records."""
        create_response = client.post(
            "/api/v1/breaches",
            json=sample_breach,
            headers={"x-access-token": admin_token},
        )
        breach_id = create_response.json["data"]["_id"]
        # Use analyst token (lower privilege)
        analyst_response = client.delete(
            f"/api/v1/breaches/{breach_id}",
            headers={"x-access-token": analyst_token},
        )
        assert analyst_response.status_code == 403
        # This confirms RBAC is enforced at route level

    def test_list_breaches_respects_pagination(self, client):
        response = client.get("/api/v1/breaches?page=1&limit=5")
        assert response.status_code == 200
        assert len(response.json["data"]) <= 5
        assert response.json["meta"]["limit"] == 5
```

---

## 8. Frontend – Angular Unit Tests

### 8.1 Angular Test Configuration

```typescript
// karma.conf.js — coverage reporting enabled
module.exports = function(config) {
  config.set({
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    reporters: ['progress', 'kjhtml', 'coverage-istanbul'],
    coverageIstanbulReporter: {
      reports: ['html', 'lcovonly', 'text-summary'],
      dir: require('path').join(__dirname, 'coverage'),
      fixWebpackSourcePaths: true,
      thresholds: {
        statements: 80,
        lines: 80,
        branches: 75,
        functions: 80
      }
    }
  });
};
```

Run with: `ng test --coverage --watch=false`

---

## 9. Frontend – Component Tests

### 9.1 BreachListComponent

```typescript
// src/app/features/breaches/breach-list/breach-list.component.spec.ts
import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { BreachListComponent } from './breach-list.component';
import { BreachService } from '../../../core/services/breach.service';
import { RouterTestingModule } from '@angular/router/testing';
import { HttpClientTestingModule } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { Breach } from '../../../core/models/breach.model';

describe('BreachListComponent', () => {
  let component: BreachListComponent;
  let fixture: ComponentFixture<BreachListComponent>;
  let mockBreachService: jasmine.SpyObj<BreachService>;

  const mockBreaches: Breach[] = [
    {
      _id: '64ab1234abc',
      title: 'Test Breach Alpha',
      severity: 'critical',
      status: 'active',
      industry: 'finance',
      affected_records_count: 100000,
      risk_score: 9.1,
      breach_date: '2026-01-01T00:00:00Z',
      discovered_date: '2026-01-10T00:00:00Z',
      description: 'Test breach description',
      data_types_exposed: ['email'],
      organisation: { name: 'Test Corp', domain: 'testcorp.com', country: 'UK', size: 'large' },
      created_at: '2026-01-10T00:00:00Z',
      updated_at: '2026-01-10T00:00:00Z',
      created_by: 'user123'
    }
  ];

  const mockResponse = {
    status: 'success' as const,
    data: mockBreaches,
    meta: { page: 1, limit: 20, total: 1, total_pages: 1 }
  };

  beforeEach(async () => {
    mockBreachService = jasmine.createSpyObj('BreachService', ['getBreaches']);
    mockBreachService.getBreaches.and.returnValue(of(mockResponse));

    await TestBed.configureTestingModule({
      imports: [BreachListComponent, RouterTestingModule, HttpClientTestingModule],
      providers: [{ provide: BreachService, useValue: mockBreachService }]
    }).compileComponents();

    fixture = TestBed.createComponent(BreachListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should call getBreaches on init', () => {
    expect(mockBreachService.getBreaches).toHaveBeenCalledOnce();
  });

  it('should render breach titles in the DOM', () => {
    fixture.detectChanges();
    const compiled = fixture.nativeElement as HTMLElement;
    expect(compiled.textContent).toContain('Test Breach Alpha');
  });

  it('should display loading spinner while fetching', () => {
    component.isLoading = true;
    fixture.detectChanges();
    const spinner = fixture.nativeElement.querySelector('[data-testid="loading-spinner"]');
    expect(spinner).toBeTruthy();
  });

  it('should display empty state when no breaches returned', () => {
    mockBreachService.getBreaches.and.returnValue(
      of({ status: 'success' as const, data: [], meta: { page: 1, limit: 20, total: 0, total_pages: 0 } })
    );
    component.loadBreaches();
    fixture.detectChanges();
    const emptyState = fixture.nativeElement.querySelector('[data-testid="empty-state"]');
    expect(emptyState).toBeTruthy();
  });

  it('should display error state on API failure', fakeAsync(() => {
    mockBreachService.getBreaches.and.returnValue(throwError(() => ({ status: 500 })));
    component.loadBreaches();
    tick();
    fixture.detectChanges();
    expect(component.hasError).toBeTrue();
  }));

  it('should update filters and reload on severity change', fakeAsync(() => {
    component.filters.severity = 'critical';
    component.applyFilters();
    tick(300); // debounce
    expect(mockBreachService.getBreaches).toHaveBeenCalledWith(
      jasmine.objectContaining({ severity: 'critical' })
    );
  }));

  it('should update page and reload on pagination change', () => {
    component.onPageChange(2);
    expect(component.filters.page).toBe(2);
    expect(mockBreachService.getBreaches).toHaveBeenCalledTimes(2);
  });
});
```

### 9.2 SeverityBadgeComponent

```typescript
// src/app/shared/components/severity-badge/severity-badge.component.spec.ts
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SeverityBadgeComponent } from './severity-badge.component';

describe('SeverityBadgeComponent', () => {
  let component: SeverityBadgeComponent;
  let fixture: ComponentFixture<SeverityBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SeverityBadgeComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(SeverityBadgeComponent);
    component = fixture.componentInstance;
  });

  it('should render "critical" with red CSS class', () => {
    component.severity = 'critical';
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.classList).toContain('badge--critical');
    expect(badge.textContent.trim().toLowerCase()).toBe('critical');
  });

  it('should render "low" with green CSS class', () => {
    component.severity = 'low';
    fixture.detectChanges();
    const badge = fixture.nativeElement.querySelector('.badge');
    expect(badge.classList).toContain('badge--low');
  });

  it('should accept all five severity levels without error', () => {
    const levels: string[] = ['critical', 'high', 'medium', 'low', 'informational'];
    levels.forEach(level => {
      expect(() => {
        component.severity = level as any;
        fixture.detectChanges();
      }).not.toThrow();
    });
  });
});
```

---

## 10. Frontend – Service Tests

### 10.1 BreachService Tests

```typescript
// src/app/core/services/breach.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { BreachService } from './breach.service';
import { environment } from '../../../environments/environment';

describe('BreachService', () => {
  let service: BreachService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [BreachService]
    });
    service = TestBed.inject(BreachService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  describe('getBreaches()', () => {
    it('should GET /breaches with no params by default', () => {
      service.getBreaches().subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/breaches`);
      expect(req.request.method).toBe('GET');
      req.flush({ status: 'success', data: [], meta: { page: 1, limit: 20, total: 0, total_pages: 0 } });
    });

    it('should append query params when filters are provided', () => {
      service.getBreaches({ severity: 'critical', page: 2, limit: 10 }).subscribe();
      const req = httpMock.expectOne(r => r.url.includes('/breaches') && r.params.get('severity') === 'critical');
      expect(req.request.params.get('page')).toBe('2');
      expect(req.request.params.get('limit')).toBe('10');
      req.flush({ status: 'success', data: [], meta: {} });
    });
  });

  describe('createBreach()', () => {
    it('should POST to /breaches with correct body', () => {
      const payload = { title: 'Test', severity: 'high' };
      service.createBreach(payload).subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/breaches`);
      expect(req.request.method).toBe('POST');
      expect(req.request.body).toEqual(payload);
      req.flush({ status: 'success', data: { _id: '123', ...payload } });
    });
  });

  describe('deleteBreach()', () => {
    it('should DELETE to /breaches/{id}', () => {
      service.deleteBreach('64ab1234abc').subscribe();
      const req = httpMock.expectOne(`${environment.apiUrl}/breaches/64ab1234abc`);
      expect(req.request.method).toBe('DELETE');
      req.flush(null);
    });
  });
});
```

### 10.2 AuthService Tests

```typescript
// src/app/core/services/auth.service.spec.ts
import { TestBed } from '@angular/core/testing';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthService } from './auth.service';
import { RouterTestingModule } from '@angular/router/testing';

describe('AuthService', () => {
  let service: AuthService;
  let httpMock: HttpTestingController;

  const mockToken = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.' +
    btoa(JSON.stringify({ sub: 'user123', role: 'analyst', exp: Math.floor(Date.now() / 1000) + 3600 })) +
    '.signature';

  beforeEach(() => {
    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule, RouterTestingModule],
      providers: [AuthService]
    });
    service = TestBed.inject(AuthService);
    httpMock = TestBed.inject(HttpTestingController);
    localStorage.clear();
  });

  afterEach(() => {
    httpMock.verify();
    localStorage.clear();
  });

  it('should return false for isAuthenticated() when no token', () => {
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('should return true for isAuthenticated() when valid token stored', () => {
    localStorage.setItem('token', mockToken);
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('should extract role from JWT payload', () => {
    localStorage.setItem('token', mockToken);
    expect(service.getCurrentUserRole()).toBe('analyst');
  });

  it('should clear localStorage on logout()', () => {
    localStorage.setItem('token', mockToken);
    service.logout();
    expect(localStorage.getItem('token')).toBeNull();
  });

  it('should call POST /auth/login and store token', () => {
    service.login('analyst@test.com', 'Pass@123').subscribe();
    const req = httpMock.expectOne(r => r.url.includes('/auth/login'));
    expect(req.request.method).toBe('POST');
    req.flush({
      status: 'success',
      data: { token: mockToken, token_type: 'JWT', expires_in: 3600 }
    });
    expect(service.getToken()).toBe(mockToken);
  });
});
```

---

## 11. Frontend – Guard Tests

### 11.1 AuthGuard Tests

```typescript
// src/app/core/guards/auth.guard.spec.ts
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { RouterTestingModule } from '@angular/router/testing';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';

describe('authGuard', () => {
  let mockAuthService: jasmine.SpyObj<AuthService>;
  let mockRouter: jasmine.SpyObj<Router>;

  const mockRoute = {} as ActivatedRouteSnapshot;
  const mockState = { url: '/breaches/create' } as RouterStateSnapshot;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['isAuthenticated']);
    mockRouter = jasmine.createSpyObj('Router', ['createUrlTree', 'navigate']);
    mockRouter.createUrlTree.and.callFake((commands, extras) => commands as any);

    TestBed.configureTestingModule({
      imports: [RouterTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: Router, useValue: mockRouter }
      ]
    });
  });

  it('should return true when user is authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(true);
    const result = TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(result).toBeTrue();
  });

  it('should redirect to /login when not authenticated', () => {
    mockAuthService.isAuthenticated.and.returnValue(false);
    TestBed.runInInjectionContext(() => authGuard(mockRoute, mockState));
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(
      ['/login'],
      jasmine.objectContaining({ queryParams: { returnUrl: '/breaches/create' } })
    );
  });
});
```

### 11.2 RoleGuard Tests

```typescript
// src/app/core/guards/role.guard.spec.ts
describe('roleGuard', () => {
  it('should allow access when user has required role', () => {
    mockAuthService.getCurrentUserRole.and.returnValue('admin');
    const routeWithAdminRole = { data: { roles: ['admin'] } } as any;
    const result = TestBed.runInInjectionContext(() => roleGuard(routeWithAdminRole, mockState));
    expect(result).toBeTrue();
  });

  it('should redirect to /forbidden when user lacks required role', () => {
    mockAuthService.getCurrentUserRole.and.returnValue('guest');
    const routeWithAdminRole = { data: { roles: ['admin', 'analyst'] } } as any;
    TestBed.runInInjectionContext(() => roleGuard(routeWithAdminRole, mockState));
    expect(mockRouter.createUrlTree).toHaveBeenCalledWith(['/forbidden']);
  });

  it('should allow access when no role restriction is set', () => {
    mockAuthService.getCurrentUserRole.and.returnValue('guest');
    const routeNoRole = { data: {} } as any;
    const result = TestBed.runInInjectionContext(() => roleGuard(routeNoRole, mockState));
    expect(result).toBeTrue();
  });
});
```

---

## 12. Frontend – Interceptor Tests

### 12.1 AuthInterceptor Tests

```typescript
// src/app/core/interceptors/auth.interceptor.spec.ts
import { TestBed } from '@angular/core/testing';
import { HTTP_INTERCEPTORS, HttpClient } from '@angular/common/http';
import { HttpClientTestingModule, HttpTestingController } from '@angular/common/http/testing';
import { AuthInterceptor } from './auth.interceptor';
import { AuthService } from '../services/auth.service';

describe('AuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let mockAuthService: jasmine.SpyObj<AuthService>;

  beforeEach(() => {
    mockAuthService = jasmine.createSpyObj('AuthService', ['getToken']);

    TestBed.configureTestingModule({
      imports: [HttpClientTestingModule],
      providers: [
        { provide: AuthService, useValue: mockAuthService },
        { provide: HTTP_INTERCEPTORS, useClass: AuthInterceptor, multi: true }
      ]
    });

    httpMock = TestBed.inject(HttpTestingController);
    httpClient = TestBed.inject(HttpClient);
  });

  afterEach(() => httpMock.verify());

  it('should attach x-access-token header when token is present', () => {
    mockAuthService.getToken.and.returnValue('mock-jwt-token');
    httpClient.get('/api/v1/breaches').subscribe();
    const req = httpMock.expectOne('/api/v1/breaches');
    expect(req.request.headers.get('x-access-token')).toBe('mock-jwt-token');
    req.flush({});
  });

  it('should NOT attach x-access-token header when no token', () => {
    mockAuthService.getToken.and.returnValue(null);
    httpClient.get('/api/v1/breaches').subscribe();
    const req = httpMock.expectOne('/api/v1/breaches');
    expect(req.request.headers.has('x-access-token')).toBeFalse();
    req.flush({});
  });
});
```

### 12.2 ErrorInterceptor Tests

```typescript
// src/app/core/interceptors/error.interceptor.spec.ts
describe('ErrorInterceptor', () => {
  it('should call logout and navigate to /login on 401', () => {
    mockAuthService.getToken.and.returnValue('token');
    httpClient.get('/api/v1/breaches').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/v1/breaches');
    req.flush({ status: 'error', message: 'Unauthorized', code: 401 }, { status: 401, statusText: 'Unauthorized' });
    expect(mockAuthService.logout).toHaveBeenCalled();
    expect(mockRouter.navigate).toHaveBeenCalledWith(
      ['/login'], jasmine.objectContaining({ queryParams: jasmine.any(Object) })
    );
  });

  it('should navigate to /forbidden on 403', () => {
    httpClient.get('/api/v1/admin/stats').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/v1/admin/stats');
    req.flush({ status: 'error', message: 'Forbidden', code: 403 }, { status: 403, statusText: 'Forbidden' });
    expect(mockRouter.navigate).toHaveBeenCalledWith(['/forbidden']);
  });

  it('should show error notification on 500', () => {
    httpClient.get('/api/v1/breaches').subscribe({ error: () => {} });
    const req = httpMock.expectOne('/api/v1/breaches');
    req.flush({}, { status: 500, statusText: 'Server Error' });
    expect(mockNotificationService.showError).toHaveBeenCalled();
  });
});
```

---

## 13. Frontend – End-to-End Tests (Cypress)

### 13.1 Cypress Configuration

```typescript
// cypress.config.ts
import { defineConfig } from 'cypress';

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:4200',
    viewportWidth: 1280,
    viewportHeight: 800,
    video: true,
    screenshotOnRunFailure: true,
    specPattern: 'cypress/e2e/**/*.cy.ts',
    supportFile: 'cypress/support/e2e.ts'
  }
});
```

### 13.2 Custom Cypress Commands

```typescript
// cypress/support/commands.ts
declare global {
  namespace Cypress {
    interface Chainable {
      loginAs(role: 'admin' | 'analyst' | 'guest'): void;
      clearAuthState(): void;
    }
  }
}

Cypress.Commands.add('loginAs', (role: 'admin' | 'analyst' | 'guest') => {
  const credentials = {  // pragma: allowlist secret
    admin:   { email: 'admin@breachlens.test',   password: 'Admin@Secure99' },  // pragma: allowlist secret
    analyst: { email: 'analyst@breachlens.test', password: 'Analyst@Secure88' },  // pragma: allowlist secret
    guest:   { email: '',                         password: '' }
  };

  if (role === 'guest') return;

  cy.request('POST', `${Cypress.env('apiUrl')}/auth/login`, credentials[role])
    .then(res => {
      window.localStorage.setItem('token', res.body.data.token);
    });
});

Cypress.Commands.add('clearAuthState', () => {
  window.localStorage.removeItem('token');
});
```

### 13.3 E2E Test: Authentication Flow

```typescript
// cypress/e2e/auth.cy.ts
describe('Authentication Flow', () => {
  beforeEach(() => cy.clearAuthState());

  it('should redirect unauthenticated user to login', () => {
    cy.visit('/breaches/create');
    cy.url().should('include', '/login');
    cy.url().should('include', 'returnUrl');
  });

  it('should show validation errors on empty login form', () => {
    cy.visit('/login');
    cy.get('[data-testid="login-submit"]').click();
    cy.get('[data-testid="email-error"]').should('be.visible');
    cy.get('[data-testid="password-error"]').should('be.visible');
  });

  it('should log in successfully as analyst and redirect', () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type('analyst@breachlens.test');
    cy.get('[data-testid="password-input"]').type('Analyst@Secure88');
    cy.get('[data-testid="login-submit"]').click();
    cy.url().should('include', '/dashboard');
    cy.get('[data-testid="user-role-badge"]').should('contain', 'analyst');
  });

  it('should show error toast for wrong credentials', () => {
    cy.visit('/login');
    cy.get('[data-testid="email-input"]').type('analyst@breachlens.test');
    cy.get('[data-testid="password-input"]').type('WrongPassword123');
    cy.get('[data-testid="login-submit"]').click();
    cy.get('[data-testid="error-toast"]').should('be.visible')
      .and('contain', 'Invalid credentials');
  });
});
```

### 13.4 E2E Test: Breach Management Flow

```typescript
// cypress/e2e/breach-management.cy.ts
describe('Breach Management – Analyst Journey', () => {
  beforeEach(() => cy.loginAs('analyst'));

  it('should display the breach list with pagination controls', () => {
    cy.visit('/breaches');
    cy.get('[data-testid="breach-list-item"]').should('have.length.at.least', 1);
    cy.get('[data-testid="pagination"]').should('be.visible');
  });

  it('should filter breaches by severity', () => {
    cy.visit('/breaches');
    cy.get('[data-testid="severity-filter"]').select('critical');
    cy.get('[data-testid="breach-list-item"]').each($item => {
      cy.wrap($item).find('[data-testid="severity-badge"]')
        .should('contain.text', 'critical');
    });
  });

  it('should search breaches with debounced input', () => {
    cy.visit('/breaches');
    cy.get('[data-testid="search-input"]').type('LinkedIn');
    cy.wait(400); // wait for debounce
    cy.get('[data-testid="breach-list-item"]').should('have.length.at.least', 1);
    cy.get('[data-testid="breach-list-item"]').first().should('contain.text', 'LinkedIn');
  });

  it('should navigate to breach detail on row click', () => {
    cy.visit('/breaches');
    cy.get('[data-testid="breach-list-item"]').first().click();
    cy.url().should('match', /\/breaches\/[a-f0-9]{24}/);
    cy.get('[data-testid="breach-title"]').should('be.visible');
  });

  it('should create a new breach and confirm 201 response', () => {
    cy.visit('/breaches/create');
    cy.get('[data-testid="title-input"]').type('Cypress E2E Test Breach');
    cy.get('[data-testid="description-input"]').type('This breach was created by the Cypress automated test suite.');
    cy.get('[data-testid="severity-select"]').select('high');
    cy.get('[data-testid="status-select"]').select('active');
    cy.get('[data-testid="industry-select"]').select('technology');
    cy.get('[data-testid="breach_date-input"]').type('2026-01-15');
    cy.get('[data-testid="discovered_date-input"]').type('2026-01-20');
    cy.get('[data-testid="affected_records_count-input"]').clear().type('75000');
    cy.get('[data-testid="org_name-input"]').type('Cypress Corp');
    cy.get('[data-testid="org_domain-input"]').type('cypress-corp.test');
    cy.get('[data-testid="org_country-input"]').type('USA');
    cy.get('[data-testid="org_size-select"]').select('medium');
    cy.get('[data-testid="submit-btn"]').click();
    cy.get('[data-testid="success-toast"]').should('contain', 'Breach created successfully');
    cy.url().should('match', /\/breaches\/[a-f0-9]{24}/);
  });

  it('should NOT show the delete button for an analyst', () => {
    cy.visit('/breaches');
    cy.get('[data-testid="breach-list-item"]').first().click();
    cy.get('[data-testid="delete-btn"]').should('not.exist');
  });
});
```

### 13.5 E2E Test: Analytics Dashboard

```typescript
// cypress/e2e/analytics.cy.ts
describe('Analytics Dashboard', () => {
  beforeEach(() => cy.loginAs('analyst'));

  it('should render all KPI summary tiles', () => {
    cy.visit('/analytics');
    cy.get('[data-testid="kpi-total-breaches"]').should('be.visible').and('not.be.empty');
    cy.get('[data-testid="kpi-total-records"]').should('be.visible');
    cy.get('[data-testid="kpi-avg-risk-score"]').should('be.visible');
    cy.get('[data-testid="kpi-open-alerts"]').should('be.visible');
  });

  it('should render the Chart.js risk-by-industry chart canvas', () => {
    cy.visit('/analytics');
    cy.get('[data-testid="chart-risk-by-industry"] canvas').should('be.visible');
  });

  it('should render the Leaflet breach map with markers', () => {
    cy.visit('/analytics/map');
    cy.get('.leaflet-container').should('be.visible');
    cy.get('.leaflet-marker-icon', { timeout: 5000 }).should('have.length.at.least', 1);
  });
});
```

### 13.6 E2E Test: Exposure Check (Public Route)

```typescript
// cypress/e2e/exposure-check.cy.ts
describe('Exposure Check – Public Route', () => {
  it('should be accessible without login', () => {
    cy.clearAuthState();
    cy.visit('/exposure-check');
    cy.url().should('include', '/exposure-check');
    cy.get('[data-testid="exposure-form"]').should('be.visible');
  });

  it('should show "exposed" result for known email', () => {
    cy.visit('/exposure-check');
    cy.get('[data-testid="email-input"]').type('victim@finance-corp.example.com');
    cy.get('[data-testid="check-btn"]').click();
    cy.get('[data-testid="result-exposed-badge"]').should('be.visible');
    cy.get('[data-testid="result-breach-count"]').should('contain', 'found in');
  });

  it('should show "not exposed" for unknown email', () => {
    cy.visit('/exposure-check');
    cy.get('[data-testid="email-input"]').type('safe@notexposed.example.com');
    cy.get('[data-testid="check-btn"]').click();
    cy.get('[data-testid="result-safe-badge"]').should('be.visible');
  });

  it('should validate email format before submitting', () => {
    cy.visit('/exposure-check');
    cy.get('[data-testid="email-input"]').type('notvalid');
    cy.get('[data-testid="check-btn"]').click();
    cy.get('[data-testid="email-error"]').should('be.visible');
    cy.get('[data-testid="result-exposed-badge"]').should('not.exist');
  });
});
```

---

## 14. Submission Evidence Pack

The following artefacts must be included in the final submission pack to satisfy the COM661 automated testing evidence requirement.

### 14.1 Required Evidence Files

```
submission/
├── evidence/
│   ├── backend/
│   │   ├── newman-report.html          # Newman HTML report (htmlextra format)
│   │   ├── newman-report.json          # Raw Newman JSON output
│   │   ├── newman-junit.xml            # JUnit XML (CI-compatible)
│   │   ├── postman-collection.png      # Screenshot of collection structure in Postman UI
│   │   ├── postman-runner-pass.png     # Screenshot of Collection Runner showing all green
│   │   └── pytest-coverage-report/    # Pytest HTML coverage report folder
│   │       └── index.html
│   └── frontend/
│       ├── karma-coverage-report/      # Angular Karma coverage HTML report
│       │   └── index.html
│       ├── karma-test-results.txt      # Terminal output of ng test --watch=false
│       ├── cypress-videos/             # Cypress video recordings of E2E tests
│       │   ├── auth.cy.ts.mp4
│       │   ├── breach-management.cy.ts.mp4
│       │   └── analytics.cy.ts.mp4
│       └── cypress-screenshots/        # Screenshots on failure (if any)
```

### 14.2 Evidence Checklist

| # | Evidence Item | Tool | Demonstrates |
|---|--------------|------|-------------|
| E1 | Newman HTML report (all green) | Newman + htmlextra | 64 requests tested, 108 assertions pass |
| E2 | Postman collection structure screenshot | Postman UI | Collection architecture, folder organisation |
| E3 | Collection Runner screenshot | Postman UI | Visual pass/fail confirmation |
| E4 | Pre-request script screenshot | Postman UI | JWT auto-injection implemented |
| E5 | pytest coverage report (≥ 80%) | pytest-cov | Backend service layer coverage |
| E6 | Karma coverage report (≥ 80%) | Karma + Istanbul | Angular service/guard/interceptor coverage |
| E7 | Cypress E2E video recordings | Cypress | Full user journey validation |
| E8 | `ng test` terminal output (all passing) | Angular CLI | Component and unit test pass state |

---

## 15. Test Coverage Targets

### 15.1 Backend Coverage Targets

| Module | Target Coverage | Priority |
|--------|----------------|----------|
| `app/utils/validators.py` | ≥ 95% | Critical |
| `app/middleware/auth_middleware.py` | ≥ 95% | Critical |
| `app/services/breach_service.py` | ≥ 85% | High |
| `app/services/analytics_service.py` | ≥ 80% | High |
| `app/routes/breaches.py` | ≥ 80% | High |
| `app/routes/analytics.py` | ≥ 75% | Medium |
| `app/utils/response.py` | ≥ 90% | High |

### 15.2 Frontend Coverage Targets

| Module | Target Coverage | Priority |
|--------|----------------|----------|
| `core/guards/*.ts` | 100% branch | Critical |
| `core/interceptors/*.ts` | 100% branch | Critical |
| `core/services/auth.service.ts` | ≥ 95% | Critical |
| `core/services/breach.service.ts` | ≥ 90% | High |
| `core/services/analytics.service.ts` | ≥ 85% | High |
| `features/breaches/breach-list/` | ≥ 85% | High |
| `features/breaches/breach-form/` | ≥ 80% | High |
| `shared/components/` | ≥ 80% | Medium |

### 15.3 Postman Coverage Targets

| Category | Requests | Target Pass Rate |
|----------|----------|-----------------|
| Auth endpoints | 5 | 100% |
| Breach CRUD | 16 | 100% |
| Affected Accounts | 6 | 100% |
| Timeline | 4 | 100% |
| Remediation | 4 | 100% |
| Monitoring Alerts | 4 | 100% |
| Geospatial endpoints | 4 | 100% |
| Analytics endpoints | 6 | 100% |
| Exposure check | 4 | 100% |
| User management | 5 | 100% |
| Admin endpoints | 5 | 100% |
| **Total** | **63** | **100%** |

---

*QA_STRATEGY.md v1.0.0 – BreachLens – COM661 Individual Coursework*
*All test artefacts referenced in §14 must be present in the submission pack.*
