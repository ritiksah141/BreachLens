# BreachLens COM661 Submission Priority Guide

## ✅ REQUIRED - Do This Now

### Newman HTML Report (5-10 minutes)
**Why:** Mandatory submission artifact per QA_STRATEGY.md §14.1
**Status:** Newman installed, API needs to be running

**Steps:**
```bash
# Terminal 1: Start API
cd backend
source ../venv/bin/activate
python run.py

# Terminal 2: Generate report
newman run backend/postman/BreachLens.postman_collection.json \
  --environment backend/postman/BreachLens.postman_environment.json \
  --reporters htmlextra \
  --reporter-htmlextra-export evidence/backend/newman-report.html
```

**Evidence Location:** `evidence/backend/newman-report.html`

---

## ❌ NOT NEEDED for Academic Submission

All items from IMPLEMENTATION_SUMMARY.md "Next Steps" are **optional production features**, NOT submission requirements:

| Feature | Category | Why Not Needed |
|---------|----------|----------------|
| Sentry Error Tracking | Production Observability | Not in QA_STRATEGY.md §14 submission checklist |
| Structured JSON Logging | Production Observability | PRD §7 only requires request logging (already done ✅) |
| Prometheus Metrics | Production Monitoring | Not in PRD §7 or submission requirements |
| Enhanced Health Checks | Production Deployment | Not in PRD §7 or QA_STRATEGY.md §14 |
| Performance Test Suite | Load Testing | QA_STRATEGY.md §14 only requires Newman/pytest/Karma/Cypress |
| MongoDB Connection Pooling | Performance Optimization | Not in submission requirements |
| Query Optimization | Performance | PRD §7.2 requires indexes (done ✅), not automated tests |

---

## 📊 Current Submission Readiness

### Backend Evidence 🔄
- [x] Pytest coverage reports (48%, 70%+ critical modules)
- [x] Security test suite (40 tests, 100% pass rate)
- [x] All 10 critical security features implemented
- [x] Comprehensive documentation (7,500+ lines, 12 files)
- [x] Professional README files (7 total)
- [ ] **Newman HTML report** ← ONLY REMAINING ITEM

### What You Already Have
All COM661 requirements from PRD §8 are met:
- ✅ Database complexity exceeds demonstration (4 sub-document arrays, 2dsphere, 8 aggregation pipelines)
- ✅ Complex queries ($near, $unwind, $lookup, $group, $project, $sort)
- ✅ Strict RESTful API (noun-based URIs, correct verbs, all 9 status codes)
- ✅ Full CRUD + Sub-document CRUD
- ✅ Robust validation (type, range, enum, email, URL, GeoJSON)
- ✅ JWT + RBAC (Admin/Analyst/Guest)
- ✅ Centralized error handling
- ✅ Automated testing (pytest 104 unit tests, 100% passing)
- ✅ Professional documentation (6 core docs + 6 README files = 7,500+ lines)

---

## 🎯 Final Recommendation

**Do this for submission:**
1. Generate Newman HTML report (10 minutes with running API)
2. Add Postman screenshots per QA_STRATEGY.md §14.2:
   - Collection structure in Postman UI
   - Collection Runner showing all green

**Skip for academic submission:**
- All infrastructure/monitoring features (Sentry, Prometheus, structured logging)
- Performance test suite
- Database optimization (connection pooling, query optimization)
- Enhanced health checks

**Reason:** These are production-grade enhancements, not grading requirements. Your submission already exceeds the COM661 rubric for a high first without them.

---

## 🚀 Production Deployment Priorities

If you plan to deploy BreachLens to production (after submission), here's the priority order:

### High Priority (Do Before Launch) - 6-8 hours

#### 1. Enhanced Health Checks (1 hour) ⭐
**Why Critical:** Required for load balancers (AWS ELB, Nginx) and container orchestration (Kubernetes, Docker Swarm)
```python
# /health/ready endpoint checks:
# - MongoDB connection alive
# - Redis connection alive (if used)
# - Disk space available
# - Memory usage acceptable
```

#### 2. Structured JSON Logging (2 hours) ⭐
**Why Critical:**
- CloudWatch/Datadog/Splunk require JSON format
- Enables log aggregation and searching
- Essential for debugging production issues
```python
# Output format:
{"timestamp": "2026-02-26T10:00:00Z", "level": "ERROR", "message": "...", "request_id": "abc123"}
```

#### 3. MongoDB Connection Pooling (1 hour) ⭐
**Why Critical:** Prevents connection exhaustion under load
```python
# PyMongo already pools by default, but verify:
app.config["MONGO_MAX_POOL_SIZE"] = 50
app.config["MONGO_MIN_POOL_SIZE"] = 10
```

#### 4. Sentry Error Tracking (1 hour) ⭐
**Why Critical:**
- Real-time error alerts via email/Slack
- Stack traces with user context
- Error grouping and trend analysis
```bash
# Environment variable:
SENTRY_DSN=https://your-project@sentry.io/123456
```

#### 5. Query Optimization (2-3 hours) ⭐
**Why Critical:** Ensure analytics endpoints perform under load
```python
# Validate with explain():
db.breaches.find(...).explain("executionStats")
# Look for: IXSCAN (good) vs COLLSCAN (bad)
```

### Medium Priority (First Week) - 4-6 hours

#### 6. Prometheus Metrics (2-3 hours)
**Why Useful:**
- Monitor request rates, errors, latency
- Alert on anomalies (Grafana/AlertManager)
- Track business metrics (breach creation rate)

#### 7. Request ID Tracking (1 hour)
**Why Useful:** Trace requests across microservices/logs
```python
# Add to request_logging.py:
request_id = str(uuid.uuid4())
g.request_id = request_id
```

### Low Priority (Post-Launch) - 4-5 hours

#### 8. Performance Test Suite (2-3 hours)
**Why Useful:** Validate system handles expected load before Black Friday / major events

#### 9. Response Caching (2 hours)
**Why Useful:** Reduce database load for frequently accessed data (analytics dashboards)

---

## 📦 Production Deployment Checklist

### Environment Configuration
```bash
# Required for production:
export FLASK_ENV=production
export MONGO_URI=mongodb+srv://prod-cluster...
export JWT_SECRET_KEY=$(openssl rand -hex 32)
export PASSWORD_RESET_SECRET=$(openssl rand -hex 32)
export REDIS_URL=redis://prod-redis:6379/0
export EMAIL_BACKEND=smtp  # or sendgrid/ses
export SMTP_HOST=smtp.gmail.com
export SMTP_PORT=587
export SMTP_USERNAME=your-email@domain.com
export SMTP_PASSWORD=app-password
export SENTRY_DSN=https://...
export FRONTEND_URL=https://breachlens.com
```

### Infrastructure Setup
1. **Database:** MongoDB Atlas (M10+ cluster)
2. **Cache:** Redis (AWS ElastiCache or Redis Cloud)
3. **Hosting:**
   - AWS EC2/ECS/Fargate
   - Heroku (easiest for MVP)
   - DigitalOcean App Platform
   - Google Cloud Run
4. **Load Balancer:** AWS ALB or Nginx (with health check on `/health/ready`)
5. **CDN:** CloudFront or Cloudflare (for static assets)
6. **Email:** SendGrid, AWS SES, or Mailgun

### Security Hardening
- [x] HTTPS enforced (let's encrypt or AWS ACM)
- [x] CORS configured for production frontend domain
- [x] Rate limiting enabled with Redis backend
- [x] Security headers configured
- [x] JWT secrets rotated from defaults
- [ ] Database backups scheduled (MongoDB Atlas automated backups)
- [ ] Secrets stored in AWS Secrets Manager / HashiCorp Vault
- [ ] API behind rate-limiting WAF (CloudFlare / AWS WAF)

### Monitoring & Alerting
- [ ] Sentry configured with Slack/email alerts
- [ ] Prometheus + Grafana dashboards
- [ ] CloudWatch alarms for:
  - High error rate (> 1%)
  - Slow response time (p95 > 500ms)
  - Database connection pool exhaustion
  - High memory usage (> 80%)

---

## ⏱️ Time Investment Summary

| Phase | Academic Submission | Production Deployment |
|-------|-------------------|----------------------|
| **Current State** | ✅ Complete (except Newman report) | ⚠️ Needs hardening |
| **Time to Submit** | 10 minutes | N/A |
| **Time to Production** | N/A | 6-8 hours (high priority items) |
| **Total Optional Features** | 0 hours (all done!) | 10-14 hours (all items) |

---

## 📚 Additional Resources

- **Complete Validation Guide**: [../SUBMISSION_CHECKLIST.md](../SUBMISSION_CHECKLIST.md) - Step-by-step localhost testing
- **Backend Setup**: [../backend/README.md](../backend/README.md) - API setup and configuration
- **Testing Guide**: [../backend/tests/README.md](../backend/tests/README.md) - All 104 tests documented
- **Documentation Index**: [README.md](README.md) - All 6 core documents explained

---

**Generated:** 27 February 2026
**Based on:** docs/PRD.md §7-8, docs/QA_STRATEGY.md §14, production best practices
**Status**: 99% ready for submission (just Newman report remaining)
