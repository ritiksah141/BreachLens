# BreachLens Frontend

[![Tests](https://img.shields.io/badge/Tests-247%20passing-brightgreen.svg)](src/app/)
[![Angular](https://img.shields.io/badge/Angular-17.3-red.svg)](https://angular.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.4-blue.svg)](https://www.typescriptlang.org/)
[![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-purple.svg)](https://getbootstrap.com/)

**Angular SPA for cyber threat intelligence visualization (COM661 coursework).**

---

## 🚀 Quick Start

### **1. Install Dependencies**
```bash
cd frontend
npm install
```

### **2. Start Development Server**
```bash
npm start
# App: http://localhost:4200
# Requires backend running on http://localhost:5001
```

### **3. Run Tests**
```bash
npx ng test --watch=false --browsers=ChromeHeadless
# Expected: 247 passing
```

### **4. Production Build**
```bash
npm run build
# Output: dist/breachlens-frontend/
```

---

## 📂 Project Structure

```
frontend/
├── src/
│   ├── app/
│   │   ├── core/                         # Singleton services & infrastructure
│   │   │   ├── guards/                   # Route guards (3 functional guards)
│   │   │   │   └── auth.guard.ts         # authGuard, adminGuard, analystGuard
│   │   │   ├── interceptors/             # HTTP interceptors
│   │   │   │   └── auth.interceptor.ts   # JWT token attachment + 401/403 handling
│   │   │   ├── models/                   # TypeScript interfaces
│   │   │   │   └── models.ts             # Breach, User, ApiResponse, etc.
│   │   │   ├── resolvers/                # Route resolvers
│   │   │   │   └── breach.resolver.ts    # Pre-fetches breach data before navigation
│   │   │   └── services/                 # Application services (7)
│   │   │       ├── auth.service.ts       # JWT auth, login/register/logout, signals
│   │   │       ├── breach.service.ts     # Breach CRUD, geospatial, subdocuments
│   │   │       ├── analytics.service.ts  # Dashboard aggregation endpoints
│   │   │       ├── admin.service.ts      # Admin stats, user management, audit
│   │   │       ├── user.service.ts       # User profile CRUD
│   │   │       ├── notification.service.ts # Signal-based toast notifications
│   │   │       └── theme.service.ts      # Dark/light mode with localStorage
│   │   ├── features/                     # Feature modules (lazy-loaded)
│   │   │   ├── dashboard/                # Analytics dashboard (6 Chart.js charts)
│   │   │   ├── breaches/
│   │   │   │   ├── breach-list/          # Filterable data table with pagination
│   │   │   │   ├── breach-detail/        # Full breach view with subdocument CRUD
│   │   │   │   └── breach-map/           # Leaflet geospatial map
│   │   │   ├── admin/                    # Admin panel (breach management, user mgmt)
│   │   │   │   └── user-management/      # User role/status management
│   │   │   └── auth/
│   │   │       ├── login/                # Email/password login
│   │   │       ├── register/             # Registration with password strength
│   │   │       ├── reset-password/       # Token-based password reset
│   │   │       └── profile/              # User profile display
│   │   ├── shared/                       # Reusable building blocks
│   │   │   ├── components/
│   │   │   │   ├── navbar/               # Top navigation with role-based links
│   │   │   │   ├── pagination/           # Page controls with Input/Output
│   │   │   │   └── severity-badge/       # Severity indicator (5 levels)
│   │   │   ├── directives/
│   │   │   │   ├── copy-clipboard.directive.ts   # Click-to-copy with visual flash
│   │   │   │   └── require-role.directive.ts     # Structural directive for RBAC
│   │   │   └── pipes/
│   │   │       ├── time-ago.pipe.ts      # Relative time ("2h ago", "3d ago")
│   │   │       ├── risk-level.pipe.ts    # Score → label (CRITICAL/HIGH/LOW)
│   │   │       └── compact-number.pipe.ts # 1500000 → "1.5M"
│   │   ├── app.component.ts             # Root shell (header, nav, toasts, footer)
│   │   ├── app.routes.ts                # Route config (9 lazy-loaded routes)
│   │   └── app.config.ts                # Application providers
│   ├── environments/                     # Environment configs
│   ├── styles.css                        # Global CSS variables (dark/light themes)
│   ├── index.html                        # Entry HTML
│   └── main.ts                           # Bootstrap
├── angular.json                          # CLI configuration
├── tsconfig.json                         # TypeScript config
├── karma.conf.js                         # Test runner config
├── package.json                          # Dependencies
└── README.md                             # This file
```

---

## 🧪 Testing

### **Run All Tests**
```bash
npx ng test --watch=false --browsers=ChromeHeadless

# Expected: 247 passed in ~3s
```

### **Test Breakdown**
| Module | Tests | Focus |
|--------|-------|-------|
| time-ago.pipe.spec.ts | 27 | Relative time formatting edge cases |
| risk-level.pipe.spec.ts | 30 | Score-to-label mapping, CSS class output |
| compact-number.pipe.spec.ts | 26 | Number formatting (K, M, B, T) |
| copy-clipboard.directive.spec.ts | 10 | Clipboard API, visual feedback, fallback |
| require-role.directive.spec.ts | 15 | Role-based template rendering, reactivity |
| notification.service.spec.ts | 13 | Signal-based notifications, auto-dismiss |
| theme.service.spec.ts | 10 | Dark/light toggle, localStorage persistence |
| auth.guard.spec.ts | 11 | Signal-based guard mocking, redirects |
| auth.interceptor.spec.ts | 8 | Token injection, 401/403 error handling |
| breach.resolver.spec.ts | 8 | Pre-fetch success/failure, error redirect |
| severity-badge.component.spec.ts | 13 | Badge rendering for all 5 severity levels |
| pagination.component.spec.ts | 15 | Page navigation, edge cases, event emission |
| profile.component.spec.ts | 22 | Profile display, role badges, session info |
| breach-list.component.spec.ts | 10 | List rendering, filter integration |
| dashboard.component.spec.ts | 10 | Chart initialization, analytics loading |
| auth.service.spec.ts | 10 | JWT handling, login/logout flow |
| breach.service.spec.ts | 9 | HTTP calls, query parameter building |

### **Run Specific Tests**
```bash
# Single spec file
npx ng test --watch=false --browsers=ChromeHeadless --include='**/pipes/*.spec.ts'

# Watch mode (interactive)
npx ng test
```

### **Generate Coverage Report**
```bash
npx ng test --watch=false --browsers=ChromeHeadless --code-coverage
open coverage/breachlens-frontend/index.html
```

---

## 🏗️ Architecture

### **Angular Features Used**

| Feature | Implementation |
|---------|---------------|
| **Standalone Components** | All 13 components — zero NgModules |
| **Signals** | `signal()`, `computed()`, `effect()` across auth, theme, notifications |
| **Functional Guards** | `authGuard`, `adminGuard`, `analystGuard` as `CanActivateFn` |
| **Functional Interceptor** | `authInterceptor` as `HttpInterceptorFn` |
| **Route Resolver** | `breachResolver` as `ResolveFn<Breach>` |
| **Custom Pipes** | `TimeAgoPipe`, `RiskLevelPipe`, `CompactNumberPipe` |
| **Custom Directives** | `CopyClipboardDirective` (attribute), `RequireRoleDirective` (structural) |
| **Reactive Forms** | `FormGroup` + `FormBuilder` with custom validators |
| **Lazy Loading** | All 9 routes use `loadComponent()` |
| **Control Flow** | `@if`, `@for` with `track`, `@switch`/`@case` |
| **Dependency Injection** | `inject()` function, `providedIn: 'root'` |

### **State Management**
```
AuthService          → signal<User | null>, computed<boolean> (isAdmin, isAnalyst)
ThemeService         → signal<'dark' | 'light'>, localStorage persistence
NotificationService  → signal<Notification[]>, auto-dismiss timers
```

No external state library — Angular signals provide reactive state with minimal overhead.

### **Component Inventory**

| Category | Components | Count |
|----------|-----------|-------|
| **Features** | Dashboard, BreachList, BreachDetail, BreachMap, Admin, UserManagement, Login, Register, ResetPassword, Profile | 10 |
| **Shared** | Navbar, Pagination, SeverityBadge | 3 |
| **Root** | AppComponent | 1 |
| **Total** | | **14** |

### **Service Layer**

| Service | Endpoints | Purpose |
|---------|-----------|---------|
| AuthService | 6 | JWT auth, login/register/logout, signal-based user state |
| BreachService | 37 | CRUD, geospatial, subdocuments, advanced search, bulk ops |
| AnalyticsService | 11 | Dashboard aggregations (summary, trends, distributions) |
| AdminService | 7 | System stats, user management, audit logs |
| UserService | 4 | User profile CRUD |
| NotificationService | — | Client-side toast system (no HTTP) |
| ThemeService | — | Dark/light toggle (no HTTP) |

**Total backend calls: 65 HTTP endpoints consumed**

---

## 🔌 Backend Communication

### **HTTP Methods Used**
```
GET     — List, search, filter, analytics, profile
POST    — Create, login, register, bulk import
PUT     — Full update
PATCH   — Partial update, role changes, activate/deactivate
DELETE  — Single delete, bulk delete
```

### **Authentication Flow**
```
1. POST /auth/login          → Receives JWT token
2. Token stored in localStorage (bl_token)
3. authInterceptor attaches x-access-token header to all requests
4. 401 → handleSessionExpired() → clear session, redirect to /auth/login
5. 403 → show error, re-sync user profile from server
6. POST /auth/logout         → Token blacklisted server-side
```

### **Query Parameters**
All list endpoints support flexible query strings:
```
/breaches?page=1&limit=12&severity=critical&status=active&sort_by=risk_score&order=desc
/breaches/advanced-search?q=payment&industries=finance,healthcare&min_risk=7&include_facets=true
/breaches/geo/near?longitude=-0.1278&latitude=51.5074&radius=100000
/analytics/monthly-trend?year=2025
```

---

## 🎨 Theming

### **Dark/Light Mode**
- System preference detection on first visit (`prefers-color-scheme`)
- Manual toggle via navbar button
- Persisted to `localStorage`
- CSS custom properties for all colors — single source of truth

### **CSS Variable System**
```css
/* Dark mode (default) */
:root {
  --surface: #111318;
  --primary: #7bd0ff;
  --error: #f87171;
  --severity-critical: #f87171;
  --severity-high: #fb923c;
  ...
}

/* Light mode override */
[data-theme='light'] {
  --surface: #f8f9fa;
  --primary: #0284c7;
  --error: #dc2626;
  --severity-critical: #dc2626;
  --severity-high: #ea580c;
  ...
}
```

### **Theme-Aware Components**
- Leaflet map tiles switch between Stadia Maps (dark) and OpenStreetMap (light)
- Chart.js colors read from CSS variables at runtime via `getComputedStyle()`
- Map markers use severity CSS variables for dynamic coloring
- All shadows use `color-mix()` instead of hardcoded `rgba()`

---

## 🗺️ Visualizations

### **Charts (Dashboard)**
| Chart | Type | Data Source |
|-------|------|-------------|
| Severity Breakdown | Bar | `/analytics/severity-breakdown` |
| Monthly Threat Trend | Line | `/analytics/monthly-trend` |
| Data Types Exposed | Doughnut | `/analytics/data-types-frequency` |
| Risk Score Distribution | Histogram | `/analytics/risk-scores` |
| Top Organisations | Horizontal Bar | `/analytics/top-organisations` |
| Industry-Year Trends | Multi-line | `/analytics/industry-year-trend` |

### **Maps (Breach Map + Detail)**
- Leaflet.js with GeoJSON circle markers
- Severity-based color coding + risk score radius scaling
- Interactive popups with breach metadata
- "Near me" geolocation button
- Bounding box queries on map move
- Theme-reactive tile layers

---

## 🔐 Role-Based Access

### **Route Guards**
| Guard | Protects | Behavior |
|-------|----------|----------|
| `authGuard` | `/auth/profile` | Redirect to `/auth/login` if unauthenticated |
| `adminGuard` | `/admin` | Re-syncs role from server, redirects to `/` if not admin |
| `analystGuard` | — (available) | Requires analyst or admin role |

### **UI-Level RBAC**
```html
<!-- Structural directive hides elements by role -->
<button *appRequireRole="['analyst', 'admin']">Edit Breach</button>

<!-- Admin-only navigation -->
<a *appRequireRole="'admin'" routerLink="/admin">Admin Panel</a>
```

### **Access Matrix**
| Feature | Guest | Analyst | Admin |
|---------|-------|---------|-------|
| View breaches | ✅ | ✅ | ✅ |
| View analytics | ✅ | ✅ | ✅ |
| Edit breaches | ❌ | ✅ | ✅ |
| Admin panel | ❌ | ❌ | ✅ |
| User management | ❌ | ❌ | ✅ |

---

## 🧩 Routing

### **Route Configuration**
```
/                    → Dashboard          (lazy-loaded)
/breaches            → BreachList         (lazy-loaded)
/breaches/:id        → BreachDetail       (lazy-loaded, resolver: breachResolver)
/map                 → BreachMap          (lazy-loaded)
/admin               → Admin             (lazy-loaded, guard: adminGuard)
/auth/login          → Login             (lazy-loaded)
/auth/register       → Register          (lazy-loaded)
/auth/reset-password → ResetPassword     (lazy-loaded)
/auth/profile        → Profile           (lazy-loaded, guard: authGuard)
**                   → Redirect to /
```

All routes use `loadComponent()` for code splitting — each feature is a separate bundle loaded on demand.

---

## 🛠 Technology Stack

| Category | Technology | Version |
|----------|-----------|---------|
| **Framework** | Angular | 17.3 |
| **Language** | TypeScript | 5.4 |
| **UI** | Bootstrap | 5.3 |
| **Charts** | Chart.js | 4.4 |
| **Maps** | Leaflet.js | 1.9.4 |
| **Reactive** | RxJS | 7.8 |
| **Testing** | Jasmine + Karma | 5.1 / 6.4 |
| **Build** | Angular CLI | 17.3 |

---

## 🐛 Troubleshooting

### **Backend Not Running**
```bash
# Ensure backend is running on port 5001:
cd ../backend
source ../venv/bin/activate
python run.py

# Check API health:
curl http://localhost:5001/health
```

### **Tests Failing**
```bash
# Clear node_modules and reinstall:
rm -rf node_modules
npm install

# Run tests with verbose output:
npx ng test --watch=false --browsers=ChromeHeadless
```

### **Build Errors**
```bash
# Check TypeScript compilation:
npx ng build

# Common fix — clear Angular cache:
rm -rf .angular/cache
npm run build
```

### **CORS Errors in Browser**
```bash
# Ensure backend CORS allows http://localhost:4200
# Check backend .env:
CORS_ORIGINS=http://localhost:4200,http://localhost:3000
```

---

## 📚 Additional Resources

- **Backend API**: [../backend/README.md](../backend/README.md)
- **API Reference**: [../docs/API_SPEC.md](../docs/API_SPEC.md)
- **System Architecture**: [../docs/SYSTEM_ARCHITECTURE.md](../docs/SYSTEM_ARCHITECTURE.md)
- **QA Strategy**: [../docs/QA_STRATEGY.md](../docs/QA_STRATEGY.md)

---

**Status**: ✅ 247/247 tests passing | 14 components | 65 backend endpoints consumed
**Angular Version**: 17.3 | **Node**: 18+
