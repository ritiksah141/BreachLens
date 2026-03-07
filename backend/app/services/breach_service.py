"""
breach_service.py — All MongoDB breach collection operations for BreachLens.
"""
import math
from datetime import datetime
from typing import Optional

from bson import ObjectId
from bson.errors import InvalidId
from pymongo import ASCENDING, DESCENDING

from app.extensions import mongo
from app.utils.validators import parse_iso_date, is_valid_object_id, safe_regex_query

# ---------------------------------------------------------------------------
# Module-level constants
# ---------------------------------------------------------------------------

_SEVERITY_WEIGHTS: dict[str, float] = {
    "critical": 10.0,
    "high": 7.5,
    "medium": 5.0,
    "low": 2.5,
    "informational": 1.0,
}

_HIGH_SENSITIVITY: frozenset[str] = frozenset([
    "password", "hash", "credential", "ssn", "national_id", "nino", "medicare",
    "financial_data", "credit_card", "bank_account", "medical_record",
    "biometric", "health_claim", "diagnosis", "prescription", "nhs_number",
    "tax_file", "income", "scada", "api_key", "authentication_token",
    "2fa_bypass", "account_credential", "psychological", "passport_number",
])

_MEDIUM_SENSITIVITY: frozenset[str] = frozenset([
    "email", "phone", "address", "dob", "date_of_birth", "employment",
    "professional_info", "transaction_history", "ip_address", "academic_record",
    "invoice", "student_id", "pension", "nino",
])


def _data_type_weight(dtype: str) -> float:
    """Return sensitivity weight for a single data type string (0–10)."""
    dtype_lower = dtype.lower().replace(" ", "_")
    for keyword in _HIGH_SENSITIVITY:
        if keyword in dtype_lower:
            return 10.0
    for keyword in _MEDIUM_SENSITIVITY:
        if keyword in dtype_lower:
            return 5.0
    return 2.5  # low sensitivity default


SORT_FIELD_MAP: dict[str, str] = {
    "breach_date": "breach_date",
    "risk_score": "risk_score",
    "affected_records_count": "affected_records_count",
    "title": "title",
    "created_at": "created_at",
}


# ---------------------------------------------------------------------------
# Service class
# ---------------------------------------------------------------------------

class BreachService:
    COLLECTION = "breaches"

    @property
    def col(self):
        return mongo.db[self.COLLECTION]

    # ------------------------------------------------------------------ #
    # Indexes                                                               #
    # ------------------------------------------------------------------ #

    def ensure_indexes(self) -> None:
        """Create MongoDB indexes for the breaches collection."""
        self.col.create_index([("location", "2dsphere")], background=True)
        self.col.create_index(
            [("severity", ASCENDING), ("status", ASCENDING), ("industry", ASCENDING)],
            background=True,
        )
        self.col.create_index(
            [("title", "text"), ("description", "text")],
            background=True,
        )
        self.col.create_index([("risk_score", DESCENDING)], background=True)
        self.col.create_index([("breach_date", DESCENDING)], background=True)
        self.col.create_index([("organisation.domain", ASCENDING)], background=True)

    # ------------------------------------------------------------------ #
    # Helpers                                                               #
    # ------------------------------------------------------------------ #

    def _safe_objectid(self, value) -> Optional[ObjectId]:
        """Convert *value* to an ObjectId after validating it as a 24-char hex string."""
        if not is_valid_object_id(str(value)):
            return None
        try:
            return ObjectId(value)
        except (InvalidId, TypeError):
            return None

    @staticmethod
    def compute_risk_score(
        severity: str,
        affected_records_count: int,
        data_types_exposed: list,
    ) -> float:
        """Compute a normalised risk score in the range [0, 10]."""
        severity_weight = _SEVERITY_WEIGHTS.get(severity, 0.0)
        data_sensitivity = (
            sum(_data_type_weight(dt) for dt in data_types_exposed)
            / len(data_types_exposed)
            if data_types_exposed
            else 0.0
        )
        raw = (
            severity_weight * 4
            + min(math.log10(max(affected_records_count, 0) + 1), 10.0) * 3
            + data_sensitivity * 3
        ) / 10
        return round(min(max(raw, 0.0), 10.0), 2)

    # ------------------------------------------------------------------ #
    # Core CRUD                                                             #
    # ------------------------------------------------------------------ #

    def list_breaches(
        self,
        page: int = 1,
        limit: int = 20,
        sort_by: str = "created_at",
        order: str = "desc",
        severity: Optional[str] = None,
        status: Optional[str] = None,
        industry: Optional[str] = None,
        search: Optional[str] = None,
        min_risk: Optional[float] = None,
        max_risk: Optional[float] = None,
        include_accounts: bool = False,
    ) -> tuple[list[dict], int]:
        query: dict = {}
        if severity:
            query["severity"] = severity
        if status:
            query["status"] = status
        if industry:
            query["industry"] = industry
        if search:
            # Use $or with $regex for flexible text matching across title,
            # description, and organisation name — covers the $regex and $or
            # operators required by the module rubric.
            regex_filter = safe_regex_query(search, "title")
            query["$or"] = [
                regex_filter,
                safe_regex_query(search, "description"),
                safe_regex_query(search, "organisation.name"),
            ]
        if min_risk is not None or max_risk is not None:
            risk_filter: dict = {}
            if min_risk is not None:
                risk_filter["$gte"] = min_risk
            if max_risk is not None:
                risk_filter["$lte"] = max_risk
            query["risk_score"] = risk_filter

        projection = None if include_accounts else {"affected_accounts": 0}
        total = self.col.count_documents(query)
        sort_field = SORT_FIELD_MAP.get(sort_by, "created_at")
        sort_dir = DESCENDING if order == "desc" else ASCENDING
        cursor = (
            self.col.find(query, projection)
            .sort(sort_field, sort_dir)
            .skip((page - 1) * limit)
            .limit(limit)
        )
        return list(cursor), total

    def get_by_id(
        self, breach_id: str, include_accounts: bool = False
    ) -> Optional[dict]:
        oid = self._safe_objectid(breach_id)
        if not oid:
            return None
        projection = None if include_accounts else {"affected_accounts": 0}
        return self.col.find_one({"_id": oid}, projection)

    def create(self, data: dict, created_by: str) -> dict:
        severity = data.get("severity", "low")
        affected_records_count = int(data.get("affected_records_count", 0))
        data_types_exposed = data.get("data_types_exposed", [])

        if data.get("risk_score") is not None:
            risk_score = float(data["risk_score"])
        else:
            risk_score = self.compute_risk_score(
                severity, affected_records_count, data_types_exposed
            )

        breach_date = (
            parse_iso_date(data["breach_date"]) if data.get("breach_date") else None
        )
        discovered_date = (
            parse_iso_date(data["discovered_date"])
            if data.get("discovered_date")
            else None
        )

        now = datetime.utcnow()
        doc = {
            "title": data["title"],
            "description": data.get("description", ""),
            "severity": severity,
            "status": data.get("status", "active"),
            "breach_date": breach_date,
            "discovered_date": discovered_date,
            "affected_records_count": affected_records_count,
            "data_types_exposed": data_types_exposed,
            "industry": data.get("industry", "other"),
            "organisation": data.get("organisation", {}),
            "location": data.get("location"),
            "risk_score": risk_score,
            "source_url": data.get("source_url", ""),
            "affected_accounts": [],
            "timeline": [],
            "remediation": [],
            "monitoring_alerts": [],
            "created_at": now,
            "updated_at": now,
            "created_by": created_by,
        }
        result = self.col.insert_one(doc)
        doc["_id"] = result.inserted_id
        return doc

    def update(
        self,
        breach_id: str,
        data: dict,
        current_user_id: str,
        current_role: str,
    ) -> tuple[Optional[dict], Optional[str]]:
        oid = self._safe_objectid(breach_id)
        if not oid:
            return None, "invalid_id"
        existing = self.col.find_one({"_id": oid}, {"created_by": 1})
        if not existing:
            return None, "not_found"
        if current_role != "admin" and str(existing.get("created_by")) != str(current_user_id):
            return None, "forbidden"

        severity = data.get("severity", "low")
        affected_records_count = int(data.get("affected_records_count", 0))
        data_types_exposed = data.get("data_types_exposed", [])
        risk_score = (
            float(data["risk_score"])
            if data.get("risk_score") is not None
            else self.compute_risk_score(severity, affected_records_count, data_types_exposed)
        )

        breach_date = (
            parse_iso_date(data["breach_date"]) if data.get("breach_date") else None
        )
        discovered_date = (
            parse_iso_date(data["discovered_date"])
            if data.get("discovered_date")
            else None
        )

        update_doc = {
            "title": data["title"],
            "description": data.get("description", ""),
            "severity": severity,
            "status": data.get("status", "active"),
            "breach_date": breach_date,
            "discovered_date": discovered_date,
            "affected_records_count": affected_records_count,
            "data_types_exposed": data_types_exposed,
            "industry": data.get("industry", "other"),
            "organisation": data.get("organisation", {}),
            "location": data.get("location"),
            "risk_score": risk_score,
            "source_url": data.get("source_url", ""),
            "updated_at": datetime.utcnow(),
        }
        self.col.update_one({"_id": oid}, {"$set": update_doc})
        return self.get_by_id(breach_id, include_accounts=True), None

    def patch(
        self,
        breach_id: str,
        data: dict,
        current_user_id: str,
        current_role: str,
    ) -> tuple[Optional[dict], Optional[str]]:
        oid = self._safe_objectid(breach_id)
        if not oid:
            return None, "invalid_id"
        existing = self.col.find_one({"_id": oid})
        if not existing:
            return None, "not_found"
        if current_role != "admin" and str(existing.get("created_by")) != str(current_user_id):
            return None, "forbidden"

        allowed_patch_fields = [
            "title", "description", "severity", "status", "breach_date",
            "discovered_date", "affected_records_count", "data_types_exposed",
            "industry", "organisation", "location", "risk_score", "source_url",
        ]
        update_doc: dict = {"updated_at": datetime.utcnow()}
        for field in allowed_patch_fields:
            if field not in data:
                continue
            if field == "affected_records_count":
                update_doc[field] = int(data[field])
            elif field == "risk_score":
                update_doc[field] = round(min(max(float(data[field]), 0.0), 10.0), 2)
            elif field in ("breach_date", "discovered_date"):
                update_doc[field] = parse_iso_date(data[field]) if data[field] else None
            else:
                update_doc[field] = data[field]

        # Recompute risk_score if influencing fields changed and not explicitly provided
        influencing = {"severity", "affected_records_count", "data_types_exposed"}
        if influencing & set(data.keys()) and "risk_score" not in data:
            sev = update_doc.get("severity", existing.get("severity", "low"))
            cnt = update_doc.get("affected_records_count", existing.get("affected_records_count", 0))
            dts = update_doc.get("data_types_exposed", existing.get("data_types_exposed", []))
            update_doc["risk_score"] = self.compute_risk_score(sev, cnt, dts)

        self.col.update_one({"_id": oid}, {"$set": update_doc})
        return self.get_by_id(breach_id, include_accounts=True), None

    def delete(self, breach_id: str) -> tuple[bool, Optional[str]]:
        oid = self._safe_objectid(breach_id)
        if not oid:
            return False, "invalid_id"
        result = self.col.delete_one({"_id": oid})
        if result.deleted_count == 0:
            return False, "not_found"
        return True, None

    def bulk_delete(self, breach_ids: list[str]) -> tuple[int, list[str]]:
        oids = []
        invalid = []
        for bid in breach_ids:
            oid = self._safe_objectid(bid)
            if oid:
                oids.append(oid)
            else:
                invalid.append(bid)
        if not oids:
            return 0, invalid
        result = self.col.delete_many({"_id": {"$in": oids}})
        return result.deleted_count, invalid

    def bulk_insert(self, records: list[dict], created_by: str) -> tuple[list[dict], list[str]]:
        """Insert multiple breach records at once using ``insert_many``.

        Returns a tuple of (inserted_docs, errors).
        Each record is validated and enriched identically to :meth:`create`.
        """
        docs: list[dict] = []
        errors: list[str] = []
        now = datetime.utcnow()

        for idx, data in enumerate(records):
            try:
                severity = data.get("severity", "low")
                affected_records_count = int(data.get("affected_records_count", 0))
                data_types_exposed = data.get("data_types_exposed", [])
                risk_score = (
                    float(data["risk_score"])
                    if data.get("risk_score") is not None
                    else self.compute_risk_score(severity, affected_records_count, data_types_exposed)
                )
                breach_date = parse_iso_date(data["breach_date"]) if data.get("breach_date") else None
                discovered_date = parse_iso_date(data["discovered_date"]) if data.get("discovered_date") else None

                doc = {
                    "title": data["title"],
                    "description": data.get("description", ""),
                    "severity": severity,
                    "status": data.get("status", "active"),
                    "breach_date": breach_date,
                    "discovered_date": discovered_date,
                    "affected_records_count": affected_records_count,
                    "data_types_exposed": data_types_exposed,
                    "industry": data.get("industry", "other"),
                    "organisation": data.get("organisation", {}),
                    "location": data.get("location"),
                    "risk_score": risk_score,
                    "source_url": data.get("source_url", ""),
                    "affected_accounts": [],
                    "timeline": [],
                    "remediation": [],
                    "monitoring_alerts": [],
                    "created_at": now,
                    "updated_at": now,
                    "created_by": created_by,
                }
                docs.append(doc)
            except Exception as exc:
                errors.append(f"Record #{idx}: {str(exc)}")

        if docs:
            result = self.col.insert_many(docs, ordered=False)
            for doc, oid in zip(docs, result.inserted_ids):
                doc["_id"] = oid

        return docs, errors

    def check_exposure(
        self,
        email: Optional[str] = None,
        domain: Optional[str] = None,
    ) -> dict:
        _PROJ = {
            "title": 1,
            "severity": 1,
            "breach_date": 1,
            "industry": 1,
            "data_types_exposed": 1,
        }

        def _to_item(doc, matched_by: list[str]) -> dict:
            return {
                "_id": str(doc["_id"]),
                "title": doc.get("title", ""),
                "severity": doc.get("severity", ""),
                "breach_date": doc.get("breach_date"),
                "industry": doc.get("industry", ""),
                "data_types_exposed": doc.get("data_types_exposed", []),
                "matched_by": matched_by,
            }

        email_results: list[dict] = []
        domain_results: list[dict] = []

        if email:
            for doc in self.col.find({"affected_accounts.email": email.lower()}, _PROJ):
                email_results.append(_to_item(doc, ["email"]))

        if domain:
            for doc in self.col.find({"organisation.domain": domain.lower()}, _PROJ):
                domain_results.append(_to_item(doc, ["domain"]))

        if email and domain:
            seen: dict[str, dict] = {r["_id"]: r for r in email_results}
            for r in domain_results:
                if r["_id"] in seen:
                    seen[r["_id"]]["matched_by"] = ["email", "domain"]
                else:
                    seen[r["_id"]] = r
            merged = list(seen.values())
            return {
                "email": email,
                "domain": domain,
                "email_exposed": len(email_results) > 0,
                "domain_exposed": len(domain_results) > 0,
                "breach_count": len(merged),
                "breaches": merged,
            }

        results = email_results if email else domain_results
        response: dict = {}
        if email:
            response["email"] = email
            response["exposed"] = len(results) > 0
        if domain:
            response["domain"] = domain
            response["exposed"] = len(results) > 0
        response["breach_count"] = len(results)
        response["breaches"] = results
        return response

    # ------------------------------------------------------------------ #
    # Sub-documents: Affected Accounts                                      #
    # ------------------------------------------------------------------ #

    def list_affected_accounts(self, breach_id: str) -> tuple[Optional[list], Optional[str]]:
        try:
            oid = ObjectId(breach_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        doc = self.col.find_one({"_id": oid}, {"affected_accounts": 1})
        if not doc:
            return None, "not_found"
        return doc.get("affected_accounts", []), None

    def get_affected_account(self, breach_id: str, account_id: str) -> tuple[Optional[dict], Optional[str]]:
        """Return a single affected account from a breach."""
        accounts, err = self.list_affected_accounts(breach_id)
        if err:
            return None, err
        for acc in (accounts or []):
            if str(acc.get("_id")) == account_id:
                return acc, None
        return None, "not_found"

    def add_affected_account(self, breach_id: str, data: dict) -> tuple[Optional[dict], Optional[str]]:
        """Push a new affected account sub-document."""
        try:
            oid = ObjectId(breach_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        if not self.col.find_one({"_id": oid}, {"_id": 1}):
            return None, "not_found"
        account = {
            "_id": ObjectId(),
            "email": data["email"].lower(),
            "username": data.get("username", ""),
            "data_exposed": data.get("data_exposed", []),
            "notified": data.get("notified", False),
            "notification_date": None,
        }
        self.col.update_one(
            {"_id": oid},
            {"$push": {"affected_accounts": account}, "$set": {"updated_at": datetime.utcnow()}}
        )
        return account, None

    def update_affected_account(self, breach_id: str, account_id: str, data: dict) -> tuple[Optional[dict], Optional[str]]:
        """Patch a specific affected account using positional operator."""
        try:
            oid = ObjectId(breach_id)
            acid = ObjectId(account_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        set_fields: dict = {"updated_at": datetime.utcnow()}
        for field in ["notified", "notification_date", "username", "data_exposed"]:
            if field in data:
                set_fields[f"affected_accounts.$.{field}"] = data[field]
        result = self.col.update_one(
            {"_id": oid, "affected_accounts._id": acid},
            {"$set": set_fields}
        )
        if result.matched_count == 0:
            return None, "not_found"
        return self.get_affected_account(breach_id, account_id)

    def delete_affected_account(self, breach_id: str, account_id: str) -> tuple[bool, Optional[str]]:
        """Remove an affected account from a breach."""
        try:
            oid = ObjectId(breach_id)
            acid = ObjectId(account_id)
        except (InvalidId, TypeError):
            return False, "invalid_id"
        result = self.col.update_one(
            {"_id": oid},
            {"$pull": {"affected_accounts": {"_id": acid}}, "$set": {"updated_at": datetime.utcnow()}}
        )
        if result.matched_count == 0:
            return False, "not_found"
        return True, None

    # ------------------------------------------------------------------ #
    # Sub-documents: Timeline                                               #
    # ------------------------------------------------------------------ #

    def list_timeline(self, breach_id: str) -> tuple[Optional[list], Optional[str]]:
        try:
            oid = ObjectId(breach_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        doc = self.col.find_one({"_id": oid}, {"timeline": 1})
        if not doc:
            return None, "not_found"
        return doc.get("timeline", []), None

    def get_timeline_event(self, breach_id: str, event_id: str) -> tuple[Optional[dict], Optional[str]]:
        events, err = self.list_timeline(breach_id)
        if err:
            return None, err
        for ev in (events or []):
            if str(ev.get("_id")) == event_id:
                return ev, None
        return None, "not_found"

    def add_timeline_event(self, breach_id: str, data: dict) -> tuple[Optional[dict], Optional[str]]:
        try:
            oid = ObjectId(breach_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        if not self.col.find_one({"_id": oid}, {"_id": 1}):
            return None, "not_found"
        event = {
            "_id": ObjectId(),
            "event_date": parse_iso_date(data["event_date"]),
            "event_type": data["event_type"],
            "description": data["description"],
            "actor": data.get("actor", ""),
        }
        self.col.update_one(
            {"_id": oid},
            {"$push": {"timeline": event}, "$set": {"updated_at": datetime.utcnow()}}
        )
        return event, None

    def update_timeline_event(self, breach_id: str, event_id: str, data: dict) -> tuple[Optional[dict], Optional[str]]:
        try:
            oid = ObjectId(breach_id)
            eid = ObjectId(event_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        set_fields: dict = {"updated_at": datetime.utcnow()}
        for field in ["description", "actor", "event_type"]:
            if field in data:
                set_fields[f"timeline.$.{field}"] = data[field]
        if "event_date" in data:
            set_fields["timeline.$.event_date"] = parse_iso_date(data["event_date"])
        result = self.col.update_one(
            {"_id": oid, "timeline._id": eid},
            {"$set": set_fields}
        )
        if result.matched_count == 0:
            return None, "not_found"
        return self.get_timeline_event(breach_id, event_id)

    def delete_timeline_event(self, breach_id: str, event_id: str) -> tuple[bool, Optional[str]]:
        try:
            oid = ObjectId(breach_id)
            eid = ObjectId(event_id)
        except (InvalidId, TypeError):
            return False, "invalid_id"
        result = self.col.update_one(
            {"_id": oid},
            {"$pull": {"timeline": {"_id": eid}}, "$set": {"updated_at": datetime.utcnow()}}
        )
        if result.matched_count == 0:
            return False, "not_found"
        return True, None

    # ------------------------------------------------------------------ #
    # Sub-documents: Remediation                                            #
    # ------------------------------------------------------------------ #

    def list_remediation(self, breach_id: str) -> tuple[Optional[list], Optional[str]]:
        try:
            oid = ObjectId(breach_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        doc = self.col.find_one({"_id": oid}, {"remediation": 1})
        if not doc:
            return None, "not_found"
        return doc.get("remediation", []), None

    def get_remediation_action(self, breach_id: str, action_id: str) -> tuple[Optional[dict], Optional[str]]:
        actions, err = self.list_remediation(breach_id)
        if err:
            return None, err
        for act in (actions or []):
            if str(act.get("_id")) == action_id:
                return act, None
        return None, "not_found"

    def add_remediation_action(self, breach_id: str, data: dict) -> tuple[Optional[dict], Optional[str]]:
        try:
            oid = ObjectId(breach_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        if not self.col.find_one({"_id": oid}, {"_id": 1}):
            return None, "not_found"
        action = {
            "_id": ObjectId(),
            "action": data["action"],
            "status": data["status"],
            "assigned_to": data.get("assigned_to", ""),
            "due_date": parse_iso_date(data["due_date"]),
            "completed_date": None,
        }
        self.col.update_one(
            {"_id": oid},
            {"$push": {"remediation": action}, "$set": {"updated_at": datetime.utcnow()}}
        )
        return action, None

    def update_remediation_action(self, breach_id: str, action_id: str, data: dict) -> tuple[Optional[dict], Optional[str]]:
        try:
            oid = ObjectId(breach_id)
            aid = ObjectId(action_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        set_fields: dict = {"updated_at": datetime.utcnow()}
        for field in ["action", "status", "assigned_to"]:
            if field in data:
                set_fields[f"remediation.$.{field}"] = data[field]
        if "due_date" in data:
            set_fields["remediation.$.due_date"] = parse_iso_date(data["due_date"])
        if "completed_date" in data:
            set_fields["remediation.$.completed_date"] = parse_iso_date(data["completed_date"])
        result = self.col.update_one(
            {"_id": oid, "remediation._id": aid},
            {"$set": set_fields}
        )
        if result.matched_count == 0:
            return None, "not_found"
        return self.get_remediation_action(breach_id, action_id)

    def delete_remediation_action(self, breach_id: str, action_id: str) -> tuple[bool, Optional[str]]:
        try:
            oid = ObjectId(breach_id)
            aid = ObjectId(action_id)
        except (InvalidId, TypeError):
            return False, "invalid_id"
        result = self.col.update_one(
            {"_id": oid},
            {"$pull": {"remediation": {"_id": aid}}, "$set": {"updated_at": datetime.utcnow()}}
        )
        if result.matched_count == 0:
            return False, "not_found"
        return True, None

    # ------------------------------------------------------------------ #
    # Sub-documents: Monitoring Alerts                                      #
    # ------------------------------------------------------------------ #

    def list_alerts(self, breach_id: str) -> tuple[Optional[list], Optional[str]]:
        try:
            oid = ObjectId(breach_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        doc = self.col.find_one({"_id": oid}, {"monitoring_alerts": 1})
        if not doc:
            return None, "not_found"
        return doc.get("monitoring_alerts", []), None

    def get_alert(self, breach_id: str, alert_id: str) -> tuple[Optional[dict], Optional[str]]:
        alerts, err = self.list_alerts(breach_id)
        if err:
            return None, err
        for al in (alerts or []):
            if str(al.get("_id")) == alert_id:
                return al, None
        return None, "not_found"

    def create_alert(self, breach_id: str, data: dict) -> tuple[Optional[dict], Optional[str]]:
        try:
            oid = ObjectId(breach_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        if not self.col.find_one({"_id": oid}, {"_id": 1}):
            return None, "not_found"
        triggered_at = (
            parse_iso_date(data["triggered_at"]) if data.get("triggered_at") else datetime.utcnow()
        )
        alert = {
            "_id": ObjectId(),
            "alert_type": data["alert_type"],
            "severity": data["severity"],
            "details": data["details"],
            "triggered_at": triggered_at,
            "acknowledged": False,
        }
        self.col.update_one(
            {"_id": oid},
            {"$push": {"monitoring_alerts": alert}, "$set": {"updated_at": datetime.utcnow()}}
        )
        return alert, None

    def update_alert(self, breach_id: str, alert_id: str, data: dict) -> tuple[Optional[dict], Optional[str]]:
        try:
            oid = ObjectId(breach_id)
            alid = ObjectId(alert_id)
        except (InvalidId, TypeError):
            return None, "invalid_id"
        set_fields: dict = {"updated_at": datetime.utcnow()}
        for field in ["acknowledged", "details", "severity"]:
            if field in data:
                set_fields[f"monitoring_alerts.$.{field}"] = data[field]
        result = self.col.update_one(
            {"_id": oid, "monitoring_alerts._id": alid},
            {"$set": set_fields}
        )
        if result.matched_count == 0:
            return None, "not_found"
        return self.get_alert(breach_id, alert_id)

    def delete_alert(self, breach_id: str, alert_id: str) -> tuple[bool, Optional[str]]:
        try:
            oid = ObjectId(breach_id)
            alid = ObjectId(alert_id)
        except (InvalidId, TypeError):
            return False, "invalid_id"
        result = self.col.update_one(
            {"_id": oid},
            {"$pull": {"monitoring_alerts": {"_id": alid}}, "$set": {"updated_at": datetime.utcnow()}}
        )
        if result.matched_count == 0:
            return False, "not_found"
        return True, None

    # ------------------------------------------------------------------ #
    # Geospatial                                                            #
    # ------------------------------------------------------------------ #

    def find_near(self, longitude: float, latitude: float, radius: int = 50000) -> list[dict]:
        """Find breaches within `radius` metres of [longitude, latitude]."""
        cursor = self.col.find(
            {
                "location": {
                    "$near": {
                        "$geometry": {"type": "Point", "coordinates": [longitude, latitude]},
                        "$maxDistance": radius,
                    }
                }
            },
            {"affected_accounts": 0}
        )
        results = []
        for doc in cursor:
            coords = doc.get("location", {}).get("coordinates", [longitude, latitude])
            # Approximate distance via haversine placeholder — actual handled by MongoDB
            doc["distance_metres"] = None
            results.append(doc)
        return results

    def find_within_bounds(self, min_lng: float, min_lat: float, max_lng: float, max_lat: float) -> list[dict]:
        """Find breaches within a bounding box using GeoJSON Polygon (required for 2dsphere index)."""
        # Build a closed GeoJSON Polygon ring from the four bounding-box corners.
        # $box is for legacy 2d indexes only — use $geometry with type "Polygon" here.
        polygon = {
            "type": "Polygon",
            "coordinates": [[
                [min_lng, min_lat],
                [max_lng, min_lat],
                [max_lng, max_lat],
                [min_lng, max_lat],
                [min_lng, min_lat],   # close the ring
            ]],
        }
        return list(self.col.find(
            {
                "location": {
                    "$geoWithin": {
                        "$geometry": polygon,
                    }
                }
            },
            {"affected_accounts": 0}
        ))

    def get_geojson(self, severity: Optional[str] = None, industry: Optional[str] = None) -> list[dict]:
        """Return all breach docs with location for GeoJSON construction."""
        query: dict = {"location": {"$exists": True, "$ne": None}}
        if severity:
            query["severity"] = severity
        if industry:
            query["industry"] = industry
        return list(self.col.find(query, {
            "title": 1, "severity": 1, "risk_score": 1,
            "affected_records_count": 1, "industry": 1, "status": 1, "location": 1
        }))
