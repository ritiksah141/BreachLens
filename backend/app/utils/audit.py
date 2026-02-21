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


class AuditLogger:
    """
    Structured audit logger that writes to a separate audit log file.

    Log format: JSON with timestamp, user_id, action, resource, IP, method, result, details
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
        # Get audit log directory from environment or use default
        log_dir = os.getenv("AUDIT_LOG_DIR", "logs")
        log_file = os.getenv("AUDIT_LOG_FILE", "audit.log")

        # Create logs directory if it doesn't exist
        os.makedirs(log_dir, exist_ok=True)

        log_path = os.path.join(log_dir, log_file)

        # Create rotating file handler if available, otherwise use regular handler
        try:
            from logging.handlers import RotatingFileHandler
            # Rotate after 10MB, keep 5 backup files
            handler = RotatingFileHandler(
                log_path,
                maxBytes=int(os.getenv("AUDIT_LOG_MAX_BYTES", 10485760)),  # 10MB default
                backupCount=int(os.getenv("AUDIT_LOG_BACKUP_COUNT", 5))
            )
        except ImportError:
            handler = logging.FileHandler(log_path)

        # JSON-formatted logs for easy parsing
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
        """
        Log an audit event.

        Args:
            action: Type of action performed (e.g., "user_created", "breach_deleted")
            resource: Resource affected (e.g., "/api/v1/breaches/123")
            result: Outcome of the action ("success" or "failure: reason")
            details: Additional context as dict (e.g., {"old_role": "user", "new_role": "admin"})
            user_id: User performing the action (defaults to g.current_user_id)
            ip_address: IP address of requester (defaults to request.remote_addr)
        """
        # Get user_id and IP from context if not provided
        if user_id is None:
            user_id = getattr(g, "current_user_id", "anonymous")

        if ip_address is None:
            ip_address = request.remote_addr if has_request_context() and request else "unknown"

        # Anonymize IP if configured
        if os.getenv("REQUEST_IP_POLICY", "anonymize") == "anonymize":
            ip_address = self._anonymize_ip(ip_address)
        elif os.getenv("REQUEST_IP_POLICY") == "none":
            ip_address = "redacted"

        audit_entry = {
            "timestamp": datetime.now(timezone.utc).isoformat(),
            "user_id": str(user_id),
            "action": action,
            "resource": resource,
            "method": request.method if has_request_context() and request else "N/A",
            "ip_address": ip_address,
            "user_agent": request.headers.get("User-Agent", "unknown") if has_request_context() and request else "N/A",
            "result": result,
            "details": details or {}
        }

        # Log as JSON
        self.logger.info(json.dumps(audit_entry))

    def _anonymize_ip(self, ip_address: str) -> str:
        """
        Anonymize IP address by hashing it with a salt.

        Args:
            ip_address: Original IP address

        Returns:
            Hashed IP address (first 8 characters of hash)
        """
        import hashlib
        salt = os.getenv("IP_ANONYMIZATION_SALT")
        if not salt:
            raise ValueError(
                "IP_ANONYMIZATION_SALT environment variable is required for anonymizing IP addresses. "
                "Set a cryptographically secure random value (minimum 32 characters)."
            )
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
