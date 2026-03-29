✦ Based on a comprehensive review of the BreachLens backend and frontend, I have identified several significant gaps where backend functionality is not yet exposed
  or implemented in the frontend.

  1. User Management & Admin Controls (Major Gap)
  The backend has a robust user management system that is almost entirely missing from the frontend UI.
   * Missing Services: There is no UserService or AdminService to handle user-related API calls.
   * Missing UI: There is no interface for administrators to:
       * List all registered users (/api/v1/admin/users).
       * Change user roles (e.g., promote a guest to analyst).
       * Activate or deactivate user accounts.
   * System Statistics: The /api/v1/admin/stats endpoint, which provides system-wide health data (user counts, breach status breakdown, alert counts), is not
     utilized anywhere in the admin panel.

  2. Breach Management & Advanced Queries
  While basic CRUD for breaches exists, several advanced backend features are missing:
   * Bulk Operations: The backend supports bulk import and bulk delete (/api/v1/breaches/bulk), but these are not implemented in the BreachService or the UI.
   * Geospatial Search:
       * The getWithinBounds (bounding box) query is missing from the frontend service.
       * There is no dedicated "Global Map" or "Geospatial Search" page to visualize breaches geographically, even though the backend provides GeoJSON and
         "near-me" search capabilities.
   * Implementation Inconsistency: The DashboardComponent uses a manual fetch() call for the exposure check instead of using the existing method in BreachService.

  3. Sub-document CRUD (Incomplete)
  The backend allows full management of Timeline Events, Remediation Actions, Affected Accounts, and Monitoring Alerts. However, the frontend implementation is
  partial:
   * Missing Operations: All "Update" (PATCH) operations for these four sub-document types are missing from the BreachService. Delete operations are also missing
     for Remediation Actions and Monitoring Alerts.
   * Display-Only UI: The BreachDetailComponent currently only displays these items. Analysts and Admins have no UI to add, edit, or remove timeline events,
     remediation steps, or monitoring alerts.

  4. Analytics & Dashboard
  The backend offers 10 distinct analytics endpoints, but the frontend only uses about half of them.
   * Missing Analytics: The following data is available but not shown:
       * Top Organisations: List of most frequently targeted companies.
       * Alert Acknowledgement: Rates of how quickly alerts are being handled.
       * Industry Year Trend: Year-over-year comparison of breaches by industry.
       * Risk Scores: Distribution of risk scores across all breaches.
   * Remediation Rate: The service method exists but the data is not visualized in the dashboard.

  5. Summary Checklist of Missing Components

  ┌───────────┬─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┐
  │ Category  │ Missing Feature                                                                                                         │
  ├───────────┼─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┤
  │ Services  │ UserService, AdminService, Full Sub-document CRUD in BreachService.                                                     │
  │ Admin UI  │ User Management Table, Role Editor, System Health Dashboard.                                                            │
  │ Breach UI │ Bulk Import/Delete Tool, Sub-document Editors (Modals/Forms).                                                           │
  │ Visuals   │ Global Breach Map, Advanced Analytics Charts (Top Orgs, Trends).                                                        │
  │ Models    │ The models are well-defined but some response interfaces need to be updated to match specific backend projection names. │
  └───────────┴─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────┘
