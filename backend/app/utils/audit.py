"""
audit.py — Audit logging system for BreachLens.

Provides comprehensive audit trail for sensitive operations including:
- User actions (login, logout, deletions, modifications)
- Administrative operations (role changes, user management)
- Data access and modifications
- Security events (failed logins, unauthorized access)

Audit logs are written in JSON format for easy parsing and analysis.
Complies with GDPR, SOC2, and ISO27001 audit requirements.
"""
import os
import logging
import json
from functools import wraps
from datetime import datetime, timezone
from flask import g, request, current_app, has_request_context
from typing import Callable, Any
from app.extensions import mongo


class AuditLogger:
    """
    Structured audit logger that writes to both a separate audit log file
    and a MongoDB 'audit_logs' collection for persistence and scalability.
    """

    def __init__(self):
        """Initialize audit logger with appropriate handlers."""
        self.logger = logging.getLogger("audit")
        self.logger.setLevel(logging.INFO)
        self.logger.propagate = False  # Don't propagate to root logger

        # Only add handler if not already configured
        if not self.logger.handlers:
            self._setup_handler()

    def _setup_handler(self):
        """Setup file handler for audit logs."""
        log_dir = os.getenv("AUDIT_LOG_DIR", "logs")
        log_file = os.getenv("AUDIT_LOG_FILE", "audit.log")
        os.makedirs(log_dir, exist_ok=True)
        log_path = os.path.join(log_dir, log_file)

        try:
            from logging.handlers import RotatingFileHandler
            handler = RotatingFileHandler(
                log_path,
                maxBytes=int(os.getenv("AUDIT_LOG_MAX_BYTES", 10485760)),
                backupCount=int(os.getenv("AUDIT_LOG_BACKUP_COUNT", 5))
            )
        except ImportError:
            handler = logging.FileHandler(log_path)

        formatter = logging.Formatter('%(message)s')
        handler.setFormatter(formatter)
        self.logger.addHandler(handler)

    def log_event(
        self,
        action: str,
        resource: str,
        result: str,
        details: dict = None,
        user_id: str = None,
        ip_address: str = None
    ):
        """Log an audit event to file and MongoDB."""
        if user_id is None:
            user_id = getattr(g, "current_user_id", "anonymous")

        if ip_address is None:
            ip_address = request.remote_addr if has_request_context() and request else "unknown"

        if os.getenv("REQUEST_IP_POLICY", "anonymize") == "anonymize":
            ip_address = self._anonymize_ip(ip_address)
        elif os.getenv("REQUEST_IP_POLICY") == "none":
            ip_address = "redacted"

        audit_entry = {
            "timestamp": datetime.now(timezone.utc),
            "user_id": str(user_id),
            "action": action,
            "resource": resource,
            "method": request.method if has_request_context() and request else "N/A",
            "ip_address": ip_address,
            "user_agent": request.headers.get("User-Agent", "unknown") if has_request_context() and request else "N/A",
            "result": result,
            "details": details or {}
        }

        # 1. Log to file as JSON string
        file_entry = audit_entry.copy()
        file_entry["timestamp"] = file_entry["timestamp"].isoformat()
        self.logger.info(json.dumps(file_entry))

        # 2. Log to MongoDB (Background safe)
        try:
            if has_request_context() and mongo.db is not None:
                mongo.db["audit_logs"].insert_one(audit_entry)
        except Exception as e:
            # Prevent audit logging failure from crashing the request
            if has_request_context():
                current_app.logger.warning(f"Failed to write audit log to MongoDB: {e}")

    def _anonymize_ip(self, ip_address: str) -> str:
        import hashlib
        salt = os.getenv("IP_ANONYMIZATION_SALT", "default-audit-salt-for-privacy")
        hashed = hashlib.sha256(f"{ip_address}{salt}".encode()).hexdigest()
        return f"anon_{hashed[:8]}"


# Global audit logger instance
_audit_logger = AuditLogger()


def audit_log(action: str, include_response: bool = False):
    """
    Decorator to log sensitive operations for audit trail.

    Automatically captures:
    - User ID from g.current_user_id
    - Resource path from request.path
    - IP address from request.remote_addr
    - Request method
    - Success/failure status

    Usage:
        @audit_log("breach_deleted")
        def delete_breach(breach_id):
            ...

    Args:
        action: Action name/identifier for the audit log
        include_response: If True, includes response data in details (use cautiously)

    Returns:
        Decorated function
    """
    def decorator(f: Callable) -> Callable:
        @wraps(f)
        def wrapped(*args, **kwargs) -> Any:
            result = "success"
            details = {}
            response_data = None

            try:
                # Execute the operation
                response_data = f(*args, **kwargs)

                # Extract details from response if it's a tuple (response, status_code)
                if isinstance(response_data, tuple) and len(response_data) >= 2:
                    status_code = response_data[1]
                    if status_code >= 400:
                        result = f"failure: HTTP {status_code}"

                return response_data

            except Exception as e:
                # Log failure
                result = f"failure: {type(e).__name__}"
                details["error"] = str(e)
                raise

            finally:
                # Capture additional details from kwargs (e.g., user_id, breach_id)
                for key in ["user_id", "breach_id", "comment_id", "subdocument_id"]:
                    if key in kwargs:
                        details[key] = str(kwargs[key])

                # Include response data if requested (be careful with sensitive data)
                if include_response and response_data:
                    try:
                        if isinstance(response_data, tuple):
                            response_json = response_data[0].get_json()
                        else:
                            response_json = response_data.get_json()

                        if response_json:
                            details["response"] = response_json
                    except (json.JSONDecodeError, ValueError, TypeError):
                        pass  # Skip if response is not JSON

                # Log the audit event
                _audit_logger.log_event(
                    action=action,
                    resource=request.path if has_request_context() and request else "N/A",
                    result=result,
                    details=details
                )

        return wrapped
    return decorator


def log_auth_event(
    event_type: str,
    user_identifier: str,
    result: str,
    details: dict = None
):
    """
    Log authentication-related events.

    Use for login attempts, registration, password resets, etc.

    Args:
        event_type: Type of auth event ("login", "login_failed", "register", "password_reset")
        user_identifier: Username or email
        result: "success" or "failure: reason"
        details: Additional context
    """
    audit_details = dict(details) if details else {}
    audit_details["user_identifier"] = user_identifier

    _audit_logger.log_event(
        action=f"auth_{event_type}",
        resource=request.path if has_request_context() and request else "/api/v1/auth",
        result=result,
        details=audit_details
    )


def log_security_event(
    event_type: str,
    description: str,
    severity: str = "medium",
    details: dict = None
):
    """
    Log security-related events.

    Use for suspicious activity, rate limiting, injection attempts, etc.

    Args:
        event_type: Type of security event ("rate_limit", "injection_attempt", "unauthorized_access")
        description: Human-readable description
        severity: "low", "medium", "high", "critical"
        details: Additional context
    """
    audit_details = dict(details) if details else {}
    audit_details["description"] = description
    audit_details["severity"] = severity

    _audit_logger.log_event(
        action=f"security_{event_type}",
        resource=request.path if has_request_context() and request else "N/A",
        result="detected",
        details=audit_details
    )
