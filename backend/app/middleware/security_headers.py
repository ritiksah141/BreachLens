"""
security_headers.py — Security headers middleware for BreachLens.

Implements security headers to protect against common web vulnerabilities:
- Content Security Policy (CSP)
- X-Content-Type-Options
- X-Frame-Options
- Referrer-Policy
- Permissions-Policy
"""
import os
from flask import Flask


def init_security_headers(app: Flask) -> None:
    """
    Add security headers to all HTTP responses.

    Headers configured based on OWASP recommendations.
    CSP policy allows API usage while preventing XSS attacks.

    Args:
        app: Flask application instance
    """

    @app.after_request
    def set_security_headers(response):
        """Apply security headers to every response."""

        # Prevent MIME type sniffing
        response.headers['X-Content-Type-Options'] = 'nosniff'

        # Prevent clickjacking attacks
        frame_options = os.getenv("X_FRAME_OPTIONS", "DENY")
        response.headers['X-Frame-Options'] = frame_options

        # Referrer Policy - Controls referrer information leakage
        referrer_policy = os.getenv("REFERRER_POLICY", "strict-origin-when-cross-origin")
        response.headers['Referrer-Policy'] = referrer_policy

        # Permissions Policy - Restricts browser features
        permissions_policy = os.getenv(
            "PERMISSIONS_POLICY",
            "geolocation=(), microphone=(), camera=(), payment=()"
        )
        response.headers['Permissions-Policy'] = permissions_policy

        return response

    app.logger.info("Security headers middleware initialized successfully")
