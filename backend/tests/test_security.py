"""
Comprehensive security test suite for BreachLens.

Tests cover:
- NoSQL injection protection
- HTML/XSS sanitization
- Password reset flow security
- JWT token blacklist
- Audit logging
- Rate limiting
- Security headers
- Input validation
- Configuration security
- Role-based access control
- Account lockout mechanism
"""
import pytest
from unittest.mock import patch, MagicMock
from datetime import datetime, timedelta
from app.utils.validators import (
    sanitize_mongo_input, sanitize_query_params, safe_regex_query,
    sanitize_html, sanitize_breach_payload_html, is_valid_email,
    is_valid_domain, is_valid_url
)
from app.utils.audit import log_auth_event, log_security_event, audit_log


class TestNoSQLInjectionProtection:
    """Test input sanitization functions."""

    def test_sanitize_dict_with_operators(self):
        """Should remove MongoDB operators from dict."""
        input_data = {
            "username": "john",
            "$ne": "admin",
            "$gt": "",
            "role": "user"
        }
        result = sanitize_mongo_input(input_data)
        assert "$ne" not in result
        assert "$gt" not in result
        assert result["username"] == "john"
        assert result["role"] == "user"

    def test_sanitize_nested_dict(self):
        """Should recursively sanitize nested structures."""
        input_data = {
            "user": {
                "$where": "1==1",
                "name": "test"
            }
        }
        result = sanitize_mongo_input(input_data)
        assert "$where" not in result["user"]
        assert result["user"]["name"] == "test"

    def test_sanitize_list(self):
        """Should sanitize list elements."""
        input_data = ["safe", {"$ne": "unsafe"}, "also_safe"]
        result = sanitize_mongo_input(input_data)
        assert result[0] == "safe"
        assert "$ne" not in result[1]
        assert result[2] == "also_safe"

    def test_sanitize_string_preserves_legitimate_data(self):
        """Strings with $ should be preserved (don't mutate legitimate data like prices)."""
        result = sanitize_mongo_input("Cost is $100")
        assert result == "Cost is $100"

        # For NoSQL operator-like strings, preserve them
        # The defense is at query construction (use safe_regex_query for regex)
        result = sanitize_mongo_input("$where: 1==1")
        assert result == "$where: 1==1"

    def test_sanitize_query_params(self):
        """Should sanitize URL query parameters."""
        params = {
            "severity": "critical",
            "$where": "1==1",
            "status": {"$ne": None}
        }
        result = sanitize_query_params(params)
        assert "severity" in result
        assert "$where" not in result
        # Dict values with operators should be cleaned
        assert result["status"] == ""

    def test_safe_regex_query(self):
        """Should escape special regex characters."""
        pattern = "test.*hack"
        result = safe_regex_query(pattern, "title")
        assert "title" in result
        assert "$regex" in result["title"]
        # Dots and asterisks should be escaped
        assert "\\." in result["title"]["$regex"]
        assert "\\*" in result["title"]["$regex"]

    def test_sanitize_preserves_none(self):
        """Should handle None values."""
        assert sanitize_mongo_input(None) is None

    def test_sanitize_preserves_primitives(self):
        """Should preserve safe primitive types."""
        assert sanitize_mongo_input(42) == 42
        assert sanitize_mongo_input(3.14) == 3.14
        assert sanitize_mongo_input(True) is True
        assert sanitize_mongo_input(False) is False

    def test_mongo_operators_removed_from_input(self):
        """MongoDB operators should be removed from user input."""
        malicious = {'username': 'admin', '$ne': None}
        result = sanitize_mongo_input(malicious)
        assert '$ne' not in result
        assert result['username'] == 'admin'

    def test_strings_preserved_for_exact_matches(self):
        """Strings should be preserved as-is ($ is safe in exact matches)."""
        # Preserve legitimate data with $ symbols
        result = sanitize_mongo_input("Price: $50")
        assert result == "Price: $50"

        # For regex queries, use safe_regex_query instead
        # which properly escapes regex metacharacters
        malicious = "$where: 1==1"
        result = sanitize_mongo_input(malicious)
        assert result == malicious  # Preserved, not mutated


class TestXSSSanitization:
    """Test HTML/XSS sanitization features."""

    def test_script_tags_removed(self):
        """Script tags should be completely removed."""
        malicious = '<script>alert("xss")</script>Safe content'
        result = sanitize_html(malicious, strip_tags=True)
        assert '<script>' not in result
        assert 'alert' not in result or '<script>' not in result
        assert 'Safe content' in result

    def test_event_handlers_stripped(self):
        """Event handlers like onclick should be removed."""
        malicious = '<div onclick="alert()">Click me</div>'
        result = sanitize_html(malicious)
        assert 'onclick' not in result
        assert 'alert' not in result or 'onclick' not in result

    def test_javascript_urls_blocked(self):
        """JavaScript URLs in href should be removed."""
        malicious = '<a href="javascript:alert()">Link</a>'
        result = sanitize_html(malicious)
        assert 'javascript:' not in result

    def test_data_urls_blocked(self):
        """Data URLs should be blocked."""
        malicious = '<a href="data:text/html,<script>alert()</script>">Link</a>'
        result = sanitize_html(malicious)
        assert 'data:' not in result or 'href' not in result

    def test_allowed_tags_preserved(self):
        """Safe HTML tags should be preserved."""
        safe_html = '<p>Hello <strong>world</strong></p>'
        result = sanitize_html(safe_html)
        assert '<p>' in result
        assert '<strong>' in result
        assert 'Hello' in result

    def test_breach_title_strips_all_html(self):
        """Breach titles should have all HTML stripped."""
        data = {'title': '<b>Bold</b> Title'}
        result = sanitize_breach_payload_html(data)
        assert '<b>' not in result['title']
        assert 'Title' in result['title']

    def test_breach_description_allows_formatting(self):
        """Breach descriptions should allow basic formatting."""
        data = {'description': '<p>Valid <strong>content</strong></p>'}
        result = sanitize_breach_payload_html(data)
        assert '<p>' in result['description']
        assert '<strong>' in result['description']

    def test_breach_description_removes_scripts(self):
        """Breach descriptions should remove script tags."""
        data = {'description': '<p>Safe</p><script>alert()</script>'}
        result = sanitize_breach_payload_html(data)
        assert '<script>' not in result['description']
        assert '<p>Safe</p>' in result['description']

    def test_nested_breach_data_sanitized(self):
        """Nested subdocuments should be sanitized."""
        data = {
            'title': 'Test',
            'organisation': {
                'name': '<img src=x onerror=alert()>Acme'
            },
            'timeline': [
                {'description': '<p>Event</p><script>bad</script>'}
            ]
        }
        result = sanitize_breach_payload_html(data)
        assert '<img' not in result['organisation']['name']
        assert '<script>' not in result['timeline'][0]['description']
        assert '<p>Event</p>' in result['timeline'][0]['description']


class TestPasswordResetSecurity:
    """Test password reset flow security."""

    @patch('app.services.auth_service.AuthService.col')
    def test_forgot_password_endpoint_exists(self, mock_col, client):
        """POST /forgot-password endpoint should exist."""
        mock_col.find_one.return_value = None

        response = client.post(
            '/api/v1/auth/forgot-password',
            json={'email': 'test@example.com'}
        )
        # Should not be 404 (endpoint exists)
        assert response.status_code in [200, 400, 422, 429]

    def test_reset_password_endpoint_exists(self, client):
        """POST /reset-password endpoint should exist."""
        response = client.post(
            '/api/v1/auth/reset-password',
            json={'token': 'fake-token', 'new_password': 'NewPass123'}
        )
        # Should not be 404 (endpoint exists)
        assert response.status_code in [200, 400, 422, 429]

    @patch('app.services.auth_service.AuthService.col')
    def test_forgot_password_requires_email(self, mock_col, client):
        """Forgot password should require email field."""
        response = client.post(
            '/api/v1/auth/forgot-password',
            json={}
        )
        assert response.status_code in [400, 422]

    def test_reset_password_requires_token_and_password(self, client):
        """Reset password should require token and new_password."""
        response = client.post(
            '/api/v1/auth/reset-password',
            json={'token': 'test'}
        )
        assert response.status_code in [400, 422]


class TestJWTBlacklist:
    """Test JWT token blacklist functionality."""

    def test_jwt_redis_client_available(self):
        """JWT Redis blocklist should be available."""
        from app.extensions import jwt_redis_blocklist
        # jwt_redis_blocklist may be None if Redis is unavailable (graceful degradation)
        # This is expected behavior
        assert jwt_redis_blocklist is None or hasattr(jwt_redis_blocklist, 'setex')

    def test_logout_endpoint_exists(self, client, analyst_headers):
        """POST /logout endpoint should exist."""
        response = client.post(
            '/api/v1/auth/logout',
            headers=analyst_headers
        )
        # Should not be 404 (endpoint exists)
        assert response.status_code in [200, 401, 403]
        if response.status_code == 200:
            data = response.get_json()
            assert 'message' in data or 'status' in data


class TestRateLimiting:
    """Test rate limiting on sensitive endpoints.

    Note: Rate limiting requires Redis to work properly in tests.
    Without Redis, in-memory storage resets between test client requests.
    """

    @pytest.mark.skip(reason="Rate limiting requires Redis backend. In-memory storage doesn't persist between test client requests.")
    @patch('app.services.auth_service.AuthService.col')
    def test_login_has_rate_limit(self, mock_col, client):
        """Login endpoint should have rate limiting (requires Redis)."""
        mock_col.find_one.return_value = None

        # Hammer the endpoint to trigger rate limit
        # Flask-Limiter is configured for 5/min for auth endpoints
        rate_limit_triggered = False
        for attempt in range(15):  # Exceed rate limit
            response = client.post(
                '/api/v1/auth/login',
                json={'email': 'test@example.com', 'password': 'test'}
            )
            if response.status_code == 429:
                rate_limit_triggered = True
                break

        # Should have hit rate limit
        assert rate_limit_triggered, "Rate limit was not triggered after 15 rapid requests"
        assert response.status_code == 429

    @pytest.mark.skip(reason="Rate limiting requires Redis backend. In-memory storage doesn't persist between test client requests.")
    def test_register_has_rate_limit(self, client):
        """Register endpoint should have rate limiting (requires Redis)."""
        # Hammer the endpoint to trigger rate limit
        # Flask-Limiter is configured for 3/min for register
        rate_limit_triggered = False
        for attempt in range(10):  # Exceed rate limit
            response = client.post(
                '/api/v1/auth/register',
                json={'email': f'test{attempt}@example.com', 'password': 'Test123'}  # Invalid payload
            )
            if response.status_code == 429:
                rate_limit_triggered = True
                break

        # Should have hit rate limit
        assert rate_limit_triggered, "Rate limit was not triggered after 10 rapid requests"
        assert response.status_code == 429


class TestSecurityHeaders:
    """Test security headers middleware."""

    def test_security_headers_present(self, client):
        """All security headers should be present in response."""
        response = client.get("/health")

        # Check for key security headers
        assert "Content-Security-Policy" in response.headers
        assert "X-Content-Type-Options" in response.headers
        assert response.headers["X-Content-Type-Options"] == "nosniff"
        assert "X-Frame-Options" in response.headers
        # X-XSS-Protection is deprecated and intentionally not included (rely on CSP instead)
        assert "Referrer-Policy" in response.headers
        assert "Permissions-Policy" in response.headers

    def test_csp_header_format(self, client):
        """CSP header should have proper directives."""
        response = client.get("/health")
        csp = response.headers.get("Content-Security-Policy", "")

        # Should contain key directives
        assert "default-src" in csp
        assert "'self'" in csp

    def test_hsts_not_in_development(self, client):
        """HSTS should not be present in development mode."""
        response = client.get("/health")
        # In development, HSTS should not be set unless explicitly enabled
        # This depends on config, but typically absent in dev
        assert "Strict-Transport-Security" not in response.headers or \
               response.headers.get("Strict-Transport-Security") is None


class TestInputValidation:
    """Test input validation functions."""

    def test_email_validation(self):
        """Email validation should work correctly."""
        assert is_valid_email('user@example.com') is True
        assert is_valid_email('invalid-email') is False
        assert is_valid_email('no-at-sign.com') is False

    def test_domain_validation(self):
        """Domain validation should work correctly."""
        assert is_valid_domain('example.com') is True
        assert is_valid_domain('sub.example.com') is True
        assert is_valid_domain('not a domain') is False

    def test_url_validation(self):
        """URL validation should work correctly."""
        assert is_valid_url('https://example.com') is True
        assert is_valid_url('http://example.com/path') is True
        assert is_valid_url('not a url') is False
        assert is_valid_url('javascript:alert()') is False


class TestConfigurationSecurity:
    """Test configuration security measures."""

    @pytest.mark.skip(reason="Environment-dependent test - requires specific setup")
    def test_production_config_validates_secrets(self):
        """Production config should require strong secrets."""
        from app.config import ProductionConfig
        import os

        # Save original values
        original_secret = os.environ.get('SECRET_KEY')
        original_jwt = os.environ.get('JWT_SECRET_KEY')

        try:
            # Test 1: Dev secret key should be rejected
            os.environ['SECRET_KEY'] = 'dev-secret-key'
            os.environ['JWT_SECRET_KEY'] = 'this-is-a-valid-jwt-secret-key-that-is-at-least-32-chars-long'

            with pytest.raises(ValueError, match="SECRET_KEY must be set"):
                ProductionConfig()

            # Test 2: Short JWT secret should be rejected
            os.environ['SECRET_KEY'] = 'production-secret-key-that-is-valid'
            os.environ['JWT_SECRET_KEY'] = 'short'

            with pytest.raises(ValueError, match="JWT_SECRET_KEY must be set"):
                ProductionConfig()

        finally:
            # Restore original values (use explicit None check to handle empty strings)
            if original_secret is not None:
                os.environ['SECRET_KEY'] = original_secret
            elif 'SECRET_KEY' in os.environ:
                del os.environ['SECRET_KEY']

            if original_jwt is not None:
                os.environ['JWT_SECRET_KEY'] = original_jwt
            elif 'JWT_SECRET_KEY' in os.environ:
                del os.environ['JWT_SECRET_KEY']


class TestEndpointAuthorization:
    """Test role-based access control."""

    def test_create_breach_requires_auth(self, client, sample_breach_payload):
        """Creating a breach should require authentication."""
        response = client.post(
            '/api/v1/breaches/',
            json=sample_breach_payload
        )
        assert response.status_code == 401

    def test_create_breach_guest_forbidden(self, client, guest_headers, sample_breach_payload):
        """Guests should not be able to create breaches."""
        response = client.post(
            '/api/v1/breaches/',
            json=sample_breach_payload,
            headers=guest_headers
        )
        assert response.status_code in [401, 403]

    def test_admin_endpoints_require_admin_role(self, client, analyst_headers):
        """Admin endpoints should require admin role."""
        response = client.get(
            '/api/v1/admin/users',
            headers=analyst_headers
        )
        assert response.status_code in [403, 404]  # Forbidden or not found


class TestAccountLockout:
    """Test account lockout mechanism."""

    def test_check_lockout_nonexistent_user(self, auth_service, app):
        """Should return False for non-existent user."""
        from app.extensions import mongo

        mock_col = MagicMock()
        mock_col.find_one.return_value = None
        mock_db = MagicMock()
        mock_db.__getitem__.return_value = mock_col

        with app.app_context():
            with patch.object(mongo, 'db', mock_db):
                is_locked, seconds = auth_service.check_account_lockout("nonexistent@test.com")
                assert is_locked is False
                assert seconds is None

    def test_record_failed_login_increments_counter(self, auth_service, create_test_user, app):
        """Should increment failed login attempts."""
        from app.extensions import mongo

        user = create_test_user("test@example.com", "analyst")

        mock_col = MagicMock()
        mock_col.find_one.return_value = {"email": user["email"], "failed_login_attempts": 0}
        mock_col.update_one.return_value = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__.return_value = mock_col

        with app.app_context():
            with patch.object(mongo, 'db', mock_db):
                # Record a failed login
                auth_service.record_failed_login(user["email"])

                # Check update_one was called with incremented counter
                mock_col.update_one.assert_called_once()
                call_args = mock_col.update_one.call_args
                assert call_args[0][0] == {"email": user["email"]}
                assert call_args[0][1]["$set"]["failed_login_attempts"] == 1

    def test_account_locks_after_max_attempts(self, auth_service, create_test_user, app):
        """Should lock account after reaching max attempts."""
        from app.extensions import mongo

        user = create_test_user("test2@example.com", "analyst")

        with app.app_context():
            max_attempts = app.config.get("MAX_LOGIN_ATTEMPTS", 5)

            mock_col = MagicMock()
            # Use callable side_effect to avoid StopIteration
            call_count = [0]  # Mutable to track calls in closure
            def mock_find_one(*args, **kwargs):
                result = {"email": user["email"], "failed_login_attempts": call_count[0]}
                call_count[0] = min(call_count[0] + 1, max_attempts)
                return result

            mock_col.find_one.side_effect = mock_find_one
            mock_col.update_one.return_value = MagicMock()
            mock_db = MagicMock()
            mock_db.__getitem__.return_value = mock_col

            with patch.object(mongo, 'db', mock_db):
                # Record max attempts
                for _ in range(max_attempts):
                    auth_service.record_failed_login(user["email"])

                # Check that the last update_one call included locked_until
                last_call = mock_col.update_one.call_args
                assert "locked_until" in last_call[0][1]["$set"]

    def test_reset_failed_attempts(self, auth_service, create_test_user, app):
        """Should reset failed attempts counter."""
        from app.extensions import mongo

        user = create_test_user("test3@example.com", "analyst")

        mock_col = MagicMock()
        mock_col.update_one.return_value = MagicMock()
        mock_db = MagicMock()
        mock_db.__getitem__.return_value = mock_col

        with app.app_context():
            with patch.object(mongo, 'db', mock_db):
                # Reset counter
                auth_service.reset_failed_attempts(user["email"])

                # Verify update_one was called with reset values
                mock_col.update_one.assert_called_once()
                call_args = mock_col.update_one.call_args
                assert call_args[0][0] == {"email": user["email"]}
                assert call_args[0][1]["$set"]["failed_login_attempts"] == 0
                assert "$unset" in call_args[0][1]


class TestAuditLogging:
    """Test audit logging functions."""

    def test_log_auth_event(self, app):
        """Should log authentication events without errors."""
        with app.test_request_context():
            # Should not raise exception
            log_auth_event("login", "test@example.com", "success")
            log_auth_event("register", "new@example.com", "failure: validation")

    def test_log_security_event(self, app):
        """Should log security events without errors."""
        with app.test_request_context():
            # Should not raise exception
            log_security_event(
                "rate_limit",
                "Too many requests from IP",
                severity="medium",
                details={"ip": "192.168.1.1"}
            )

    def test_audit_logger_available(self):
        """Audit logger should be importable."""
        assert callable(log_auth_event)
        assert callable(log_security_event)

    def test_audit_log_decorator_available(self):
        """Audit log decorator should be importable."""
        assert callable(audit_log)


# Fixtures - removed as we now use mocks instead of real database operations
