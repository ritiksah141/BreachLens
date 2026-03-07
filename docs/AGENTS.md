# BreachLens – AI Coding Assistant Context File
## AGENTS.md – System Prompt & Coding Standards Reference
**Version:** 1.0.0
**Project:** BreachLens – Dark Web Breach Intelligence Tracker
**Module:** COM661 – Full Stack Strategies and Development


---

> **PURPOSE OF THIS FILE**
> This file is the authoritative context document for any AI coding assistant (GitHub Copilot, Cursor, Claude, etc.) working on the BreachLens codebase. Every code generation, refactoring, or completion task **MUST** comply with every rule defined here. This file takes precedence over any default assistant behaviour or general best-practice suggestions that conflict with these project-specific standards.

---

## Table of Contents

1. [Project Identity](#1-project-identity)
2. [Full Technology Stack](#2-full-technology-stack)
3. [Repository Structure](#3-repository-structure)
4. [Backend Coding Standards (Flask/Python)](#4-backend-coding-standards-flaskpython)
5. [Frontend Coding Standards (Angular)](#5-frontend-coding-standards-angular)
6. [MongoDB Standards](#6-mongodb-standards)
7. [Mandatory Implementation Rules](#7-mandatory-implementation-rules)
8. [HTTP & REST Standards](#8-http--rest-standards)
9. [Authentication & Security Rules](#9-authentication--security-rules)
10. [Error Handling Contract](#10-error-handling-contract)
11. [Testing Standards](#11-testing-standards)
12. [What NOT To Do](#12-what-not-to-do)

---

## 1. Project Identity

```
Application Name : BreachLens – Dark Web Breach Intelligence Tracker
Project Type     : Full-Stack Cybersecurity Intelligence Platform
Academic Context : COM661 CW1 (Backend) + CW2 (Frontend) — Target Grade: 90%+
Scope            : Individual project — no team collaboration rules apply
Domain           : Cybersecurity / Threat Intelligence
Primary Goal     : Exceed the Biz Directory demo application in every assessed dimension
```

---

## 2. Full Technology Stack

### 2.1 Backend

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Language | Python | 3.11+ | Type hints required everywhere |
| Web Framework | Flask | 3.0.x | Application factory pattern |
| Database Driver | PyMongo | 4.6.x | Direct driver, not MongoEngine or ODM |
| Authentication | PyJWT | 2.8.x | Raw `jwt.encode`/`jwt.decode`, `x-access-token` header |
| Password Hashing | bcrypt | 4.1.x | Min 12 salt rounds |
| Validation | Marshmallow | 3.21.x | Schema-based validation + manual validators |
| CORS | Flask-CORS | 4.0.x | Configurable origins per environment |
| Rate Limiting | Flask-Limiter | 3.5.x | In-memory backend |
| Environment Vars | python-dotenv | 1.0.x | `.env` file for local dev |
| Testing | pytest | 8.x | All backend unit tests |
| Mock DB | mongomock | 4.1.x | MongoDB mock for unit tests |
| HTTP Testing | Postman / Newman | Latest | API integration testing |

### 2.2 Database

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Database | MongoDB | 7.0+ | Local instance only |
| Index Types | 2dsphere, compound, text | — | Mandatory — see §6 |
| Query Features | Aggregation Pipeline, GeoJSON | — | Mandatory — see §6 |

### 2.3 Frontend

| Component | Technology | Version | Notes |
|-----------|-----------|---------|-------|
| Framework | Angular | 17.3.x | Strict mode MANDATORY |
| Language | TypeScript | 5.3.x | `strict: true` in tsconfig |
| UI Library | Angular Material | 17.x | Primary component library |
| CSS Framework | Tailwind CSS | 3.4.x | Utility classes for layout/spacing |
| Charts | Chart.js | 4.4.x | Via `ng2-charts` wrapper 5.x |
| Maps | Leaflet.js | 1.9.x | Via `@asymmetrik/ngx-leaflet` |
| HTTP Client | Angular HttpClient | Built-in | Via `HttpClientModule` |
| Forms | Angular Reactive Forms | Built-in | `FormBuilder`, `Validators` |
| State | RxJS | 7.8.x | Services with `BehaviorSubject` |
| Routing | Angular Router | Built-in | Lazy loading, route guards |
| Testing | Jasmine + Karma | Built-in | Unit + integration tests |
| E2E Testing | Cypress | 13.x | End-to-end tests |
| Linting | ESLint | 8.x | `@angular-eslint` rules |

### 2.4 Dev Tools

| Tool | Purpose |
|------|---------|
| Angular CLI 17+ | Scaffold, build, serve, test |
| MongoDB Compass | Database visual inspection |
| Postman | API development and automated testing |
| Newman | CLI execution of Postman collections |
| Git | Version control |
| VSCode | Primary IDE |

---

## 3. Repository Structure

```
BreachLens/
├── backend/
│   ├── app/
│   │   ├── __init__.py              # create_app() factory — ONLY place Flask is instantiated
│   │   ├── config.py                # DevelopmentConfig, TestingConfig
│   │   ├── extensions.py            # mongo, jwt, cors, limiter — initialised here, imported elsewhere
│   │   ├── routes/
│   │   │   ├── __init__.py
│   │   │   ├── auth.py              # Blueprint: auth_bp, prefix /api/v1/auth
│   │   │   ├── breaches.py          # Blueprint: breaches_bp, prefix /api/v1/breaches
│   │   │   ├── analytics.py         # Blueprint: analytics_bp, prefix /api/v1/analytics
│   │   │   ├── admin.py             # Blueprint: admin_bp, prefix /api/v1/admin
│   │   │   └── users.py             # Blueprint: users_bp, prefix /api/v1/users
│   │   ├── services/
│   │   │   ├── breach_service.py    # ALL MongoDB breach logic lives here
│   │   │   ├── analytics_service.py # ALL aggregation pipeline logic lives here
│   │   │   ├── user_service.py
│   │   │   └── auth_service.py
│   │   ├── middleware/
│   │   │   └── auth_middleware.py   # @require_auth, @require_role decorators
│   │   ├── schemas/
│   │   │   ├── breach_schema.py     # Marshmallow schemas for validation
│   │   │   └── user_schema.py
│   │   └── utils/
│   │       ├── validators.py        # Custom validation helpers
│   │       ├── geo_utils.py         # GeoJSON validation and transformation
│   │       └── response.py          # success_response(), error_response() builders
│   ├── tests/
│   │   ├── conftest.py
│   │   ├── test_auth.py
│   │   ├── test_breaches.py
│   │   ├── test_analytics.py
│   │   └── test_subdocuments.py
│   ├── seed/
│   │   └── seed_data.py             # 25+ realistic breach records
│   ├── postman/
│   │   ├── BreachLens.postman_collection.json
│   │   └── BreachLens.postman_environment.json
│   ├── run.py                       # Entry point: app = create_app()
│   ├── requirements.txt
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── app/
│   │   │   ├── core/                # Guards, Interceptors, Services, Models
│   │   │   ├── features/            # Auth, Breaches, Analytics, Admin modules
│   │   │   └── shared/              # Reusable components, pipes
│   │   ├── environments/
│   │   │   ├── environment.ts
│   │   │   └── environment.prod.ts
│   │   └── styles.scss
│   ├── angular.json
│   ├── tsconfig.json
│   └── package.json
├── docs/
│   ├── PRD.md
│   ├── AGENTS.md
│   ├── API_SPEC.md
│   └── QA_STRATEGY.md
├── README.md
└── LICENSE
```

---

## 4. Backend Coding Standards (Flask/Python)

### 4.1 Python Style Rules (PEP 8 — STRICTLY ENFORCED)

```python
# CORRECT: snake_case for functions and variables
def get_breach_by_id(breach_id: str) -> dict:
    ...

# CORRECT: PascalCase for classes
class BreachService:
    ...

# CORRECT: UPPER_SNAKE_CASE for module-level constants
MAX_RISK_SCORE: float = 10.0
ALLOWED_SEVERITIES: list[str] = ["critical", "high", "medium", "low", "informational"]

# CORRECT: Type hints on ALL function signatures
def create_breach(data: dict, created_by: str) -> tuple[dict, int]:
    ...

# CORRECT: Docstring on every public function
def calculate_risk_score(severity: str, record_count: int) -> float:
    """
    Calculate a normalised risk score between 0.0 and 10.0.

    Args:
        severity: One of ALLOWED_SEVERITIES.
        record_count: Number of affected records (>= 0).

    Returns:
        Float risk score in range [0.0, 10.0].

    Raises:
        ValueError: If severity is not in ALLOWED_SEVERITIES.
    """
    ...
```

### 4.2 Flask Application Factory (MANDATORY PATTERN)

```python
# app/__init__.py — ALWAYS use this pattern
from flask import Flask
from app.extensions import mongo, jwt, cors, limiter
from app.routes.auth import auth_bp
from app.routes.breaches import breaches_bp
from app.routes.analytics import analytics_bp
from app.routes.admin import admin_bp
from app.routes.users import users_bp

def create_app(config_name: str = "development") -> Flask:
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Initialise extensions
    mongo.init_app(app)
    jwt.init_app(app)
    cors.init_app(app, resources={r"/api/*": {"origins": app.config["CORS_ORIGINS"]}})
    limiter.init_app(app)

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(breaches_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(users_bp)

    # Register centralised error handlers
    register_error_handlers(app)

    return app
```

### 4.3 Blueprint Pattern (MANDATORY)

```python
# app/routes/breaches.py
from flask import Blueprint, request, jsonify
from app.middleware.auth_middleware import require_auth, require_role
from app.services.breach_service import BreachService
from app.utils.response import success_response, error_response

breaches_bp = Blueprint("breaches", __name__, url_prefix="/api/v1/breaches")
breach_service = BreachService()

@breaches_bp.route("/", methods=["GET"])
def list_breaches():
    # ALWAYS: parse and validate query params before passing to service
    # ALWAYS: return success_response() wrapper
    ...

@breaches_bp.route("/<breach_id>", methods=["GET"])
@require_auth
def get_breach(breach_id: str):
    ...
```

### 4.4 Service Layer Pattern (MANDATORY)

```python
# ALL MongoDB operations go in services/ — NEVER directly in route handlers
# app/services/breach_service.py
from app.extensions import mongo
from bson import ObjectId
from bson.errors import InvalidId
from pymongo.errors import PyMongoError

class BreachService:
    def __init__(self):
        self.collection_name = "breaches"

    @property
    def collection(self):
        return mongo.db[self.collection_name]

    def get_by_id(self, breach_id: str) -> dict | None:
        """Retrieve a single breach by its ObjectId string."""
        try:
            oid = ObjectId(breach_id)
        except InvalidId:
            return None
        return self.collection.find_one({"_id": oid})
```

### 4.5 Standard Response Builders (MANDATORY)

```python
# app/utils/response.py — ALWAYS use these, never raw jsonify in routes
from flask import jsonify
from bson import ObjectId
import json

class MongoJSONEncoder(json.JSONEncoder):
    def default(self, obj):
        if isinstance(obj, ObjectId):
            return str(obj)
        if hasattr(obj, "isoformat"):
            return obj.isoformat()
        return super().default(obj)

def success_response(data: any, status_code: int = 200, meta: dict = None) -> tuple:
    """
    Standard success envelope.
    Returns: (Response, int)
    """
    body = {"status": "success", "data": data}
    if meta:
        body["meta"] = meta
    return jsonify(json.loads(json.dumps(body, cls=MongoJSONEncoder))), status_code

def error_response(message: str, status_code: int, details: dict = None) -> tuple:
    """
    Standard error envelope.
    Returns: (Response, int)
    """
    body = {"status": "error", "message": message, "code": status_code}
    if details:
        body["details"] = details
    return jsonify(body), status_code
```

### 4.6 Centralised Error Handlers (MANDATORY)

```python
# app/__init__.py — register_error_handlers()
from flask import jsonify

def register_error_handlers(app):
    @app.errorhandler(400)
    def bad_request(e):
        return jsonify({"status": "error", "message": str(e.description), "code": 400}), 400

    @app.errorhandler(401)
    def unauthorized(e):
        return jsonify({"status": "error", "message": "Authentication required.", "code": 401}), 401

    @app.errorhandler(403)
    def forbidden(e):
        return jsonify({"status": "error", "message": "Insufficient permissions.", "code": 403}), 403

    @app.errorhandler(404)
    def not_found(e):
        return jsonify({"status": "error", "message": "Resource not found.", "code": 404}), 404

    @app.errorhandler(405)
    def method_not_allowed(e):
        return jsonify({"status": "error", "message": "HTTP method not allowed.", "code": 405}), 405

    @app.errorhandler(422)
    def unprocessable(e):
        return jsonify({"status": "error", "message": str(e.description), "code": 422}), 422

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"status": "error", "message": "An internal server error occurred.", "code": 500}), 500
```

### 4.7 Authentication Middleware (MANDATORY PATTERN)

```python
# app/middleware/auth_middleware.py
from functools import wraps
from flask import request, g, current_app
import jwt as pyjwt              # raw PyJWT — NOT Flask-JWT-Extended
from app.extensions import mongo
from app.utils.response import error_response

def _get_token_from_header():
    """Read token from x-access-token header."""
    return request.headers.get("x-access-token")

def _check_blacklist(token):
    """Return True if token is in MongoDB blacklist collection."""
    return mongo.db["blacklist"].find_one({"token": token}) is not None

def _decode_token(token):
    """Decode JWT with SECRET_KEY; return payload dict or None."""
    try:
        return pyjwt.decode(token, current_app.config["SECRET_KEY"], algorithms=["HS256"])
    except (pyjwt.ExpiredSignatureError, pyjwt.InvalidTokenError):
        return None

def jwt_required(f):
    """Decorator: requires valid JWT in x-access-token header."""
    @wraps(f)
    def decorated(*args, **kwargs):
        token = _get_token_from_header()
        if token:
            if _check_blacklist(token):
                return error_response("Token has been cancelled.", 401)
            payload = _decode_token(token)
            if payload is None:
                return error_response("Token is invalid or has expired.", 401)
            g.current_user = payload.get("user", "")
            g.current_user_id = payload.get("user", "")
            g.current_user_claims = payload
            return f(*args, **kwargs)
        return error_response("Token is missing.", 401)
    return decorated

def admin_required(f):
    """Decorator: requires valid JWT AND admin: True in payload."""
    # ... checks payload["admin"] is True, else 403 ...

def require_role(*roles):
    """Decorator factory: requires one of the specified roles in token payload."""
    # ... checks payload["role"] in roles, else 403 ...

# Usage in routes:
# @jwt_required                              — any authenticated user
# @admin_required                            — admin only
# @require_role("admin")                    — admin only (alternative)
# @require_role("admin", "analyst")         — admin or analyst
```

---

## 5. Frontend Coding Standards (Angular)

### 5.1 TypeScript Strict Mode (MANDATORY — NEVER DISABLE)

```json
// tsconfig.json — these settings must NEVER be weakened
{
  "compilerOptions": {
    "strict": true,
    "strictNullChecks": true,
    "strictPropertyInitialization": true,
    "noImplicitAny": true,
    "noImplicitReturns": true,
    "forceConsistentCasingInFileNames": true
  },
  "angularCompilerOptions": {
    "strictInjectionParameters": true,
    "strictInputAccessModifiers": true,
    "strictTemplates": true
  }
}
```

### 5.2 Model Interfaces (MANDATORY — All API responses must have a TypeScript interface)

```typescript
// src/app/core/models/breach.model.ts
export interface GeoLocation {
  type: 'Point';
  coordinates: [number, number]; // [longitude, latitude]
}

export interface Organisation {
  name: string;
  domain: string;
  country: string;
  size: 'small' | 'medium' | 'large' | 'enterprise';
}

export interface AffectedAccount {
  _id: string;
  email: string;
  username: string;
  data_exposed: string[];
  notified: boolean;
  notification_date: string | null;
}

export interface TimelineEvent {
  _id: string;
  event_date: string;
  event_type: 'breach_occurred' | 'discovered' | 'disclosed' | 'contained' | 'resolved';
  description: string;
  actor: string;
}

export interface RemediationAction {
  _id: string;
  action: string;
  status: 'pending' | 'in_progress' | 'completed';
  assigned_to: string;
  due_date: string;
  completed_date: string | null;
}

export interface MonitoringAlert {
  _id: string;
  alert_type: 'new_exposure' | 'credential_stuffing' | 'dark_web_mention' | 'domain_squatting';
  triggered_at: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  details: string;
  acknowledged: boolean;
}

export type SeverityLevel = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type BreachStatus = 'active' | 'contained' | 'investigating' | 'resolved';
export type Industry = 'finance' | 'healthcare' | 'retail' | 'government' | 'technology' | 'education' | 'energy' | 'other';

export interface Breach {
  _id: string;
  title: string;
  description: string;
  source_url?: string;
  breach_date: string;
  discovered_date: string;
  severity: SeverityLevel;
  status: BreachStatus;
  industry: Industry;
  affected_records_count: number;
  data_types_exposed: string[];
  risk_score: number;
  organisation: Organisation;
  location?: GeoLocation;
  affected_accounts?: AffectedAccount[];
  timeline?: TimelineEvent[];
  remediation?: RemediationAction[];
  monitoring_alerts?: MonitoringAlert[];
  created_at: string;
  updated_at: string;
  created_by: string;
}

// src/app/core/models/api-response.model.ts
export interface ApiResponse<T> {
  status: 'success' | 'error';
  data?: T;
  meta?: PaginationMeta;
  message?: string;
  code?: number;
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  total_pages: number;
}
```

### 5.3 Service Pattern (MANDATORY)

```typescript
// src/app/core/services/breach.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ApiResponse, Breach } from '../models';

export interface BreachFilterParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  order?: 'asc' | 'desc';
  severity?: string;
  status?: string;
  industry?: string;
  search?: string;
}

@Injectable({ providedIn: 'root' })
export class BreachService {
  private readonly apiUrl = `${environment.apiUrl}/breaches`;

  constructor(private http: HttpClient) {}

  getBreaches(filters: BreachFilterParams = {}): Observable<ApiResponse<Breach[]>> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });
    return this.http.get<ApiResponse<Breach[]>>(this.apiUrl, { params });
  }

  getBreachById(id: string): Observable<ApiResponse<Breach>> {
    return this.http.get<ApiResponse<Breach>>(`${this.apiUrl}/${id}`);
  }

  createBreach(data: Partial<Breach>): Observable<ApiResponse<Breach>> {
    return this.http.post<ApiResponse<Breach>>(this.apiUrl, data);
  }

  updateBreach(id: string, data: Partial<Breach>): Observable<ApiResponse<Breach>> {
    return this.http.put<ApiResponse<Breach>>(`${this.apiUrl}/${id}`, data);
  }

  patchBreach(id: string, data: Partial<Breach>): Observable<ApiResponse<Breach>> {
    return this.http.patch<ApiResponse<Breach>>(`${this.apiUrl}/${id}`, data);
  }

  deleteBreach(id: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${id}`);
  }
}
```

### 5.4 HTTP Interceptor (MANDATORY)

```typescript
// src/app/core/interceptors/auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthService } from '../services/auth.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private authService: AuthService) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    const token = this.authService.getToken();
    if (token) {
      const cloned = req.clone({
        setHeaders: { 'x-access-token': token }
      });
      return next.handle(cloned);
    }
    return next.handle(req);
  }
}

// src/app/core/interceptors/error.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { NotificationService } from '../services/notification.service';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private router: Router,
    private authService: AuthService,
    private notificationService: NotificationService
  ) {}

  intercept(req: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(req).pipe(
      catchError((error: HttpErrorResponse) => {
        if (error.status === 401) {
          this.authService.logout();
          this.router.navigate(['/login'], { queryParams: { returnUrl: this.router.url } });
        } else if (error.status === 403) {
          this.router.navigate(['/forbidden']);
        } else if (error.status >= 500) {
          this.notificationService.showError('A server error occurred. Please try again later.');
        }
        return throwError(() => error);
      })
    );
  }
}
```

### 5.5 Route Guard Pattern (MANDATORY)

```typescript
// src/app/core/guards/auth.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  if (authService.isAuthenticated()) {
    return true;
  }
  return router.createUrlTree(['/login'], { queryParams: { returnUrl: state.url } });
};

// src/app/core/guards/role.guard.ts
import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const roleGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);
  const requiredRoles: string[] = route.data['roles'] ?? [];
  const userRole = authService.getCurrentUserRole();

  if (requiredRoles.length === 0 || requiredRoles.includes(userRole ?? '')) {
    return true;
  }
  return router.createUrlTree(['/forbidden']);
};

// Usage in routing module:
// { path: 'admin', loadChildren: ..., canActivate: [authGuard, roleGuard], data: { roles: ['admin'] } }
```

### 5.6 Reactive Form Pattern (MANDATORY)

```typescript
// CORRECT — Always use FormBuilder, always define validators inline
// NEVER use template-driven forms (#f="ngForm" pattern)
export class BreachFormComponent implements OnInit {
  breachForm!: FormGroup;

  constructor(private fb: FormBuilder) {}

  ngOnInit(): void {
    this.breachForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(200)]],
      severity: ['', [Validators.required, Validators.pattern(/^(critical|high|medium|low|informational)$/)]],
      breach_date: ['', Validators.required],
      affected_records_count: [0, [Validators.required, Validators.min(0)]],
      organisation: this.fb.group({
        name: ['', Validators.required],
        domain: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/)]],
        country: ['', Validators.required],
        size: ['', Validators.required]
      })
    });
  }
}
```

---

## 6. MongoDB Standards

### 6.1 Index Strategy (MANDATORY — All indexes must be created before any queries)

```javascript
// Backend seed or init script must create these indexes:

// 2dsphere index for geospatial queries
db.breaches.createIndex({ "location": "2dsphere" })

// Compound index for multi-field filtering
db.breaches.createIndex({ "severity": 1, "industry": 1, "status": 1 })

// Text index for full-text search
db.breaches.createIndex({ "title": "text", "description": "text" })

// Individual indexes for common query fields
db.breaches.createIndex({ "breach_date": -1 })
db.breaches.createIndex({ "risk_score": -1 })
db.breaches.createIndex({ "organisation.domain": 1 })

// Users collection
db.users.createIndex({ "email": 1 }, { unique: true })
db.users.createIndex({ "username": 1 }, { unique: true })
```

### 6.2 Geospatial Query Patterns

```python
# $near query — breaches within radius (in metres)
# ALWAYS use with 2dsphere index; ALWAYS validate coordinates before passing to MongoDB

def find_breaches_near(longitude: float, latitude: float, max_distance_metres: int) -> list:
    # Validate coordinates before querying MongoDB
    if not isinstance(longitude, (int, float)) or longitude is None:
        raise ValueError("Longitude must be a numeric value")
    if not isinstance(latitude, (int, float)) or latitude is None:
        raise ValueError("Latitude must be a numeric value")
    if longitude < -180 or longitude > 180:
        raise ValueError("Longitude must be within [-180, 180]")
    if latitude < -90 or latitude > 90:
        raise ValueError("Latitude must be within [-90, 90]")

    # Validate max_distance_metres
    if not isinstance(max_distance_metres, (int, float)) or max_distance_metres is None:
        raise ValueError("max_distance_metres must be a numeric value")
    if max_distance_metres < 0:
        raise ValueError("max_distance_metres must be non-negative")
    if max_distance_metres > 20_000_000:  # 20,000 km limit (half Earth circumference)
        raise ValueError("max_distance_metres exceeds reasonable limit (max 20,000,000)")

    return list(mongo.db.breaches.find({
        "location": {
            "$near": {
                "$geometry": {
                    "type": "Point",
                    "coordinates": [longitude, latitude]
                },
                "$maxDistance": max_distance_metres
            }
        }
    }))

# GeoJSON Feature Collection for Leaflet
def to_geojson_feature_collection(breaches: list) -> dict:
    features = []
    for breach in breaches:
        if breach.get("location"):
            features.append({
                "type": "Feature",
                "geometry": breach["location"],
                "properties": {
                    "id": str(breach["_id"]),
                    "title": breach["title"],
                    "severity": breach["severity"],
                    "risk_score": breach.get("risk_score", 0),
                    "affected_records_count": breach.get("affected_records_count", 0),
                    "industry": breach.get("industry")
                }
            })
    return {"type": "FeatureCollection", "features": features}
```

### 6.3 Aggregation Pipeline Patterns (MANDATORY — Use these; never use Python-side aggregation)

```python
# Risk score by industry — CANONICAL PIPELINE EXAMPLE
# ALL aggregation must happen in MongoDB, never in Python

def get_risk_by_industry() -> list:
    pipeline = [
        {
            "$match": {
                "risk_score": {"$exists": True, "$ne": None}
            }
        },
        {
            "$group": {
                "_id": "$industry",
                "avg_risk_score": {"$avg": "$risk_score"},
                "max_risk_score": {"$max": "$risk_score"},
                "min_risk_score": {"$min": "$risk_score"},
                "breach_count": {"$sum": 1},
                "total_records_exposed": {"$sum": "$affected_records_count"}
            }
        },
        {
            "$project": {
                "_id": 0,
                "industry": "$_id",
                "avg_risk_score": {"$round": ["$avg_risk_score", 2]},
                "max_risk_score": 1,
                "min_risk_score": 1,
                "breach_count": 1,
                "total_records_exposed": 1
            }
        },
        {
            "$sort": {"avg_risk_score": -1}
        }
    ]
    return list(mongo.db.breaches.aggregate(pipeline))


# Remediation rate — demonstrates $unwind on sub-documents
def get_remediation_completion_rate() -> list:
    pipeline = [
        {"$unwind": "$remediation"},
        {
            "$group": {
                "_id": {
                    "breach_id": "$_id",
                    "title": "$title",
                    "status": "$remediation.status"
                },
                "count": {"$sum": 1}
            }
        },
        {
            "$group": {
                "_id": {
                    "breach_id": "$_id.breach_id",
                    "title": "$_id.title"
                },
                "total": {"$sum": "$count"},
                "completed": {
                    "$sum": {
                        "$cond": [{"$eq": ["$_id.status", "completed"]}, "$count", 0]
                    }
                }
            }
        },
        {
            "$project": {
                "_id": 0,
                "breach_id": {"$toString": "$_id.breach_id"},
                "title": "$_id.title",
                "total_actions": "$total",
                "completed_actions": "$completed",
                "completion_rate": {
                    "$round": [
                        {"$multiply": [{"$divide": ["$completed", "$total"]}, 100]},
                        1
                    ]
                }
            }
        },
        {"$sort": {"completion_rate": 1}}
    ]
    return list(mongo.db.breaches.aggregate(pipeline))
```

### 6.4 Sub-document Update Patterns (MANDATORY)

```python
# ADD to sub-document array — $push
def add_affected_account(breach_id: str, account_data: dict) -> dict:
    account_data["_id"] = ObjectId()
    result = mongo.db.breaches.find_one_and_update(
        {"_id": ObjectId(breach_id)},
        {"$push": {"affected_accounts": account_data}, "$set": {"updated_at": datetime.utcnow()}},
        return_document=True
    )
    return result

# UPDATE specific sub-document — positional $ operator
def update_affected_account(breach_id: str, account_id: str, updates: dict) -> dict:
    set_fields = {f"affected_accounts.$.{k}": v for k, v in updates.items()}
    set_fields["updated_at"] = datetime.utcnow()
    return mongo.db.breaches.find_one_and_update(
        {
            "_id": ObjectId(breach_id),
            "affected_accounts._id": ObjectId(account_id)
        },
        {"$set": set_fields},
        return_document=True
    )

# REMOVE from sub-document array — $pull
def remove_affected_account(breach_id: str, account_id: str) -> dict:
    return mongo.db.breaches.find_one_and_update(
        {"_id": ObjectId(breach_id)},
        {
            "$pull": {"affected_accounts": {"_id": ObjectId(account_id)}},
            "$set": {"updated_at": datetime.utcnow()}
        },
        return_document=True
    )
```

---

## 7. Mandatory Implementation Rules

These rules are absolute. The AI assistant **MUST NOT** generate code that violates them.

### RULE-01: Always Validate Inputs Before Any Database Operation
```python
# CORRECT
def create_breach(data: dict) -> tuple[dict, int]:
    errors = validate_breach_input(data)  # Validates FIRST
    if errors:
        return error_response("Validation failed.", 422, errors), 422
    # ... then proceed to DB

# WRONG — never do this
def create_breach(data: dict):
    mongo.db.breaches.insert_one(data)  # No validation!
```

### RULE-02: Always Return Correct HTTP Status Codes
```python
# Reference table — NEVER deviate
# 200 — Successful GET / PUT / PATCH response with body
# 201 — Successful POST (resource created) — include Location header
# 204 — Successful DELETE (no response body)
# 400 — Malformed request (bad JSON, wrong Content-Type)
# 401 — Missing or invalid JWT token
# 403 — Valid token but insufficient role
# 404 — Resource not found (never 200 with null data)
# 422 — Validation failed (correct field types but invalid values)
# 500 — Unhandled server exception
```

### RULE-03: Always Use Structured JSON Error Responses
```python
# EVERY error response must match this schema exactly:
{"status": "error", "message": "<human-readable>", "code": <int>}

# Validation errors include details:
{"status": "error", "message": "Validation failed.", "code": 422, "details": {"title": "must be at least 5 characters"}}
```

### RULE-04: Never Expose Internal Errors to the Client
```python
# WRONG
return jsonify({"error": str(e)}), 500  # Exposes stack trace/internal info

# CORRECT
app.logger.error(f"Unhandled exception: {e}", exc_info=True)
return error_response("An internal server error occurred.", 500)
```

### RULE-05: Never Store Plaintext Passwords
```python
# ALWAYS hash with bcrypt before insert
password_hash = bcrypt.generate_password_hash(password, rounds=12).decode("utf-8")
# NEVER store the raw password string
```

### RULE-06: Always Paginate List Endpoints
```python
# EVERY collection endpoint MUST support pagination
page = int(request.args.get("page", 1))
limit = min(int(request.args.get("limit", 20)), 100)  # Cap at 100
skip = (page - 1) * limit
total = mongo.db.breaches.count_documents(query_filter)
documents = list(mongo.db.breaches.find(query_filter).sort(...).skip(skip).limit(limit))
```

### RULE-07: Never Perform Aggregation in Python
All grouping, sorting, filtering, and mathematical operations on datasets **must** use MongoDB aggregation pipelines. Python is only used to pass the pipeline and serialise the result.

### RULE-08: Always Redact Sensitive Fields for Guest Role
```python
# Remove affected_accounts from responses for Guest / unauthenticated users
projection = {"affected_accounts": 0} if role == "guest" else {}
```

### RULE-09: Always Update `updated_at` on Any Mutation
```python
# Every $set or $push must include:
"$set": {"updated_at": datetime.utcnow(), ...other_fields}
```

### RULE-10: Angular — Never Use `any` Type
```typescript
// WRONG
const response: any = await this.http.get(url).toPromise();

// CORRECT (RxJS 7+)
import { firstValueFrom } from 'rxjs';
const response = await firstValueFrom(this.http.get<ApiResponse<Breach>>(url));
```

---

## 8. HTTP & REST Standards

### 8.1 URI Conventions
```
# CORRECT — nouns only, plural, hierarchical
GET    /api/v1/breaches
GET    /api/v1/breaches/{id}
POST   /api/v1/breaches
PUT    /api/v1/breaches/{id}
PATCH  /api/v1/breaches/{id}
DELETE /api/v1/breaches/{id}
GET    /api/v1/breaches/{id}/affected-accounts
POST   /api/v1/breaches/{id}/affected-accounts
GET    /api/v1/analytics/risk-by-industry

# WRONG — verbs in URIs
GET  /api/v1/getBreaches          # verb in URI
POST /api/v1/breaches/create      # verb in URI
GET  /api/v1/breaches/deleteAll   # verb in URI (also dangerous!)
```

### 8.2 Versioning
All API routes **must** be prefixed with `/api/v1/`. This is mandatory.

### 8.3 Content-Type
All API responses **must** return `Content-Type: application/json`.

### 8.4 Query Parameter Conventions

| Parameter | Type | Description |
|-----------|------|-------------|
| `page` | integer ≥ 1 | Pagination page number (default: 1) |
| `limit` | integer 1–100 | Items per page (default: 20) |
| `sort_by` | string | Field name to sort by |
| `order` | `asc` \| `desc` | Sort direction (default: `desc`) |
| `severity` | enum string | Filter by severity level |
| `status` | enum string | Filter by breach status |
| `industry` | enum string | Filter by industry |
| `search` | string | Full-text search query |

---

## 9. Authentication & Security Rules

### 9.1 JWT Configuration
```python
# config.py — uses raw PyJWT (not Flask-JWT-Extended)
SECRET_KEY = os.environ.get("SECRET_KEY")                # MUST be from env var
JWT_ACCESS_TOKEN_EXPIRES = timedelta(hours=1)
# Token is sent via x-access-token header, decoded with jwt.decode()
# NEVER hardcode SECRET_KEY in source code
```

### 9.2 Token Generation (raw PyJWT)
```python
import jwt as pyjwt

# When issuing a token, include user, admin flag, and role:
token = pyjwt.encode(
    {
        "user": user["username"],
        "user_id": str(user["_id"]),
        "admin": user.get("role") == "admin",
        "role": user.get("role", "guest"),
        "exp": datetime.utcnow() + timedelta(hours=1),
    },
    current_app.config["SECRET_KEY"],
    algorithm="HS256",
)
```

### 9.3 Login Endpoint (Basic Auth — Module Requirement)
```python
# GET /api/v1/login  — HTTP Basic Authentication
# Authorization: Basic base64(username:password)
# Returns: {"token": "eyJ...", "token_type": "JWT", "expires_in": 3600}
```

### 9.4 Token Blacklist (MongoDB)
```python
# Logout stores the FULL token in MongoDB blacklist collection
mongo.db["blacklist"].update_one(
    {"token": token},
    {"$set": {"token": token, "blacklisted_at": datetime.utcnow()}},
    upsert=True,
)
# Decorators check blacklist via find_one({"token": token})
```

### 9.5 RBAC Route Matrix

| Role | GET (public) | GET (protected) | POST | PUT/PATCH | DELETE | Admin routes |
|------|-------------|-----------------|------|-----------|--------|-------------|
| Guest (no token) | ✅ | ❌ | ❌ | ❌ | ❌ | ❌ |
| Analyst | ✅ | ✅ | ✅ | ✅ (own records) | ❌ | ❌ |
| Admin | ✅ | ✅ | ✅ | ✅ | ✅ | ✅ |

---

## 10. Error Handling Contract

### 10.1 Universal Error Response Schema
```json
{
  "status": "error",
  "message": "Human-readable description of the error",
  "code": 422,
  "details": {
    "field_name": "Specific validation message for this field"
  }
}
```
- `status`: Always `"error"` for non-2xx responses.
- `message`: Always a human-readable string. Never expose exception messages.
- `code`: Always matches the HTTP status code.
- `details`: Optional. Present for 422 validation errors only.

### 10.2 Universal Success Response Schema
```json
{
  "status": "success",
  "data": { ... },
  "meta": {
    "page": 1,
    "limit": 20,
    "total": 147,
    "total_pages": 8
  }
}
```
- `meta` is only present on paginated list responses.
- `data` is `null` for 204 responses (no body at all for DELETE).

---

## 11. Testing Standards

### 11.1 Backend Test Rules
- Every route must have at least: success case, 404 case, auth failure case, validation failure case.
- Use `pytest` fixtures for test database setup/teardown.
- Use `mongomock` for unit tests; real MongoDB for integration tests.
- All Postman tests must assert: status code, response schema, data presence.

### 11.2 Frontend Test Rules
- Every Angular service must have unit tests for each public method.
- Every route guard must have tests for: authorised pass, unauthorised redirect.
- Every interceptor must have tests for: token injection, 401 handling, 403 handling.
- Use `HttpClientTestingModule` for all service tests.
- Never skip tests with `fdescribe`/`fit` in committed code.

---

## 12. What NOT To Do

The AI assistant **MUST NEVER** do any of the following:

| ❌ Anti-Pattern | ✅ Required Alternative |
|----------------|------------------------|
| Use `app.route()` directly — must use Blueprints | Use Blueprint route decorators |
| Perform MongoDB queries directly in route handlers | Always use service layer |
| Return raw `jsonify({"error": ...})` in routes | Use `error_response()` helper |
| Use `any` type in TypeScript | Always define proper interfaces |
| Use template-driven Angular forms | Always use Reactive Forms |
| Store JWT secret in source code | Read from environment variable |
| Aggregate data in Python loops | Use MongoDB aggregation pipelines |
| Return 200 for resource-not-found | Return 404 |
| Skip validation for PATCH (partial update) | Validate provided fields even for PATCH |
| Use `subscribe()` inside services | Return `Observable` from services; subscribe in components |
| Use `document.getElementById` in Angular | Use `@ViewChild` or template binding |
| Catch errors silently | Always log server errors; always return structured error response |
| Disable `strictNullChecks` to fix TS errors | Fix the actual null safety issue |
| Use `*` for CORS origins in production config | Configure specific allowed origins |

---

*AGENTS.md v1.0.0 – BreachLens – COM661 Individual Coursework*
*This file must be included in the submission pack and referenced in the project README.*
