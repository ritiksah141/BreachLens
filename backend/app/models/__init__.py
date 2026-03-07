"""
models — Validation schema classes for BreachLens MongoDB documents.

This package provides structured validation schemas for the core domain
entities (breaches and users). Each model defines required fields, allowed
values, type constraints, and cross-field rules. The validators in
``app.utils.validators`` provide the low-level checks; models compose them
into cohesive document-level schemas.
"""

from app.models.breach import BreachSchema, AffectedAccountSchema, TimelineEventSchema, RemediationActionSchema, MonitoringAlertSchema  # noqa: F401
from app.models.user import UserSchema  # noqa: F401

__all__ = [
    "BreachSchema",
    "AffectedAccountSchema",
    "TimelineEventSchema",
    "RemediationActionSchema",
    "MonitoringAlertSchema",
    "UserSchema",
]
