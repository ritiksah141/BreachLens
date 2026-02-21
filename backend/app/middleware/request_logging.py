"""
request_logging.py — HTTP request/response logging middleware for BreachLens.

Registers before_request / after_request hooks on the Flask app to emit
structured log lines for every inbound API call (AGENTS.md BE-02-04).

Also tracks request IDs for distributed tracing and log correlation.

Log format (single line, pipe-separated):
  [REQUEST]  {method} {path} — from {remote_addr} — request_id={request_id}
  [RESPONSE] {method} {path} {status_code} — {elapsed_ms}ms — request_id={request_id}
"""
import logging
import time
import hashlib
import uuid
from flask import Flask, g, request, current_app

logger = logging.getLogger("breachlens.request")


def init_request_logging(app: Flask) -> None:
    """Register request/response logging hooks on *app*."""

    @app.before_request
    def _log_request() -> None:
        g._request_start = time.monotonic()

        # Generate or extract request ID (sanitize input)
        raw_request_id = request.headers.get('X-Request-ID', '').strip()
        # Validate request ID: only allow alphanumeric, dots, underscores, hyphens
        if raw_request_id and all(c.isalnum() or c in '._-' for c in raw_request_id) and len(raw_request_id) <= 128:
            request_id = raw_request_id
        else:
            request_id = str(uuid.uuid4())
        g.request_id = request_id

        # Determine IP logging policy from config
        ip_policy = current_app.config.get("REQUEST_IP_POLICY", "anonymize")
        ip_value = "-"

        if ip_policy == "full":
            ip_value = request.remote_addr or "-"
        elif ip_policy == "anonymize" and request.remote_addr:
            # Require IP_ANONYMIZATION_SALT to be configured (no default for security)
            salt = current_app.config.get("IP_ANONYMIZATION_SALT")
            if not salt:
                raise RuntimeError(
                    "IP_ANONYMIZATION_SALT must be configured when REQUEST_IP_POLICY='anonymize'. "
                    "Set IP_ANONYMIZATION_SALT environment variable to a secure random value."
                )
            hashed = hashlib.sha256(f"{request.remote_addr}{salt}".encode()).hexdigest()
            ip_value = hashed[:16]  # Use first 16 chars of hash

        # Create log record with request_id
        log_record = logger.makeRecord(
            logger.name, logging.INFO, "", 0,
            "[REQUEST]  %s %s — from %s — request_id=%s",
            (request.method, request.path, ip_value, request_id),
            None, None
        )
        log_record.request_id = request_id
        logger.handle(log_record)

    @app.after_request
    def _log_response(response):
        elapsed_ms = round((time.monotonic() - getattr(g, "_request_start", time.monotonic())) * 1000, 2)
        request_id = getattr(g, 'request_id', 'unknown')

        # Add request ID to response headers
        response.headers['X-Request-ID'] = request_id

        # Create log record with request_id
        log_record = logger.makeRecord(
            logger.name, logging.INFO, "", 0,
            "[RESPONSE] %s %s %s — %.2fms — request_id=%s",
            (request.method, request.path, response.status_code, elapsed_ms, request_id),
            None, None
        )
        log_record.request_id = request_id
        logger.handle(log_record)

        return response
