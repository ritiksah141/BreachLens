# BreachLens Frontend

[![Tests](https://img.shields.io/badge/Tests-249%20passing-brightgreen.svg)](src/app/)
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
# Expected: 249 passing
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
│   │   │       ├── breach.service.ts     # Breach CRUD, geospatial, exposure scanning
│   │   │       ├── analytics.service.ts  # Dashboard and Analytics aggregations
│   │   │       ├── admin.service.ts      # Admin stats, user management, audit
│   │   │       ├── user.service.ts       # User profile CRUD
│   │   │       ├── notification.service.ts # Signal-based toast notifications
│   │   │       └── theme.service.ts      # Dark/light mode with localStorage
│   │   ├── features/                     # Feature modules (lazy-loaded)
│   │   │   ├── dashboard/                # Live summary dashboard (KPIs, Trends)
│   │   │   ├── analytics/                # Advanced analytics (Industry trends, Risk profiles)
│   │   │   ├── breaches/
│   │   │   │   ├── breach-list/          # Filterable data table with pagination
│   │   │   │   ├── breach-detail/        # Full breach view with subdocument CRUD
│   │   │   │   ├── breach-map/           # Tactical Leaflet geospatial map
│   │   │   │   └── exposure-checker/     # Identity & Domain exposure intelligence
│   │   │   ├── admin/                    # Admin panel (breach management, audit)
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
│   │   ├── app.routes.ts                # Route config (10 lazy-loaded routes)
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

# Expected: 249 passed in ~3s
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
| breach-list.component.spec.ts | 11 | List rendering, filter integration |
| dashboard.component.spec.ts | 10 | Chart initialization, analytics loading |
| auth.service.spec.ts | 10 | JWT handling, login/logout flow |
| breach.service.spec.ts | 10 | HTTP calls, query parameter building |

---

## 🏗️ Architecture

### **Angular Features Used**

| Feature | Implementation |
|---------|---------------|
| **Standalone Components** | All 16 components — zero NgModules |
| **Signals** | `signal()`, `computed()`, `effect()` across auth, theme, notifications |
| **Functional Guards** | `authGuard`, `adminGuard`, `analystGuard` as `CanActivateFn` |
| **Functional Interceptor** | `authInterceptor` as `HttpInterceptorFn` |
| **Route Resolver** | `breachResolver` as `ResolveFn<Breach>` |
| **Custom Pipes** | `TimeAgoPipe`, `RiskLevelPipe`, `CompactNumberPipe` |
| **Custom Directives** | `CopyClipboardDirective` (attribute), `RequireRoleDirective` (structural) |
| **Reactive Forms** | `FormGroup` + `FormBuilder` with custom validators |
| **Lazy Loading** | All 10 routes use `loadComponent()` |
| **Control Flow** | `@if`, `@for` with `track`, `@switch`/`@case` |
| **Dependency Injection** | `inject()` function, `providedIn: 'root'` |

### **State Management**
```
AuthService          → signal<User | null>, computed<boolean> (isAdmin, isAnalyst)
ThemeService         → signal<'dark' | 'light'>, localStorage persistence
NotificationService  → signal<Notification[]>, auto-dismiss timers
```

### **Component Inventory**

| Category | Components | Count |
|----------|-----------|-------|
| **Features** | Dashboard, Analytics, BreachList, BreachDetail, BreachMap, ExposureChecker, Admin, UserManagement, Login, Register, ResetPassword, Profile | 12 |
| **Shared** | Navbar, Pagination, SeverityBadge | 3 |
| **Root** | AppComponent | 1 |
| **Total** | | **16** |

### **Service Layer**

| Service | Endpoints | Purpose |
|---------|-----------|---------|
| AuthService | 6 | JWT auth, login/register/logout, signal-based user state |
| BreachService | 37 | CRUD, geospatial, exposure check, advanced search |
| AnalyticsService | 11 | Dashboard & Advanced analytics (summary, trends, distributions) |
| AdminService | 7 | System stats, user management, audit logs |
| UserService | 4 | User profile CRUD |
| NotificationService | — | Client-side toast system (no HTTP) |
| ThemeService | — | Dark/light toggle (no HTTP) |

**Total backend calls: 65 HTTP endpoints consumed**

---

## 🎨 Visualizations

### **Exposure Intelligence (Scanner)**
- **Identity Scan**: Cross-reference emails against verified breach records.
- **Domain Audit**: Audit corporate domains for historical data incursions.
- **Tactical Map**: Leaflet.js with GeoJSON markers, severity-based color coding, and risk radius scaling.
- **Protocol Recommendations**: Dynamic security advice based on exposure detected.

### **Advanced Analytics**
| Chart | Type | Data Source |
|-------|------|-------------|
| Top Organisations | Horizontal Bar | `/analytics/top-organisations` |
| Risk Distribution | Histogram (Line) | `/analytics/risk-scores` |
| Industry-Year Trends | Stacked Bar | `/analytics/industry-year-trend` |
| Exposed Data Frequency | Progress Indicators | `/analytics/data-types-frequency` |

### **Dashboard KPIs**
| Visualization | Purpose |
|---------------|---------|
| Severity Breakdown | Doughnut chart showing threat levels |
| Monthly Propagation | Interactive bar chart for temporal trends |
| KPIs | Real-time counts of breaches, alerts, and avg risk |
| Background Map | Ambient global telemetry visualization |

---

## 🔐 Role-Based Access

### **Access Matrix**
| Feature | Guest | Analyst | Admin |
|---------|-------|---------|-------|
| View breaches | ✅ | ✅ | ✅ |
| View analytics | ✅ | ✅ | ✅ |
| Exposure Scanner | ✅ | ✅ | ✅ |
| Edit breaches | ❌ | ✅ | ✅ |
| Admin panel | ❌ | ❌ | ✅ |
| User management | ❌ | ❌ | ✅ |

---

## 🧩 Routing

### **Route Configuration**
```
/                    → Dashboard            (lazy-loaded)
/breaches            → BreachList           (lazy-loaded)
/breaches/:id        → BreachDetail         (lazy-loaded, resolver: breachResolver)
/map                 → ExposureChecker      (lazy-loaded)
/analytics           → Analytics            (lazy-loaded, guard: analystGuard)
/admin               → Admin               (lazy-loaded, guard: adminGuard)
/auth/login          → Login               (lazy-loaded)
/auth/register       → Register            (lazy-loaded)
/auth/reset-password → ResetPassword       (lazy-loaded)
/auth/profile        → Profile             (lazy-loaded, guard: authGuard)
**                   → Redirect to /
```

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

**Status**: ✅ 249/249 tests passing | 16 components | 65 backend endpoints consumed
**Angular Version**: 17.3 | **Node**: 18+
