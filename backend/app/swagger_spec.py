"""
swagger_spec.py — Full OpenAPI/Swagger 2.0 specification for BreachLens.

Loaded by flasgger in the application factory to serve interactive
Swagger UI at /api/docs.
"""

SWAGGER_TEMPLATE: dict = {
    "swagger": "2.0",
    "info": {
        "title": "BreachLens API",
        "description": (
            "Dark Web Breach Intelligence Tracker API.\n\n"
            "**Authentication:** All protected endpoints require an `Authorization: Bearer <token>` "
            "header obtained from `GET /api/v1/login` (Basic Auth) or `POST /api/v1/auth/login`.\n\n"
            "Legacy support for `x-access-token` is maintained for backward compatibility.\n\n"
            "**Roles:** `guest` · `analyst` · `admin`"
        ),
        "version": "2.1.0",
        "contact": {"email": "admin@breachlens.io"},
    },
    "basePath": "/api/v1",
    "schemes": ["http", "https"],
    "consumes": ["application/json"],
    "produces": ["application/json"],
    "securityDefinitions": {
        "Bearer": {
            "type": "apiKey",
            "in": "header",
            "name": "Authorization",
            "description": 'Enter your JWT token with the "Bearer " prefix (e.g., Bearer eyJhbGci...)',
        }
    },
    "tags": [
        {"name": "Auth",            "description": "Registration, login, tokens"},
        {"name": "Breaches",        "description": "Breach record CRUD"},
        {"name": "Affected Accounts","description": "Sub-document: affected accounts"},
        {"name": "Timeline",        "description": "Sub-document: breach timeline events"},
        {"name": "Remediation",     "description": "Sub-document: remediation actions"},
        {"name": "Alerts",          "description": "Sub-document: monitoring alerts"},
        {"name": "Geospatial",      "description": "Location-based breach queries"},
        {"name": "Analytics",       "description": "Aggregation pipelines & trend data"},
        {"name": "Exposure",        "description": "Email / domain exposure check"},
        {"name": "Users",           "description": "User management"},
        {"name": "Admin",           "description": "Admin-only operations"},
    ],
    "paths": {
        # ------------------------------------------------------------------ #
        # AUTH                                                                 #
        # ------------------------------------------------------------------ #
        "/auth/register": {
            "post": {
                "tags": ["Auth"],
                "summary": "Register a new user",
                "parameters": [{
                    "in": "body", "name": "body", "required": True,
                    "schema": {
                        "type": "object",
                        "required": ["username", "email", "password"],
                        "properties": {
                            "username": {"type": "string", "example": "jdoe"},
                            "email":    {"type": "string", "example": "jdoe@example.com"},
                            "password": {"type": "string", "example": "SecurePass1"},
                            "role":     {"type": "string", "enum": ["guest", "analyst"], "default": "guest"},
                        },
                    },
                }],
                "responses": {
                    "201": {"description": "User created"},
                    "409": {"description": "Email or username already taken"},
                    "422": {"description": "Validation error"},
                },
            }
        },
        "/auth/login": {
            "post": {
                "tags": ["Auth"],
                "summary": "Login and obtain JWT tokens",
                "parameters": [{
                    "in": "body", "name": "body", "required": True,
                    "schema": {
                        "type": "object",
                        "required": ["email", "password"],
                        "properties": {
                            "email":    {"type": "string", "example": "admin@breachlens.io"},
                            "password": {"type": "string", "example": "AdminPass1"},
                        },
                    },
                }],
                "responses": {
                    "200": {"description": "Returns token and token_type JWT"},
                    "401": {"description": "Invalid credentials"},
                },
            }
        },
        "/auth/logout": {
            "post": {
                "tags": ["Auth"],
                "summary": "Logout (blacklist token in MongoDB)",
                "security": [{"Bearer": []}],
                "responses": {
                    "204": {"description": "Logged out"},
                    "401": {"description": "Unauthorised"},
                },
            }
        },
        "/auth/me": {
            "get": {
                "tags": ["Auth"],
                "summary": "Get the currently authenticated user's profile",
                "security": [{"Bearer": []}],
                "responses": {
                    "200": {"description": "Current user object"},
                    "401": {"description": "Unauthorised"},
                    "404": {"description": "User not found"},
                },
            }
        },

        # ------------------------------------------------------------------ #
        # BREACHES CRUD                                                        #
        # ------------------------------------------------------------------ #
        "/breaches/": {
            "get": {
                "tags": ["Breaches"],
                "summary": "List breaches with filtering & pagination",
                "parameters": [
                    {"in": "query", "name": "page",     "type": "integer", "default": 1},
                    {"in": "query", "name": "limit",    "type": "integer", "default": 20},
                    {"in": "query", "name": "severity", "type": "string",
                     "enum": ["critical", "high", "medium", "low"]},
                    {"in": "query", "name": "status",   "type": "string",
                     "enum": ["active", "contained", "resolved"]},
                    {"in": "query", "name": "industry", "type": "string"},
                    {"in": "query", "name": "search",   "type": "string",
                     "description": "Full-text search on title / description"},
                    {"in": "query", "name": "min_risk", "type": "number"},
                    {"in": "query", "name": "max_risk", "type": "number"},
                    {"in": "query", "name": "sort_by",  "type": "string", "default": "created_at"},
                    {"in": "query", "name": "order",    "type": "string",
                     "enum": ["asc", "desc"], "default": "desc"},
                ],
                "responses": {
                    "200": {"description": "Paginated breach list"},
                    "400": {"description": "Invalid query parameters"},
                },
            },
            "post": {
                "tags": ["Breaches"],
                "summary": "Create a new breach record (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [{
                    "in": "body", "name": "body", "required": True,
                    "schema": {"$ref": "#/definitions/BreachInput"},
                }],
                "responses": {
                    "201": {"description": "Breach created"},
                    "401": {"description": "Unauthorised"},
                    "403": {"description": "Forbidden"},
                    "422": {"description": "Validation error"},
                },
            },
        },
        "/breaches/{breach_id}": {
            "get": {
                "tags": ["Breaches"],
                "summary": "Get a single breach by MongoDB ObjectId",
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                ],
                "responses": {
                    "200": {"description": "Breach object"},
                    "400": {"description": "Invalid ID format"},
                    "404": {"description": "Not found"},
                },
            },
            "put": {
                "tags": ["Breaches"],
                "summary": "Full replacement update of a breach (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path",  "name": "breach_id", "type": "string", "required": True},
                    {"in": "body",  "name": "body",       "required": True,
                     "schema": {"$ref": "#/definitions/BreachInput"}},
                ],
                "responses": {
                    "200": {"description": "Updated breach"},
                    "403": {"description": "Forbidden – not the record owner"},
                    "404": {"description": "Not found"},
                    "422": {"description": "Validation error"},
                },
            },
            "patch": {
                "tags": ["Breaches"],
                "summary": "Partial update of a breach (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path",  "name": "breach_id", "type": "string", "required": True},
                    {"in": "body",  "name": "body",       "required": True,
                     "schema": {"$ref": "#/definitions/BreachPatch"}},
                ],
                "responses": {
                    "200": {"description": "Updated breach"},
                    "403": {"description": "Forbidden"},
                    "404": {"description": "Not found"},
                },
            },
            "delete": {
                "tags": ["Breaches"],
                "summary": "Delete a breach (admin only)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                ],
                "responses": {
                    "204": {"description": "Deleted"},
                    "403": {"description": "Forbidden"},
                    "404": {"description": "Not found"},
                },
            },
        },

        # ------------------------------------------------------------------ #
        # EXPOSURE CHECK                                                        #
        # ------------------------------------------------------------------ #
        "/breaches/exposure-check": {
            "get": {
                "tags": ["Exposure"],
                "summary": "Check if an email or domain appears in any breach",
                "parameters": [
                    {"in": "query", "name": "email",  "type": "string",
                     "description": "Email address to check (mutually exclusive with domain)"},
                    {"in": "query", "name": "domain", "type": "string",
                     "description": "Domain name to check (mutually exclusive with email)"},
                ],
                "responses": {
                    "200": {"description": "Exposure summary"},
                    "400": {"description": "Neither email nor domain provided"},
                    "422": {"description": "Invalid email / domain format"},
                },
            }
        },

        # ------------------------------------------------------------------ #
        # GEOSPATIAL                                                            #
        # ------------------------------------------------------------------ #
        "/breaches/geo/near": {
            "get": {
                "tags": ["Geospatial"],
                "summary": "Find breaches near a coordinate within a given radius",
                "parameters": [
                    {"in": "query", "name": "longitude", "type": "number", "required": True},
                    {"in": "query", "name": "latitude",  "type": "number", "required": True},
                    {"in": "query", "name": "radius",    "type": "integer",
                     "description": "Radius in metres (1–500000)", "default": 50000},
                ],
                "responses": {
                    "200": {"description": "GeoJSON FeatureCollection"},
                    "400": {"description": "Missing or invalid coordinate params"},
                },
            }
        },
        "/breaches/geo/within-bounds": {
            "get": {
                "tags": ["Geospatial"],
                "summary": "Find breaches within a bounding box",
                "parameters": [
                    {"in": "query", "name": "min_lng", "type": "number", "required": True},
                    {"in": "query", "name": "min_lat", "type": "number", "required": True},
                    {"in": "query", "name": "max_lng", "type": "number", "required": True},
                    {"in": "query", "name": "max_lat", "type": "number", "required": True},
                ],
                "responses": {
                    "200": {"description": "GeoJSON FeatureCollection"},
                    "422": {"description": "Invalid bounding box"},
                },
            }
        },
        "/breaches/geo/geojson": {
            "get": {
                "tags": ["Geospatial"],
                "summary": "Return all breach locations as GeoJSON with optional filters",
                "parameters": [
                    {"in": "query", "name": "severity", "type": "string",
                     "enum": ["critical", "high", "medium", "low"]},
                    {"in": "query", "name": "industry", "type": "string"},
                ],
                "responses": {"200": {"description": "GeoJSON FeatureCollection"}},
            }
        },

        # ------------------------------------------------------------------ #
        # AFFECTED ACCOUNTS SUB-DOC                                             #
        # ------------------------------------------------------------------ #
        "/breaches/{breach_id}/affected-accounts": {
            "get": {
                "tags": ["Affected Accounts"],
                "summary": "List all affected accounts for a breach (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [{"in": "path", "name": "breach_id", "type": "string", "required": True}],
                "responses": {"200": {"description": "Array of account objects"}, "404": {"description": "Breach not found"}},
            },
            "post": {
                "tags": ["Affected Accounts"],
                "summary": "Add an affected account to a breach (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "body", "name": "body", "required": True,
                     "schema": {"$ref": "#/definitions/AffectedAccount"}},
                ],
                "responses": {"201": {"description": "Account added"}, "422": {"description": "Validation error"}},
            },
        },
        "/breaches/{breach_id}/affected-accounts/{account_id}": {
            "get": {
                "tags": ["Affected Accounts"],
                "summary": "Get a single affected account (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id",  "type": "string", "required": True},
                    {"in": "path", "name": "account_id", "type": "string", "required": True},
                ],
                "responses": {"200": {"description": "Account object"}, "404": {"description": "Not found"}},
            },
            "patch": {
                "tags": ["Affected Accounts"],
                "summary": "Update an affected account (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id",  "type": "string", "required": True},
                    {"in": "path", "name": "account_id", "type": "string", "required": True},
                    {"in": "body", "name": "body", "required": True, "schema": {"type": "object"}},
                ],
                "responses": {"200": {"description": "Updated account"}, "404": {"description": "Not found"}},
            },
            "delete": {
                "tags": ["Affected Accounts"],
                "summary": "Delete an affected account (admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id",  "type": "string", "required": True},
                    {"in": "path", "name": "account_id", "type": "string", "required": True},
                ],
                "responses": {"204": {"description": "Deleted"}, "404": {"description": "Not found"}},
            },
        },

        # ------------------------------------------------------------------ #
        # TIMELINE SUB-DOC                                                     #
        # ------------------------------------------------------------------ #
        "/breaches/{breach_id}/timeline": {
            "get": {
                "tags": ["Timeline"],
                "summary": "List timeline events for a breach",
                "security": [{"Bearer": []}],
                "parameters": [{"in": "path", "name": "breach_id", "type": "string", "required": True}],
                "responses": {"200": {"description": "Array of timeline events"}, "404": {"description": "Not found"}},
            },
            "post": {
                "tags": ["Timeline"],
                "summary": "Add a timeline event (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "body", "name": "body", "required": True,
                     "schema": {"$ref": "#/definitions/TimelineEvent"}},
                ],
                "responses": {"201": {"description": "Event added"}, "422": {"description": "Validation error"}},
            },
        },
        "/breaches/{breach_id}/timeline/{event_id}": {
            "get": {
                "tags": ["Timeline"],
                "summary": "Get a single timeline event",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "path", "name": "event_id",  "type": "string", "required": True},
                ],
                "responses": {"200": {"description": "Event object"}, "404": {"description": "Not found"}},
            },
            "patch": {
                "tags": ["Timeline"],
                "summary": "Update a timeline event (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "path", "name": "event_id",  "type": "string", "required": True},
                    {"in": "body", "name": "body", "required": True, "schema": {"type": "object"}},
                ],
                "responses": {"200": {"description": "Updated event"}},
            },
            "delete": {
                "tags": ["Timeline"],
                "summary": "Delete a timeline event (admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "path", "name": "event_id",  "type": "string", "required": True},
                ],
                "responses": {"204": {"description": "Deleted"}},
            },
        },

        # ------------------------------------------------------------------ #
        # REMEDIATION SUB-DOC                                                  #
        # ------------------------------------------------------------------ #
        "/breaches/{breach_id}/remediation": {
            "get": {
                "tags": ["Remediation"],
                "summary": "List remediation actions for a breach",
                "security": [{"Bearer": []}],
                "parameters": [{"in": "path", "name": "breach_id", "type": "string", "required": True}],
                "responses": {"200": {"description": "Array of remediation actions"}, "404": {"description": "Not found"}},
            },
            "post": {
                "tags": ["Remediation"],
                "summary": "Add a remediation action (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "body", "name": "body", "required": True,
                     "schema": {"$ref": "#/definitions/RemediationAction"}},
                ],
                "responses": {"201": {"description": "Action added"}, "422": {"description": "Validation error"}},
            },
        },
        "/breaches/{breach_id}/remediation/{action_id}": {
            "get": {
                "tags": ["Remediation"],
                "summary": "Get a single remediation action",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "path", "name": "action_id", "type": "string", "required": True},
                ],
                "responses": {"200": {"description": "Action object"}, "404": {"description": "Not found"}},
            },
            "patch": {
                "tags": ["Remediation"],
                "summary": "Update a remediation action (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "path", "name": "action_id", "type": "string", "required": True},
                    {"in": "body", "name": "body", "required": True, "schema": {"type": "object"}},
                ],
                "responses": {"200": {"description": "Updated action"}},
            },
            "delete": {
                "tags": ["Remediation"],
                "summary": "Delete a remediation action (admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "path", "name": "action_id", "type": "string", "required": True},
                ],
                "responses": {"204": {"description": "Deleted"}},
            },
        },

        # ------------------------------------------------------------------ #
        # ALERTS SUB-DOC                                                        #
        # ------------------------------------------------------------------ #
        "/breaches/{breach_id}/alerts": {
            "get": {
                "tags": ["Alerts"],
                "summary": "List monitoring alerts for a breach",
                "security": [{"Bearer": []}],
                "parameters": [{"in": "path", "name": "breach_id", "type": "string", "required": True}],
                "responses": {"200": {"description": "Array of alerts"}, "404": {"description": "Not found"}},
            },
            "post": {
                "tags": ["Alerts"],
                "summary": "Create a monitoring alert (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "body", "name": "body", "required": True,
                     "schema": {"$ref": "#/definitions/MonitoringAlert"}},
                ],
                "responses": {"201": {"description": "Alert created"}, "422": {"description": "Validation error"}},
            },
        },
        "/breaches/{breach_id}/alerts/{alert_id}": {
            "get": {
                "tags": ["Alerts"],
                "summary": "Get a single alert",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "path", "name": "alert_id",  "type": "string", "required": True},
                ],
                "responses": {"200": {"description": "Alert object"}, "404": {"description": "Not found"}},
            },
            "patch": {
                "tags": ["Alerts"],
                "summary": "Update an alert (analyst/admin, e.g. acknowledge it)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "path", "name": "alert_id",  "type": "string", "required": True},
                    {"in": "body", "name": "body", "required": True, "schema": {"type": "object"}},
                ],
                "responses": {"200": {"description": "Updated alert"}},
            },
            "delete": {
                "tags": ["Alerts"],
                "summary": "Delete an alert (admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "breach_id", "type": "string", "required": True},
                    {"in": "path", "name": "alert_id",  "type": "string", "required": True},
                ],
                "responses": {"204": {"description": "Deleted"}},
            },
        },

        # ------------------------------------------------------------------ #
        # ANALYTICS                                                            #
        # ------------------------------------------------------------------ #
        "/analytics/risk-by-industry": {
            "get": {
                "tags": ["Analytics"],
                "summary": "Average risk score grouped by industry (analyst/admin)",
                "security": [{"Bearer": []}],
                "responses": {"200": {"description": "Array of {_id, avg_risk, count}"}},
            }
        },
        "/analytics/severity-breakdown": {
            "get": {
                "tags": ["Analytics"],
                "summary": "Count of breaches by severity level",
                "responses": {"200": {"description": "Array of {severity, count}"}},
            }
        },
        "/analytics/monthly-trend": {
            "get": {
                "tags": ["Analytics"],
                "summary": "Number of breaches disclosed per calendar month",
                "parameters": [
                    {"in": "query", "name": "year", "type": "integer",
                     "description": "Filter to a specific year (omit for all years)"},
                ],
                "responses": {"200": {"description": "Array of {year, month, count}"}},
            }
        },
        "/analytics/top-organisations": {
            "get": {
                "tags": ["Analytics"],
                "summary": "Organisations with the most breaches (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "query", "name": "limit", "type": "integer",
                     "default": 10, "description": "Max 25"},
                ],
                "responses": {"200": {"description": "Array of {org_name, breach_count, avg_risk}"}},
            }
        },
        "/analytics/data-types-frequency": {
            "get": {
                "tags": ["Analytics"],
                "summary": "Most commonly exposed data types across all breaches",
                "responses": {"200": {"description": "Array of {data_type, count}"}},
            }
        },
        "/analytics/remediation-rate": {
            "get": {
                "tags": ["Analytics"],
                "summary": "Percentage of breaches with at least one completed remediation action (analyst/admin)",
                "security": [{"Bearer": []}],
                "responses": {"200": {"description": "Remediation rate statistics"}},
            }
        },
        "/analytics/alert-acknowledgement": {
            "get": {
                "tags": ["Analytics"],
                "summary": "Alert acknowledgement rate breakdown (analyst/admin)",
                "security": [{"Bearer": []}],
                "responses": {"200": {"description": "Alert acknowledgement statistics"}},
            }
        },
        "/analytics/industry-year-trend": {
            "get": {
                "tags": ["Analytics"],
                "summary": "Breach count by industry and year (analyst/admin)",
                "security": [{"Bearer": []}],
                "responses": {"200": {"description": "Array of {industry, year, count}"}},
            }
        },
        "/analytics/risk-scores": {
            "get": {
                "tags": ["Analytics"],
                "summary": "Risk score frequency distribution (histogram)",
                "parameters": [
                    {"in": "query", "name": "bins", "type": "integer",
                     "default": 10, "description": "Number of histogram bins (2–20)"},
                ],
                "responses": {"200": {"description": "Array of {range_label, count}"}},
            }
        },
        "/analytics/summary": {
            "get": {
                "tags": ["Analytics"],
                "summary": "High-level summary statistics",
                "responses": {
                    "200": {"description": "total_breaches, total_affected_records, by_severity, etc."},
                },
            }
        },

        # ------------------------------------------------------------------ #
        # USERS                                                                #
        # ------------------------------------------------------------------ #
        "/users/": {
            "get": {
                "tags": ["Users"],
                "summary": "List users with pagination (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "query", "name": "page",  "type": "integer", "default": 1},
                    {"in": "query", "name": "limit", "type": "integer", "default": 20},
                ],
                "responses": {"200": {"description": "Paginated user list"}},
            }
        },
        "/users/{user_id}": {
            "get": {
                "tags": ["Users"],
                "summary": "Get a single user by ID (analyst/admin)",
                "security": [{"Bearer": []}],
                "parameters": [{"in": "path", "name": "user_id", "type": "string", "required": True}],
                "responses": {"200": {"description": "User object"}, "404": {"description": "Not found"}},
            },
            "patch": {
                "tags": ["Users"],
                "summary": "Update own profile fields (authenticated user)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "user_id", "type": "string", "required": True},
                    {"in": "body", "name": "body", "required": True, "schema": {"type": "object"}},
                ],
                "responses": {"200": {"description": "Updated user"}, "403": {"description": "Not own account"}},
            },
            "delete": {
                "tags": ["Users"],
                "summary": "Delete a user (admin only)",
                "security": [{"Bearer": []}],
                "parameters": [{"in": "path", "name": "user_id", "type": "string", "required": True}],
                "responses": {"204": {"description": "Deleted"}, "403": {"description": "Forbidden"}},
            },
        },

        # ------------------------------------------------------------------ #
        # ADMIN                                                                #
        # ------------------------------------------------------------------ #
        "/admin/stats": {
            "get": {
                "tags": ["Admin"],
                "summary": "System-wide statistics dashboard (admin)",
                "security": [{"Bearer": []}],
                "responses": {"200": {"description": "Aggregated system stats"}},
            }
        },
        "/admin/users": {
            "get": {
                "tags": ["Admin"],
                "summary": "List all users with admin view (admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "query", "name": "page",  "type": "integer", "default": 1},
                    {"in": "query", "name": "limit", "type": "integer", "default": 20},
                ],
                "responses": {"200": {"description": "Paginated user list"}},
            }
        },
        "/admin/users/{user_id}/role": {
            "patch": {
                "tags": ["Admin"],
                "summary": "Change a user's role (admin)",
                "security": [{"Bearer": []}],
                "parameters": [
                    {"in": "path", "name": "user_id", "type": "string", "required": True},
                    {"in": "body", "name": "body", "required": True,
                     "schema": {
                         "type": "object", "required": ["role"],
                         "properties": {
                             "role": {"type": "string", "enum": ["guest", "analyst", "admin"]},
                         },
                     }},
                ],
                "responses": {"200": {"description": "Updated user"}, "422": {"description": "Invalid role"}},
            }
        },
        "/admin/users/{user_id}/activate": {
            "patch": {
                "tags": ["Admin"],
                "summary": "Activate a user account (admin)",
                "security": [{"Bearer": []}],
                "parameters": [{"in": "path", "name": "user_id", "type": "string", "required": True}],
                "responses": {"200": {"description": "User activated"}, "404": {"description": "Not found"}},
            }
        },
        "/admin/users/{user_id}/deactivate": {
            "patch": {
                "tags": ["Admin"],
                "summary": "Deactivate a user account (admin)",
                "security": [{"Bearer": []}],
                "parameters": [{"in": "path", "name": "user_id", "type": "string", "required": True}],
                "responses": {"200": {"description": "User deactivated"}, "404": {"description": "Not found"}},
            }
        },
        "/admin/breaches/bulk": {
            "delete": {
                "tags": ["Admin"],
                "summary": "Bulk delete multiple breaches by ID list (admin)",
                "security": [{"Bearer": []}],
                "parameters": [{
                    "in": "body", "name": "body", "required": True,
                    "schema": {
                        "type": "object", "required": ["ids"],
                        "properties": {
                            "ids": {
                                "type": "array",
                                "items": {"type": "string"},
                                "example": ["507f1f77bcf86cd799439011", "507f1f77bcf86cd799439012"],
                            },
                        },
                    },
                }],
                "responses": {
                    "200": {"description": "deleted count + any invalid IDs"},
                    "422": {"description": "ids must be a non-empty list"},
                },
            }
        },
    },

    # ---------------------------------------------------------------------- #
    # DEFINITIONS                                                              #
    # ---------------------------------------------------------------------- #
    "definitions": {
        "BreachInput": {
            "type": "object",
            "required": ["title", "organisation", "disclosure_date",
                         "severity", "status", "data_types_exposed"],
            "properties": {
                "title":                  {"type": "string", "example": "Example Corp Data Breach 2025"},
                "description":            {"type": "string"},
                "disclosure_date":        {"type": "string", "format": "date", "example": "2025-01-15"},
                "breach_date":            {"type": "string", "format": "date"},
                "severity":               {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                "status":                 {"type": "string", "enum": ["active", "contained", "resolved"]},
                "risk_score":             {"type": "number", "minimum": 0, "maximum": 10},
                "affected_records_count": {"type": "integer"},
                "data_types_exposed":     {"type": "array", "items": {"type": "string"}},
                "organisation": {
                    "type": "object",
                    "required": ["name"],
                    "properties": {
                        "name":           {"type": "string"},
                        "domain":         {"type": "string"},
                        "industry":       {"type": "string"},
                        "country":        {"type": "string"},
                        "country_code":   {"type": "string", "minLength": 2, "maxLength": 2},
                        "employee_count": {"type": "integer"},
                    },
                },
                "location": {
                    "type": "object",
                    "required": ["type", "coordinates"],
                    "properties": {
                        "type":        {"type": "string", "enum": ["Point"]},
                        "coordinates": {
                            "type": "array", "items": {"type": "number"},
                            "minItems": 2, "maxItems": 2,
                            "example": [-0.1276, 51.5074],
                        },
                    },
                },
            },
        },
        "BreachPatch": {
            "type": "object",
            "description": "Any subset of BreachInput fields",
            "properties": {
                "title":    {"type": "string"},
                "severity": {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                "status":   {"type": "string", "enum": ["active", "contained", "resolved"]},
                "risk_score": {"type": "number"},
            },
        },
        "AffectedAccount": {
            "type": "object",
            "required": ["email"],
            "properties": {
                "email":    {"type": "string", "format": "email"},
                "name":     {"type": "string"},
                "notified": {"type": "boolean", "default": False},
            },
        },
        "TimelineEvent": {
            "type": "object",
            "required": ["event_date", "description"],
            "properties": {
                "event_date":  {"type": "string", "format": "date"},
                "title":       {"type": "string"},
                "description": {"type": "string"},
                "event_type":  {"type": "string",
                                "enum": ["discovery", "disclosure", "patch", "notification", "other"]},
            },
        },
        "RemediationAction": {
            "type": "object",
            "required": ["action", "status"],
            "properties": {
                "action":      {"type": "string"},
                "description": {"type": "string"},
                "status":      {"type": "string", "enum": ["pending", "in_progress", "completed"]},
                "due_date":    {"type": "string", "format": "date"},
                "assigned_to": {"type": "string"},
            },
        },
        "MonitoringAlert": {
            "type": "object",
            "required": ["alert_type", "message"],
            "properties": {
                "alert_type":    {"type": "string",
                                  "enum": ["new_record", "severity_change", "dark_web", "other"]},
                "message":       {"type": "string"},
                "severity":      {"type": "string", "enum": ["critical", "high", "medium", "low"]},
                "acknowledged":  {"type": "boolean", "default": False},
            },
        },
    },
}
