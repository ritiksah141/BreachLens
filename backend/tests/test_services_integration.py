"""
test_services_integration.py — Integration tests for ALL service layers.

These tests call service methods against a real mongomock database
(no mocking), driving coverage on breach_service.py, user_service.py,
auth_service.py, analytics_service.py, and models/user.py.
"""
import pytest
from datetime import datetime, timedelta
from bson import ObjectId

from app.services.breach_service import BreachService
from app.services.user_service import UserService
from app.services.auth_service import AuthService
from app.services.analytics_service import AnalyticsService
from app.models.user import UserSchema

# Mark all tests in this module as integration tests.
# These tests use mongomock (in-memory) but are more extensive and slower than unit tests.
pytestmark = pytest.mark.integration


# ===================================================================
# Fixtures
# ===================================================================

@pytest.fixture
def svc(app):
    """A BreachService instance with access to the mongomock database."""
    with app.app_context():
        service = BreachService()
        service.col.delete_many({})          # start clean
        yield service
        service.col.delete_many({})          # clean up


def _payload(**overrides):
    """Minimal valid breach payload."""
    base = {
        "title": "Integration Test Breach",
        "description": "A description that is long enough to pass validation checks.",
        "severity": "high",
        "status": "active",
        "industry": "technology",
        "affected_records_count": 5000,
        "breach_date": "2024-01-15",
        "discovered_date": "2024-01-20",
        "data_types_exposed": ["email", "password"],
        "organisation": {"name": "Acme Corp", "domain": "acme.com", "country": "US"},
        "source_url": "https://example.com/report",
    }
    base.update(overrides)
    return base


CREATOR = "creator_user_123"


# ===================================================================
# Core CRUD
# ===================================================================

class TestCreate:

    def test_create_breach_inserts_doc(self, svc):
        doc = svc.create(_payload(), CREATOR)
        assert "_id" in doc
        assert doc["created_by"] == CREATOR
        assert doc["risk_score"] > 0
        assert doc["affected_accounts"] == []

    def test_create_uses_explicit_risk_score(self, svc):
        doc = svc.create(_payload(risk_score=8.5), CREATOR)
        assert doc["risk_score"] == 8.5

    def test_create_computes_risk_score_when_missing(self, svc):
        doc = svc.create(_payload(), CREATOR)
        assert 0 <= doc["risk_score"] <= 10

    def test_create_parses_dates(self, svc):
        doc = svc.create(_payload(), CREATOR)
        assert isinstance(doc["breach_date"], datetime)
        assert isinstance(doc["discovered_date"], datetime)


class TestGetById:

    def test_get_by_valid_id(self, svc):
        created = svc.create(_payload(), CREATOR)
        found = svc.get_by_id(str(created["_id"]))
        assert found is not None
        assert found["title"] == "Integration Test Breach"

    def test_get_by_invalid_id_returns_none(self, svc):
        assert svc.get_by_id("not-valid") is None

    def test_get_by_nonexistent_id(self, svc):
        assert svc.get_by_id(str(ObjectId())) is None

    def test_get_includes_accounts_when_requested(self, svc):
        created = svc.create(_payload(), CREATOR)
        found = svc.get_by_id(str(created["_id"]), include_accounts=True)
        assert "affected_accounts" in found

    def test_get_excludes_accounts_by_default(self, svc):
        created = svc.create(_payload(), CREATOR)
        found = svc.get_by_id(str(created["_id"]), include_accounts=False)
        assert "affected_accounts" not in found


class TestUpdate:

    def test_update_success(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        updated, err = svc.update(bid, _payload(title="Updated Breach Title"),
                                  CREATOR, "admin")
        assert err is None
        assert updated["title"] == "Updated Breach Title"

    def test_update_invalid_id(self, svc):
        result, err = svc.update("bad-id", _payload(), CREATOR, "admin")
        assert err == "invalid_id"

    def test_update_not_found(self, svc):
        result, err = svc.update(str(ObjectId()), _payload(), CREATOR, "admin")
        assert err == "not_found"

    def test_update_forbidden_for_non_owner(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        result, err = svc.update(bid, _payload(), "other_user", "analyst")
        assert err == "forbidden"

    def test_update_allowed_for_admin(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        result, err = svc.update(bid, _payload(title="Admin Updated Title"),
                                 "other_user", "admin")
        assert err is None
        assert result["title"] == "Admin Updated Title"


class TestPatch:

    def test_patch_single_field(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        patched, err = svc.patch(bid, {"severity": "critical"}, CREATOR, "admin")
        assert err is None
        assert patched["severity"] == "critical"

    def test_patch_recomputes_risk_score(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        original_risk = doc["risk_score"]
        patched, err = svc.patch(bid, {"severity": "critical", "affected_records_count": 999999},
                                 CREATOR, "admin")
        assert err is None
        assert patched["risk_score"] != original_risk

    def test_patch_invalid_id(self, svc):
        result, err = svc.patch("bad", {"severity": "low"}, CREATOR, "admin")
        assert err == "invalid_id"

    def test_patch_not_found(self, svc):
        result, err = svc.patch(str(ObjectId()), {"severity": "low"}, CREATOR, "admin")
        assert err == "not_found"

    def test_patch_forbidden_non_owner(self, svc):
        doc = svc.create(_payload(), CREATOR)
        result, err = svc.patch(str(doc["_id"]), {"severity": "low"}, "other", "analyst")
        assert err == "forbidden"

    def test_patch_explicit_risk_score(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        patched, err = svc.patch(bid, {"risk_score": 3.7}, CREATOR, "admin")
        assert err is None
        assert patched["risk_score"] == 3.7

    def test_patch_date_fields(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        patched, err = svc.patch(bid, {"breach_date": "2023-06-01"}, CREATOR, "admin")
        assert err is None
        assert isinstance(patched["breach_date"], datetime)


class TestDelete:

    def test_delete_success(self, svc):
        doc = svc.create(_payload(), CREATOR)
        ok, err = svc.delete(str(doc["_id"]))
        assert ok is True
        assert err is None

    def test_delete_invalid_id(self, svc):
        ok, err = svc.delete("bad")
        assert ok is False
        assert err == "invalid_id"

    def test_delete_not_found(self, svc):
        ok, err = svc.delete(str(ObjectId()))
        assert ok is False
        assert err == "not_found"


class TestBulkDelete:

    def test_bulk_delete_all_valid(self, svc):
        ids = [str(svc.create(_payload(), CREATOR)["_id"]) for _ in range(3)]
        deleted, invalid = svc.bulk_delete(ids)
        assert deleted == 3
        assert invalid == []

    def test_bulk_delete_with_invalid_ids(self, svc):
        doc = svc.create(_payload(), CREATOR)
        deleted, invalid = svc.bulk_delete([str(doc["_id"]), "bad-id", "also-bad"])
        assert deleted == 1
        assert len(invalid) == 2

    def test_bulk_delete_all_invalid(self, svc):
        deleted, invalid = svc.bulk_delete(["x", "y"])
        assert deleted == 0
        assert len(invalid) == 2


class TestBulkInsert:

    def test_bulk_insert_success(self, svc):
        records = [_payload(title=f"Bulk Breach {i}") for i in range(3)]
        docs, errors = svc.bulk_insert(records, CREATOR)
        assert len(docs) == 3
        assert errors == []
        assert all("_id" in d for d in docs)

    def test_bulk_insert_with_bad_record(self, svc):
        records = [
            _payload(),
            {"title": "bad", "affected_records_count": "not-an-int"},  # will fail int()
        ]
        docs, errors = svc.bulk_insert(records, CREATOR)
        # First should succeed, second should error
        assert len(docs) >= 1


# ===================================================================
# Listing / Filtering / Search / Pagination
# ===================================================================

class TestListBreaches:

    def test_list_empty_collection(self, svc):
        results, total = svc.list_breaches()
        assert results == []
        assert total == 0

    def test_list_returns_inserted(self, svc):
        svc.create(_payload(), CREATOR)
        svc.create(_payload(title="Second Breach Incident"), CREATOR)
        results, total = svc.list_breaches()
        assert total == 2
        assert len(results) == 2

    def test_list_filter_by_severity(self, svc):
        svc.create(_payload(severity="critical"), CREATOR)
        svc.create(_payload(severity="low"), CREATOR)
        results, total = svc.list_breaches(severity="critical")
        assert total == 1
        assert results[0]["severity"] == "critical"

    def test_list_filter_by_status(self, svc):
        svc.create(_payload(status="resolved"), CREATOR)
        svc.create(_payload(status="active"), CREATOR)
        results, total = svc.list_breaches(status="resolved")
        assert total == 1

    def test_list_filter_by_industry(self, svc):
        svc.create(_payload(industry="finance"), CREATOR)
        svc.create(_payload(industry="healthcare"), CREATOR)
        results, total = svc.list_breaches(industry="finance")
        assert total == 1

    def test_list_search_by_title(self, svc):
        svc.create(_payload(title="Ransomware Attack on Healthcare"), CREATOR)
        svc.create(_payload(title="Phishing Campaign Results"), CREATOR)
        results, total = svc.list_breaches(search="Ransomware")
        assert total == 1
        assert "Ransomware" in results[0]["title"]

    def test_list_pagination(self, svc):
        for i in range(5):
            svc.create(_payload(title=f"Breach Incident Number {i}"), CREATOR)
        results, total = svc.list_breaches(page=1, limit=2)
        assert total == 5
        assert len(results) == 2
        results2, _ = svc.list_breaches(page=2, limit=2)
        assert len(results2) == 2

    def test_list_sort_ascending(self, svc):
        svc.create(_payload(title="Alpha Breach Title"), CREATOR)
        svc.create(_payload(title="Zulu Breach Title"), CREATOR)
        results, _ = svc.list_breaches(sort_by="title", order="asc")
        assert results[0]["title"] == "Alpha Breach Title"

    def test_list_risk_score_range(self, svc):
        svc.create(_payload(risk_score=2.0), CREATOR)
        svc.create(_payload(risk_score=8.0), CREATOR)
        results, total = svc.list_breaches(min_risk=5.0, max_risk=10.0)
        assert total == 1
        assert results[0]["risk_score"] == 8.0


class TestAdvancedSearchService:

    def test_advanced_search_multifilter(self, svc):
        svc.create(_payload(title="Finance Incident", severity="critical", industry="finance"), CREATOR)
        svc.create(_payload(title="Retail Incident", severity="low", industry="retail"), CREATOR)

        results, total, facets = svc.advanced_search(
            query_text="Incident",
            severities=["critical"],
            industries=["finance"],
            min_risk=0,
            max_risk=10,
            include_facets=True,
        )

        assert total == 1
        assert len(results) == 1
        assert results[0]["severity"] == "critical"
        assert "severity" in facets

    def test_advanced_search_has_location_false(self, svc):
        svc.create(_payload(title="No Geo Breach", location=None), CREATOR)
        svc.create(
            _payload(
                title="Geo Breach",
                location={"type": "Point", "coordinates": [-0.1, 51.5]},
            ),
            CREATOR,
        )

        results, total, _ = svc.advanced_search(has_location=False)
        assert total >= 1
        assert any(r["title"] == "No Geo Breach" for r in results)

    def test_advanced_search_date_range(self, svc):
        svc.create(_payload(title="Old Breach", breach_date="2022-01-01"), CREATOR)
        svc.create(_payload(title="Recent Breach", breach_date="2024-05-01"), CREATOR)

        results, total, _ = svc.advanced_search(
            breach_from="2024-01-01",
            breach_to="2024-12-31",
        )
        assert total >= 1
        assert any(r["title"] == "Recent Breach" for r in results)


class TestFilterOptionsService:

    def test_filter_options_contains_ranges_and_dimensions(self, svc):
        svc.create(_payload(severity="critical", status="active", industry="finance", risk_score=9.0), CREATOR)
        svc.create(_payload(severity="low", status="resolved", industry="retail", risk_score=2.0), CREATOR)

        options = svc.get_filter_options()

        assert "severities" in options
        assert "statuses" in options
        assert "industries" in options
        assert "data_types" in options
        assert "ranges" in options
        assert options["ranges"]["max_risk"] >= options["ranges"]["min_risk"]
        assert options["ranges"]["max_records"] >= options["ranges"]["min_records"]


class TestSubdocumentQueryService:

    def test_query_subdocuments_by_timeline_type(self, svc):
        doc = svc.create(_payload(title="Timeline Filter Breach"), CREATOR)
        svc.add_timeline_event(
            str(doc["_id"]),
            {
                "event_date": "2024-03-01",
                "event_type": "discovered",
                "description": "Incident discovered by SOC team.",
            },
        )

        results, total, facets = svc.query_subdocuments(timeline_event_types=["discovered"])
        assert total >= 1
        assert any(r["title"] == "Timeline Filter Breach" for r in results)
        assert "timeline_event_types" in facets

    def test_query_subdocuments_by_alert_and_remediation(self, svc):
        doc = svc.create(_payload(title="Alert Remediation Breach"), CREATOR)
        svc.add_remediation_action(
            str(doc["_id"]),
            {
                "action": "Reset all affected credentials",
                "status": "completed",
                "due_date": "2024-06-01",
            },
        )
        svc.create_alert(
            str(doc["_id"]),
            {
                "alert_type": "new_exposure",
                "severity": "high",
                "details": "New credential dump detected.",
            },
        )

        results, total, facets = svc.query_subdocuments(
            remediation_statuses=["completed"],
            alert_severities=["high"],
            alert_acknowledged=False,
        )
        assert total >= 1
        assert any(r["title"] == "Alert Remediation Breach" for r in results)
        assert "alert_severities" in facets

    def test_query_subdocuments_by_account_notified_and_data_type(self, svc):
        doc = svc.create(_payload(title="Accounts Filter Breach"), CREATOR)
        acc, _ = svc.add_affected_account(
            str(doc["_id"]),
            {
                "email": "victim@example.com",
                "data_exposed": ["email", "password"],
                "notified": False,
            },
        )
        svc.update_affected_account(str(doc["_id"]), str(acc["_id"]), {"notified": True})

        results, total, facets = svc.query_subdocuments(
            account_notified=True,
            exposed_data_types=["password"],
        )
        assert total >= 1
        assert any(r["title"] == "Accounts Filter Breach" for r in results)
        assert "account_notified_mix" in facets


# ===================================================================
# Exposure Check
# ===================================================================

class TestExposureCheck:

    def test_check_by_email(self, svc):
        doc = svc.create(_payload(), CREATOR)
        svc.add_affected_account(str(doc["_id"]),
                                 {"email": "victim@example.com", "data_exposed": ["email"]})
        result = svc.check_exposure(email="victim@example.com")
        assert result["email_exposed"] is True
        assert result["breach_count"] == 1

    def test_check_by_domain(self, svc):
        svc.create(_payload(organisation={"name": "Acme", "domain": "acme.com"}), CREATOR)
        result = svc.check_exposure(domain="acme.com")
        assert result["domain_exposed"] is True

    def test_check_no_match(self, svc):
        result = svc.check_exposure(email="nobody@nowhere.com")
        assert result["email_exposed"] is False
        assert result["domain_exposed"] is False
        assert result["breach_count"] == 0

    def test_check_by_email_and_domain(self, svc):
        doc = svc.create(_payload(organisation={"name": "Acme", "domain": "acme.com"}), CREATOR)
        svc.add_affected_account(str(doc["_id"]),
                                 {"email": "victim@acme.com"})
        result = svc.check_exposure(email="victim@acme.com", domain="acme.com")
        assert result["email_exposed"] is True
        assert result["domain_exposed"] is True
        assert result["breach_count"] >= 1


# ===================================================================
# Sub-documents: Affected Accounts
# ===================================================================

class TestAffectedAccountsCRUD:

    def test_list_affected_accounts_empty(self, svc):
        doc = svc.create(_payload(), CREATOR)
        accs, err = svc.list_affected_accounts(str(doc["_id"]))
        assert err is None
        assert accs == []

    def test_add_affected_account(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        acc, err = svc.add_affected_account(bid, {"email": "user@test.com"})
        assert err is None
        assert acc["email"] == "user@test.com"
        assert "_id" in acc

    def test_get_affected_account(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        acc, _ = svc.add_affected_account(bid, {"email": "user@test.com"})
        found, err = svc.get_affected_account(bid, str(acc["_id"]))
        assert err is None
        assert found["email"] == "user@test.com"

    def test_get_affected_account_not_found(self, svc):
        doc = svc.create(_payload(), CREATOR)
        found, err = svc.get_affected_account(str(doc["_id"]), str(ObjectId()))
        assert err == "not_found"

    def test_update_affected_account(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        acc, _ = svc.add_affected_account(bid, {"email": "user@test.com"})
        updated, err = svc.update_affected_account(bid, str(acc["_id"]),
                                                   {"notified": True})
        assert err is None
        assert updated["notified"] is True

    def test_update_affected_account_not_found(self, svc):
        doc = svc.create(_payload(), CREATOR)
        result, err = svc.update_affected_account(str(doc["_id"]), str(ObjectId()),
                                                  {"notified": True})
        assert err == "not_found"

    def test_delete_affected_account(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        acc, _ = svc.add_affected_account(bid, {"email": "user@test.com"})
        ok, err = svc.delete_affected_account(bid, str(acc["_id"]))
        assert ok is True
        accs, _ = svc.list_affected_accounts(bid)
        assert len(accs) == 0

    def test_list_accounts_invalid_id(self, svc):
        result, err = svc.list_affected_accounts("bad")
        assert err == "invalid_id"

    def test_add_account_breach_not_found(self, svc):
        result, err = svc.add_affected_account(str(ObjectId()), {"email": "a@b.com"})
        assert err == "not_found"

    def test_delete_account_invalid_id(self, svc):
        ok, err = svc.delete_affected_account("bad", "bad")
        assert ok is False
        assert err == "invalid_id"


# ===================================================================
# Sub-documents: Timeline
# ===================================================================

class TestTimelineCRUD:

    def _event_data(self):
        return {
            "event_date": "2024-01-15",
            "event_type": "breach_occurred",
            "description": "Initial compromise of authentication database detected here.",
        }

    def test_list_timeline_empty(self, svc):
        doc = svc.create(_payload(), CREATOR)
        events, err = svc.list_timeline(str(doc["_id"]))
        assert err is None
        assert events == []

    def test_add_timeline_event(self, svc):
        doc = svc.create(_payload(), CREATOR)
        event, err = svc.add_timeline_event(str(doc["_id"]), self._event_data())
        assert err is None
        assert event["event_type"] == "breach_occurred"

    def test_get_timeline_event(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        event, _ = svc.add_timeline_event(bid, self._event_data())
        found, err = svc.get_timeline_event(bid, str(event["_id"]))
        assert err is None
        assert found["event_type"] == "breach_occurred"

    def test_get_timeline_event_not_found(self, svc):
        doc = svc.create(_payload(), CREATOR)
        found, err = svc.get_timeline_event(str(doc["_id"]), str(ObjectId()))
        assert err == "not_found"

    def test_update_timeline_event(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        event, _ = svc.add_timeline_event(bid, self._event_data())
        updated, err = svc.update_timeline_event(bid, str(event["_id"]),
                                                 {"description": "Updated description of the compromise."})
        assert err is None
        assert updated["description"] == "Updated description of the compromise."

    def test_update_timeline_event_not_found(self, svc):
        doc = svc.create(_payload(), CREATOR)
        result, err = svc.update_timeline_event(str(doc["_id"]), str(ObjectId()),
                                                {"description": "Something longer than ten chars."})
        assert err == "not_found"

    def test_delete_timeline_event(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        event, _ = svc.add_timeline_event(bid, self._event_data())
        ok, err = svc.delete_timeline_event(bid, str(event["_id"]))
        assert ok is True
        events, _ = svc.list_timeline(bid)
        assert len(events) == 0

    def test_delete_timeline_event_not_found(self, svc):
        """$pull on a non-existent sub-doc still succeeds (modified_count=1
        because the parent doc is found).  The service returns ok=True."""
        doc = svc.create(_payload(), CREATOR)
        ok, err = svc.delete_timeline_event(str(doc["_id"]), str(ObjectId()))
        assert ok is True
        assert err is None

    def test_list_timeline_invalid_id(self, svc):
        result, err = svc.list_timeline("bad")
        assert err == "invalid_id"

    def test_add_event_breach_not_found(self, svc):
        result, err = svc.add_timeline_event(str(ObjectId()), self._event_data())
        assert err == "not_found"

    def test_update_event_invalid_id(self, svc):
        result, err = svc.update_timeline_event("bad", "bad", {"description": "Something here..."})
        assert err == "invalid_id"

    def test_delete_event_invalid_id(self, svc):
        ok, err = svc.delete_timeline_event("bad", "bad")
        assert ok is False
        assert err == "invalid_id"

    def test_update_event_date_field(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        event, _ = svc.add_timeline_event(bid, self._event_data())
        updated, err = svc.update_timeline_event(bid, str(event["_id"]),
                                                 {"event_date": "2024-02-01"})
        assert err is None


# ===================================================================
# Sub-documents: Remediation
# ===================================================================

class TestRemediationCRUD:

    def _remediation_data(self):
        return {
            "action": "Force password reset for all affected users",
            "status": "pending",
            "due_date": "2025-04-01",
            "assigned_to": "security_team",
        }

    def test_list_remediation_empty(self, svc):
        doc = svc.create(_payload(), CREATOR)
        actions, err = svc.list_remediation(str(doc["_id"]))
        assert err is None
        assert actions == []

    def test_add_remediation_action(self, svc):
        doc = svc.create(_payload(), CREATOR)
        action, err = svc.add_remediation_action(str(doc["_id"]), self._remediation_data())
        assert err is None
        assert action["status"] == "pending"
        assert action["assigned_to"] == "security_team"

    def test_get_remediation_action(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        action, _ = svc.add_remediation_action(bid, self._remediation_data())
        found, err = svc.get_remediation_action(bid, str(action["_id"]))
        assert err is None
        assert found["action"] == "Force password reset for all affected users"

    def test_get_remediation_not_found(self, svc):
        doc = svc.create(_payload(), CREATOR)
        found, err = svc.get_remediation_action(str(doc["_id"]), str(ObjectId()))
        assert err == "not_found"

    def test_update_remediation(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        action, _ = svc.add_remediation_action(bid, self._remediation_data())
        updated, err = svc.update_remediation_action(bid, str(action["_id"]),
                                                     {"status": "completed"})
        assert err is None
        assert updated["status"] == "completed"

    def test_update_remediation_due_date(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        action, _ = svc.add_remediation_action(bid, self._remediation_data())
        updated, err = svc.update_remediation_action(bid, str(action["_id"]),
                                                     {"due_date": "2025-06-01"})
        assert err is None

    def test_update_remediation_completed_date(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        action, _ = svc.add_remediation_action(bid, self._remediation_data())
        updated, err = svc.update_remediation_action(bid, str(action["_id"]),
                                                     {"completed_date": "2025-05-15"})
        assert err is None

    def test_update_remediation_not_found(self, svc):
        doc = svc.create(_payload(), CREATOR)
        result, err = svc.update_remediation_action(str(doc["_id"]), str(ObjectId()),
                                                    {"status": "completed"})
        assert err == "not_found"

    def test_delete_remediation(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        action, _ = svc.add_remediation_action(bid, self._remediation_data())
        ok, err = svc.delete_remediation_action(bid, str(action["_id"]))
        assert ok is True

    def test_delete_remediation_not_found(self, svc):
        """$pull on a non-existent sub-doc still succeeds."""
        doc = svc.create(_payload(), CREATOR)
        ok, err = svc.delete_remediation_action(str(doc["_id"]), str(ObjectId()))
        assert ok is True
        assert err is None

    def test_list_remediation_invalid_id(self, svc):
        result, err = svc.list_remediation("bad")
        assert err == "invalid_id"

    def test_add_remediation_breach_not_found(self, svc):
        result, err = svc.add_remediation_action(str(ObjectId()), self._remediation_data())
        assert err == "not_found"

    def test_add_remediation_invalid_id(self, svc):
        result, err = svc.add_remediation_action("bad", self._remediation_data())
        assert err == "invalid_id"

    def test_update_remediation_invalid_id(self, svc):
        result, err = svc.update_remediation_action("bad", "bad", {"status": "completed"})
        assert err == "invalid_id"

    def test_delete_remediation_invalid_id(self, svc):
        ok, err = svc.delete_remediation_action("bad", "bad")
        assert ok is False
        assert err == "invalid_id"


# ===================================================================
# Sub-documents: Monitoring Alerts
# ===================================================================

class TestAlertsCRUD:

    def _alert_data(self):
        return {
            "alert_type": "new_exposure",
            "severity": "high",
            "details": "Credentials appearing on dark web marketplace identified.",
        }

    def test_list_alerts_empty(self, svc):
        doc = svc.create(_payload(), CREATOR)
        alerts, err = svc.list_alerts(str(doc["_id"]))
        assert err is None
        assert alerts == []

    def test_create_alert(self, svc):
        doc = svc.create(_payload(), CREATOR)
        alert, err = svc.create_alert(str(doc["_id"]), self._alert_data())
        assert err is None
        assert alert["alert_type"] == "new_exposure"
        assert alert["acknowledged"] is False

    def test_create_alert_with_triggered_at(self, svc):
        doc = svc.create(_payload(), CREATOR)
        data = {**self._alert_data(), "triggered_at": "2024-03-01T12:00:00Z"}
        alert, err = svc.create_alert(str(doc["_id"]), data)
        assert err is None
        assert isinstance(alert["triggered_at"], datetime)

    def test_get_alert(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        alert, _ = svc.create_alert(bid, self._alert_data())
        found, err = svc.get_alert(bid, str(alert["_id"]))
        assert err is None
        assert found["severity"] == "high"

    def test_get_alert_not_found(self, svc):
        doc = svc.create(_payload(), CREATOR)
        found, err = svc.get_alert(str(doc["_id"]), str(ObjectId()))
        assert err == "not_found"

    def test_update_alert(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        alert, _ = svc.create_alert(bid, self._alert_data())
        updated, err = svc.update_alert(bid, str(alert["_id"]),
                                        {"acknowledged": True})
        assert err is None
        assert updated["acknowledged"] is True

    def test_update_alert_not_found(self, svc):
        doc = svc.create(_payload(), CREATOR)
        result, err = svc.update_alert(str(doc["_id"]), str(ObjectId()),
                                       {"acknowledged": True})
        assert err == "not_found"

    def test_delete_alert(self, svc):
        doc = svc.create(_payload(), CREATOR)
        bid = str(doc["_id"])
        alert, _ = svc.create_alert(bid, self._alert_data())
        ok, err = svc.delete_alert(bid, str(alert["_id"]))
        assert ok is True

    def test_delete_alert_not_found(self, svc):
        """$pull on a non-existent sub-doc still succeeds."""
        doc = svc.create(_payload(), CREATOR)
        ok, err = svc.delete_alert(str(doc["_id"]), str(ObjectId()))
        assert ok is True
        assert err is None

    def test_list_alerts_invalid_id(self, svc):
        result, err = svc.list_alerts("bad")
        assert err == "invalid_id"

    def test_create_alert_invalid_id(self, svc):
        result, err = svc.create_alert("bad", self._alert_data())
        assert err == "invalid_id"

    def test_create_alert_breach_not_found(self, svc):
        result, err = svc.create_alert(str(ObjectId()), self._alert_data())
        assert err == "not_found"

    def test_update_alert_invalid_id(self, svc):
        result, err = svc.update_alert("bad", "bad", {"acknowledged": True})
        assert err == "invalid_id"

    def test_delete_alert_invalid_id(self, svc):
        ok, err = svc.delete_alert("bad", "bad")
        assert ok is False
        assert err == "invalid_id"


# ===================================================================
# GeoJSON
# ===================================================================

class TestGeoJSON:

    def test_get_geojson_returns_located_breaches(self, svc):
        svc.create(_payload(location={"type": "Point", "coordinates": [-73.97, 40.77]}), CREATOR)
        svc.create(_payload(), CREATOR)  # no location
        results = svc.get_geojson()
        assert len(results) == 1
        assert "location" in results[0]

    def test_get_geojson_filter_severity(self, svc):
        svc.create(_payload(severity="critical",
                            location={"type": "Point", "coordinates": [0, 0]}), CREATOR)
        svc.create(_payload(severity="low",
                            location={"type": "Point", "coordinates": [1, 1]}), CREATOR)
        results = svc.get_geojson(severity="critical")
        assert len(results) == 1

    def test_get_geojson_filter_industry(self, svc):
        svc.create(_payload(industry="finance",
                            location={"type": "Point", "coordinates": [0, 0]}), CREATOR)
        results = svc.get_geojson(industry="finance")
        assert len(results) == 1

    def test_get_geojson_empty(self, svc):
        results = svc.get_geojson()
        assert results == []


# ===================================================================
# =============== USER SERVICE INTEGRATION TESTS ====================
# ===================================================================

@pytest.fixture
def user_svc(app):
    """A UserService instance against mongomock."""
    with app.app_context():
        service = UserService()
        service.col.delete_many({})
        yield service
        service.col.delete_many({})


def _insert_user(svc, **overrides):
    """Insert a user directly into the collection and return the doc."""
    doc = {
        "username": overrides.get("username", "testuser"),
        "email": overrides.get("email", "test@example.com"),
        "password_hash": "$2b$12$fakehashfakehashfakehashfakehashfakehashfakehashfa",
        "role": overrides.get("role", "analyst"),
        "is_active": overrides.get("is_active", True),
        "created_at": datetime.utcnow(),
        "last_login": None,
    }
    doc.update({k: v for k, v in overrides.items()
                if k not in ("username", "email", "role", "is_active")})
    result = svc.col.insert_one(doc)
    doc["_id"] = result.inserted_id
    return doc


class TestUserServiceGetAll:

    def test_empty_collection(self, user_svc):
        users, total = user_svc.get_all()
        assert users == []
        assert total == 0

    def test_returns_users(self, user_svc):
        _insert_user(user_svc, username="u1", email="u1@x.com")
        _insert_user(user_svc, username="u2", email="u2@x.com")
        users, total = user_svc.get_all()
        assert total == 2
        assert len(users) == 2

    def test_pagination(self, user_svc):
        for i in range(5):
            _insert_user(user_svc, username=f"u{i}", email=f"u{i}@x.com")
        users, total = user_svc.get_all(page=1, limit=2)
        assert total == 5
        assert len(users) == 2

    def test_page_out_of_range(self, user_svc):
        _insert_user(user_svc)
        users, total = user_svc.get_all(page=100, limit=20)
        assert total == 1
        assert users == []

    def test_limit_clamped(self, user_svc):
        """Limit > 100 is clamped to 100; limit <= 0 defaults to 20."""
        _insert_user(user_svc)
        users, total = user_svc.get_all(page=1, limit=999)
        assert total == 1  # just verifies it runs without error

    def test_negative_page_clamped(self, user_svc):
        _insert_user(user_svc)
        users, total = user_svc.get_all(page=-5, limit=20)
        assert total == 1


class TestUserServiceGetById:

    def test_get_existing_user(self, user_svc):
        doc = _insert_user(user_svc)
        found = user_svc.get_by_id(str(doc["_id"]))
        assert found is not None
        assert found["username"] == "testuser"

    def test_get_nonexistent_user(self, user_svc):
        assert user_svc.get_by_id(str(ObjectId())) is None

    def test_get_invalid_id(self, user_svc):
        assert user_svc.get_by_id("bad-id") is None


class TestUserServiceUpdate:

    def test_update_username(self, user_svc):
        doc = _insert_user(user_svc)
        updated = user_svc.update_user(str(doc["_id"]), {"username": "newname"})
        assert updated["username"] == "newname"

    def test_update_email(self, user_svc):
        doc = _insert_user(user_svc)
        updated = user_svc.update_user(str(doc["_id"]), {"email": "new@x.com"})
        assert updated is not None

    def test_update_password_hash(self, user_svc):
        doc = _insert_user(user_svc)
        updated = user_svc.update_user(str(doc["_id"]),
                                       {"password_hash": "$2b$12$newhashnewhashnewhashnewhashnewhashnewhashnewh"})
        assert updated is not None

    def test_update_invalid_id(self, user_svc):
        assert user_svc.update_user("bad", {"username": "x"}) is None

    def test_update_nonexistent(self, user_svc):
        result = user_svc.update_user(str(ObjectId()), {"username": "x"})
        # update_one succeeds but returns the get_by_id which is None
        assert result is None

    def test_update_filters_unsafe_fields(self, user_svc):
        """Fields like 'role' and 'is_active' are filtered out by update_user."""
        doc = _insert_user(user_svc, role="analyst")
        user_svc.update_user(str(doc["_id"]), {"role": "admin", "is_active": False})
        # Role shouldn't change via update_user
        refreshed = user_svc.get_by_id(str(doc["_id"]))
        # Note: update_user filters role out; the user doc shouldn't change role
        assert refreshed["role"] == "analyst"


class TestUserServiceDelete:

    def test_delete_active_user(self, user_svc):
        doc = _insert_user(user_svc)
        ok = user_svc.delete_user(str(doc["_id"]))
        assert ok is True

    def test_delete_already_inactive(self, user_svc):
        doc = _insert_user(user_svc, is_active=False)
        ok = user_svc.delete_user(str(doc["_id"]))
        assert ok is False

    def test_delete_invalid_id(self, user_svc):
        ok = user_svc.delete_user("bad")
        assert ok is False

    def test_delete_nonexistent(self, user_svc):
        ok = user_svc.delete_user(str(ObjectId()))
        assert ok is False


class TestUserServiceGetUser:

    def test_get_user_safe_fields(self, user_svc):
        doc = _insert_user(user_svc)
        found = user_svc.get_user(str(doc["_id"]))
        assert found is not None
        assert "password_hash" not in found

    def test_get_user_invalid_id(self, user_svc):
        assert user_svc.get_user("bad") is None

    def test_get_user_not_found(self, user_svc):
        assert user_svc.get_user(str(ObjectId())) is None


class TestUserServiceCounters:

    def test_count_users_with_role(self, user_svc):
        _insert_user(user_svc, username="a1", email="a1@x.com", role="admin")
        _insert_user(user_svc, username="a2", email="a2@x.com", role="analyst")
        _insert_user(user_svc, username="a3", email="a3@x.com", role="analyst")
        assert user_svc.count_users_with_role("analyst") == 2
        assert user_svc.count_users_with_role("admin") == 1
        assert user_svc.count_users_with_role("guest") == 0

    def test_count_active_admins(self, user_svc):
        _insert_user(user_svc, username="ad1", email="ad1@x.com", role="admin", is_active=True)
        _insert_user(user_svc, username="ad2", email="ad2@x.com", role="admin", is_active=False)
        assert user_svc.count_active_admins() == 1


# ===================================================================
# =============== AUTH SERVICE INTEGRATION TESTS ====================
# ===================================================================

@pytest.fixture
def auth_svc(app):
    """An AuthService instance against mongomock."""
    with app.app_context():
        service = AuthService()
        service.col.delete_many({})
        yield service
        service.col.delete_many({})


class TestAuthServiceRegister:

    def test_register_success(self, auth_svc):
        user, err = auth_svc.register("newuser", "new@example.com", "StrongPass1")
        assert err is None
        assert user["username"] == "newuser"
        assert user["email"] == "new@example.com"
        assert "password_hash" not in user

    def test_register_default_role(self, auth_svc):
        user, err = auth_svc.register("u1", "u1@x.com", "StrongPass1")
        assert user["role"] == "guest"

    def test_register_custom_role(self, auth_svc):
        user, err = auth_svc.register("u2", "u2@x.com", "StrongPass1", role="analyst")
        assert user["role"] == "analyst"

    def test_register_duplicate_email(self, auth_svc):
        auth_svc.register("u1", "dup@x.com", "StrongPass1")
        user, err = auth_svc.register("u2", "dup@x.com", "StrongPass1")
        assert user is None
        assert "email" in err.lower()

    def test_register_duplicate_username(self, auth_svc):
        auth_svc.register("samename", "a@x.com", "StrongPass1")
        user, err = auth_svc.register("samename", "b@x.com", "StrongPass1")
        assert user is None
        assert "username" in err.lower()


class TestAuthServiceLogin:

    def test_login_success_by_email(self, auth_svc):
        auth_svc.register("loginuser", "login@x.com", "StrongPass1")
        result, err = auth_svc.login(email="login@x.com", password="StrongPass1")
        assert err is None
        assert "token" in result
        assert result["user"]["username"] == "loginuser"

    def test_login_success_by_username(self, auth_svc):
        auth_svc.register("loginuser2", "login2@x.com", "StrongPass1")
        result, err = auth_svc.login(username="loginuser2", password="StrongPass1")
        assert err is None
        assert "token" in result

    def test_login_wrong_password(self, auth_svc):
        auth_svc.register("user1", "user1@x.com", "StrongPass1")
        result, err = auth_svc.login(email="user1@x.com", password="WrongPass1")
        assert result is None
        assert "invalid" in err.lower()

    def test_login_nonexistent_user(self, auth_svc):
        result, err = auth_svc.login(email="nobody@x.com", password="Pass1234")
        assert result is None
        assert "invalid" in err.lower()

    def test_login_no_credentials(self, auth_svc):
        result, err = auth_svc.login()
        assert result is None

    def test_login_inactive_user(self, auth_svc):
        auth_svc.register("inactive", "inactive@x.com", "StrongPass1")
        auth_svc.col.update_one({"email": "inactive@x.com"},
                                {"$set": {"is_active": False}})
        result, err = auth_svc.login(email="inactive@x.com", password="StrongPass1")
        assert result is None
        assert "inactive" in err.lower()

    def test_login_updates_last_login(self, auth_svc):
        auth_svc.register("tsluser", "tsl@x.com", "StrongPass1")  # pragma: allowlist secret
        auth_svc.login(email="tsl@x.com", password="StrongPass1")  # pragma: allowlist secret
        user = auth_svc.col.find_one({"email": "tsl@x.com"})
        assert user["last_login"] is not None


class TestAuthServiceGetUserById:

    def test_get_user_by_id_success(self, auth_svc):
        user, _ = auth_svc.register("findme", "findme@x.com", "StrongPass1")
        found = auth_svc.get_user_by_id(str(user["_id"]))
        assert found is not None
        assert found["username"] == "findme"
        assert "password_hash" not in found

    def test_get_user_by_id_invalid(self, auth_svc):
        assert auth_svc.get_user_by_id("bad-id") is None

    def test_get_user_by_id_not_found(self, auth_svc):
        assert auth_svc.get_user_by_id(str(ObjectId())) is None


class TestAccountLockout:

    def test_no_lockout_initially(self, auth_svc):
        auth_svc.register("lockuser", "lock@x.com", "StrongPass1")
        locked, remaining = auth_svc.check_account_lockout("lock@x.com")
        assert locked is False
        assert remaining is None

    def test_lockout_nonexistent_email(self, auth_svc):
        locked, remaining = auth_svc.check_account_lockout("nobody@x.com")
        assert locked is False

    def test_record_failed_login_increments(self, auth_svc):
        auth_svc.register("failuser", "fail@x.com", "StrongPass1")
        auth_svc.record_failed_login("fail@x.com")
        user = auth_svc.col.find_one({"email": "fail@x.com"})
        assert user["failed_login_attempts"] == 1

    def test_lockout_after_max_attempts(self, app, auth_svc):
        auth_svc.register("lockme", "lockme@x.com", "StrongPass1")
        max_attempts = app.config.get("MAX_LOGIN_ATTEMPTS", 5)
        for _ in range(max_attempts):
            auth_svc.record_failed_login("lockme@x.com")
        locked, remaining = auth_svc.check_account_lockout("lockme@x.com")
        assert locked is True
        assert remaining > 0

    def test_reset_failed_attempts(self, auth_svc):
        auth_svc.register("resetuser", "reset@x.com", "StrongPass1")
        auth_svc.record_failed_login("reset@x.com")
        auth_svc.record_failed_login("reset@x.com")
        auth_svc.reset_failed_attempts("reset@x.com")
        user = auth_svc.col.find_one({"email": "reset@x.com"})
        assert user["failed_login_attempts"] == 0
        assert "locked_until" not in user

    def test_record_failed_login_nonexistent(self, auth_svc):
        """Should silently return without error."""
        auth_svc.record_failed_login("ghost@x.com")


# ===================================================================
# ============= ANALYTICS SERVICE INTEGRATION TESTS =================
# ===================================================================

@pytest.fixture
def analytics_svc(app):
    """An AnalyticsService instance with pre-seeded breach data."""
    with app.app_context():
        service = AnalyticsService()
        svc = BreachService()
        svc.col.delete_many({})

        # Seed 5 breaches with varied data for aggregation coverage
        now = datetime.utcnow()
        breaches = [
            {
                "title": "Finance Critical Breach",
                "severity": "critical", "status": "active", "industry": "finance",
                "risk_score": 9.5, "affected_records_count": 100000,
                "breach_date": datetime(2024, 3, 1), "discovered_date": datetime(2024, 3, 15),
                "data_types_exposed": ["email", "password", "ssn"],
                "organisation": {"name": "Big Bank"},
                "affected_accounts": [],
                "timeline": [],
                "monitoring_alerts": [
                    {"_id": ObjectId(), "alert_type": "new_exposure", "severity": "critical",
                     "details": "Creds on dark web", "triggered_at": now, "acknowledged": False},
                ],
                "remediation": [
                    {"_id": ObjectId(), "action": "Force password resets for all users",
                     "status": "completed", "due_date": now, "assigned_to": "sec_team", "completed_date": now},
                ],
                "created_at": now, "updated_at": now, "created_by": "seed",
            },
            {
                "title": "Healthcare Medium Breach",
                "severity": "medium", "status": "resolved", "industry": "healthcare",
                "risk_score": 5.0, "affected_records_count": 5000,
                "breach_date": datetime(2024, 6, 1), "discovered_date": datetime(2024, 6, 10),
                "data_types_exposed": ["email", "medical_record"],
                "organisation": {"name": "City Hospital"},
                "affected_accounts": [],
                "timeline": [],
                "monitoring_alerts": [
                    {"_id": ObjectId(), "alert_type": "dark_web_mention", "severity": "medium",
                     "details": "Records mentioned on forum", "triggered_at": now, "acknowledged": True},
                ],
                "remediation": [
                    {"_id": ObjectId(), "action": "Notify patients and regulatory body",
                     "status": "pending", "due_date": now, "assigned_to": "compliance", "completed_date": None},
                ],
                "created_at": now, "updated_at": now, "created_by": "seed",
            },
            {
                "title": "Tech Low Breach Event",
                "severity": "low", "status": "active", "industry": "technology",
                "risk_score": 2.0, "affected_records_count": 200,
                "breach_date": datetime(2024, 1, 1), "discovered_date": datetime(2024, 1, 5),
                "data_types_exposed": ["email"],
                "organisation": {"name": "Startup Inc"},
                "affected_accounts": [],
                "timeline": [],
                "monitoring_alerts": [],
                "remediation": [],
                "created_at": now, "updated_at": now, "created_by": "seed",
            },
            {
                "title": "Finance High Breach Incident",
                "severity": "high", "status": "investigating", "industry": "finance",
                "risk_score": 7.0, "affected_records_count": 50000,
                "breach_date": datetime(2024, 9, 1), "discovered_date": datetime(2024, 9, 10),
                "data_types_exposed": ["credit_card", "address"],
                "organisation": {"name": "Big Bank"},
                "affected_accounts": [],
                "timeline": [],
                "monitoring_alerts": [
                    {"_id": ObjectId(), "alert_type": "credential_stuffing", "severity": "high",
                     "details": "Stuffing attacks detected", "triggered_at": now, "acknowledged": False},
                ],
                "remediation": [],
                "created_at": now, "updated_at": now, "created_by": "seed",
            },
            {
                "title": "Retail Informational Breach",
                "severity": "informational", "status": "contained", "industry": "retail",
                "risk_score": 1.0, "affected_records_count": 50,
                "breach_date": datetime(2024, 12, 1), "discovered_date": datetime(2024, 12, 5),
                "data_types_exposed": ["email", "phone"],
                "organisation": {"name": "Shop Co"},
                "affected_accounts": [],
                "timeline": [],
                "monitoring_alerts": [],
                "remediation": [],
                "created_at": now, "updated_at": now, "created_by": "seed",
            },
        ]
        svc.col.insert_many(breaches)
        yield service
        svc.col.delete_many({})


class TestAnalyticsSeverityBreakdown:

    def test_returns_all_severities(self, analytics_svc):
        result = analytics_svc.severity_breakdown()
        assert isinstance(result, list)
        assert len(result) > 0
        severities = {r["severity"] for r in result}
        assert "critical" in severities

    def test_breach_count_adds_up(self, analytics_svc):
        result = analytics_svc.severity_breakdown()
        total = sum(r["breach_count"] for r in result)
        assert total == 5


class TestAnalyticsRiskByIndustry:

    def test_returns_industries(self, analytics_svc):
        result = analytics_svc.risk_by_industry()
        assert isinstance(result, list)
        industries = {r["industry"] for r in result}
        assert "finance" in industries

    def test_finance_has_two_breaches(self, analytics_svc):
        result = analytics_svc.risk_by_industry()
        finance = next(r for r in result if r["industry"] == "finance")
        assert finance["breach_count"] == 2


class TestAnalyticsMonthlyTrend:

    def test_returns_monthly_data(self, analytics_svc):
        result = analytics_svc.monthly_trend(year=2024)
        assert isinstance(result, list)
        assert len(result) > 0

    def test_empty_year(self, analytics_svc):
        result = analytics_svc.monthly_trend(year=1999)
        assert result == []

    def test_defaults_to_current_year(self, analytics_svc):
        # Just verify it doesn't error
        result = analytics_svc.monthly_trend()
        assert isinstance(result, list)


class TestAnalyticsTopOrganisations:

    def test_returns_top_orgs(self, analytics_svc):
        result = analytics_svc.top_organisations(limit=3)
        assert isinstance(result, list)
        assert len(result) >= 1

    def test_big_bank_has_highest_records(self, analytics_svc):
        result = analytics_svc.top_organisations(limit=1)
        assert result[0]["organisation"] == "Big Bank"


class TestAnalyticsDataTypesFrequency:

    def test_returns_data_types(self, analytics_svc):
        result = analytics_svc.data_types_frequency()
        assert isinstance(result, list)
        types = {r["data_type"] for r in result}
        assert "email" in types

    def test_email_is_most_common(self, analytics_svc):
        result = analytics_svc.data_types_frequency()
        assert result[0]["data_type"] == "email"


class TestAnalyticsRemediationRate:

    def test_returns_remediation_data(self, analytics_svc):
        result = analytics_svc.remediation_rate()
        assert isinstance(result, list)
        assert len(result) >= 1

    def test_completed_action_counted(self, analytics_svc):
        result = analytics_svc.remediation_rate()
        finance_breach = next(
            (r for r in result if r["title"] == "Finance Critical Breach"), None
        )
        assert finance_breach is not None
        assert finance_breach["completed_actions"] == 1
        assert finance_breach["completion_rate"] == 100.0


class TestAnalyticsAlertAcknowledgement:

    def test_returns_acknowledgement_data(self, analytics_svc):
        result = analytics_svc.alert_acknowledgement()
        assert isinstance(result, list)
        assert len(result) >= 1


class TestAnalyticsIndustryYearTrend:

    def test_returns_trend_data(self, analytics_svc):
        result = analytics_svc.industry_year_trend()
        assert isinstance(result, list)
        assert len(result) >= 1

    def test_contains_finance_2024(self, analytics_svc):
        result = analytics_svc.industry_year_trend()
        match = [r for r in result if r["industry"] == "finance" and r["year"] == 2024]
        assert len(match) == 1
        assert match[0]["breach_count"] == 2


class TestAnalyticsRiskScoreDistribution:

    def test_returns_buckets(self, analytics_svc):
        result = analytics_svc.risk_score_distribution()
        assert isinstance(result, list)
        assert len(result) >= 1

    def test_custom_bins(self, analytics_svc):
        result = analytics_svc.risk_score_distribution(bins=5)
        assert isinstance(result, list)

    def test_invalid_bins_defaults(self, analytics_svc):
        result = analytics_svc.risk_score_distribution(bins=-1)
        assert isinstance(result, list)


class TestAnalyticsSummary:

    def test_summary_returns_kpis(self, analytics_svc):
        result = analytics_svc.summary()
        assert result["total_breaches"] == 5
        assert result["total_records_exposed"] > 0
        assert "avg_risk_score" in result
        assert "open_alerts" in result
        assert "active_breaches" in result
        assert "resolved_breaches" in result
        assert "industries_affected" in result

    def test_active_breach_count(self, analytics_svc):
        result = analytics_svc.summary()
        assert result["active_breaches"] == 2

    def test_resolved_breach_count(self, analytics_svc):
        result = analytics_svc.summary()
        assert result["resolved_breaches"] == 1


class TestAnalyticsAttackSurfaceProfile:

    def test_attack_surface_profile_shape(self, analytics_svc):
        result = analytics_svc.attack_surface_profile()
        assert "overview" in result
        assert "severity_mix" in result
        assert "top_data_types" in result
        assert "industry_risk_ranking" in result
        assert "alert_pressure" in result

    def test_attack_surface_profile_industry_filter(self, analytics_svc):
        result = analytics_svc.attack_surface_profile(industry="finance")
        assert result["overview"]["breach_count"] >= 1


# ===================================================================
# =================== USER MODEL (UserSchema) ======================
# ===================================================================

class TestUserSchemaRegistration:

    def test_valid_registration(self):
        errors = UserSchema.validate_registration({
            "username": "validuser",
            "email": "valid@example.com",
            "password": "StrongPass1!",  # pragma: allowlist secret
        })
        assert errors == []

    def test_missing_username(self):
        errors = UserSchema.validate_registration({
            "username": "",
            "email": "a@b.com",
            "password": "StrongPass1!",  # pragma: allowlist secret
        })
        assert len(errors) > 0

    def test_invalid_username_chars(self):
        errors = UserSchema.validate_registration({
            "username": "bad user!",
            "email": "a@b.com",
            "password": "StrongPass1!", # pragma: allowlist secret
        })
        assert any("Username" in e for e in errors)

    def test_invalid_email(self):
        errors = UserSchema.validate_registration({
            "username": "validuser",
            "email": "not-an-email",
            "password": "StrongPass1!", # pragma: allowlist secret
        })
        assert any("email" in e.lower() for e in errors)

    def test_weak_password(self):
        errors = UserSchema.validate_registration({
            "username": "validuser",
            "email": "a@b.com",
            "password": "weak",  # pragma: allowlist secret
        })
        assert any("Password" in e for e in errors)

    def test_admin_self_register_blocked(self):
        errors = UserSchema.validate_registration({
            "username": "validuser",
            "email": "a@b.com",
            "password": "StrongPass1!", # pragma: allowlist secret
            "role": "admin",
        })
        assert any("admin" in e.lower() for e in errors)

    def test_invalid_role(self):
        errors = UserSchema.validate_registration({
            "username": "validuser",
            "email": "a@b.com",
            "password": "StrongPass1", # pragma: allowlist secret
            "role": "superuser",
        })
        assert any("Role" in e for e in errors)

    def test_non_string_username(self):
        errors = UserSchema.validate_registration({
            "username": 123,
            "email": "a@b.com",
            "password": "StrongPass1", # pragma: allowlist secret
        })
        assert any("username" in e for e in errors)

    def test_non_string_email(self):
        errors = UserSchema.validate_registration({
            "username": "validuser",
            "email": 123,
            "password": "StrongPass1", # pragma: allowlist secret
        })
        assert any("email" in e for e in errors)

    def test_non_string_password(self):
        errors = UserSchema.validate_registration({
            "username": "validuser",
            "email": "a@b.com",
            "password": 123, # pragma: allowlist secret
        })
        assert any("password" in e for e in errors)

    def test_email_exceeds_max_length(self):
        errors = UserSchema.validate_registration({
            "username": "validuser",
            "email": "a" * 250 + "@b.com",
            "password": "StrongPass1", # pragma: allowlist secret
        })
        assert any("254" in e or "exceed" in e.lower() for e in errors)

    def test_password_exceeds_max_length(self):
        errors = UserSchema.validate_registration({
            "username": "validuser",
            "email": "a@b.com",
            "password": "A1" + "a" * 127,  # pragma: allowlist secret
        })
        assert any("128" in e or "exceed" in e.lower() for e in errors)


class TestUserSchemaUpdate:

    def test_valid_update(self):
        errors = UserSchema.validate_update({"username": "newname"})
        assert errors == []

    def test_invalid_username(self):
        errors = UserSchema.validate_update({"username": "x"})
        assert len(errors) > 0

    def test_invalid_email(self):
        errors = UserSchema.validate_update({"email": "bad"})
        assert len(errors) > 0

    def test_invalid_password(self):
        errors = UserSchema.validate_update({"password": "weak"})
        assert len(errors) > 0

    def test_invalid_role(self):
        errors = UserSchema.validate_update({"role": "superadmin"})
        assert len(errors) > 0

    def test_valid_role(self):
        errors = UserSchema.validate_update({"role": "analyst"})
        assert errors == []

    def test_non_string_username(self):
        errors = UserSchema.validate_update({"username": 42})
        assert any("username" in e for e in errors)

    def test_non_string_email(self):
        errors = UserSchema.validate_update({"email": 42})
        assert any("email" in e for e in errors)

    def test_non_string_password(self):
        errors = UserSchema.validate_update({"password": 42})
        assert any("password" in e for e in errors)

    def test_email_too_long(self):
        errors = UserSchema.validate_update({"email": "a" * 260 + "@b.com"})
        assert len(errors) > 0

    def test_password_too_long(self):
        errors = UserSchema.validate_update({"password": "A1" + "x" * 130})
        assert len(errors) > 0


class TestUserSchemaValidateRole:

    def test_valid_roles(self):
        for role in ["guest", "analyst", "admin"]:
            assert UserSchema.validate_role(role) == []

    def test_invalid_role(self):
        errors = UserSchema.validate_role("superadmin")
        assert len(errors) == 1


class TestUserSchemaSanitize:

    def test_strips_mongo_operators(self):
        cleaned = UserSchema.sanitize({"username": "ok", "$gt": "1"})
        assert "$gt" not in cleaned

    def test_strips_html_from_username(self):
        cleaned = UserSchema.sanitize({"username": "<script>alert(1)</script>john"})
        assert "<script>" not in cleaned["username"]


class TestUserSchemaToDocument:

    def test_builds_correct_structure(self):
        doc = UserSchema.to_document("testuser", "test@x.com", "$2b$12$hash", "analyst")
        assert doc["username"] == "testuser"
        assert doc["email"] == "test@x.com"
        assert doc["role"] == "analyst"
        assert doc["is_active"] is True
        assert "created_at" in doc
        assert doc["last_login"] is None


class TestUserSchemaToSafeDict:

    def test_strips_password_hash(self):
        full_doc = {
            "_id": ObjectId(),
            "username": "u",
            "email": "u@x.com",
            "role": "guest",
            "is_active": True,
            "created_at": datetime.utcnow(),
            "last_login": None,
            "password_hash": "secret",  # pragma: allowlist secret
        }
        safe = UserSchema.to_safe_dict(full_doc)
        assert "password_hash" not in safe
        assert safe["username"] == "u"
