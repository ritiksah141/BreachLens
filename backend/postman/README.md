# BreachLens Postman Collection

[![Postman Tests](https://img.shields.io/badge/Postman-87%20requests-blue.svg)](BreachLens.postman_collection.json)
[![API Version](https://img.shields.io/badge/API-v1.0-green.svg)](../README.md#-api-endpoints-63-total)

**Comprehensive API test collection for all 63 endpoints.**

> **Note:** The collection contains **87 requests** testing **63 unique endpoints**. Some endpoints have multiple test scenarios (e.g., success cases, validation errors, permission checks).

---

## ⚡ TL;DR - Quick Run Guide

**For COM661 Submission - Generate Evidence in 5 Minutes:**

```bash
# 1. Start backend (Terminal 1)
cd backend
source ../venv/bin/activate
python seed/seed_data.py --reset
python run.py

# 2. In Postman App:
#    - Import: BreachLens.postman_collection.json
#    - Import: BreachLens.postman_environment.json
#    - Activate environment: Top-right → "BreachLens Local"
#    - Right-click collection → "Run collection"
#    - Click "Run BreachLens API v1"
#    - Wait ~60 seconds (87 requests)
#    - Click "View Summary" → Cmd+P → Save as PDF ✅
#    - Click collection → "View Documentation" → Cmd+P → Save as PDF ✅

# You now have both submission PDFs! 🎉
```

**Jump to:**
- 📥 [Detailed Setup Instructions](#-setup-instructions-one-time) (first-time users)
- 🏃 [Running Tests Guide](#-running-tests-for-submission-evidence) (step-by-step with screenshots)
- 🐛 [Troubleshooting](#-troubleshooting) (if tests fail)
- 🎓 [Submission Checklist](#-academic-submission-guide) (what to submit)

---

## 📦 Files

### **BreachLens.postman_collection.json**
Complete Postman collection with 87 requests covering all API functionality.

**Organized into folders:**
- 🔐 **Authentication** (8 requests → 8 endpoints)
- 📊 **Breaches** (40+ requests → 32 endpoints)
- 📈 **Analytics** (10 requests → 10 endpoints)
- 👤 **Users** (7 requests → 4 endpoints)
- 🛡️ **Admin** (9 requests → 6 endpoints)
- ❤️ **Health** (3 requests → 3 endpoints)

### **BreachLens.postman_environment.json**
Environment variables for local testing.

**Variables:**
- `base_url` - API base URL (default: http://localhost:5001/api/v1)
- `token` - JWT token (auto-updated via x-access-token header)
- `user_id` - Current user ID
- `breach_id` - Sample breach ID for testing

---

## 🚀 Quick Start

### **Prerequisites**
- ✅ Postman Desktop App installed (download from https://www.postman.com/downloads/)
- ✅ MongoDB running locally (`mongod` service)
- ✅ Python virtual environment activated
- ✅ Database seeded with test data (optional but recommended)

---

## 📥 Setup Instructions (One-time)

### **Step 1: Import Collection**

1. Open **Postman Desktop App**
2. Click **Import** button (top-left corner)
3. Click **Choose Files** or drag-and-drop
4. Navigate to: `/Users/ritiksah/BreachLens/backend/postman/`
5. Select **`BreachLens.postman_collection.json`**
6. Click **Open** → **Import**
7. ✅ You should see **"BreachLens API v1"** in the left sidebar under Collections

### **Step 2: Import Environment**

1. Click **Import** button again
2. Select **`BreachLens.postman_environment.json`**
3. Click **Import**
4. ✅ You should see **"BreachLens Local"** in the Environments list

### **Step 3: Activate Environment**

1. Look at the **top-right corner** of Postman
2. Find the **environment dropdown** (shows "No Environment" by default)
3. Click the dropdown
4. Select **"BreachLens Local"**
5. ✅ The dropdown should now show **"BreachLens Local"** as active

---

## 🏃 Running Tests (For Submission Evidence)

### **Step 1: Prepare the Backend**

Open a terminal and run:

```bash
# Navigate to backend directory
cd /Users/ritiksah/BreachLens/backend

# Activate virtual environment
source ../venv/bin/activate

# (Optional) Seed database with test data
python seed/seed_data.py --reset

# Start Flask API server
python run.py
```

**Expected output:**
```
 * Running on http://0.0.0.0:5001
 * Debug mode: on
```

✅ Keep this terminal window open while running Postman tests.

---

### **Step 2: Run Collection via Collection Runner**

1. In Postman sidebar, find **"BreachLens API v1"** collection
2. **Hover** over the collection name
3. Click the **three dots (⋯)** icon that appears
4. Select **"Run collection"**

**Alternative:** Right-click the collection → **Run collection**

---

### **Step 3: Configure Collection Runner**

The **Collection Runner** window has these options:

### **Step 4: Configure Collection Runner**

The **Collection Runner** window has these options:

#### **Run Order Tab:**
- ✅ **All 87 requests** checked by default
- ✅ All 11 folders enabled

#### **Configuration Options:**

| Setting | Recommended Value | Description |
|---------|------------------|-------------|
| **Iterations** | `1` | Number of times to run the entire collection |
| **Delay** | `100 ms` | Pause between requests (prevents rate limiting) |
| **Data file** | None | Not needed for this collection |
| **Persist responses** | ✅ Checked | Keeps full response data for review |
| **Keep variable values** | ✅ Checked | Maintains auth tokens between requests |
| **Run collection without using stored cookies** | ❌ Unchecked | Allow cookies |
| **Save responses** | ✅ Checked | For detailed debugging |

---

### **Step 4: Run the Collection**

1. Click the large **"Run BreachLens API v1"** button (bottom-right)
2. ⏳ Wait for tests to complete (~30-60 seconds for 87 requests)
3. Watch the progress bar and request count increment

**What you'll see:**
```
Running... 12/87 requests
✓ Login Admin
✓ Login Analyst
✓ Get All Breaches
...
```

---

### **Step 5: Review Results**

After completion, you'll see:

#### **Summary Tab:**
- ✅ **Total Requests**: 87
- ✅ **Tests Passed**: ~410-420 assertions
- ✅ **Tests Failed**: 0 ❌ (if any fail, see troubleshooting)
- ✅ **Average Response Time**: < 500ms (typical)

#### **Test Results Tab:**
- Shows each request with ✓ or ✗
- Expand failed requests to see assertion details

#### **Failed Tests Tab:**
- Shows only failed assertions (should be empty)

#### **Console Tab:**
- Detailed request/response logs
- Useful for debugging

---

### **Step 6: Generate Submission Evidence**

There are TWO pieces of evidence needed:

#### **A) Collection Runner Summary (PDF)**

1. Click **"View Summary"** button (top-right of results)
2. A new tab opens showing comprehensive results
3. In your browser, press **`Cmd + P`** (Mac) or **`Ctrl + P`** (Windows)
4. Select **"Save as PDF"**
5. Save as: **`BreachLens_Collection_Runner_Results.pdf`**

**What this PDF includes:**
- ✅ Total requests run
- ✅ Tests passed/failed counts
- ✅ Response times (average, min, max)
- ✅ All assertions with pass/fail status
- ✅ Timestamp of execution

---

#### **B) API Documentation (PDF)**

1. Go back to Postman main window
2. In the sidebar, click on **"BreachLens API v1"** collection (single-click)
3. The right panel shows collection details
4. Click **"View more actions (...)"** → **"View documentation"**

   **Alternative:** Click the **documentation icon** 📄 next to the collection name

5. A web browser opens showing the API documentation
6. Press **`Cmd + P`** (Mac) or **`Ctrl + P`** (Windows)
7. Select **"Save as PDF"**
8. Save as: **`BreachLens_API_Documentation.pdf`**

**What this PDF includes:**
- ✅ All 87 requests with descriptions
- ✅ Request/response schemas
- ✅ Authentication requirements
- ✅ Example requests (if you add saved examples)

---

### **Step 7: Add Saved Examples (Recommended for Better Documentation)**

To make your API documentation PDF more comprehensive:

1. **Manually run important requests** (Login, Create Breach, etc.)
2. After getting a successful response (200 OK), click **"Save Response"**
3. Click **"Save as Example"**
4. Name it descriptively (e.g., "Successful Admin Login")
5. Repeat for 5-10 key endpoints

**Why this matters:** Saved examples show actual request/response data in the documentation, making it much more professional for submission.

---

## 📊 Expected Test Results

### **Passing Criteria (With Seeded Users):**

| Metric | Expected Value |
|--------|---------------|
| **Total Requests** | 87 |
| **Requests Passed** | 87 (100%) |
| **Total Assertions** | ~410-420 |
| **Assertions Passed** | ~410-420 (100%) |
| **Average Response Time** | < 500ms |
| **Failed Tests** | 0 |

### **What Each Folder Tests:**

| Folder | Requests Run | Key Coverage |
|--------|----------|--------------|
| **Authentication** | 6 | Login (admin/analyst), logout, error cases |
| **Breaches** | 22 | Full CRUD, sub-documents, search, geospatial |
| **Analytics** | 10 | Aggregations, trends, severity breakdown |
| **Users** | 7 | User CRUD, profile, role changes |
| **Admin** | 6 | Stats, user management, system health |
| **Health** | 3 | Liveness, readiness probes |
| **TOTAL** | **87** | **63 unique endpoints covered** |

---

## 📋 Collection Structure

### **Folder: Authentication** (6 requests)

**1. Login**
```
POST /auth/login
Body: { email, password }
Tests:
  ✓ Status code is 200
  ✓ Token is returned
  ✓ Token auto-saved to environment
```

**2. Get Current User**
```
GET /auth/me
Headers: x-access-token: {{token}}
Tests:
  ✓ Status code is 200
  ✓ User profile returned
```

**3. Logout**
```
POST /auth/logout
Headers: x-access-token: {{token}}
Tests:
  ✓ Status code is 200
  ✓ Token blacklisted
```

---

### **Folder: Breaches** (22 requests)

**Core CRUD:**
- List Breaches (with pagination, filters, sorting)
- Get Single Breach
- Create Breach
- Update Breach (full + partial)
- Delete Breach
- Search Breaches
- Exposure Check

**Sub-documents (20 requests):**
- Affected Accounts: List, Add, Update, Delete, Get
- Timeline: List, Add, Update, Delete, Get
- Remediation: List, Add, Update, Delete, Get
- Monitoring Alerts: List, Add, Update, Delete, Get, Acknowledge

**Geospatial (3 requests):**
- Find Breaches Near Coordinates
- Find Breaches Within Bounds
- Get GeoJSON FeatureCollection

**Example Request:**
```
POST /breaches
Headers: x-access-token: {{token}}
Body: {
  "title": "Acme Corp Breach",
  "description": "SQL injection attack",
  "breach_date": "2025-01-15T08:00:00Z",
  "severity": "critical",
  "organisation": {
    "name": "Acme Corp",
    "domain": "acme.com"
  },
  "location": {
    "type": "Point",
    "coordinates": [-0.1278, 51.5074]
  }
}
Tests:
  ✓ Status code is 201
  ✓ Breach ID returned
  ✓ Breach saved to environment
```

---

### **Folder: Analytics** (10 requests)

**Aggregation Endpoints:**
- Risk by Industry
- Severity Breakdown
- Monthly Trend
- Top Organisations
- Data Types Frequency
- Remediation Rate
- Alert Acknowledgement
- Summary Stats

**Example Request:**
```
GET /analytics/risk-by-industry
Tests:
  ✓ Status code is 200
  ✓ Response is array
  ✓ Each item has industry, avg_risk_score, breach_count
```

---

### **Folder: Users** (7 requests)

**User Management:**
- List All Users (Admin)
- Get My Profile
- Update My Profile
- Change User Role (Admin)
- Activate User (Admin)
- Deactivate User (Admin)
- Delete User (Admin)

**Example Request:**
```
PATCH /users/{{user_id}}/role
Headers: x-access-token: {{admin_token}}
Body: { "role": "analyst" }
Tests:
  ✓ Status code is 200
  ✓ Role updated successfully
```

---

### **Folder: Admin** (6 requests)

**Admin Operations:**
- System Statistics
- User Management Dashboard
- Audit Logs
- Clear Cache
- Rebuild Indexes
- Detailed Health Check

**Example Request:**
```
GET /admin/stats
Headers: x-access-token: {{admin_token}}
Tests:
  ✓ Status code is 200
  ✓ Response has total_breaches, total_users
  ✓ Database size returned
```

---

### **Folder: Health** (3 requests)

**Health Checks:**
- Basic Health
- Readiness Check (DB)
- Liveness Check

**Example Request:**
```
GET /health/ready
Tests:
  ✓ Status code is 200
  ✓ Response has status: "healthy"
  ✓ Database connected: true
```

---

## 🧪 Running Tests

### **Using Postman Collection Runner**
1. Open Postman Desktop App
2. Click the three dots (⋯) next to the **BreachLens API v1** collection
3. Select **Run collection**
4. Configure run settings (iterations, delay, etc.)
5. Click **Run BreachLens API v1**
6. Review results summary

### **Running Specific Folder**
1. Expand the collection in the sidebar
2. Right-click a folder (e.g., **Authentication**)
3. Select **Run folder**

### **Generating Submission Evidence**
1. Run the full collection via Collection Runner
2. After completion, click **View Summary**
3. Print/save the summary page as **PDF**
4. This PDF serves as the **Collection Runner Evidence** for submission

---

## 🔐 Authentication Flow

### **Manual Token Setup**
1. Run "Login" request (uses seeded admin or analyst credentials)
2. `token` auto-saved to environment
3. All subsequent requests use `{{token}}`

### **Role-Based Testing**
```javascript
// Pre-request script to set role-specific token
if (pm.environment.get("test_role") === "admin") {
  pm.environment.set("access_token", pm.environment.get("admin_token"));
} else if (pm.environment.get("test_role") === "analyst") {
  pm.environment.set("access_token", pm.environment.get("analyst_token"));
}
```

---

## 📝 Writing New Tests

### **Example Request Structure**
```json
{
  "name": "Create Breach - Success",
  "request": {
    "method": "POST",
    "header": [
      {
        "key": "x-access-token",
        "value": "{{access_token}}"
      }
    ],
    "body": {
      "mode": "raw",
      "raw": "{ \"title\": \"Test Breach\" }"
    },
    "url": "{{base_url}}/breaches"
  },
  "event": [
    {
      "listen": "test",
      "script": {
        "exec": [
          "pm.test('Status code is 201', function () {",
          "  pm.response.to.have.status(201);",
          "});",
          "",
          "pm.test('Response has breach_id', function () {",
          "  var json = pm.response.json();",
          "  pm.expect(json).to.have.property('_id');",
          "  pm.environment.set('breach_id', json._id);",
          "});"
        ]
      }
    }
  ]
}
```

### **Common Test Patterns**
```javascript
// Status code
pm.test("Status code is 200", function () {
  pm.response.to.have.status(200);
});

// Response time
pm.test("Response time < 500ms", function () {
  pm.expect(pm.response.responseTime).to.be.below(500);
});

// JSON structure
pm.test("Response has required fields", function () {
  var json = pm.response.json();
  pm.expect(json).to.have.property("_id");
  pm.expect(json).to.have.property("title");
});

// Array length
pm.test("Response is array", function () {
  var json = pm.response.json();
  pm.expect(json).to.be.an("array");
  pm.expect(json.length).to.be.above(0);
});

// Save to environment
var json = pm.response.json();
pm.environment.set("breach_id", json._id);
```

---

## 🎯 Best Practices

### **1. Use Environment Variables**
```javascript
// Bad
url: "http://localhost:5001/api/v1/breaches"

// Good
url: "{{base_url}}/breaches"
```

### **2. Chain Requests**
```javascript
// In "Create Breach" test:
var json = pm.response.json();
pm.environment.set("breach_id", json._id);

// In "Get Breach" request:
url: "{{base_url}}/breaches/{{breach_id}}"
```

### **3. Test Negative Cases**
```
✓ Create Breach - Success (201)
✓ Create Breach - Missing Title (422)
✓ Create Breach - Invalid Email (422)
✓ Create Breach - Unauthorized (401)
✓ Create Breach - Forbidden (403)
```

### **4. Use Pre-request Scripts**
```javascript
// Generate dynamic data
pm.environment.set("timestamp", new Date().toISOString());
pm.environment.set("random_email", `test${Date.now()}@example.com`);
```

---

## 📈 Report Interpretation

### **Collection Runner Results**
1. **Summary** - Pass/fail overview, response times
2. **Failed Tests** - Detailed failure information
3. **All Requests** - Each request with status and timing
4. **Response Times** - Average and per-request latency

### **Success Criteria**
- ✅ All tests pass (100% pass rate)
- ✅ Average response time < 500ms
- ✅ No 5xx errors
- ✅ Authentication flow working

---

## 🐛 Troubleshooting

### **Issue: Collection Runner Shows Errors**

#### **Problem: "Could not get response" or Connection Refused**

**Cause:** Flask API server is not running.

**Solution:**
```bash
# Check if server is running
curl http://localhost:5001/health

# If no response, start the server:
cd backend
source ../venv/bin/activate
python run.py
```

#### **Problem: "401 Unauthorized" on most requests**

**Cause:** Authentication token not saved or expired.

**Solution:**
1. In Collection Runner results, check if **"Login"** request passed
2. Go back to Postman main window
3. Click **"BreachLens Local"** environment (top-right)
4. Click the **eye icon** 👁️ to view variables
5. Check if `access_token` has a value (long JWT string)
6. If missing, manually run **"Auth → Login"** first, then re-run collection

#### **Problem: "422 Validation Errors" on Create/Update requests**

**Cause:** Request body has invalid data.

**Solution:**
1. In Collection Runner, click the failed request
2. View the **Response** tab to see validation error details
3. Common issues:
   - Missing required fields
   - Invalid enum values (use: `low`, `medium`, `high`, `critical`)
   - Invalid date formats (use ISO 8601: `2026-03-05T00:00:00Z`)
   - Invalid email format

#### **Problem: Some tests pass, some fail randomly**

**Cause:** Database state issues or race conditions.

**Solution:**
```bash
# Reset database with fresh seed data
cd backend
python seed/seed_data.py --reset

# Re-run collection with longer delay
# In Collection Runner: Set Delay to 200ms or 300ms
```

#### **Problem: "ECONNRESET" or "socket hang up"**

**Cause:** Server crashed or timeout.

**Solution:**
1. Check the terminal running Flask for error traces
2. Increase Postman timeout: **Settings → Request timeout → 30000ms**
3. Restart Flask server

#### **Problem: Tests fail but manual requests work**

**Cause:** Test scripts have incorrect assertions.

**Solution:**
1. Review the **Test Results** tab
2. Look for which assertion failed (e.g., "Status code is 200")
3. Check if the actual response matches expectations
4. Verify environment variables are set correctly

---

### **Common Environment Variable Issues**

| Variable | Expected Value | How to Fix |
|----------|---------------|------------|
| `base_url` | `http://localhost:5001/api/v1` | Click environment → Edit |
| `access_token` | Long JWT string | Run "Login" request manually |
| `breach_id` | Valid ObjectId | Created by "Create Breach" request |
| `user_id` | Valid ObjectId | Set by "GET List Users" request |

---

### **Verification Checklist Before Running**

- [ ] MongoDB is running (`mongosh` connects successfully)
- [ ] Database is seeded (`python seed/seed_data.py --reset`)
- [ ] Flask server is running (`http://localhost:5001/health` returns 200)
- [ ] "BreachLens Local" environment is active (top-right dropdown)
- [ ] All 87 requests are checked in Collection Runner
- [ ] Delay is set to 100ms minimum

---

## 🎓 Academic Submission Guide

### **Required Evidence Files**

| File | Description | How to Generate |
|------|-------------|----------------|
| **Collection Runner PDF** | Test execution results | Run collection → View Summary → Save as PDF |
| **API Documentation PDF** | All endpoints documented | Collection → View Documentation → Save as PDF |
| **Collection JSON** | BreachLens.postman_collection.json | Already in repo |
| **Environment JSON** | BreachLens.postman_environment.json | Already in repo |

---

### **Step-by-Step: Generating Collection Runner PDF**

1. **Run Collection** (as described above in "Running Tests" section)
2. Wait for all 87 requests to complete
3. Click **"View Summary"** button (top-right of results window)
4. A new browser tab opens with comprehensive summary
5. Press **`Cmd + P`** (Mac) or **`Ctrl + P`** (Windows)
6. **Print dialog opens:**
   - Destination: **Save as PDF**
   - Layout: **Portrait**
   - Paper size: **A4** or **Letter**
   - Margins: **Default**
   - Options: ✅ **Background graphics** (shows colors)
7. Click **Save**
8. Save as: **`BreachLens_Collection_Runner_Results.pdf`**

**What this PDF includes:**
- ✅ Execution timestamp
- ✅ Total requests: 87
- ✅ Total tests passed: ~410-420
- ✅ Average response time
- ✅ Individual request results with assertions
- ✅ Failed tests (if any) with error details

---

### **Step-by-Step: Generating API Documentation PDF**

1. In Postman sidebar, **single-click** on **"BreachLens API v1"** collection
2. Right panel shows collection overview
3. Click the **"..."** (three dots) → **"View documentation"**

   **Alternative:** Use the keyboard shortcut **`Cmd + Alt + D`**

4. Browser opens showing **Postman Documentation** web page
5. Press **`Cmd + P`** (Mac) or **`Ctrl + P`** (Windows)
6. **Print dialog opens:**
   - Destination: **Save as PDF**
   - Layout: **Portrait**
   - Paper size: **A4**
   - Margins: **Minimal**
   - Scale: **90-95%** (fits better)
7. Click **Save**
8. Save as: **`BreachLens_API_Documentation.pdf`**

**What this PDF includes:**
- ✅ All 87 endpoints with full descriptions
- ✅ Request/response schemas
- ✅ Authentication requirements per endpoint
- ✅ Example requests (if you saved examples)
- ✅ Headers and query parameters documented

---

### **Pro Tip: Add Saved Examples for Better Documentation**

To make your API Documentation PDF more impressive:

1. **For each major endpoint** (Login, Create Breach, Get Analytics):
   - Click the request in sidebar
   - Click **"Send"** to execute it
   - After getting 200 OK response, click **"Save Response"**
   - Select **"Save as Example"**
   - Give it a descriptive name: `"Successful Admin Login"`, `"Create Critical Breach"`, etc.

2. **Recommended examples to save** (saves time, adds professionalism):
   - `POST /auth/login` → "Admin Login Success"
   - `POST /breaches` → "Create Critical Breach"
   - `GET /breaches` → "List All Breaches"
   - `GET /analytics/severity-breakdown` → "Severity Statistics"
   - `GET /admin/stats` → "System Statistics"

3. **After adding examples**, re-generate the documentation PDF — it will now show actual request/response data!

---

### **Final Submission Checklist**

**Files to include in submission:**

```
postman/
├── BreachLens.postman_collection.json       ✅ 87 requests with test scripts
├── BreachLens.postman_environment.json      ✅ Environment variables configured
└── README.md                                ✅ This documentation

evidence/ (or submission folder)
├── BreachLens_Collection_Runner_Results.pdf ✅ Test execution results
└── BreachLens_API_Documentation.pdf         ✅ API documentation
```

**Verification before submission:**

- [ ] Collection Runner PDF shows **87 requests executed**
- [ ] Collection Runner PDF shows **~410-420 tests passed, 0 failed**
- [ ] Collection Runner PDF has **timestamp visible**
- [ ] API Documentation PDF shows **all 87 requests**
- [ ] API Documentation PDF includes **authentication section**
- [ ] Collection JSON file is included
- [ ] Environment JSON file is included

---

### **Expected Results Summary**

**For your submission report, cite these numbers:**

| Metric | Value |
|--------|-------|
| **Total API Endpoints** | 64 |
| **Postman Collection Requests** | 87 |
| **Test Assertions** | ~410-420 |
| **Success Rate** | 100% (all executed tests passing) |
| **Average Response Time** | < 500ms |
| **Authentication** | JWT-based with 3-tier RBAC (seeded users) |
| **CRUD Operations** | Full CRUD on breaches + 4 sub-document types |
| **Aggregations** | 10 analytics pipelines |
| **Geospatial Queries** | Location-based breach search |

---

## 📚 Additional Resources

- **Backend README**: [../README.md](../README.md) - Complete API specification, authentication guide, and testing strategy
- **Testing Guide**: [../tests/README.md](../tests/README.md) - Comprehensive test documentation
- **Seeding Guide**: [../seed/README.md](../seed/README.md) - Database setup and data generation
- **Test Suite**: [../tests/README.md](../tests/README.md)
- **Postman Learning Center**: https://learning.postman.com/

---

## 📞 Support

**Common Questions:**

**Q: How long does the full collection take to run?**
A: 30-60 seconds for all 87 requests (depends on your machine).

**Q: Can I run specific folders only?**
A: Yes! Right-click any folder (e.g., "Authentication") → Run folder.

**Q: What if I don't have MongoDB installed?**
A: Install via Homebrew: `brew install mongodb-community` then `brew services start mongodb-community`

**Q: Can I use MongoDB Atlas instead of local?**
A: Yes! Update `MONGO_URI` in `.env` to your Atlas connection string.

**Q: How do I add more test assertions?**
A: Click any request → **Tests** tab → Add JavaScript test scripts using `pm.test()`.

---

**Documentation Version**: 1.0
**Last Updated**: March 2026
**Collection Status**: ✅ Production-ready
**Total Requests**: 87
**Test Coverage**: ~410-420 assertions
