"""
email.py — Email utility functions for BreachLens.

Provides a thin wrapper around Flask-Mail / SMTP so that services can send
transactional emails (password-reset, breach-alert notifications, etc.)
without coupling directly to a mail library.

Configuration (set in .env / environment):
    MAIL_SERVER        — SMTP host  (default: localhost)
    MAIL_PORT          — SMTP port  (default: 587)
    MAIL_USE_TLS       — Enable TLS (default: true)
    MAIL_USERNAME      — SMTP username
    MAIL_PASSWORD      — SMTP password
    MAIL_DEFAULT_SENDER — From address (default: noreply@breachlens.io)
"""
import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Optional

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# SMTP configuration (resolved from environment at import time)
# ---------------------------------------------------------------------------
_MAIL_SERVER: str = os.getenv("MAIL_SERVER", "localhost")
_MAIL_PORT: int = int(os.getenv("MAIL_PORT", 587))
_MAIL_USE_TLS: bool = os.getenv("MAIL_USE_TLS", "true").lower() == "true"
_MAIL_USERNAME: Optional[str] = os.getenv("MAIL_USERNAME")
_MAIL_PASSWORD: Optional[str] = os.getenv("MAIL_PASSWORD")
_DEFAULT_SENDER: str = os.getenv("MAIL_DEFAULT_SENDER", "noreply@breachlens.io")


# ---------------------------------------------------------------------------
# Internal helper
# ---------------------------------------------------------------------------

def _build_message(
    to: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    sender: Optional[str] = None,
) -> MIMEMultipart:
    """Construct a MIME multipart message."""
    msg = MIMEMultipart("alternative")
    msg["Subject"] = subject
    msg["From"] = sender or _DEFAULT_SENDER
    msg["To"] = to

    msg.attach(MIMEText(body_text, "plain", "utf-8"))
    if body_html:
        msg.attach(MIMEText(body_html, "html", "utf-8"))

    return msg


def _send_via_smtp(msg: MIMEMultipart) -> None:
    """Open an SMTP connection and deliver *msg*."""
    with smtplib.SMTP(_MAIL_SERVER, _MAIL_PORT) as server:
        if _MAIL_USE_TLS:
            server.starttls()
        if _MAIL_USERNAME and _MAIL_PASSWORD:
            server.login(_MAIL_USERNAME, _MAIL_PASSWORD)
        server.send_message(msg)


# ---------------------------------------------------------------------------
# Public API
# ---------------------------------------------------------------------------

def send_email(
    to: str,
    subject: str,
    body_text: str,
    body_html: Optional[str] = None,
    sender: Optional[str] = None,
) -> bool:
    """
    Send a transactional email.

    Args:
        to:        Recipient email address.
        subject:   Email subject line.
        body_text: Plain-text body (always required as fallback).
        body_html: Optional HTML body.
        sender:    Override the default From address.

    Returns:
        ``True`` on success, ``False`` on failure (errors are logged).
    """
    msg = _build_message(to, subject, body_text, body_html, sender)
    try:
        _send_via_smtp(msg)
        logger.info("Email sent to %s — subject: %s", to, subject)
        return True
    except Exception as exc:  # noqa: BLE001
        logger.error("Failed to send email to %s: %s", to, exc)
        return False


def send_password_reset_email(to: str, reset_token: str, base_url: str = "http://localhost:4200") -> bool:
    """
    Send a password-reset link to *to*.

    Args:
        to:          Recipient email address.
        reset_token: Signed reset token (from AuthService).
        base_url:    Frontend base URL used to construct the reset link.

    Returns:
        ``True`` on success, ``False`` on failure.
    """
    reset_url = f"{base_url}/reset-password?token={reset_token}"

    body_text = (
        f"You requested a password reset for your BreachLens account.\n\n"
        f"Click the link below to reset your password (valid for 1 hour):\n{reset_url}\n\n"
        "If you did not request a reset, please ignore this email."
    )
    body_html = f"""
    <html>
      <body>
        <p>You requested a password reset for your <strong>BreachLens</strong> account.</p>
        <p><a href="{reset_url}">Reset your password</a> (valid for 1 hour).</p>
        <p>If you did not request a reset, please ignore this email.</p>
      </body>
    </html>
    """

    return send_email(
        to=to,
        subject="BreachLens — Password Reset Request",
        body_text=body_text,
        body_html=body_html,
    )


def send_breach_alert_email(
    to: str,
    breach_name: str,
    severity: str,
    records_exposed: int,
    breach_id: str,
    base_url: str = "http://localhost:4200",
) -> bool:
    """
    Notify a user that a new breach matching their monitored assets was detected.

    Args:
        to:               Recipient email address.
        breach_name:      Human-readable name of the breach.
        severity:         Severity level (critical / high / medium / low).
        records_exposed:  Number of records exposed.
        breach_id:        Database ID of the breach document.
        base_url:         Frontend base URL for the deep-link.

    Returns:
        ``True`` on success, ``False`` on failure.
    """
    detail_url = f"{base_url}/breaches/{breach_id}"

    body_text = (
        f"BreachLens Alert: A new {severity.upper()} severity breach has been detected.\n\n"
        f"Breach: {breach_name}\n"
        f"Severity: {severity}\n"
        f"Records Exposed: {records_exposed:,}\n\n"
        f"View details: {detail_url}"
    )
    body_html = f"""
    <html>
      <body>
        <h2>BreachLens Security Alert</h2>
        <p>A new <strong>{severity.upper()}</strong> severity breach has been detected.</p>
        <table>
          <tr><td><strong>Breach:</strong></td><td>{breach_name}</td></tr>
          <tr><td><strong>Severity:</strong></td><td>{severity}</td></tr>
          <tr><td><strong>Records exposed:</strong></td><td>{records_exposed:,}</td></tr>
        </table>
        <p><a href="{detail_url}">View full breach details</a></p>
      </body>
    </html>
    """

    return send_email(
        to=to,
        subject=f"BreachLens Alert — {severity.upper()} severity breach detected: {breach_name}",
        body_text=body_text,
        body_html=body_html,
    )
