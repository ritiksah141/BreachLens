# BreachLens Postman Collection

[![Postman Tests](https://img.shields.io/badge/Postman-69%20requests-blue.svg)](BreachLens.postman_collection.json)
[![API Version](https://img.shields.io/badge/API-v2.0-green.svg)](../README.md#-api-endpoints-68-total)

**Comprehensive API test collection for all 68 endpoints.**

> **Note:** The collection contains **69 requests** with **115+ test assertions** covering all major API functionality including success cases, validation errors, and permission checks.

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
#    - Wait ~30 seconds (69 requests)
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
Complete Postman collection with 69 requests and 115+ test assertions covering all API functionality.

**Organized into folders:**
- 🔐 **1 - Auth** (5 requests)
- 📊 **2 - Breaches CRUD** (18 requests)
- 📋 **3 - Affected Accounts** (6 requests)
- 📅 **4 - Timeline** (4 requests)
- 🔧 **5 - Remediation** (4 requests)
- 🔔 **6 - Monitoring Alerts** (4 requests)
- 🌍 **7 - Geospatial** (4 requests)
- 📈 **8 - Analytics** (9 requests)
- 🔍 **9 - Exposure Check** (4 requests)
- 👤 **10 - Users** (5 requests)
- 🛡️ **11 - Admin** (6 requests)

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

#### **Run Order Tab:**
- ✅ **All 69 requests** checked by default
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
2. ⏳ Wait for tests to complete (~20-30 seconds for 69 requests)
3. Watch the progress bar and request count increment

**What you'll see:**
```
Running... 12/69 requests
✓ Login Admin
✓ Login Analyst
✓ Get All Breaches
...
```

---

### **Step 5: Review Results**

After completion, you'll see:

#### **Summary Tab:**
- ✅ **Total Requests**: 69
- ✅ **Tests Passed**: ~115 assertions
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
- ✅ All 69 requests with descriptions
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
| **Total Requests** | 69 |
| **Requests Passed** | 69 (100%) |
| **Total Assertions** | ~115 |
| **Assertions Passed** | ~115 (100%) |
| **Average Response Time** | < 500ms |
| **Failed Tests** | 0 |

### **What Each Folder Tests:**

| Folder | Requests Run | Key Coverage |
|--------|----------|--------------|
| **1 - Auth** | 5 | Login, token validation, error cases |
| **2 - Breaches CRUD** | 18 | Full CRUD, advanced search, pagination, RBAC |
| **3 - Affected Accounts** | 6 | Sub-document CRUD |
| **4 - Timeline** | 4 | Event tracking CRUD |
| **5 - Remediation** | 4 | Action tracking CRUD |
| **6 - Monitoring Alerts** | 4 | Alert management CRUD |
| **7 - Geospatial** | 4 | Location queries, GeoJSON |
| **8 - Analytics** | 9 | Aggregations, trends, risk scores, surface profiles |
| **9 - Exposure Check** | 4 | Email/domain lookup |
| **10 - Users** | 5 | User management, profile, roles |
| **11 - Admin** | 6 | System stats, user admin, bulk operations |
| **TOTAL** | **69** | **115+ test assertions** |

---

## 📋 Collection Structure

### **Folder: Authentication** (5 requests)

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

### **Folder: Breaches** (18 requests)

**Core CRUD & Tactical:**
- List Breaches (with pagination, filters, search)
- Advanced Search (multi-criteria)
- Filter Options (UI helpers)
- Subdocument Query (pattern matching)
- Get Single Breach
- Create Breach
- Update Breach (full + partial)
- Delete Breach
- Bulk Import
- Bulk Delete

**Sub-documents (14 requests):**
- Affected Accounts: List, Add, Update, Delete, Get
- Timeline: List, Add, Update, Delete
- Remediation: List, Add, Update, Delete
- Monitoring Alerts: List, Add, Acknowledge, Delete

**Geospatial (4 requests):**
- Find Breaches Near Coordinates
- Find Breaches Within Bounds
- Get GeoJSON FeatureCollection
- Missing Parameters validation

---

### **Folder: Analytics** (9 requests)

**Aggregation Endpoints:**
- Risk by Industry
- Severity Breakdown
- Monthly Trend
- Top Organisations
- Industry-Year Trends
- Risk Score Distribution
- Attack Surface Profile
- Remediation Rate
- Summary KPIs

---

### **Folder: Users** (5 requests)

**User Management:**
- List All Users (Admin)
- Get My Profile
- Update My Profile
- Change User Role (Admin)
- Delete User (Admin)

---

### **Folder: Admin** (6 requests)

**Admin Operations:**
- System Statistics
- User Management Dashboard
- Force User Activation/Deactivation
- Change User Role
- Admin Bulk Breach Purge
- Audit Trail Listing

---

### **Folder: Health** (3 requests)

**Health Checks:**
- Basic Health
- Readiness Check (DB + Config)
- Liveness Check
- Service Info Metadata

---

## 🧪 Testing Tests

### **Using Postman Collection Runner**
1. Open Postman Desktop App
2. Click the three dots (⋯) next to the **BreachLens API v1** collection
3. Select **Run collection**
4. Configure run settings (iterations, delay, etc.)
5. Click **Run BreachLens API v1**
6. Review results summary

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

### **Expected Results Summary**

**For your submission report, cite these numbers:**

| Metric | Value |
|--------|-------|
| **Total API Endpoints** | 68 |
| **Postman Collection Requests** | 69 |
| **Test Assertions** | ~115 |
| **Success Rate** | 100% (all executed tests passing) |
| **Average Response Time** | < 500ms |
| **Authentication** | JWT-based with 3-tier RBAC (seeded users) |
| **CRUD Operations** | Full CRUD on breaches + 4 sub-document types |
| **Aggregations** | 11 analytics pipelines |
| **Geospatial Queries** | Location-based breach search |

---

## 📚 Additional Resources

- **Backend README**: [../README.md](../README.md) - Complete API specification
- **Testing Guide**: [../tests/README.md](../tests/README.md) - pytest documentation
- **Seeding Guide**: [../seed/README.md](../seed/README.md) - Database setup

---

**Documentation Version**: 2.0
**Last Updated**: April 2026
**Collection Status**: ✅ Production-ready
**Total Requests**: 69
**Test Coverage**: ~115+ assertions
