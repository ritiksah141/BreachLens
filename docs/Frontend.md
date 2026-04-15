# BreachLens Frontend Follow-Up Runbook

Last updated: 2026-04-15
Scope: Frontend implementation follow-up for CW2, aligned with the upgraded backend
Goal: No missed feature, no missed evidence, no API mismatch

---

## 0. Current Status Snapshot (2026-04-15)

Validated today:
- Frontend unit tests: `27/27` passing (`npm run test -- --watch=false --browsers=ChromeHeadless`)
- Frontend production build: successful (`npm run build`)
- Advanced endpoint integrations are implemented and wired in UI:
  - Advanced search + filter options
  - Subdocument query and facets
  - Dashboard attack-surface profile
  - Admin advanced filtering flow

Strict 90% gate for frontend submission:
- [x] Build green
- [x] Unit tests green
- [x] Core advanced flows implemented
- [ ] Screenshot/video evidence pack captured and stored in `submission/`
- [ ] Mobile responsive proof captured (key pages)
- [ ] Accessibility smoke evidence captured (keyboard/focus/form labels)

Use `docs/CW2_90_EVIDENCE_MATRIX.md` as the source of truth for final grade-readiness claims.

---

## 1. Current Baseline

Frontend codebase already includes:
- Auth flows and guards
- Breach list/detail/map pages
- Admin feature shell
- Core services for breaches, analytics, admin, user

Reference files:
- `frontend/src/app/core/services/breach.service.ts`
- `frontend/src/app/core/services/analytics.service.ts`
- `frontend/src/app/core/services/admin.service.ts`
- `frontend/src/app/app.routes.ts`

Backend recently added (must be consumed by frontend next):
- `GET /api/v1/breaches/advanced-search`
- `GET /api/v1/breaches/filter-options`
- `GET /api/v1/breaches/subdocuments/query`
- `GET /api/v1/analytics/attack-surface-profile`

---

## 2. Frontend Delivery Plan (No-Gap)

### Phase A — API Contract Alignment (Mandatory First)

- [ ] Add typed interfaces for newly added backend responses:
  - Advanced search response meta/facets
  - Filter options payload
  - Subdocument query payload and facet shape
  - Attack surface profile payload
- [ ] Extend services to include new methods:
  - `BreachService.getAdvancedSearch(...)`
  - `BreachService.getFilterOptions()`
  - `BreachService.querySubdocuments(...)`
  - `AnalyticsService.getAttackSurfaceProfile(...)`
- [ ] Ensure all query parameter names match backend exactly.
- [ ] Replace any direct `fetch()` calls with Angular service methods.

Definition of done:
- No `any` in new API responses.
- All new endpoints callable from service layer.

### Phase B — Search & Filtering UX

- [ ] Build filter state model driven by `filter-options` endpoint.
- [ ] Add advanced search panel to breach list page:
  - Severity/status/industry multi-select
  - Risk and records range inputs
  - Date range
  - Data types selector
  - Include facets toggle
- [ ] Render backend-returned facets in UI for immediate insight.
- [ ] Persist filter state in URL query params for shareable views.

Definition of done:
- User can refresh page and keep active filters.
- Filter controls populate dynamically from backend values.

### Phase C — Subdocument Intelligence UI

- [ ] Add a dedicated “Subdocument Query” panel/tab (analyst/admin only).
- [ ] Support complex nested filters:
  - Timeline event types/date window
  - Remediation statuses
  - Alert severities/acknowledged state
  - Account notified flag and exposed data type
- [ ] Show result cards with per-breach subdocument counts.
- [ ] Show facets chart/list from `meta.facets`.

Definition of done:
- Analysts/admins can run nested queries without manual API testing.

### Phase D — Analytics Expansion

- [ ] Add attack-surface profile view/cards in dashboard.
- [ ] Add missing charts if not present:
  - Top organisations
  - Alert acknowledgement
  - Industry-year trend
  - Risk score distribution
  - Remediation rate
- [ ] Add year/filter controls where relevant.

Definition of done:
- Dashboard demonstrates broad coverage of backend analytics endpoints.

### Phase E — Admin & Operations Completeness

- [ ] Ensure admin page includes:
  - System stats
  - User list
  - Role updates
  - Activate/deactivate actions
  - Audit logs view (if in scope)
- [ ] Add bulk breach action UX (import/delete) with role guard.

Definition of done:
- Admin workflows work end-to-end with clear success/error feedback.

---

## 3. Backend-to-Frontend Mapping (Must Implement)

| Backend Endpoint | Frontend Service Method | Primary UI Location |
|---|---|---|
| `/api/v1/breaches` | `getBreaches` | Breach list |
| `/api/v1/breaches/advanced-search` | `getAdvancedSearch` | Breach list advanced panel |
| `/api/v1/breaches/filter-options` | `getFilterOptions` | Breach list filter controls |
| `/api/v1/breaches/subdocuments/query` | `querySubdocuments` | Breach detail intelligence tab / analytics panel |
| `/api/v1/breaches/geo/geojson` | `getGeoJson` | Map view |
| `/api/v1/breaches/geo/near` | `getNear` | Map proximity search |
| `/api/v1/analytics/summary` | `getSummary` | Dashboard header cards |
| `/api/v1/analytics/attack-surface-profile` | `getAttackSurfaceProfile` | Dashboard security panel |
| `/api/v1/analytics/risk-by-industry` | `getRiskByIndustry` | Industry chart |
| `/api/v1/analytics/top-organisations` | `getTopOrganisations` | Leaderboard chart |
| `/api/v1/analytics/alert-acknowledgement` | `getAlertAcknowledgement` | Alert ops chart |
| `/api/v1/admin/stats` | `getSystemStats` | Admin dashboard |
| `/api/v1/admin/users` | `listAllUsers` | Admin user table |

---

## 4. UI Quality Gates (Non-Negotiable)

- [ ] Loading states for every async view.
- [ ] Empty states with actionable text.
- [ ] Error states with backend message fallback.
- [ ] Role-aware rendering (hide forbidden actions early).
- [ ] Confirm dialogs for destructive actions.
- [ ] Pagination and sorting state preserved when navigating back.
- [ ] Forms validate required, enum, date, and range constraints client-side.

---

## 5. Testing Checklist (Frontend)

### Unit Tests (Karma/Jasmine)
- [ ] Service tests for all newly added methods.
- [ ] Component tests for filter logic and query-param sync.
- [ ] Guard tests for role-based route access.

### Integration/E2E (manual or Cypress if available)
- [ ] Login as guest/analyst/admin and verify route access.
- [ ] Execute advanced search with multiple criteria.
- [ ] Execute subdocument query and verify facets rendered.
- [ ] Verify admin role actions complete successfully.
- [ ] Verify map and analytics pages load with real API data.

### Commands
```bash
cd frontend
npm install
npm run test
npm run build
```

Definition of done:
- Tests green, build green, no TypeScript strict errors.

---

## 6. Submission Evidence Checklist (Frontend)

- [ ] Screenshots/video clips for:
  - Advanced search in action
  - Subdocument query in action
  - Attack surface analytics view
  - Admin user/role management
  - Map geospatial search
- [ ] Test run output (frontend unit tests)
- [ ] Successful production build output
- [ ] Postman or UI proof of role-based access behavior

---

## 7. Final Sign-Off Before Frontend Submission

- [ ] Every new backend endpoint has a frontend consumer.
- [ ] No endpoint called with wrong query param names.
- [ ] No direct `fetch()` calls bypassing service layer.
- [ ] No unused route/page stubs left visible.
- [ ] UX works on desktop and mobile breakpoints.
- [ ] Evidence artefacts collected and organized.

If every checkbox above is complete, frontend follow-up is submission-ready with minimal risk of missing rubric marks.
