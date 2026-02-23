"""
analytics_service.py — MongoDB aggregation pipeline analytics for BreachLens.
All computation runs entirely inside MongoDB — no Python-side calculation.
"""
from datetime import datetime
from app.extensions import mongo


class AnalyticsService:
    """MongoDB aggregation pipelines for the BreachLens analytics dashboard."""

    @property
    def col(self):
        return mongo.db["breaches"]

    # ------------------------------------------------------------------ #
    # 8.1 — Risk by Industry                                               #
    # ------------------------------------------------------------------ #

    def risk_by_industry(self) -> list[dict]:
        """Average, max, min risk score grouped by industry."""
        pipeline = [
            {"$match": {"risk_score": {"$exists": True, "$ne": None}}},
            {"$group": {
                "_id": "$industry",
                "avg_risk": {"$avg": "$risk_score"},
                "max_risk": {"$max": "$risk_score"},
                "min_risk": {"$min": "$risk_score"},
                "count": {"$sum": 1},
            }},
            {"$project": {
                "industry": "$_id",
                "_id": 0,
                "avg_risk": {"$round": ["$avg_risk", 2]},
                "max_risk": 1,
                "min_risk": 1,
                "count": 1,
            }},
            {"$sort": {"avg_risk": -1}},
        ]
        return list(self.col.aggregate(pipeline))

    # ------------------------------------------------------------------ #
    # 8.2 — Severity Breakdown                                             #
    # ------------------------------------------------------------------ #

    def severity_breakdown(self) -> list[dict]:
        """Breach count and total records exposed per severity level."""
        pipeline = [
            {"$group": {
                "_id": "$severity",
                "breach_count": {"$sum": 1},
                "total_records": {"$sum": "$affected_records_count"},
            }},
            {"$project": {
                "severity": "$_id",
                "_id": 0,
                "breach_count": 1,
                "total_records": 1,
            }},
            {"$sort": {"breach_count": -1}},
        ]
        return list(self.col.aggregate(pipeline))

    # ------------------------------------------------------------------ #
    # 8.3 — Monthly Trend                                                  #
    # ------------------------------------------------------------------ #

    def monthly_trend(self, year: int | None = None) -> list[dict]:
        """Monthly breach discovery count for a given year."""
        target_year = year or datetime.utcnow().year
        pipeline = [
            {"$match": {
                "discovered_date": {
                    "$gte": datetime(target_year, 1, 1),
                    "$lt": datetime(target_year + 1, 1, 1),
                }
            }},
            {"$project": {
                "month": {"$month": "$discovered_date"},
                "year": {"$year": "$discovered_date"},
            }},
            {"$group": {
                "_id": {"year": "$year", "month": "$month"},
                "count": {"$sum": 1},
            }},
            {"$project": {
                "_id": 0,
                "year": "$_id.year",
                "month": "$_id.month",
                "count": 1,
            }},
            {"$sort": {"year": 1, "month": 1}},
        ]
        return list(self.col.aggregate(pipeline))

    # ------------------------------------------------------------------ #
    # 8.4 — Top Organisations                                              #
    # ------------------------------------------------------------------ #

    def top_organisations(self, limit: int = 10) -> list[dict]:
        """Top N organisations by total affected record count."""
        pipeline = [
            {"$group": {
                "_id": "$organisation.name",
                "total_records": {"$sum": "$affected_records_count"},
                "breach_count": {"$sum": 1},
                "avg_risk": {"$avg": "$risk_score"},
            }},
            {"$sort": {"total_records": -1}},
            {"$limit": limit},
            {"$project": {
                "_id": 0,
                "organisation": "$_id",
                "total_records": 1,
                "breach_count": 1,
                "avg_risk": {"$round": ["$avg_risk", 2]},
            }},
        ]
        return list(self.col.aggregate(pipeline))

    # ------------------------------------------------------------------ #
    # 8.5 — Data Types Frequency                                           #
    # ------------------------------------------------------------------ #

    def data_types_frequency(self) -> list[dict]:
        """Frequency count of each exposed data type across all breaches."""
        pipeline = [
            {"$unwind": "$data_types_exposed"},
            {"$group": {
                "_id": "$data_types_exposed",
                "count": {"$sum": 1},
            }},
            {"$project": {
                "_id": 0,
                "data_type": "$_id",
                "count": 1,
            }},
            {"$sort": {"count": -1}},
        ]
        return list(self.col.aggregate(pipeline))

    # ------------------------------------------------------------------ #
    # 8.6 — Remediation Rate                                               #
    # ------------------------------------------------------------------ #

    def remediation_rate(self) -> list[dict]:
        """Remediation completion rate per breach."""
        pipeline = [
            {"$match": {"remediation": {"$exists": True, "$ne": []}}},
            {"$unwind": "$remediation"},
            {"$group": {
                "_id": {"breach_id": "$_id", "title": "$title"},
                "total_actions": {"$sum": 1},
                "completed_actions": {
                    "$sum": {"$cond": [{"$eq": ["$remediation.status", "completed"]}, 1, 0]}
                },
            }},
            {"$project": {
                "_id": 0,
                "breach_id": {"$toString": "$_id.breach_id"},
                "title": "$_id.title",
                "total_actions": 1,
                "completed_actions": 1,
                "completion_rate": {
                    "$round": [
                        {"$multiply": [
                            {"$divide": ["$completed_actions", "$total_actions"]}, 100
                        ]},
                        1
                    ]
                },
            }},
            {"$sort": {"completion_rate": -1}},
        ]
        return list(self.col.aggregate(pipeline))

    # ------------------------------------------------------------------ #
    # 8.7 — Alert Acknowledgement                                          #
    # ------------------------------------------------------------------ #

    def alert_acknowledgement(self) -> list[dict]:
        """Alert acknowledgement rate per severity level."""
        pipeline = [
            {"$unwind": "$monitoring_alerts"},
            {"$group": {
                "_id": "$monitoring_alerts.severity",
                "total": {"$sum": 1},
                "acknowledged": {
                    "$sum": {"$cond": ["$monitoring_alerts.acknowledged", 1, 0]}
                },
            }},
            {"$project": {
                "_id": 0,
                "severity": "$_id",
                "total": 1,
                "acknowledged": 1,
                "acknowledgement_rate": {
                    "$round": [
                        {"$multiply": [
                            {"$divide": ["$acknowledged", "$total"]}, 100
                        ]},
                        1
                    ]
                },
            }},
            {"$sort": {"total": -1}},
        ]
        return list(self.col.aggregate(pipeline))

    # ------------------------------------------------------------------ #
    # 8.8 — Industry Year Trend                                            #
    # ------------------------------------------------------------------ #

    def industry_year_trend(self) -> list[dict]:
        """Breach count by industry and year for heatmap visualisation."""
        pipeline = [
            {"$project": {
                "industry": 1,
                "year": {"$year": "$breach_date"},
            }},
            {"$group": {
                "_id": {"industry": "$industry", "year": "$year"},
                "count": {"$sum": 1},
            }},
            {"$project": {
                "_id": 0,
                "industry": "$_id.industry",
                "year": "$_id.year",
                "count": 1,
            }},
            {"$sort": {"year": 1, "industry": 1}},
        ]
        return list(self.col.aggregate(pipeline))

    # ------------------------------------------------------------------ #
    # 8.9 — Risk Score Distribution                                        #
    # ------------------------------------------------------------------ #

    def risk_score_distribution(self, bins: int = 10) -> list[dict]:
        """Risk score histogram bucket data."""
        # Validate bins parameter to prevent invalid boundaries
        if not isinstance(bins, int) or bins < 1:
            bins = 10  # Coerce to safe default

        boundaries = [round(i * (10.0 / bins), 1) for i in range(bins + 1)]
        pipeline = [
            {"$match": {"risk_score": {"$exists": True, "$ne": None}}},
            {"$bucket": {
                "groupBy": "$risk_score",
                "boundaries": boundaries,
                "default": "other",
                "output": {"count": {"$sum": 1}},
            }},
        ]
        return list(self.col.aggregate(pipeline))

    # ------------------------------------------------------------------ #
    # 8.10 — Summary KPIs                                                  #
    # ------------------------------------------------------------------ #

    def summary(self) -> dict:
        """High-level KPI summary for the dashboard header."""
        pipeline = [
            {"$group": {
                "_id": None,
                "total_breaches": {"$sum": 1},
                "total_records_exposed": {"$sum": "$affected_records_count"},
                "avg_risk_score": {"$avg": "$risk_score"},
            }},
            {"$project": {
                "_id": 0,
                "total_breaches": 1,
                "total_records_exposed": 1,
                "avg_risk_score": {"$round": ["$avg_risk_score", 2]},
            }},
        ]
        result = list(self.col.aggregate(pipeline))
        base: dict = result[0] if result else {
            "total_breaches": 0, "total_records_exposed": 0, "avg_risk_score": 0.0
        }

        # Count unacknowledged alerts
        alert_pipeline = [
            {"$unwind": "$monitoring_alerts"},
            {"$match": {"monitoring_alerts.acknowledged": False}},
            {"$count": "open_alerts"},
        ]
        alert_result = list(self.col.aggregate(alert_pipeline))
        base["open_alerts"] = alert_result[0]["open_alerts"] if alert_result else 0

        # Active breaches count
        base["active_breaches"] = self.col.count_documents({"status": "active"})

        # Resolved breaches count
        base["resolved_breaches"] = self.col.count_documents({"status": "resolved"})

        # Number of distinct industries present in the collection
        base["industries_affected"] = len(self.col.distinct("industry"))

        return base
