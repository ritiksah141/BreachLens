"""
app/__init__.py — Flask application factory for BreachLens.
"""
import logging
from flask import Flask, jsonify
from flasgger import Swagger
from app.config import config
from app.extensions import mongo, cors, limiter, cache
from app.routes.auth import auth_bp, login_bp
from app.routes.breaches import breaches_bp
from app.routes.analytics import analytics_bp
from app.routes.admin import admin_bp
from app.routes.users import users_bp
from app.routes.health import health_bp
from app.middleware.request_logging import init_request_logging
from app.middleware.security_headers import init_security_headers
from app.swagger_spec import SWAGGER_TEMPLATE

logger = logging.getLogger(__name__)


def create_app(config_name: str = "development") -> Flask:
    """
    Create and configure the Flask application.

    Args:
        config_name: One of 'development', 'testing'.

    Returns:
        Configured Flask application instance.
    """
    app = Flask(__name__)
    app.config.from_object(config[config_name])

    # Disable strict slashes globally to prevent redirects for preflight requests
    app.url_map.strict_slashes = False

    # Initialise extensions
    mongo.init_app(app)
    cors.init_app(app, resources={r"/api/.*": {"origins": app.config.get("CORS_ORIGINS", ["*"])}})
    limiter.init_app(app)
    cache.init_app(app)

    # Swagger UI at /api/docs
    Swagger(app, template=SWAGGER_TEMPLATE, config={
        "headers": [],
        "specs": [{"endpoint": "apispec", "route": "/api/docs/apispec.json"}],
        "static_url_path": "/flasgger_static",
        "swagger_ui": True,
        "specs_route": "/api/docs",
    })

    # Register Blueprints
    app.register_blueprint(auth_bp)
    app.register_blueprint(login_bp)
    app.register_blueprint(breaches_bp)
    app.register_blueprint(analytics_bp)
    app.register_blueprint(admin_bp)
    app.register_blueprint(users_bp)
    app.register_blueprint(health_bp)

    # Ensure MongoDB indexes on startup
    # Note: ensure_indexes() is idempotent and safe to call multiple times.
    # If DB is unavailable at startup, indexes will be created on first request.
    with app.app_context():
        try:
            from app.services.breach_service import BreachService
            from app.services.auth_service import AuthService
            BreachService().ensure_indexes()
            AuthService().ensure_indexes()
            # Create index on the token blacklist collection for fast lookups
            mongo.db["blacklist"].create_index("token", unique=True, background=True)
        except Exception as e:
            logger.exception("Failed to create database indexes at startup: %s", e)
            # Indexes will be created on first request if DB not yet available

    # Health check
    @app.get("/health")
    def health():
        """Liveness + readiness probe."""
        try:
            mongo.db.command("ping")
            db_status = "ok"
        except Exception:
            db_status = "unavailable"
        status = "ok" if db_status == "ok" else "degraded"
        code = 200 if status == "ok" else 503
        return jsonify({"status": status, "db": db_status}), code

    # Centralised error handlers
    _register_error_handlers(app)

    # Request / response logging
    init_request_logging(app)

    # Security headers (CSP, X-Frame-Options, etc.)
    init_security_headers(app)

    return app


def _register_error_handlers(app: Flask) -> None:
    """Register JSON error handlers for all standard HTTP error codes."""

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

    @app.errorhandler(429)
    def rate_limit_exceeded(e):
        return jsonify({"status": "error", "message": "Rate limit exceeded. Please slow down your requests.", "code": 429}), 429

    @app.errorhandler(500)
    def internal_error(e):
        return jsonify({"status": "error", "message": "An internal server error occurred.", "code": 500}), 500
