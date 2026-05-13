"""
seed_data.py — Seed 25+ realistic breach records into BreachLens MongoDB.

Usage:
    python seed/seed_data.py
    python seed/seed_data.py --reset   # Drop existing data first
"""
import sys
import os
import argparse
import secrets
from datetime import datetime, timedelta, timezone
from urllib.parse import urlparse

sys.path.insert(0, os.path.join(os.path.dirname(__file__), ".."))

from dotenv import load_dotenv
load_dotenv()

import bcrypt
from pymongo import MongoClient, UpdateOne
from bson import ObjectId

MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/breachlens")
client = MongoClient(MONGO_URI)
# Safely extract database name from URI
parsed_uri = urlparse(MONGO_URI)
DB_NAME = parsed_uri.path.lstrip("/").split("?")[0] or "breachlens"
db = client[DB_NAME]


def _dt(year: int, month: int, day: int) -> datetime:
    return datetime(year, month, day)


def _oid() -> ObjectId:
    return ObjectId()


# --------------------------------------------------------------------------- #
# Seed Users                                                                   #
# --------------------------------------------------------------------------- #
def seed_users(reset: bool = False) -> tuple[dict, dict]:
    admin_pass = os.getenv("ADMIN_PASSWORD", secrets.token_urlsafe(12))
    analyst_pass = os.getenv("ANALYST_PASSWORD", secrets.token_urlsafe(12))
    guest_pass = os.getenv("GUEST_PASSWORD", secrets.token_urlsafe(12))

    users = [
        {
            "_id": _oid(),
            "username": "admin_breach",
            "email": "admin@breachlens.io",
            "password_hash": bcrypt.hashpw(admin_pass.encode(), bcrypt.gensalt(12)).decode(),
            "role": "admin",
            "is_active": True,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": _dt(2026, 1, 1),
            "last_login": None,
        },
        {
            "_id": _oid(),
            "username": "priya_analyst",
            "email": "priya@breachlens.io",
            "password_hash": bcrypt.hashpw(analyst_pass.encode(), bcrypt.gensalt(12)).decode(),
            "role": "analyst",
            "is_active": True,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": _dt(2026, 1, 5),
            "last_login": None,
        },
        {
            "_id": _oid(),
            "username": "marcus_guest",
            "email": "marcus@example.com",
            "password_hash": bcrypt.hashpw(guest_pass.encode(), bcrypt.gensalt(12)).decode(),
            "role": "guest",
            "is_active": True,
            "failed_login_attempts": 0,
            "locked_until": None,
            "created_at": _dt(2026, 1, 10),
            "last_login": None,
        },
    ]
    # Only delete if reset is requested
    if reset:
        db.users.delete_many({})

    operations = []
    for u in users:
        operations.append(
            UpdateOne(
                {"email": u["email"]},
                {"$setOnInsert": u},
                upsert=True
            )
        )

    result = db.users.bulk_write(operations)
    print(f"  Upserted {result.upserted_count} new users. (Matched {result.matched_count} existing)")

    # Fetch all user IDs (either newly inserted or existing)
    emails = [u["email"] for u in users]
    db_users = db.users.find({"email": {"$in": emails}})
    user_ids = {u["username"]: u["_id"] for u in db_users}

    passwords = {
        "admin": admin_pass,
        "analyst": analyst_pass,
        "guest": guest_pass
    }
    return user_ids, passwords


# --------------------------------------------------------------------------- #
# Seed Breaches                                                                #
# --------------------------------------------------------------------------- #
BREACHES_DATA = [
    {
        "breach_id": "BREACH_2025_001",
        "title": "LinkedIn Credential Dump 2025",
        "description": "A massive credential dump containing LinkedIn usernames, hashed passwords, and professional profile data surfaced on a dark web forum, exposing over 2.4 million records.",
        "source_url": "https://example.com/linkedin-dump-2025",
        "breach_date": _dt(2025, 11, 15),
        "discovered_date": _dt(2025, 11, 18),
        "severity": "critical",
        "status": "active",
        "industry": "technology",
        "affected_records_count": 2400000,
        "data_types_exposed": ["email", "password_hash", "username", "professional_info"],
        "risk_score": 9.2,
        "organisation": {"name": "LinkedIn Corp", "domain": "linkedin.com", "country": "USA", "country_code": "US", "size": "enterprise", "employee_count": 20000},
        "location": {"type": "Point", "coordinates": [-122.4194, 37.7749]},
        "affected_accounts": [
            {"_id": _oid(), "email": "alice@example.com", "username": "alice_li", "data_exposed": ["email", "password_hash"], "notified": True, "notification_date": _dt(2025, 11, 20)},
            {"_id": _oid(), "email": "bob@testcorp.io", "username": "bob_t", "data_exposed": ["email", "professional_info"], "notified": False, "notification_date": None},
        ],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 11, 15), "event_type": "breach_occurred", "description": "Attacker exfiltrated credential database via exposed API endpoint.", "actor": "APT-Phantom"},
            {"_id": _oid(), "event_date": _dt(2025, 11, 18), "event_type": "discovered", "description": "Threat intelligence team identified data for sale on dark web forum.", "actor": "BreachLens TI"},
            {"_id": _oid(), "event_date": _dt(2025, 11, 20), "event_type": "disclosed", "description": "LinkedIn publicly acknowledged the breach and notified affected users.", "actor": "LinkedIn Security"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Force password reset for all affected accounts.", "status": "completed", "assigned_to": "LinkedIn Security", "due_date": _dt(2025, 11, 22), "completed_date": _dt(2025, 11, 21)},
            {"_id": _oid(), "action": "Patch exposed API endpoint and deploy WAF rules.", "status": "in_progress", "assigned_to": "Engineering", "due_date": _dt(2025, 12, 1), "completed_date": None},
        ],
        "monitoring_alerts": [
            {"_id": _oid(), "alert_type": "credential_stuffing", "triggered_at": _dt(2025, 11, 19), "severity": "high", "details": "Credential stuffing attack detected using dumped credentials against LinkedIn login.", "acknowledged": True},
        ],
        "threat_intelligence": {
            "threat_actor": "APT-Phantom",
            "attribution_confidence": "medium",
            "ttps": ["API Exploitation", "Credential Harvesting", "Data Exfiltration"],
            "mitre_attack": ["T1190", "T1078", "T1567"]
        },
        "data_availability": {
            "dark_web_status": "active_sale",
            "price_btc": 2.5,
            "price_usd": 125000,
            "marketplace": "BreachForums",
            "first_seen_dark_web": _dt(2025, 11, 19)
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "CCPA", "UK DPA 2018"],
            "notification_required": True,
            "potential_fine_max_gbp": 50000000,
            "legal_status": "regulatory_investigation"
        },
    },
    {
        "breach_id": "BREACH_2025_002",
        "title": "NHS Patient Records Exposure 2025",
        "description": "A misconfigured S3 bucket belonging to an NHS IT contractor exposed sensitive patient medical records, including diagnoses, prescriptions, and personal identifiers.",
        "source_url": "https://example.com/nhs-s3-2025",
        "breach_date": _dt(2025, 9, 3),
        "discovered_date": _dt(2025, 9, 10),
        "severity": "critical",
        "status": "contained",
        "industry": "healthcare",
        "affected_records_count": 780000,
        "data_types_exposed": ["name", "dob", "diagnosis", "prescription", "nhs_number"],
        "risk_score": 8.9,
        "organisation": {"name": "NHS Digital", "domain": "nhs.uk", "country": "UK", "country_code": "GB", "size": "enterprise", "employee_count": 1500000},
        "location": {"type": "Point", "coordinates": [-0.1276, 51.5074]},
        "affected_accounts": [
            {"_id": _oid(), "email": "patient1@nhs.uk", "username": "pat_001", "data_exposed": ["name", "dob", "diagnosis"], "notified": True, "notification_date": _dt(2025, 9, 15)},
        ],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 9, 3), "event_type": "breach_occurred", "description": "S3 bucket set to public access, data became accessible without authentication.", "actor": "Internal Configuration Error"},
            {"_id": _oid(), "event_date": _dt(2025, 9, 10), "event_type": "discovered", "description": "Security researcher notified NHS of exposed bucket.", "actor": "External Researcher"},
            {"_id": _oid(), "event_date": _dt(2025, 9, 11), "event_type": "contained", "description": "S3 bucket access permissions corrected and access logs reviewed.", "actor": "NHS IT Security"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Restrict S3 bucket to private access and enable bucket versioning.", "status": "completed", "assigned_to": "Cloud Team", "due_date": _dt(2025, 9, 12), "completed_date": _dt(2025, 9, 11)},
            {"_id": _oid(), "action": "Notify ICO and affected patients within 72 hours per GDPR.", "status": "completed", "assigned_to": "Legal & Compliance", "due_date": _dt(2025, 9, 13), "completed_date": _dt(2025, 9, 13)},
        ],
        "monitoring_alerts": [
            {"_id": _oid(), "alert_type": "new_exposure", "triggered_at": _dt(2025, 9, 10), "severity": "critical", "details": "Patient medical records detected on public-facing S3 bucket.", "acknowledged": True},
        ],
        "threat_intelligence": {
            "threat_actor": "Unknown (Misconfiguration)",
            "attribution_confidence": "high",
            "ttps": ["Cloud Misconfiguration", "Unauthorised Data Access"],
            "mitre_attack": ["T1530"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "UK DPA 2018", "NHS DSP Toolkit"],
            "notification_required": True,
            "potential_fine_max_gbp": 17500000,
            "legal_status": "ico_investigation"
        },
    },
    {
        "breach_id": "BREACH_2025_003",
        "title": "JPMorgan Chase Phishing Campaign 2025",
        "description": "A sophisticated spear-phishing campaign targeted JPMorgan Chase employees, resulting in access to internal financial systems and exfiltration of customer account data.",
        "source_url": None,
        "breach_date": _dt(2025, 7, 22),
        "discovered_date": _dt(2025, 8, 1),
        "severity": "high",
        "status": "investigating",
        "industry": "finance",
        "affected_records_count": 150000,
        "data_types_exposed": ["account_number", "email", "ssn", "transaction_history"],
        "risk_score": 7.8,
        "organisation": {"name": "JPMorgan Chase", "domain": "jpmorgan.com", "country": "USA", "country_code": "US", "size": "enterprise", "employee_count": 293000},
        "location": {"type": "Point", "coordinates": [-74.0060, 40.7128]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 7, 22), "event_type": "breach_occurred", "description": "Employee credentials stolen via spear-phishing email with malicious attachment.", "actor": "Lazarus Group"},
            {"_id": _oid(), "event_date": _dt(2025, 8, 1), "event_type": "discovered", "description": "SOC detected anomalous data access patterns in SIEM alerts.", "actor": "SOC Team"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Revoke compromised employee credentials and enforce MFA re-enrollment.", "status": "completed", "assigned_to": "IAM Team", "due_date": _dt(2025, 8, 5), "completed_date": _dt(2025, 8, 3)},
            {"_id": _oid(), "action": "Conduct forensic analysis of affected systems.", "status": "in_progress", "assigned_to": "Incident Response", "due_date": _dt(2025, 8, 15), "completed_date": None},
            {"_id": _oid(), "action": "Notify affected customers per regulatory requirements.", "status": "pending", "assigned_to": "Legal", "due_date": _dt(2025, 8, 30), "completed_date": None},
        ],
        "monitoring_alerts": [
            {"_id": _oid(), "alert_type": "credential_stuffing", "triggered_at": _dt(2025, 8, 2), "severity": "high", "details": "Stolen credentials used in credential stuffing attacks against customer portal.", "acknowledged": False},
        ],
        "threat_intelligence": {
            "threat_actor": "Lazarus Group",
            "attribution_confidence": "high",
            "ttps": ["Spear Phishing", "Credential Theft", "Lateral Movement"],
            "mitre_attack": ["T1566", "T1078", "T1021"]
        },
        "data_availability": {
            "dark_web_status": "listed",
            "price_btc": 5.0,
            "price_usd": 250000,
            "marketplace": "RaidForums Successor",
            "first_seen_dark_web": _dt(2025, 8, 3)
        },
        "compliance_impact": {
            "regulations_affected": ["GLBA", "SOX", "PCI DSS"],
            "notification_required": True,
            "potential_fine_max_gbp": 80000000,
            "legal_status": "regulatory_investigation"
        },
    },
    {
        "breach_id": "BREACH_2025_004",
        "title": "Marriott Hotels Guest Database Breach",
        "description": "Attackers gained unauthorised access to Marriott's central reservations database through a third-party supplier compromise, exposing guest loyalty profile data.",
        "source_url": "https://example.com/marriott-breach",
        "breach_date": _dt(2025, 3, 10),
        "discovered_date": _dt(2025, 3, 28),
        "severity": "high",
        "status": "resolved",
        "industry": "retail",
        "affected_records_count": 5200000,
        "data_types_exposed": ["name", "email", "phone", "loyalty_points", "passport_number"],
        "risk_score": 7.1,
        "organisation": {"name": "Marriott International", "domain": "marriott.com", "country": "USA", "country_code": "US", "size": "enterprise", "employee_count": 120000},
        "location": {"type": "Point", "coordinates": [-77.0369, 38.9072]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 3, 10), "event_type": "breach_occurred", "description": "Supplier management portal compromised via SQL injection vulnerability.", "actor": "Unknown"},
            {"_id": _oid(), "event_date": _dt(2025, 3, 28), "event_type": "discovered", "description": "Unusual database query patterns flagged by DBA monitoring script.", "actor": "Database Team"},
            {"_id": _oid(), "event_date": _dt(2025, 4, 5), "event_type": "resolved", "description": "Supplier access revoked, vulnerability patched, affected guests notified.", "actor": "CISO Office"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Terminate supplier access and retire vulnerable API.", "status": "completed", "assigned_to": "Vendor Mgmt", "due_date": _dt(2025, 4, 1), "completed_date": _dt(2025, 3, 30)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Unknown",
            "attribution_confidence": "low",
            "ttps": ["Supply Chain Attack", "SQL Injection"],
            "mitre_attack": ["T1195", "T1190"]
        },
        "data_availability": {
            "dark_web_status": "freely_available",
            "price_btc": None,
            "price_usd": None,
            "marketplace": "Telegram Channels",
            "first_seen_dark_web": _dt(2025, 4, 1)
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "CCPA", "PCI DSS"],
            "notification_required": True,
            "potential_fine_max_gbp": 25000000,
            "legal_status": "notified"
        },
    },
    {
        "breach_id": "BREACH_2025_005",
        "title": "T-Mobile SIM Swap Attack Wave",
        "description": "Coordinated SIM swap attacks against T-Mobile customers allowed attackers to intercept SMS 2FA codes, enabling takeover of cryptocurrency and banking accounts.",
        "source_url": None,
        "breach_date": _dt(2025, 6, 1),
        "discovered_date": _dt(2025, 6, 5),
        "severity": "high",
        "status": "active",
        "industry": "technology",
        "affected_records_count": 35000,
        "data_types_exposed": ["phone_number", "account_credentials", "2fa_bypass"],
        "risk_score": 8.3,
        "organisation": {"name": "T-Mobile US", "domain": "t-mobile.com", "country": "USA", "country_code": "US", "size": "enterprise", "employee_count": 75000},
        "location": {"type": "Point", "coordinates": [-94.5786, 39.0997]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 6, 1), "event_type": "breach_occurred", "description": "Insiders bribed to perform SIM swaps on high-value targets.", "actor": "Scattered Spider"},
            {"_id": _oid(), "event_date": _dt(2025, 6, 5), "event_type": "discovered", "description": "Multiple fraud reports traced back to SIM swap activity.", "actor": "Fraud Detection"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Implement enhanced customer verification for SIM change requests.", "status": "in_progress", "assigned_to": "Operations", "due_date": _dt(2025, 7, 1), "completed_date": None},
        ],
        "monitoring_alerts": [
            {"_id": _oid(), "alert_type": "dark_web_mention", "triggered_at": _dt(2025, 6, 6), "severity": "high", "details": "SIM swap services targeting T-Mobile advertised on dark web forums.", "acknowledged": True},
        ],
        "threat_intelligence": {
            "threat_actor": "Scattered Spider",
            "attribution_confidence": "high",
            "ttps": ["Social Engineering", "SIM Swapping", "Account Takeover"],
            "mitre_attack": ["T1078", "T1056", "T1531"]
        },
        "data_availability": {
            "dark_web_status": "active_sale",
            "price_btc": 1.2,
            "price_usd": 60000,
            "marketplace": "Dark Web Forum",
            "first_seen_dark_web": _dt(2025, 6, 6)
        },
        "compliance_impact": {
            "regulations_affected": ["CPNI Regulations", "FCC Rules", "CCPA"],
            "notification_required": True,
            "potential_fine_max_gbp": 24000000,
            "legal_status": "fcc_investigation"
        },
    },
    {
        "breach_id": "BREACH_2025_006",
        "title": "Australian Taxation Office Internal Leak",
        "description": "A disgruntled contractor exfiltrated tax return data for thousands of Australian taxpayers, uploading files to a personal cloud storage account.",
        "source_url": None,
        "breach_date": _dt(2025, 4, 14),
        "discovered_date": _dt(2025, 4, 22),
        "severity": "critical",
        "status": "contained",
        "industry": "government",
        "affected_records_count": 200000,
        "data_types_exposed": ["tax_file_number", "income_data", "name", "address", "bank_account"],
        "risk_score": 9.5,
        "organisation": {"name": "Australian Taxation Office", "domain": "ato.gov.au", "country": "Australia", "country_code": "AU", "size": "large", "employee_count": 20000},
        "location": {"type": "Point", "coordinates": [149.1300, -35.2809]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 4, 14), "event_type": "breach_occurred", "description": "Contractor downloaded bulk data export to personal USB device.", "actor": "Malicious Insider"},
            {"_id": _oid(), "event_date": _dt(2025, 4, 22), "event_type": "discovered", "description": "DLP system flagged unusual data transfer activity in audit logs.", "actor": "DLP System"},
            {"_id": _oid(), "event_date": _dt(2025, 4, 25), "event_type": "contained", "description": "Contractor access revoked; law enforcement engaged.", "actor": "ATO Security"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Revoke contractor privileged access and audit all recent data access.", "status": "completed", "assigned_to": "IAM", "due_date": _dt(2025, 4, 23), "completed_date": _dt(2025, 4, 23)},
            {"_id": _oid(), "action": "Implement USB device blocking for all contractor workstations.", "status": "completed", "assigned_to": "Endpoint Security", "due_date": _dt(2025, 5, 1), "completed_date": _dt(2025, 4, 30)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Malicious Insider",
            "attribution_confidence": "high",
            "ttps": ["Insider Threat", "Data Exfiltration via USB", "Privilege Abuse"],
            "mitre_attack": ["T1052", "T1078", "T1005"]
        },
        "data_availability": {
            "dark_web_status": "listed",
            "price_btc": 3.0,
            "price_usd": 150000,
            "marketplace": "Dark Web Marketplace",
            "first_seen_dark_web": _dt(2025, 4, 28)
        },
        "compliance_impact": {
            "regulations_affected": ["Privacy Act 1988 (AU)", "Tax Administration Act"],
            "notification_required": True,
            "potential_fine_max_gbp": 40000000,
            "legal_status": "criminal_prosecution"
        },
    },
    {
        "breach_id": "BREACH_2025_007",
        "title": "Samsung SmartThings IoT Platform Compromise",
        "description": "Attackers exploited an unpatched vulnerability in the Samsung SmartThings hub firmware, gaining access to home automation data and device control capabilities.",
        "source_url": "https://example.com/samsung-iot-2025",
        "breach_date": _dt(2025, 2, 8),
        "discovered_date": _dt(2025, 2, 15),
        "severity": "medium",
        "status": "resolved",
        "industry": "technology",
        "affected_records_count": 90000,
        "data_types_exposed": ["device_id", "location", "home_automation_data", "email"],
        "risk_score": 6.0,
        "organisation": {"name": "Samsung Electronics", "domain": "samsung.com", "country": "South Korea", "country_code": "KR", "size": "enterprise", "employee_count": 270000},
        "location": {"type": "Point", "coordinates": [127.0276, 37.4979]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 2, 8), "event_type": "breach_occurred", "description": "CVE-2025-1234 exploited in SmartThings hub firmware 3.1.x.", "actor": "Unknown"},
            {"_id": _oid(), "event_date": _dt(2025, 2, 15), "event_type": "discovered", "description": "Anomalous API calls from hubs detected by Samsung cloud infrastructure.", "actor": "Samsung SRE"},
            {"_id": _oid(), "event_date": _dt(2025, 3, 1), "event_type": "resolved", "description": "Emergency firmware patch pushed to all affected hubs.", "actor": "Samsung Product Security"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Deploy emergency firmware patch 3.1.4 to all affected hubs.", "status": "completed", "assigned_to": "Product Security", "due_date": _dt(2025, 2, 20), "completed_date": _dt(2025, 2, 18)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Unknown",
            "attribution_confidence": "low",
            "ttps": ["Firmware Exploitation", "IoT Vulnerability Abuse"],
            "mitre_attack": ["T1190", "T1200"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "South Korea PIPA"],
            "notification_required": True,
            "potential_fine_max_gbp": 5000000,
            "legal_status": "notified"
        },
    },
    {
        "breach_id": "BREACH_2025_008",
        "title": "University of Manchester Student Data Breach",
        "description": "A ransomware attack on the University of Manchester compromised student and staff personal data, including academic records and financial information stored on university servers.",
        "source_url": "https://example.com/uman-ransomware",
        "breach_date": _dt(2025, 5, 20),
        "discovered_date": _dt(2025, 5, 21),
        "severity": "high",
        "status": "contained",
        "industry": "education",
        "affected_records_count": 1100000,
        "data_types_exposed": ["name", "student_id", "email", "financial_data", "academic_records"],
        "risk_score": 7.6,
        "organisation": {"name": "University of Manchester", "domain": "manchester.ac.uk", "country": "UK", "country_code": "GB", "size": "large", "employee_count": 12000},
        "location": {"type": "Point", "coordinates": [-2.2374, 53.4668]},
        "affected_accounts": [
            {"_id": _oid(), "email": "student@manchester.ac.uk", "username": "stu_001", "data_exposed": ["name", "student_id", "academic_records"], "notified": True, "notification_date": _dt(2025, 5, 28)},
        ],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 5, 20), "event_type": "breach_occurred", "description": "ALPHV ransomware deployed via compromised VPN credentials.", "actor": "ALPHV (BlackCat)"},
            {"_id": _oid(), "event_date": _dt(2025, 5, 21), "event_type": "discovered", "description": "Network monitoring detected large-scale file encryption activity.", "actor": "NOC"},
            {"_id": _oid(), "event_date": _dt(2025, 5, 25), "event_type": "contained", "description": "Affected segments isolated; backups initiated restoration procedures.", "actor": "IT Security"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Isolate infected network segments and restore from clean backups.", "status": "completed", "assigned_to": "IT Operations", "due_date": _dt(2025, 5, 28), "completed_date": _dt(2025, 5, 27)},
            {"_id": _oid(), "action": "Engage NCSC and notify ICO within 72 hours.", "status": "completed", "assigned_to": "Compliance", "due_date": _dt(2025, 5, 24), "completed_date": _dt(2025, 5, 24)},
        ],
        "monitoring_alerts": [
            {"_id": _oid(), "alert_type": "dark_web_mention", "triggered_at": _dt(2025, 5, 22), "severity": "critical", "details": "ALPHV leak site posted proof-of-data screenshot for University of Manchester.", "acknowledged": True},
        ],
        "threat_intelligence": {
            "threat_actor": "ALPHV (BlackCat)",
            "attribution_confidence": "high",
            "ttps": ["Ransomware Deployment", "Credential Theft via VPN", "Data Exfiltration"],
            "mitre_attack": ["T1486", "T1078", "T1567"]
        },
        "data_availability": {
            "dark_web_status": "freely_available",
            "price_btc": None,
            "price_usd": None,
            "marketplace": "ALPHV Leak Site",
            "first_seen_dark_web": _dt(2025, 5, 22)
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "UK DPA 2018"],
            "notification_required": True,
            "potential_fine_max_gbp": 17500000,
            "legal_status": "ico_notified"
        },
    },
    {
        "breach_id": "BREACH_2024_009",
        "title": "Okta Identity Platform Source Code Theft",
        "description": "Threat actors gained access to Okta's GitHub repositories and stole source code for the Customer Identity Cloud product, later used to craft targeted phishing lures.",
        "source_url": "https://example.com/okta-github-2025",
        "breach_date": _dt(2024, 12, 3),
        "discovered_date": _dt(2024, 12, 10),
        "severity": "high",
        "status": "resolved",
        "industry": "technology",
        "affected_records_count": 0,
        "data_types_exposed": ["source_code", "api_keys", "internal_documentation"],
        "risk_score": 7.4,
        "organisation": {"name": "Okta Inc.", "domain": "okta.com", "country": "USA", "country_code": "US", "size": "large", "employee_count": 5000},
        "location": {"type": "Point", "coordinates": [-122.4194, 37.7749]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2024, 12, 3), "event_type": "breach_occurred", "description": "Attacker used stolen GitHub PAT to clone private repositories.", "actor": "Lapsus$"},
            {"_id": _oid(), "event_date": _dt(2024, 12, 10), "event_type": "discovered", "description": "Okta engineering team noticed unexpected repository clone activity.", "actor": "Okta Engineering"},
            {"_id": _oid(), "event_date": _dt(2025, 1, 15), "event_type": "resolved", "description": "All stolen tokens rotated; repositories audited.", "actor": "Okta CISO"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Rotate all GitHub personal access tokens and enforce hardware MFA.", "status": "completed", "assigned_to": "Dev Security", "due_date": _dt(2024, 12, 15), "completed_date": _dt(2024, 12, 14)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Lapsus$",
            "attribution_confidence": "high",
            "ttps": ["Source Code Theft", "GitHub Token Abuse", "Supply Chain Targeting"],
            "mitre_attack": ["T1537", "T1552", "T1195"]
        },
        "data_availability": {
            "dark_web_status": "freely_available",
            "price_btc": None,
            "price_usd": None,
            "marketplace": "Telegram Channel",
            "first_seen_dark_web": _dt(2024, 12, 11)
        },
        "compliance_impact": {
            "regulations_affected": ["SOC 2 Type II", "ISO 27001"],
            "notification_required": False,
            "potential_fine_max_gbp": 5000000,
            "legal_status": "customer_notified"
        },
    },
    {
        "breach_id": "BREACH_2025_010",
        "title": "Colonial Pipeline SCADA Data Leak",
        "description": "Stolen SCADA configuration files and operational data from Colonial Pipeline appeared on a dark web marketplace, raising concerns about infrastructure vulnerability mapping.",
        "source_url": None,
        "breach_date": _dt(2025, 8, 14),
        "discovered_date": _dt(2025, 8, 20),
        "severity": "critical",
        "status": "investigating",
        "industry": "energy",
        "affected_records_count": 0,
        "data_types_exposed": ["scada_configs", "network_diagrams", "operational_procedures"],
        "risk_score": 9.7,
        "organisation": {"name": "Colonial Pipeline", "domain": "colonialPipeline.com", "country": "USA", "country_code": "US", "size": "large", "employee_count": 500},
        "location": {"type": "Point", "coordinates": [-84.3880, 33.7490]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 8, 14), "event_type": "breach_occurred", "description": "SCADA data exfiltrated via compromised engineering workstation VPN session.", "actor": "APT44 (Sandworm)"},
            {"_id": _oid(), "event_date": _dt(2025, 8, 20), "event_type": "discovered", "description": "CISA alerted Colonial Pipeline of data listing on dark web marketplace.", "actor": "CISA"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Air-gap critical SCADA systems from internet-connected networks.", "status": "in_progress", "assigned_to": "OT Security", "due_date": _dt(2025, 9, 1), "completed_date": None},
            {"_id": _oid(), "action": "Rotate all VPN credentials and enforce certificate-based auth.", "status": "pending", "assigned_to": "Network Security", "due_date": _dt(2025, 8, 30), "completed_date": None},
        ],
        "monitoring_alerts": [
            {"_id": _oid(), "alert_type": "dark_web_mention", "triggered_at": _dt(2025, 8, 20), "severity": "critical", "details": "SCADA configs listed on dark web marketplace for $45,000.", "acknowledged": False},
        ],
        "threat_intelligence": {
            "threat_actor": "APT44 (Sandworm)",
            "attribution_confidence": "high",
            "ttps": ["VPN Exploitation", "SCADA Data Theft", "Critical Infrastructure Attack"],
            "mitre_attack": ["T1133", "T1020", "T1489"]
        },
        "data_availability": {
            "dark_web_status": "active_sale",
            "price_btc": None,
            "price_usd": 45000,
            "marketplace": "Dark Web Marketplace",
            "first_seen_dark_web": _dt(2025, 8, 20)
        },
        "compliance_impact": {
            "regulations_affected": ["NERC CIP", "TSA Pipeline Security Directives", "CFATS"],
            "notification_required": True,
            "potential_fine_max_gbp": 20000000,
            "legal_status": "cisa_investigation"
        },
    },
    {
        "breach_id": "BREACH_2025_011",
        "title": "Shopify Merchant Dashboard Data Exposure",
        "description": "A logic flaw in Shopify's partner dashboard allowed authenticated merchants to query other merchants' order and customer data via a misconfigured GraphQL endpoint.",
        "source_url": "https://example.com/shopify-graphql-2025",
        "breach_date": _dt(2025, 1, 5),
        "discovered_date": _dt(2025, 1, 12),
        "severity": "medium",
        "status": "resolved",
        "industry": "retail",
        "affected_records_count": 420000,
        "data_types_exposed": ["name", "email", "order_history", "shipping_address"],
        "risk_score": 6.5,
        "organisation": {"name": "Shopify Inc.", "domain": "shopify.com", "country": "Canada", "country_code": "CA", "size": "enterprise", "employee_count": 11000},
        "location": {"type": "Point", "coordinates": [-75.6972, 45.4215]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 1, 5), "event_type": "breach_occurred", "description": "GraphQL endpoint lacked sufficient tenant isolation checks.", "actor": "Bug Reporter"},
            {"_id": _oid(), "event_date": _dt(2025, 1, 12), "event_type": "discovered", "description": "Responsible disclosure report received from security researcher.", "actor": "HackerOne"},
            {"_id": _oid(), "event_date": _dt(2025, 1, 20), "event_type": "resolved", "description": "GraphQL query authorisation fixed and merchant data audit completed.", "actor": "Shopify Engineering"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Implement per-query tenant scoping in GraphQL resolver.", "status": "completed", "assigned_to": "Backend Team", "due_date": _dt(2025, 1, 18), "completed_date": _dt(2025, 1, 17)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Unknown (Logic Flaw)",
            "attribution_confidence": "high",
            "ttps": ["Broken Object Level Authorization", "GraphQL Introspection Abuse"],
            "mitre_attack": ["T1190", "T1078"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "CCPA", "PIPEDA"],
            "notification_required": True,
            "potential_fine_max_gbp": 12000000,
            "legal_status": "notified"
        },
    },
    {
        "breach_id": "BREACH_2025_012",
        "title": "Uber Driver Partner Database Dump",
        "description": "A database containing Uber driver-partner personal and financial details was listed for sale on underground forums, including bank account numbers and tax identifiers.",
        "source_url": None,
        "breach_date": _dt(2025, 10, 3),
        "discovered_date": _dt(2025, 10, 8),
        "severity": "high",
        "status": "active",
        "industry": "technology",
        "affected_records_count": 350000,
        "data_types_exposed": ["name", "ssn", "bank_account", "email", "vehicle_info"],
        "risk_score": 8.1,
        "organisation": {"name": "Uber Technologies", "domain": "uber.com", "country": "USA", "country_code": "US", "size": "enterprise", "employee_count": 30000},
        "location": {"type": "Point", "coordinates": [-122.4194, 37.7749]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 10, 3), "event_type": "breach_occurred", "description": "Attacker used social engineering to bypass Uber IT support and reset admin credentials.", "actor": "Scattered Spider"},
            {"_id": _oid(), "event_date": _dt(2025, 10, 8), "event_type": "discovered", "description": "Dark web monitoring platform detected listing of Uber driver-partner data.", "actor": "BreachLens TI"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Enable hardware MFA for all admin accounts immediately.", "status": "completed", "assigned_to": "Identity Team", "due_date": _dt(2025, 10, 10), "completed_date": _dt(2025, 10, 9)},
        ],
        "monitoring_alerts": [
            {"_id": _oid(), "alert_type": "dark_web_mention", "triggered_at": _dt(2025, 10, 8), "severity": "high", "details": "Driver-partner database listed for $12,000 on RaidForums successor.", "acknowledged": False},
        ],
        "threat_intelligence": {
            "threat_actor": "Scattered Spider",
            "attribution_confidence": "high",
            "ttps": ["Social Engineering", "IT Helpdesk Impersonation", "Admin Credential Abuse"],
            "mitre_attack": ["T1078", "T1534", "T1589"]
        },
        "data_availability": {
            "dark_web_status": "active_sale",
            "price_btc": None,
            "price_usd": 12000,
            "marketplace": "RaidForums Successor",
            "first_seen_dark_web": _dt(2025, 10, 8)
        },
        "compliance_impact": {
            "regulations_affected": ["CCPA", "GDPR", "NYC SHIELD Act"],
            "notification_required": True,
            "potential_fine_max_gbp": 40000000,
            "legal_status": "ftc_investigation"
        },
    },
    {
        "breach_id": "BREACH_2022_013",
        "title": "Medibank Private Healthcare Breach Re-surfacing",
        "description": "Previously stolen Medibank customer healthcare data from the 2022 breach re-appeared on new dark web forums with updated indexing, increasing targeted fraud risk.",
        "source_url": "https://example.com/medibank-resurface-2025",
        "breach_date": _dt(2022, 10, 13),
        "discovered_date": _dt(2025, 2, 5),
        "severity": "critical",
        "status": "active",
        "industry": "healthcare",
        "affected_records_count": 9700000,
        "data_types_exposed": ["name", "dob", "medicare_number", "health_claims", "address"],
        "risk_score": 9.0,
        "organisation": {"name": "Medibank Private", "domain": "medibank.com.au", "country": "Australia", "country_code": "AU", "size": "enterprise", "employee_count": 2000},
        "location": {"type": "Point", "coordinates": [144.9631, -37.8136]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2022, 10, 13), "event_type": "breach_occurred", "description": "Original breach by REvil/BlogXX through stolen VPN credentials.", "actor": "REvil"},
            {"_id": _oid(), "event_date": _dt(2025, 2, 5), "event_type": "discovered", "description": "Re-indexed dataset found on new dark web marketplace with improved search functionality.", "actor": "BreachLens TI"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Issue fresh breach notifications to all 9.7M affected individuals.", "status": "in_progress", "assigned_to": "Communications", "due_date": _dt(2025, 3, 1), "completed_date": None},
        ],
        "monitoring_alerts": [
            {"_id": _oid(), "alert_type": "dark_web_mention", "triggered_at": _dt(2025, 2, 5), "severity": "critical", "details": "Medibank 2022 dataset re-listed on new dark web marketplace with enhanced search.", "acknowledged": True},
        ],
        "threat_intelligence": {
            "threat_actor": "REvil (BlogXX)",
            "attribution_confidence": "high",
            "ttps": ["VPN Credential Theft", "Ransomware Deployment", "Double Extortion"],
            "mitre_attack": ["T1133", "T1486", "T1491"]
        },
        "data_availability": {
            "dark_web_status": "freely_available",
            "price_btc": None,
            "price_usd": None,
            "marketplace": "BreachForums",
            "first_seen_dark_web": _dt(2022, 11, 1)
        },
        "compliance_impact": {
            "regulations_affected": ["Privacy Act 1988 (AU)", "My Health Records Act"],
            "notification_required": True,
            "potential_fine_max_gbp": 40000000,
            "legal_status": "regulatory_investigation"
        },
    },
    {
        "breach_id": "BREACH_2025_014",
        "title": "Dubai Government e-Services Portal Breach",
        "description": "A SQL injection vulnerability in the Dubai e-Government portal allowed attackers to extract resident registration data and passport scans stored in unencrypted database tables.",
        "source_url": None,
        "breach_date": _dt(2025, 9, 18),
        "discovered_date": _dt(2025, 9, 25),
        "severity": "critical",
        "status": "investigating",
        "industry": "government",
        "affected_records_count": 450000,
        "data_types_exposed": ["name", "passport_number", "national_id", "address", "photo"],
        "risk_score": 9.1,
        "organisation": {"name": "Dubai Digital Authority", "domain": "digitaldubai.ae", "country": "UAE", "country_code": "AE", "size": "large", "employee_count": 5000},
        "location": {"type": "Point", "coordinates": [55.2708, 25.2048]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 9, 18), "event_type": "breach_occurred", "description": "SQL injection payload exploited in resident registration search parameter.", "actor": "Unknown"},
            {"_id": _oid(), "event_date": _dt(2025, 9, 25), "event_type": "discovered", "description": "Anomalous database query volume detected by WAF logging system.", "actor": "SOC"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Deploy parameterised query fixes across all portal endpoints.", "status": "in_progress", "assigned_to": "Dev Team", "due_date": _dt(2025, 10, 5), "completed_date": None},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Unknown",
            "attribution_confidence": "low",
            "ttps": ["SQL Injection", "Database Exfiltration"],
            "mitre_attack": ["T1190", "T1005"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["UAE PDPL", "Dubai Data Law"],
            "notification_required": True,
            "potential_fine_max_gbp": 4000000,
            "legal_status": "investigating"
        },
    },
    {
        "breach_id": "BREACH_2025_015",
        "title": "Twitter/X API Key Mass Invalidation Event",
        "description": "Thousands of third-party application API keys were leaked through a compromised developer portal, allowing unauthorised access to user DMs and posting capabilities.",
        "source_url": "https://example.com/twitter-apikey-2025",
        "breach_date": _dt(2025, 11, 2),
        "discovered_date": _dt(2025, 11, 4),
        "severity": "high",
        "status": "contained",
        "industry": "technology",
        "affected_records_count": 1800000,
        "data_types_exposed": ["api_keys", "dm_content", "account_metadata"],
        "risk_score": 7.9,
        "organisation": {"name": "X Corp (Twitter)", "domain": "x.com", "country": "USA", "country_code": "US", "size": "enterprise", "employee_count": 1500},
        "location": {"type": "Point", "coordinates": [-122.4194, 37.7749]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 11, 2), "event_type": "breach_occurred", "description": "Developer portal database compromised through SSRF attack on internal service.", "actor": "Unknown"},
            {"_id": _oid(), "event_date": _dt(2025, 11, 4), "event_type": "discovered", "description": "Spike in API abuse rate alerts triggered investigation.", "actor": "Trust & Safety"},
            {"_id": _oid(), "event_date": _dt(2025, 11, 6), "event_type": "contained", "description": "All compromised API keys invalidated; developer portal taken offline.", "actor": "X Engineering"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Mass invalidation of all third-party API keys issued before incident date.", "status": "completed", "assigned_to": "Platform Team", "due_date": _dt(2025, 11, 5), "completed_date": _dt(2025, 11, 5)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Unknown",
            "attribution_confidence": "low",
            "ttps": ["SSRF Attack", "Developer Portal Compromise", "API Key Harvesting"],
            "mitre_attack": ["T1190", "T1552", "T1078"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "CCPA"],
            "notification_required": True,
            "potential_fine_max_gbp": 16000000,
            "legal_status": "notified"
        },
    },
    {
        "breach_id": "BREACH_2025_016",
        "title": "Los Angeles School District Ransomware Attack",
        "description": "Vice Society ransomware group attacked the Los Angeles Unified School District, encrypting administrative systems and exfiltrating student psychological evaluation records.",
        "source_url": "https://example.com/lausd-ransomware",
        "breach_date": _dt(2025, 1, 30),
        "discovered_date": _dt(2025, 2, 1),
        "severity": "high",
        "status": "resolved",
        "industry": "education",
        "affected_records_count": 600000,
        "data_types_exposed": ["name", "student_id", "psychological_evaluations", "address", "ssn"],
        "risk_score": 8.0,
        "organisation": {"name": "LA Unified School District", "domain": "lausd.net", "country": "USA", "country_code": "US", "size": "large", "employee_count": 75000},
        "location": {"type": "Point", "coordinates": [-118.2437, 34.0522]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 1, 30), "event_type": "breach_occurred", "description": "Vice Society deployed ransomware payload after 3 weeks of dwell time.", "actor": "Vice Society"},
            {"_id": _oid(), "event_date": _dt(2025, 2, 1), "event_type": "discovered", "description": "Teachers unable to log in; encryption splash screen appeared.", "actor": "IT Help Desk"},
            {"_id": _oid(), "event_date": _dt(2025, 3, 10), "event_type": "resolved", "description": "Systems restored from backups; new EDR and segmentation deployed.", "actor": "LAUSD IT"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Restore all district systems from verified offline backups.", "status": "completed", "assigned_to": "IT Operations", "due_date": _dt(2025, 2, 20), "completed_date": _dt(2025, 2, 18)},
            {"_id": _oid(), "action": "Deploy endpoint detection and response across all district laptops.", "status": "completed", "assigned_to": "Endpoint Security", "due_date": _dt(2025, 3, 1), "completed_date": _dt(2025, 3, 8)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Vice Society",
            "attribution_confidence": "high",
            "ttps": ["Ransomware", "Data Exfiltration", "Dwell-and-Strike"],
            "mitre_attack": ["T1486", "T1083", "T1567"]
        },
        "data_availability": {
            "dark_web_status": "freely_available",
            "price_btc": None,
            "price_usd": None,
            "marketplace": "Vice Society Leak Site",
            "first_seen_dark_web": _dt(2025, 2, 2)
        },
        "compliance_impact": {
            "regulations_affected": ["FERPA", "CCPA", "California Education Code"],
            "notification_required": True,
            "potential_fine_max_gbp": 8000000,
            "legal_status": "state_investigation"
        },
    },
    {
        "breach_id": "BREACH_2025_017",
        "title": "German Bundestag IT Network Intrusion",
        "description": "Russian state-sponsored actors penetrated the German Bundestag IT network, accessing parliamentary committee correspondence and ministerial communications.",
        "source_url": None,
        "breach_date": _dt(2025, 3, 22),
        "discovered_date": _dt(2025, 4, 2),
        "severity": "critical",
        "status": "investigating",
        "industry": "government",
        "affected_records_count": 50000,
        "data_types_exposed": ["email_content", "parliamentary_documents", "personnel_data"],
        "risk_score": 9.4,
        "organisation": {"name": "Deutscher Bundestag", "domain": "bundestag.de", "country": "Germany", "country_code": "DE", "size": "large", "employee_count": 2500},
        "location": {"type": "Point", "coordinates": [13.3833, 52.5186]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 3, 22), "event_type": "breach_occurred", "description": "Spear-phishing email targeting IT admin yielded network access.", "actor": "APT28 (Fancy Bear)"},
            {"_id": _oid(), "event_date": _dt(2025, 4, 2), "event_type": "discovered", "description": "BSI national cyber agency identified C2 traffic in Bundestag network.", "actor": "BSI"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Isolate compromised segments and deploy network-level IOC blocking.", "status": "in_progress", "assigned_to": "BSI Incident Team", "due_date": _dt(2025, 4, 15), "completed_date": None},
        ],
        "monitoring_alerts": [
            {"_id": _oid(), "alert_type": "new_exposure", "triggered_at": _dt(2025, 4, 3), "severity": "critical", "details": "Parliamentary committee emails identified in APT28 intelligence feed.", "acknowledged": False},
        ],
        "threat_intelligence": {
            "threat_actor": "APT28 (Fancy Bear)",
            "attribution_confidence": "high",
            "ttps": ["Spear Phishing", "Lateral Movement", "Email Exfiltration"],
            "mitre_attack": ["T1566", "T1021", "T1114"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["DSGVO (GDPR-DE)", "IT-Sicherheitsgesetz"],
            "notification_required": True,
            "potential_fine_max_gbp": 16000000,
            "legal_status": "bsi_investigation"
        },
    },
    {
        "breach_id": "BREACH_2024_018",
        "title": "WeWork Co-working Space Member Data Leak",
        "description": "A misconfigured member management API exposed WeWork member profiles, company affiliations, access card data, and billing information through unauthenticated endpoints.",
        "source_url": "https://example.com/wework-api-2024",
        "breach_date": _dt(2024, 11, 5),
        "discovered_date": _dt(2024, 11, 14),
        "severity": "medium",
        "status": "resolved",
        "industry": "retail",
        "affected_records_count": 280000,
        "data_types_exposed": ["name", "email", "company", "access_card_id", "billing_address"],
        "risk_score": 5.8,
        "organisation": {"name": "WeWork Inc.", "domain": "wework.com", "country": "USA", "country_code": "US", "size": "enterprise", "employee_count": 4000},
        "location": {"type": "Point", "coordinates": [-74.0060, 40.7128]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2024, 11, 5), "event_type": "breach_occurred", "description": "REST API endpoint /api/members lacked authentication check after deployment.", "actor": "Internal Dev Error"},
            {"_id": _oid(), "event_date": _dt(2024, 11, 14), "event_type": "discovered", "description": "Penetration tester included unauthenticated API access in scope report.", "actor": "External Pentest"},
            {"_id": _oid(), "event_date": _dt(2024, 11, 16), "event_type": "resolved", "description": "API authentication fixed, affected endpoint rate-limited.", "actor": "WeWork API Team"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Enforce OAuth 2.0 authentication on all member management endpoints.", "status": "completed", "assigned_to": "Backend Engineering", "due_date": _dt(2024, 11, 18), "completed_date": _dt(2024, 11, 16)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Unknown (Unauthenticated Access)",
            "attribution_confidence": "medium",
            "ttps": ["Unauthenticated API Access", "Broken Authentication"],
            "mitre_attack": ["T1190", "T1078"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "CCPA"],
            "notification_required": True,
            "potential_fine_max_gbp": 8000000,
            "legal_status": "notified"
        },
    },
    {
        "breach_id": "BREACH_2025_019",
        "title": "Twilio Internal Employee Data Breach",
        "description": "An SMS phishing (smishing) campaign targeted Twilio employees, leading to compromise of internal dashboards and exposure of customer data processed through Twilio APIs.",
        "source_url": "https://example.com/twilio-smishing",
        "breach_date": _dt(2025, 7, 10),
        "discovered_date": _dt(2025, 7, 11),
        "severity": "high",
        "status": "resolved",
        "industry": "technology",
        "affected_records_count": 125000,
        "data_types_exposed": ["phone_number", "email", "authentication_tokens"],
        "risk_score": 7.5,
        "organisation": {"name": "Twilio Inc.", "domain": "twilio.com", "country": "USA", "country_code": "US", "size": "large", "employee_count": 6000},
        "location": {"type": "Point", "coordinates": [-122.4194, 37.7749]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 7, 10), "event_type": "breach_occurred", "description": "Employees received fake IT dept smishing messages harvesting SSO credentials.", "actor": "Scattered Spider"},
            {"_id": _oid(), "event_date": _dt(2025, 7, 11), "event_type": "discovered", "description": "Unusual dashboard access from new location triggered MFA alert.", "actor": "Security Operations"},
            {"_id": _oid(), "event_date": _dt(2025, 7, 25), "event_type": "resolved", "description": "All compromised sessions revoked; phishing-resistant FIDO2 keys deployed.", "actor": "CISO Office"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Migrate all employee authentication to FIDO2 hardware keys.", "status": "completed", "assigned_to": "IT Security", "due_date": _dt(2025, 7, 20), "completed_date": _dt(2025, 7, 22)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Scattered Spider",
            "attribution_confidence": "high",
            "ttps": ["SMS Phishing (Smishing)", "SSO Credential Harvest", "Session Hijacking"],
            "mitre_attack": ["T1660", "T1078", "T1539"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "CCPA", "FCC TCPA"],
            "notification_required": True,
            "potential_fine_max_gbp": 8000000,
            "legal_status": "customer_notified"
        },
    },
    {
        "breach_id": "BREACH_2025_020",
        "title": "Capita HR Platform Data Exfiltration",
        "description": "Capita's HR outsourcing platform suffered a data exfiltration attack affecting local authority and NHS pension member data stored in an unsecured Azure Blob container.",
        "source_url": "https://example.com/capita-azure-2025",
        "breach_date": _dt(2025, 3, 31),
        "discovered_date": _dt(2025, 6, 5),
        "severity": "high",
        "status": "resolved",
        "industry": "finance",
        "affected_records_count": 890000,
        "data_types_exposed": ["name", "dob", "nino", "pension_amount", "bank_account"],
        "risk_score": 7.9,
        "organisation": {"name": "Capita plc", "domain": "capita.com", "country": "UK", "country_code": "GB", "size": "enterprise", "employee_count": 55000},
        "location": {"type": "Point", "coordinates": [-0.1276, 51.5074]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 3, 31), "event_type": "breach_occurred", "description": "Azure Blob Storage container left publicly accessible after cloud migration.", "actor": "Misconfiguration"},
            {"_id": _oid(), "event_date": _dt(2025, 6, 5), "event_type": "discovered", "description": "Client local authority flagged unexpected data in response to DSAR.", "actor": "Client Organisation"},
            {"_id": _oid(), "event_date": _dt(2025, 6, 20), "event_type": "resolved", "description": "Container secured; ICO notified; affected pension members written to.", "actor": "Capita Data Privacy"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Audit all Azure Blob Storage containers for public access ACLs.", "status": "completed", "assigned_to": "Cloud Security", "due_date": _dt(2025, 6, 10), "completed_date": _dt(2025, 6, 8)},
            {"_id": _oid(), "action": "Notify ICO and pension member trustees under GDPR Article 33.", "status": "completed", "assigned_to": "Legal", "due_date": _dt(2025, 6, 8), "completed_date": _dt(2025, 6, 7)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Unknown (Cloud Misconfiguration)",
            "attribution_confidence": "high",
            "ttps": ["Cloud Storage Misconfiguration", "Unauthorised Data Access"],
            "mitre_attack": ["T1530"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "UK DPA 2018", "Pensions Act 2004"],
            "notification_required": True,
            "potential_fine_max_gbp": 17500000,
            "legal_status": "ico_investigation"
        },
    },
    {
        "breach_id": "BREACH_2025_021",
        "title": "Palantir Government Contract Data Exposure",
        "description": "Unrestricted access to Palantir's demonstration environment inadvertently exposed US government agency metadata and project scoping documents used in contract proposals.",
        "source_url": None,
        "breach_date": _dt(2025, 4, 8),
        "discovered_date": _dt(2025, 4, 20),
        "severity": "medium",
        "status": "resolved",
        "industry": "government",
        "affected_records_count": 12000,
        "data_types_exposed": ["contract_metadata", "agency_identifiers", "project_scope"],
        "risk_score": 5.2,
        "organisation": {"name": "Palantir Technologies", "domain": "palantir.com", "country": "USA", "country_code": "US", "size": "large", "employee_count": 3500},
        "location": {"type": "Point", "coordinates": [-105.0178, 39.7392]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 4, 8), "event_type": "breach_occurred", "description": "Demo environment API did not enforce tenant scoping for government client data.", "actor": "Internal Config Error"},
            {"_id": _oid(), "event_date": _dt(2025, 4, 20), "event_type": "discovered", "description": "Client agency security team notified Palantir of data visibility issue.", "actor": "Client Agency"},
            {"_id": _oid(), "event_date": _dt(2025, 4, 22), "event_type": "resolved", "description": "Demo environment reset; tenant scoping enforced via ACL policy.", "actor": "Palantir Engineering"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Implement strict tenant isolation in demo and staging environments.", "status": "completed", "assigned_to": "Platform Security", "due_date": _dt(2025, 4, 25), "completed_date": _dt(2025, 4, 23)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Unknown (Internal Config Error)",
            "attribution_confidence": "high",
            "ttps": ["Demo Environment Misconfiguration", "Tenant Isolation Failure"],
            "mitre_attack": ["T1190"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["US Federal Acquisition Regulations", "FedRAMP"],
            "notification_required": True,
            "potential_fine_max_gbp": 4000000,
            "legal_status": "contract_review"
        },
    },
    {
        "breach_id": "BREACH_2025_022",
        "title": "Alibaba Cloud Customer Config Dump",
        "description": "A bug in Alibaba Cloud's ECS metadata service allowed SSRF attacks to retrieve cloud credential tokens for neighbouring customer instances, resulting in configuration data theft.",
        "source_url": "https://example.com/alibaba-ssrf-2025",
        "breach_date": _dt(2025, 5, 4),
        "discovered_date": _dt(2025, 5, 9),
        "severity": "high",
        "status": "contained",
        "industry": "technology",
        "affected_records_count": 60000,
        "data_types_exposed": ["cloud_credentials", "env_variables", "api_keys"],
        "risk_score": 7.3,
        "organisation": {"name": "Alibaba Cloud", "domain": "alibabacloud.com", "country": "China", "country_code": "CN", "size": "enterprise", "employee_count": 230000},
        "location": {"type": "Point", "coordinates": [120.1551, 30.2741]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 5, 4), "event_type": "breach_occurred", "description": "SSRF via ECS metadata exploit harvested temporary IAM credential tokens.", "actor": "Unknown"},
            {"_id": _oid(), "event_date": _dt(2025, 5, 9), "event_type": "discovered", "description": "Alibaba Cloud CSIRT detected repeated metadata service access from unexpected IPs.", "actor": "CSIRT"},
            {"_id": _oid(), "event_date": _dt(2025, 5, 15), "event_type": "contained", "description": "Metadata service now requires IMDSv2 token; all affected credentials rotated.", "actor": "Cloud Engineering"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Enforce IMDSv2 on all ECS instances; disable IMDSv1.", "status": "completed", "assigned_to": "Cloud Platform", "due_date": _dt(2025, 5, 12), "completed_date": _dt(2025, 5, 12)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Unknown",
            "attribution_confidence": "low",
            "ttps": ["SSRF via Cloud Metadata Service", "Credential Harvesting"],
            "mitre_attack": ["T1552", "T1078", "T1190"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["China PIPL", "China Cybersecurity Law"],
            "notification_required": True,
            "potential_fine_max_gbp": 4000000,
            "legal_status": "customer_notified"
        },
    },
    {
        "breach_id": "BREACH_2025_023",
        "title": "National Australia Bank Internal Audit Leak",
        "description": "Internal audit findings and risk assessment documents for NAB's digital banking division were inadvertently published to a public-facing documentation portal.",
        "source_url": None,
        "breach_date": _dt(2025, 10, 14),
        "discovered_date": _dt(2025, 10, 16),
        "severity": "medium",
        "status": "resolved",
        "industry": "finance",
        "affected_records_count": 3000,
        "data_types_exposed": ["internal_risk_assessment", "audit_findings", "system_vulnerabilities"],
        "risk_score": 5.5,
        "organisation": {"name": "National Australia Bank", "domain": "nab.com.au", "country": "Australia", "country_code": "AU", "size": "enterprise", "employee_count": 38000},
        "location": {"type": "Point", "coordinates": [144.9631, -37.8136]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 10, 14), "event_type": "breach_occurred", "description": "Confluence admin published audit pages to 'All users incl. external' permission group.", "actor": "Internal Admin Error"},
            {"_id": _oid(), "event_date": _dt(2025, 10, 16), "event_type": "discovered", "description": "External vendor noticed sensitive content accessible without VPN.", "actor": "External Vendor"},
            {"_id": _oid(), "event_date": _dt(2025, 10, 16), "event_type": "resolved", "description": "Confluence space restricted; cache invalidated; document content reviewed.", "actor": "NAB IT"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Review all Confluence space permissions; enforce VPN-only access for sensitive content.", "status": "completed", "assigned_to": "Collaboration Tools Team", "due_date": _dt(2025, 10, 20), "completed_date": _dt(2025, 10, 18)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Unknown (Internal Admin Error)",
            "attribution_confidence": "high",
            "ttps": ["Excessive Permissions", "Public Document Exposure"],
            "mitre_attack": ["T1530"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["Privacy Act 1988 (AU)", "APRA CPS 234"],
            "notification_required": True,
            "potential_fine_max_gbp": 8000000,
            "legal_status": "apra_notified"
        },
    },
    {
        "breach_id": "BREACH_2025_024",
        "title": "European Central Bank Research Division Intrusion",
        "description": "Sophisticated adversaries penetrated the European Central Bank's research division network, accessing pre-publication economic forecasting models and rate decision discussions.",
        "source_url": None,
        "breach_date": _dt(2025, 6, 28),
        "discovered_date": _dt(2025, 7, 5),
        "severity": "critical",
        "status": "investigating",
        "industry": "finance",
        "affected_records_count": 25000,
        "data_types_exposed": ["economic_forecasts", "rate_decisions", "internal_research", "personnel_data"],
        "risk_score": 9.6,
        "organisation": {"name": "European Central Bank", "domain": "ecb.europa.eu", "country": "Germany", "country_code": "DE", "size": "large", "employee_count": 3800},
        "location": {"type": "Point", "coordinates": [8.6821, 50.1109]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 6, 28), "event_type": "breach_occurred", "description": "Zero-day exploit in ECB's internal collaboration platform used for initial access.", "actor": "APT29 (Cozy Bear)"},
            {"_id": _oid(), "event_date": _dt(2025, 7, 5), "event_type": "discovered", "description": "Europol cyber division alerted ECB to C2 infrastructure associated with APT29.", "actor": "Europol"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Isolate research division network and deploy forensic investigation team.", "status": "in_progress", "assigned_to": "ECB Security", "due_date": _dt(2025, 7, 20), "completed_date": None},
        ],
        "monitoring_alerts": [
            {"_id": _oid(), "alert_type": "new_exposure", "triggered_at": _dt(2025, 7, 6), "severity": "critical", "details": "Pre-publication rate decision document detected in APT29 exfiltration sample.", "acknowledged": False},
        ],
        "threat_intelligence": {
            "threat_actor": "APT29 (Cozy Bear)",
            "attribution_confidence": "high",
            "ttps": ["Zero-day Exploit", "Financial Intelligence Collection", "Long-term Persistence"],
            "mitre_attack": ["T1190", "T1005", "T1083"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "EU NIS Directive", "DORA"],
            "notification_required": True,
            "potential_fine_max_gbp": 16000000,
            "legal_status": "europol_investigation"
        },
    },
    {
        "breach_id": "BREACH_2025_025",
        "title": "Zoom Video Conference Recording Leak",
        "description": "Improperly secured Zoom cloud recordings for corporate and government clients were indexed by search engines due to a default public sharing misconfiguration in Zoom's enterprise settings.",
        "source_url": "https://example.com/zoom-recordings-2025",
        "breach_date": _dt(2025, 8, 4),
        "discovered_date": _dt(2025, 8, 9),
        "severity": "medium",
        "status": "contained",
        "industry": "technology",
        "affected_records_count": 220000,
        "data_types_exposed": ["meeting_recordings", "chat_transcripts", "participant_lists"],
        "risk_score": 6.2,
        "organisation": {"name": "Zoom Video Communications", "domain": "zoom.us", "country": "USA", "country_code": "US", "size": "enterprise", "employee_count": 7400},
        "location": {"type": "Point", "coordinates": [-121.8863, 37.3382]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 8, 4), "event_type": "breach_occurred", "description": "Enterprise recording sharing defaulted to public on new plan activation.", "actor": "Default Misconfiguration"},
            {"_id": _oid(), "event_date": _dt(2025, 8, 9), "event_type": "discovered", "description": "IT admin noticed indexed meeting recordings in Google search results.", "actor": "Customer IT Admin"},
            {"_id": _oid(), "event_date": _dt(2025, 8, 11), "event_type": "contained", "description": "Zoom pushed setting change to all affected enterprise accounts.", "actor": "Zoom Trust & Safety"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Change all corporate recording sharing default to organisation-only.", "status": "completed", "assigned_to": "Platform Security", "due_date": _dt(2025, 8, 12), "completed_date": _dt(2025, 8, 11)},
        ],
        "monitoring_alerts": [],
        "threat_intelligence": {
            "threat_actor": "Unknown (Default Misconfiguration)",
            "attribution_confidence": "high",
            "ttps": ["Default Settings Abuse", "Meeting Recording Exposure"],
            "mitre_attack": ["T1530"]
        },
        "data_availability": {
            "dark_web_status": "none",
            "price_btc": None,
            "price_usd": None,
            "marketplace": None,
            "first_seen_dark_web": None
        },
        "compliance_impact": {
            "regulations_affected": ["GDPR", "CCPA", "FERPA"],
            "notification_required": True,
            "potential_fine_max_gbp": 12000000,
            "legal_status": "customer_notified"
        },
    },
    {
        "breach_id": "BREACH_2025_026",
        "title": "South Korean Military Satellite Data Theft",
        "description": "North Korean state actors compromised a South Korean defence contractor's network and exfiltrated satellite communication encryption protocols and orbital positioning data.",
        "source_url": None,
        "breach_date": _dt(2025, 9, 5),
        "discovered_date": _dt(2025, 9, 18),
        "severity": "critical",
        "status": "investigating",
        "industry": "government",
        "affected_records_count": 8000,
        "data_types_exposed": ["encryption_protocols", "orbital_data", "technical_specifications"],
        "risk_score": 9.8,
        "organisation": {"name": "Korea Aerospace Research Institute", "domain": "kari.re.kr", "country": "South Korea", "country_code": "KR", "size": "medium", "employee_count": 1200},
        "location": {"type": "Point", "coordinates": [127.7669, 35.9078]},
        "affected_accounts": [],
        "timeline": [
            {"_id": _oid(), "event_date": _dt(2025, 9, 5), "event_type": "breach_occurred", "description": "Watering hole attack via defence contractor supplier web portal planted RAT.", "actor": "Lazarus Group"},
            {"_id": _oid(), "event_date": _dt(2025, 9, 18), "event_type": "discovered", "description": "KISA national cyber agency identified C2 communication pattern in traffic analysis.", "actor": "KISA"},
        ],
        "remediation": [
            {"_id": _oid(), "action": "Air-gap satellite system development environment from internet.", "status": "in_progress", "assigned_to": "KARI Security", "due_date": _dt(2025, 10, 1), "completed_date": None},
        ],
        "monitoring_alerts": [
            {"_id": _oid(), "alert_type": "dark_web_mention", "triggered_at": _dt(2025, 9, 20), "severity": "critical", "details": "Korean satellite encryption spec document offered to foreign intelligence buyers on dark forum.", "acknowledged": False},
        ],
        "threat_intelligence": {
            "threat_actor": "Lazarus Group",
            "attribution_confidence": "high",
            "ttps": ["Watering Hole Attack", "RAT Installation", "Satellite Intelligence Collection"],
            "mitre_attack": ["T1189", "T1071", "T1020"]
        },
        "data_availability": {
            "dark_web_status": "active_sale",
            "price_btc": None,
            "price_usd": 500000,
            "marketplace": "Foreign Intelligence Dark Forum",
            "first_seen_dark_web": _dt(2025, 9, 20)
        },
        "compliance_impact": {
            "regulations_affected": ["South Korea National Security Act", "Information Security Management Act"],
            "notification_required": False,
            "potential_fine_max_gbp": None,
            "legal_status": "national_security_classified"
        },
    },
]


def seed_breaches(user_ids: dict, reset: bool = False) -> None:
    admin_id = user_ids.get("admin_breach")
    analyst_id = user_ids.get("priya_analyst")

    now = datetime.now(timezone.utc)
    operations = []
    for i, b in enumerate(BREACHES_DATA):
        doc = {
            **b,
            "created_at": now - timedelta(days=len(BREACHES_DATA) - i),
            "updated_at": now - timedelta(days=len(BREACHES_DATA) - i),
            "created_by": admin_id if i % 3 == 0 else analyst_id,
        }
        operations.append(
            UpdateOne(
                {"breach_id": b["breach_id"]},
                {"$setOnInsert": doc},
                upsert=True
            )
        )

    # Only delete if reset is requested
    if reset:
        db.breaches.delete_many({"breach_id": {"$exists": True}})

    result = db.breaches.bulk_write(operations)
    print(f"  Upserted {result.upserted_count} new hand-crafted breaches. (Matched {result.matched_count} existing)")

    # Create indexes
    db.breaches.create_index([("location", "2dsphere")])
    db.breaches.create_index([("severity", 1), ("status", 1), ("industry", 1)])
    db.breaches.create_index([("title", "text"), ("description", "text")])
    db.breaches.create_index([("risk_score", -1)])
    db.breaches.create_index([("breach_date", -1)])
    db.breaches.create_index([("organisation.domain", 1)])
    print("  MongoDB indexes created.")


# --------------------------------------------------------------------------- #
# Entry Point                                                                  #
# --------------------------------------------------------------------------- #
def main(reset: bool = False) -> None:
    """Seed the BreachLens database with 25 hand-crafted breach records.

    Can be called programmatically (e.g., from pipeline.py) or via CLI.

    Args:
        reset: When True, drop existing collections before seeding.
    """
    if reset:
        db.breaches.drop()
        db.users.drop()
        print("  Collections dropped.")

    print("  Seeding BreachLens hand-crafted records...")
    user_ids, passwords = seed_users(reset=reset)
    seed_breaches(user_ids, reset=reset)
    print(f"  Done. Database: {DB_NAME}")
    print("\n  Generated default credentials:")
    print(f"    Admin:   admin@breachlens.io  / {passwords['admin']}")
    print(f"    Analyst: priya@breachlens.io  / {passwords['analyst']}")
    print(f"    Guest:   marcus@example.com   / {passwords['guest']}")
    print("\n  ⚠️  Please save these credentials securely. They will not be printed again.")


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed BreachLens database.")
    parser.add_argument("--reset", action="store_true", help="Drop all collections before seeding.")
    args = parser.parse_args()
    main(reset=args.reset)
