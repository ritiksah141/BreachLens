"""
security_headers.py — Security headers middleware for BreachLens.

Implements comprehensive security headers to protect against common web vulnerabilities:
- Content Security Policy (CSP)
- X-Content-Type-Options
- X-Frame-Options
- X-XSS-Protection
- Strict-Transport-Security (HSTS)
"""
import os
from flask import Flask


def init_security_headers(app: Flask) -> None:
    """
    Add security headers to all HTTP responses.

    Headers configured based on OWASP recommendations and Mozilla Observatory guidelines.
    CSP policy allows API usage while preventing XSS attacks.

    Args:
        app: Flask application instance
    """

    @app.after_request
    def set_security_headers(response):
        """Apply security headers to every response."""

        # Content Security Policy - Prevents XSS and injection attacks
        # API-friendly policy: primarily restricts browser-executed content
        csp_policy = os.getenv(
            "CSP_POLICY",
            "default-src 'self'; "
            "script-src 'self'; "
            "style-src 'self' 'unsafe-inline'; "  # Allow inline styles for Swagger UI
            "img-src 'self' data: https:; "
            "font-src 'self'; "
            "connect-src 'self'; "
            "frame-ancestors 'none'; "
            "base-uri 'self'; "
            "form-action 'self';"
        )
        response.headers['Content-Security-Policy'] = csp_policy

        # Prevent MIME type sniffing - Forces browsers to respect Content-Type
        response.headers['X-Content-Type-Options'] = 'nosniff'

        # Prevent clickjacking attacks - Disables framing entirely
        # Use 'SAMEORIGIN' if frontend needs to iframe the API docs
        frame_options = os.getenv("X_FRAME_OPTIONS", "DENY")
        response.headers['X-Frame-Options'] = frame_options

        # X-XSS-Protection header is deprecated and can introduce vulnerabilities
        # Modern browsers rely on CSP instead. OWASP recommends removing or setting to '0'.
        # We rely on the CSP policy above for XSS protection.
        # Uncomment the line below if legacy browser support requires it:
        # response.headers['X-XSS-Protection'] = '0'

        # Referrer Policy - Controls referrer information leakage
        referrer_policy = os.getenv("REFERRER_POLICY", "strict-origin-when-cross-origin")
        response.headers['Referrer-Policy'] = referrer_policy

        # Permissions Policy (formerly Feature-Policy) - Restricts browser features
        permissions_policy = os.getenv(
            "PERMISSIONS_POLICY",
            "geolocation=(), microphone=(), camera=(), payment=()"
        )
        response.headers['Permissions-Policy'] = permissions_policy

        # HSTS - Force HTTPS in production only
        # Only enable when deployed behind HTTPS (production environments)
        is_production = app.config.get('ENV') == 'production' or not app.testing
        if is_production or os.getenv("ENABLE_HSTS", "").lower() == "true":
            # Safely parse HSTS_MAX_AGE with fallback
            try:
                hsts_max_age = int(os.getenv("HSTS_MAX_AGE", "31536000"))
            except (ValueError, TypeError):
                import warnings
                warnings.warn("Invalid HSTS_MAX_AGE value, using default 31536000 (1 year)", RuntimeWarning)
                hsts_max_age = 31536000

            hsts_include_subdomains = os.getenv("HSTS_INCLUDE_SUBDOMAINS", "true").lower() == "true"
            hsts_preload = os.getenv("HSTS_PRELOAD", "false").lower() == "true"

            hsts_value = f'max-age={hsts_max_age}'
            if hsts_include_subdomains:
                hsts_value += '; includeSubDomains'
            if hsts_preload:
                hsts_value += '; preload'

            response.headers['Strict-Transport-Security'] = hsts_value

        return response

    app.logger.info("Security headers middleware initialized successfully")
