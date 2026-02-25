# BreachLens Postman Collection

[![Newman Tests](https://img.shields.io/badge/Newman-87%2B%20requests-blue.svg)](BreachLens.postman_collection.json)
[![API Version](https://img.shields.io/badge/API-v1.0-green.svg)](../../docs/API_SPEC.md)

**Comprehensive API test collection for all 51 endpoints.**

---

## 📦 Files

### **BreachLens.postman_collection.json**
Complete Postman collection with 87+ requests covering all API functionality.

**Organized into folders:**
- 🔐 **Authentication** (5 requests)
- 📊 **Breaches** (22 requests)
- 📈 **Analytics** (10 requests)
- 👤 **Users** (7 requests)
- 🛡️ **Admin** (6 requests)
- ❤️ **Health** (3 requests)

### **BreachLens.postman_environment.json**
Environment variables for local/staging/production testing.

**Variables:**
- `base_url` - API base URL (default: http://localhost:5001/api/v1)
- `access_token` - JWT access token (auto-updated)
- `refresh_token` - JWT refresh token (auto-updated)
- `user_id` - Current user ID
- `breach_id` - Sample breach ID for testing

---

## 🚀 Quick Start

### **Option 1: Postman Desktop App**

1. **Import Collection**
   ```
   File → Import → Select BreachLens.postman_collection.json
   ```

2. **Import Environment**
   ```
   File → Import → Select BreachLens.postman_environment.json
   ```

3. **Select Environment**
   ```
   Top-right dropdown → Select "BreachLens Local"
   ```

4. **Start API**
   ```bash
   cd backend
   source ../venv/bin/activate
   python run.py
   ```

5. **Run Collection**
   ```
   Collections → BreachLens → Run
   ```

---

### **Option 2: Newman CLI (Automated)**

**Quick Run:**
```bash
# From backend directory
./generate_newman_report.sh
```

**Manual Newman Run:**
```bash
# Install Newman + HTML reporter
npm install -g newman newman-reporter-htmlextra

# Run collection
newman run postman/BreachLens.postman_collection.json \
  -e postman/BreachLens.postman_environment.json \
  -r cli,htmlextra \
  --reporter-htmlextra-export ../evidence/backend/newman-report.html

# Open report
open ../evidence/backend/newman-report.html
```

---

## 📋 Collection Structure

### **Folder: Authentication** (5 requests)

**1. Register New User**
```
POST /auth/register
Body: { email, username, password, role }
Tests:
  ✓ Status code is 201
  ✓ Response has user object
  ✓ User ID is returned
```

**2. Login**
```
POST /auth/login
Body: { email, password }
Tests:
  ✓ Status code is 200
  ✓ Access token is returned
  ✓ Refresh token is returned
  ✓ Token auto-saved to environment
```

**3. Get Current User**
```
GET /auth/me
Headers: Authorization: Bearer {{access_token}}
Tests:
  ✓ Status code is 200
  ✓ User profile returned
```

**4. Refresh Token**
```
POST /auth/refresh
Headers: Authorization: Bearer {{refresh_token}}
Tests:
  ✓ Status code is 200
  ✓ New access token returned
```

**5. Logout**
```
POST /auth/logout
Headers: Authorization: Bearer {{access_token}}
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
Headers: Authorization: Bearer {{access_token}}
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
Headers: Authorization: Bearer {{admin_token}}
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
Headers: Authorization: Bearer {{admin_token}}
Tests:
  ✓ Status code is 200
  ✓ Response has total_breaches, total_users
  ✓ Database size returned
```

---

### **Folder: Health** (3 requests)

**Health Checks:**
- Basic Health
- Readiness Check (DB + Redis)
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

### **Run All Tests**
```bash
newman run postman/BreachLens.postman_collection.json \
  -e postman/BreachLens.postman_environment.json
```

### **Run Specific Folder**
```bash
newman run postman/BreachLens.postman_collection.json \
  -e postman/BreachLens.postman_environment.json \
  --folder "Authentication"
```

### **Run With Delay**
```bash
newman run postman/BreachLens.postman_collection.json \
  -e postman/BreachLens.postman_environment.json \
  --delay-request 500  # 500ms between requests
```

### **Run With Verbose Output**
```bash
newman run postman/BreachLens.postman_collection.json \
  -e postman/BreachLens.postman_environment.json \
  --verbose
```

---

## 📊 Automated Report Generation

### **Use Provided Script**
```bash
# From backend directory
./generate_newman_report.sh
```

**What it does:**
1. ✅ Checks Newman and htmlextra reporter installed
2. ✅ Validates MongoDB connection
3. ✅ Seeds test data if needed
4. ✅ Starts Flask API (if not running)
5. ✅ Runs Newman collection
6. ✅ Generates HTML report with charts
7. ✅ Saves to `evidence/backend/newman-report.html`

**Script Output:**
```
🚀 Starting Newman API Test Report Generation...
✅ Newman installed
✅ htmlextra reporter installed
✅ MongoDB connection successful
✅ Flask API running on port 5001
🧪 Running Newman tests...
✅ Newman report generated: evidence/backend/newman-report.html
```

---

## 🔐 Authentication Flow

### **Manual Token Setup**
1. Run "Register New User" request
2. Run "Login" request
3. `access_token` and `refresh_token` auto-saved to environment
4. All subsequent requests use `{{access_token}}`

### **Token Refresh**
When access token expires (1 hour):
1. Run "Refresh Token" request
2. New access token auto-saved
3. Continue testing

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
        "key": "Authorization",
        "value": "Bearer {{access_token}}"
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

### **Newman HTML Report Sections**
1. **Summary** - Pass/fail overview, response times
2. **Failed Tests** - Detailed failure information
3. **Skipped Tests** - Tests not run
4. **Requests** - All requests with timing
5. **Environment** - Variables used

### **Success Criteria**
- ✅ All tests pass (100% pass rate)
- ✅ Average response time < 500ms
- ✅ No 5xx errors
- ✅ Authentication flow working

---

## 🐛 Troubleshooting

### **Issue: Connection Refused**
```bash
# Ensure API is running:
curl http://localhost:5001/health

# Start API:
cd backend
python run.py
```

### **Issue: 401 Unauthorized**
```bash
# Refresh tokens:
1. Run "Login" request
2. Check {{access_token}} saved to environment
3. Retry failed request
```

### **Issue: 422 Validation Errors**
```bash
# Check request body:
1. Ensure all required fields present
2. Validate data types (string, number, date)
3. Check enum values (severity, status, etc.)
```

### **Issue: Newman Not Found**
```bash
# Install Newman globally:
npm install -g newman newman-reporter-htmlextra

# Or use npx:
npx newman run postman/BreachLens.postman_collection.json
```

---

## 🎓 Academic Submission

### **Required Evidence**
1. ✅ Postman collection file (BreachLens.postman_collection.json)
2. ✅ Environment file (BreachLens.postman_environment.json)
3. ✅ Newman HTML report (evidence/backend/newman-report.html)

### **Generating Report for Submission**
```bash
cd backend
./generate_newman_report.sh
# Report saved to: evidence/backend/newman-report.html
```

### **What to Submit**
```
postman/
├── BreachLens.postman_collection.json  ✅ Include
├── BreachLens.postman_environment.json ✅ Include
└── README.md                           ✅ Include

evidence/backend/
└── newman-report.html                  ✅ Include
```

---

## 📚 Additional Resources

- **API Documentation**: [../../docs/API_SPEC.md](../../docs/API_SPEC.md)
- **Backend Setup**: [../README.md](../README.md)
- **Testing Strategy**: [../../docs/QA_STRATEGY.md](../../docs/QA_STRATEGY.md)
- **Postman Learning**: https://learning.postman.com/
- **Newman Documentation**: https://www.npmjs.com/package/newman

---

**Collection Version**: 1.0
**Total Requests**: 87+
**Status**: ✅ Ready for submission
