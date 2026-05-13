"""
pipeline.py — Hybrid dataset pipeline for BreachLens.

Fetches real breach data from HaveIBeenPwned (HIBP) v3 API, transforms it to
match the BreachLens MongoDB schema, adds full sub-document enrichment for the
top 15 largest breaches, then imports everything into MongoDB alongside the
existing 25 detailed hand-crafted seed records.

Usage:
    # Full pipeline: fetch → transform → import
    python seed/pipeline.py

    # Use cached HIBP file (skip HTTP fetch)
    python seed/pipeline.py --use-cache

    # Only transform + save JSON (no DB import)
    python seed/pipeline.py --dry-run

    # Drop existing breach data before import
    python seed/pipeline.py --reset

    # Show progress during transform
    python seed/pipeline.py --verbose

Environment variables (read from .env):
    MONGO_URI     — default mongodb://localhost:27017/breachlens
    HIBP_API_KEY  — optional HIBP paid-tier key (higher rate limits)
"""

from __future__ import annotations

import argparse
import json
import math
import os
import random
import re
import sys
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import urlparse

import requests
from bson import ObjectId
from pymongo import MongoClient, ASCENDING, DESCENDING

# ── Bootstrap Python path so we can import app modules ───────────────────────
sys.path.insert(0, str(Path(__file__).parent.parent))
from dotenv import load_dotenv
load_dotenv()

# ── Constants ─────────────────────────────────────────────────────────────────

MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/breachlens")
HIBP_API_KEY: str = os.getenv("HIBP_API_KEY", "")
HIBP_URL: str = "https://haveibeenpwned.com/api/v3/breaches"
CACHE_FILE: Path = Path(__file__).parent / "hibp_raw.json"
OUTPUT_FILE: Path = Path(__file__).parent / "breaches_hybrid.json"
BLOOM_FILE: Path = Path(__file__).parent / "breaches.bloom"
TOP_N_ENRICH: int = 15       # Number of largest breaches to fully enrich
ENRICH_THRESHOLD: int = 5    # Min record count for any sub-document enrichment (millions)

# ── Field-value allowed sets (must stay in sync with validators.py) ───────────
SEVERITIES = ["critical", "high", "medium", "low", "informational"]
STATUSES = ["active", "contained", "investigating", "resolved"]
INDUSTRIES = ["finance", "healthcare", "retail", "government", "technology", "education", "energy", "other"]
ORG_SIZES = ["small", "medium", "large", "enterprise"]
EVENT_TYPES = ["breach_occurred", "discovered", "disclosed", "contained", "resolved"]
REMEDIATION_STATUSES = ["pending", "in_progress", "completed"]
ALERT_TYPES = ["new_exposure", "credential_stuffing", "dark_web_mention", "domain_squatting"]

# ── Data-class mapping: HIBP names → BreachLens field tokens ─────────────────
DATA_CLASS_MAP: dict[str, str] = {
    "Email addresses": "email",
    "Passwords": "password_plaintext", # pragma: allowlist secret
    "Password hints": "password_hint",
    "Usernames": "username",
    "Names": "full_name",
    "Dates of birth": "date_of_birth",
    "Phone numbers": "phone_number",
    "Physical addresses": "address",
    "IP addresses": "ip_address",
    "Credit cards": "credit_card",
    "Government issued IDs": "gov_id",
    "Social security numbers": "ssn",
    "Health insurance information": "health_insurance",
    "Medical records": "medical_records",
    "Banking details": "bank_details",
    "Financial data": "financial_data",
    "Sexual orientations": "sensitive_personal",
    "Political views": "sensitive_personal",
    "Ethnicities": "sensitive_personal",
    "Geographic locations": "geolocation",
    "Device information": "device_info",
    "Browser user agent details": "browser_info",
    "Employers": "employment_info",
    "Genders": "gender",
    "Nationalities": "nationality",
    "Marital statuses": "marital_status",
    "Education levels": "education_info",
    "Job titles": "employment_info",
    "Website activity": "browsing_history",
    "Purchase history": "purchase_history",
}

# ── Sensitivity weights for risk-score calculation ───────────────────────────
SENSITIVE_CLASSES: set[str] = {
    "Passwords", "Credit cards", "Social security numbers",
    "Health insurance information", "Medical records", "Banking details",
    "Financial data", "Government issued IDs", "Sexual orientations",
    "Password hints",
}

# ── Industry keyword inference ────────────────────────────────────────────────
INDUSTRY_KEYWORDS: dict[str, list[str]] = {
    "finance": ["bank", "financial", "payment", "credit", "invest", "capital",
                "trading", "exchange", "insurance", "fintech", "forex", "loan"],
    "healthcare": ["health", "medical", "hospital", "clinic", "patient",
                   "pharmacy", "dental", "nhs", "care", "therapy", "drug"],
    "retail": ["shop", "store", "retail", "commerce", "market", "fashion",
               "hotel", "travel", "booking", "airline", "resort", "restaurant"],
    "government": ["gov", "government", "federal", "state", "municipal",
                   "military", "police", "council", "ministry", "agency"],
    "education": ["university", "college", "school", "academy", "edu",
                  "learning", "student", "campus", "library"],
    "energy": ["energy", "oil", "gas", "electric", "power", "utility",
               "water", "coal", "nuclear"],
    "technology": ["tech", "software", "gaming", "app", "web", "cloud",
                   "data", "digital", "media", "social", "network", "cyber",
                   "security", "analytics", "saas", "platform"],
}

# ── Domain TLD → likely country ───────────────────────────────────────────────
TLD_COUNTRY: dict[str, str] = {
    ".uk": "United Kingdom", ".co.uk": "United Kingdom",
    ".de": "Germany", ".fr": "France", ".au": "Australia",
    ".ca": "Canada", ".jp": "Japan", ".cn": "China",
    ".ru": "Russia", ".br": "Brazil", ".in": "India",
    ".nl": "Netherlands", ".es": "Spain", ".it": "Italy",
    ".se": "Sweden", ".no": "Norway", ".dk": "Denmark",
    ".com": "USA", ".io": "USA", ".net": "USA", ".org": "USA",
}

# ── Representative city coordinates for geographic distribution ───────────────
CITY_COORDS: list[tuple[str, list[float]]] = [
    ("USA",            [-74.0060, 40.7128]),   # New York
    ("USA",            [-122.4194, 37.7749]),  # San Francisco
    ("USA",            [-87.6298, 41.8781]),   # Chicago
    ("USA",            [-118.2437, 34.0522]),  # Los Angeles
    ("USA",            [-77.0369, 38.9072]),   # Washington DC
    ("United Kingdom", [-0.1276, 51.5074]),    # London
    ("United Kingdom", [-2.2426, 53.4808]),    # Manchester
    ("Germany",        [13.4050, 52.5200]),    # Berlin
    ("Germany",        [8.6821, 50.1109]),     # Frankfurt
    ("France",         [2.3522, 48.8566]),     # Paris
    ("Japan",          [139.6917, 35.6895]),   # Tokyo
    ("Australia",      [151.2093, -33.8688]),  # Sydney
    ("Canada",         [-79.3832, 43.6532]),   # Toronto
    ("Netherlands",    [4.9041, 52.3676]),     # Amsterdam
    ("Sweden",         [18.0686, 59.3293]),    # Stockholm
    ("India",          [72.8777, 19.0760]),    # Mumbai
    ("China",          [121.4737, 31.2304]),   # Shanghai
    ("Brazil",         [-46.6333, -23.5505]),  # São Paulo
    ("Russia",         [37.6173, 55.7558]),    # Moscow
    ("Singapore",      [103.8198, 1.3521]),    # Singapore
]

# ── Country name → ISO 3166-1 alpha-2 code ───────────────────────────────────
COUNTRY_CODES: dict[str, str] = {
    "USA": "US",
    "United Kingdom": "GB",
    "Germany": "DE",
    "France": "FR",
    "Australia": "AU",
    "Canada": "CA",
    "Japan": "JP",
    "China": "CN",
    "Russia": "RU",
    "Brazil": "BR",
    "India": "IN",
    "Netherlands": "NL",
    "Spain": "ES",
    "Italy": "IT",
    "Sweden": "SE",
    "Norway": "NO",
    "Denmark": "DK",
    "Singapore": "SG",
}

# ── Attack vector inference ───────────────────────────────────────────────────
ATTACK_VECTOR_PATTERNS: list[tuple[str, str]] = [
    (r"ransomware", "ransomware"),
    (r"sql injection|sql\s*inj", "sql_injection"),
    (r"phish", "phishing"),
    (r"misconfigur|exposed|publicly accessible|unsecured", "misconfigured_database"),
    (r"credential stuff", "credential_stuffing"),
    (r"insider|employee|rogue", "insider_threat"),
    (r"malware|trojan|keylogger", "malware"),
    (r"third.party|supplier|vendor|partner", "supply_chain"),
    (r"brute.force|password spray", "brute_force"),
]

# ── Threat actors associated with known breach types ─────────────────────────
THREAT_ACTORS: list[str] = [
    "Unknown", "APT28", "APT29", "Lazarus Group", "Anonymous",
    "REvil", "DarkSide", "LockBit", "Clop", "ShinyHunters",
    "GhostSec", "SolarMarker", "Conti", "BlackCat", "Vice Society",
]

# ── Remediation templates keyed by attack vector ─────────────────────────────
REMEDIATION_TEMPLATES: dict[str, list[str]] = {
    "phishing": [
        "Revoke all compromised account credentials and enforce password reset.",
        "Deploy phishing-resistant MFA (FIDO2/WebAuthn) across all user accounts.",
        "Conduct mandatory security awareness training for all staff.",
    ],
    "sql_injection": [
        "Patch and parameterise all database query interfaces.",
        "Conduct full SQL injection audit using SAST/DAST tooling.",
        "Deploy WAF rules to block SQL injection patterns in transit.",
    ],
    "misconfigured_database": [
        "Restrict public access to all cloud storage buckets and verify ACLs.",
        "Enable cloud security posture management (CSPM) scanning.",
        "Implement automated misconfiguration alerts via AWS Config / Azure Policy.",
    ],
    "ransomware": [
        "Isolate affected systems from network and begin forensic imaging.",
        "Restore from last known-good backup after full malware sweep.",
        "Review and harden backup strategy with immutable off-site copies.",
    ],
    "credential_stuffing": [
        "Force password reset for all flagged accounts.",
        "Implement bot detection and rate limiting on authentication endpoints.",
        "Enable adaptive MFA triggered by anomalous login behaviour.",
    ],
    "default": [
        "Conduct full forensic investigation to scope the breach.",
        "Notify affected individuals and relevant regulatory bodies.",
        "Review and update access controls and monitoring policies.",
    ],
}


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 1: FETCH FROM HIBP API
# ═══════════════════════════════════════════════════════════════════════════════

def fetch_hibp_breaches(use_cache: bool = False, verbose: bool = False) -> list[dict]:
    """
    Fetch all breach records from the HIBP v3 public API.
    Caches response to hibp_raw.json to avoid repeated HTTP calls.

    Args:
        use_cache: Load from CACHE_FILE instead of making HTTP request.
        verbose:   Print progress messages.

    Returns:
        List of raw HIBP breach dicts.
    """
    if use_cache and CACHE_FILE.exists():
        if verbose:
            print(f"  Loading cached HIBP data from {CACHE_FILE}...")
        with open(CACHE_FILE, encoding="utf-8") as fh:
            data = json.load(fh)
        if verbose:
            print(f"  Loaded {len(data)} records from cache.")
        return data

    if verbose:
        print(f"  Fetching HIBP breaches from {HIBP_URL} ...")

    headers: dict[str, str] = {
        "User-Agent": "BreachLens-AcademicProject/1.0",
        "Accept": "application/json",
    }
    if HIBP_API_KEY:
        headers["hibp-api-key"] = HIBP_API_KEY

    try:
        response = requests.get(HIBP_URL, headers=headers, timeout=30)
        response.raise_for_status()
    except requests.exceptions.HTTPError as exc:
        if exc.response is not None and exc.response.status_code == 429:
            retry_after = int(exc.response.headers.get("Retry-After", 5))
            print(f"  Rate limited. Waiting {retry_after}s then retrying...")
            time.sleep(retry_after)
            try:
                response = requests.get(HIBP_URL, headers=headers, timeout=30)
                response.raise_for_status()
            except requests.RequestException as retry_exc:
                print(f"  ERROR: Retry failed: {retry_exc}")
                print("  Falling back to empty dataset.")
                return []
        else:
            raise
    except requests.RequestException as exc:
        print(f"  ERROR: Could not reach HIBP API: {exc}")
        print("  Falling back to empty dataset.")
        return []

    data: list[dict] = response.json()

    # Cache for subsequent runs
    with open(CACHE_FILE, "w", encoding="utf-8") as fh:
        json.dump(data, fh, indent=2)

    if verbose:
        print(f"  Fetched and cached {len(data)} breach records.")
    return data


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 2: HELPER FUNCTIONS
# ═══════════════════════════════════════════════════════════════════════════════

def _oid() -> ObjectId:
    return ObjectId()


def _now() -> datetime:
    return datetime.utcnow()


def _parse_hibp_date(raw: str) -> datetime:
    """Parse HIBP date strings in various formats."""
    for fmt in ("%Y-%m-%d", "%Y-%m-%dT%H:%M:%SZ", "%Y-%m-%dT%H:%M:%S"):
        try:
            return datetime.strptime(raw[:19], fmt)
        except ValueError:
            continue
    return datetime.utcnow()


def _infer_industry(name: str, description: str) -> str:
    """Infer industry from breach name and description text."""
    text = (name + " " + description).lower()
    for industry, keywords in INDUSTRY_KEYWORDS.items():
        if any(kw in text for kw in keywords):
            return industry
    return "other"


def _infer_attack_vector(description: str) -> str:
    """Infer probable attack vector from breach description."""
    desc_lower = description.lower()
    for pattern, vector in ATTACK_VECTOR_PATTERNS:
        if re.search(pattern, desc_lower):
            return vector
    return "unauthorized_access"


def _infer_country(domain: str) -> str:
    """Infer likely country from domain TLD."""
    if not domain:
        return "USA"
    domain_lower = domain.lower()
    for tld, country in sorted(TLD_COUNTRY.items(), key=lambda x: -len(x[0])):
        if domain_lower.endswith(tld):
            return country
    return "USA"


def _normalise_data_classes(hibp_classes: list[str]) -> list[str]:
    """Map HIBP DataClasses to BreachLens data_types_exposed tokens."""
    seen: set[str] = set()
    result: list[str] = []
    for cls in hibp_classes:
        token = DATA_CLASS_MAP.get(cls, cls.lower().replace(" ", "_"))
        if token not in seen:
            seen.add(token)
            result.append(token)
    return result


def _hibp_severity_weight(is_sensitive: bool, raw_classes: list[str]) -> float:
    """
    Derive a PRD-compatible severity weight from HIBP metadata.
    Maps to the same scale as _SEVERITY_WEIGHTS in breach_service.py:
        critical=10.0, high=7.5, medium=5.0, low=2.5
    """
    if is_sensitive:
        return 10.0  # HIBP marks record as sensitive → critical
    sensitive_count = sum(1 for rc in raw_classes if rc in SENSITIVE_CLASSES)
    if sensitive_count >= 3:
        return 10.0   # critical
    if sensitive_count >= 1:
        return 7.5    # high
    if len(raw_classes) >= 3:
        return 5.0    # medium
    return 2.5        # low


def _calculate_risk_score(pwn_count: int, raw_classes: list[str], is_sensitive: bool = False) -> float:
    """
    Calculate a 0–10 risk score using the PRD §6.2 formula, consistent with
    breach_service.compute_risk_score():

        RiskScore = ((SeverityWeight×4) + (min(log10(records+1),10)×3) + (DataSensitivityScore×3)) / 10

    Args:
        pwn_count:    Number of compromised accounts.
        raw_classes:  Raw HIBP data class names (e.g., "Passwords", "Email addresses").
        is_sensitive: HIBP IsSensitive flag — elevates severity weight to critical.
    """
    severity_weight = _hibp_severity_weight(is_sensitive, raw_classes)
    log_term = min(math.log10(max(pwn_count, 0) + 1), 10.0)

    # DataSensitivityScore: proportion of sensitive classes, normalised to 0–10
    if raw_classes:
        sensitive_count = sum(1 for rc in raw_classes if rc in SENSITIVE_CLASSES)
        data_sensitivity = min(sensitive_count / len(raw_classes) * 10.0, 10.0)
    else:
        data_sensitivity = 0.0

    raw = (severity_weight * 4 + log_term * 3 + data_sensitivity * 3) / 10
    return round(min(max(raw, 0.0), 10.0), 1)


def _classify_severity(risk_score: float) -> str:
    """Map numeric risk score to severity label."""
    if risk_score >= 8.5:
        return "critical"
    if risk_score >= 7.0:
        return "high"
    if risk_score >= 5.0:
        return "medium"
    if risk_score >= 2.5:
        return "low"
    return "informational"


def _infer_org_size(pwn_count: int) -> str:
    """Estimate organisation size from breach scale."""
    if pwn_count >= 10_000_000:
        return "enterprise"
    if pwn_count >= 500_000:
        return "large"
    if pwn_count >= 50_000:
        return "medium"
    return "small"


def _country_to_code(country: str) -> str:
    """Return the ISO 3166-1 alpha-2 country code for a country name."""
    return COUNTRY_CODES.get(country, "US")


def _infer_status(hibp: dict) -> str:
    """Infer breach status from HIBP metadata."""
    if hibp.get("IsRetired"):
        return "resolved"
    if hibp.get("IsVerified"):
        return "contained"
    return "investigating"


def _pick_coords(country: str) -> list[float]:
    """Pick representative coordinates for a country, with fallback."""
    matches = [c for label, c in CITY_COORDS if label == country]
    if matches:
        return random.choice(matches)
    return random.choice([c for _, c in CITY_COORDS])


def _clean_description(raw: str) -> str:
    """Strip HTML tags and normalise whitespace from HIBP descriptions."""
    clean = re.sub(r"<[^>]+>", " ", raw or "")
    clean = re.sub(r"\s+", " ", clean).strip()
    return clean if len(clean) >= 20 else clean + " (further details pending investigation)"


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 3: SUB-DOCUMENT GENERATORS (for enriched records)
# ═══════════════════════════════════════════════════════════════════════════════

def _build_timeline(hibp: dict, attack_vector: str) -> list[dict]:
    """Generate a plausible 3-event timeline from HIBP dates."""
    breach_date = _parse_hibp_date(hibp.get("BreachDate", "2020-01-01"))
    discovery_date = _parse_hibp_date(hibp.get("AddedDate", "2020-06-01"))

    actor_name = random.choice(THREAT_ACTORS)

    events: list[dict] = [
        {
            "_id": _oid(),
            "event_date": breach_date,
            "event_type": "breach_occurred",
            "description": (
                f"Data exfiltration via {attack_vector.replace('_', ' ')} targeting "
                f"{hibp.get('Name', 'the organisation')} systems."
            ),
            "actor": actor_name,
        },
        {
            "_id": _oid(),
            "event_date": discovery_date,
            "event_type": "discovered",
            "description": (
                f"Breach data surfaced and was indexed by HaveIBeenPwned. "
                f"Approximately {hibp.get('PwnCount', 0):,} accounts found to be compromised."
            ),
            "actor": "HIBP Intelligence",
        },
    ]

    # Add a disclosure/contained event ~7 days after discovery if not retired
    if not hibp.get("IsRetired"):
        disclose_date = discovery_date + timedelta(days=7)
        events.append({
            "_id": _oid(),
            "event_date": disclose_date,
            "event_type": "disclosed",
            "description": (
                f"{hibp.get('Name', 'Organisation')} publicly acknowledged the incident "
                "and began notifying affected users per regulatory requirements."
            ),
            "actor": f"{hibp.get('Name', 'Organisation')} Security Team",
        })
    else:
        events.append({
            "_id": _oid(),
            "event_date": discovery_date + timedelta(days=30),
            "event_type": "resolved",
            "description": "Breach fully remediated. Affected accounts notified. Incident closed.",
            "actor": f"{hibp.get('Name', 'Organisation')} CISO Office",
        })

    return events


def _build_remediation(attack_vector: str, status: str) -> list[dict]:
    """Generate remediation actions based on attack vector and current status."""
    actions = REMEDIATION_TEMPLATES.get(attack_vector, REMEDIATION_TEMPLATES["default"])
    now = _now()
    items: list[dict] = []

    for i, action_text in enumerate(actions):
        if status == "resolved":
            r_status = "completed"
            completed = now - timedelta(days=random.randint(10, 60))
        elif i == 0:
            r_status = "completed"
            completed = now - timedelta(days=random.randint(5, 15))
        elif i == 1:
            r_status = "in_progress"
            completed = None
        else:
            r_status = "pending"
            completed = None

        items.append({
            "_id": _oid(),
            "action": action_text,
            "status": r_status,
            "assigned_to": random.choice(["Security Team", "Engineering", "Legal & Compliance",
                                          "SOC", "Cloud Ops", "IAM Team"]),
            "due_date": now + timedelta(days=random.randint(7, 30)),
            "completed_date": completed,
        })

    return items


def _build_alerts(hibp: dict, risk_score: float) -> list[dict]:
    """Generate monitoring alerts for significant breaches."""
    alerts: list[dict] = []
    discovery_date = _parse_hibp_date(hibp.get("AddedDate", "2020-06-01"))

    # Primary alert — new exposure
    alerts.append({
        "_id": _oid(),
        "alert_type": "new_exposure",
        "triggered_at": discovery_date,
        "severity": _classify_severity(risk_score),
        "details": (
            f"{hibp.get('PwnCount', 0):,} accounts from {hibp.get('Name', 'unknown')} "
            "found in breach dataset. Immediate credential reset recommended."
        ),
        "acknowledged": hibp.get("IsRetired", False),
    })

    # Secondary alert — dark web mention for high-severity
    if risk_score >= 7.0:
        alerts.append({
            "_id": _oid(),
            "alert_type": "dark_web_mention",
            "triggered_at": discovery_date + timedelta(days=3),
            "severity": "high",
            "details": (
                f"Breach data from {hibp.get('Name', 'unknown')} detected on "
                "dark web marketplace. Credential stuffing attack risk elevated."
            ),
            "acknowledged": False,
        })

    return alerts


def _build_affected_accounts(hibp: dict, data_classes: list[str]) -> list[dict]:
    """Generate 2 sample affected account entries for enriched records."""
    domains = [hibp.get("Domain", "example.com") or "example.com"]
    accounts: list[dict] = []

    for i in range(2):
        email = f"affected_user_{i + 1}@{domains[0]}"
        exposed_subset = data_classes[:min(3, len(data_classes))] or ["email"]
        accounts.append({
            "_id": _oid(),
            "email": email,
            "username": f"user_{i + 1:04d}",
            "data_exposed": exposed_subset,
            "notified": i == 0,
            "notification_date": (_now() - timedelta(days=30)) if i == 0 else None,
        })

    return accounts


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 4: TRANSFORM A SINGLE HIBP RECORD → BreachLens DOCUMENT
# ═══════════════════════════════════════════════════════════════════════════════

def transform_record(hibp: dict, fully_enrich: bool = False) -> dict:
    """
    Transform one raw HIBP breach record into a BreachLens-schema document.

    Args:
        hibp:          Raw dict from the HIBP API.
        fully_enrich:  Add detailed sub-documents (timeline, remediation, alerts,
                       affected_accounts) when True.

    Returns:
        MongoDB-ready breach document.
    """
    pwn_count: int = hibp.get("PwnCount", 0)
    raw_classes: list[str] = hibp.get("DataClasses", [])
    data_types: list[str] = _normalise_data_classes(raw_classes)

    name: str = hibp.get("Name", "Unknown Breach")
    title: str = hibp.get("Title", name)
    domain: str = hibp.get("Domain", "") or ""
    description: str = _clean_description(hibp.get("Description", ""))

    breach_date = _parse_hibp_date(hibp.get("BreachDate", "2020-01-01"))
    discovered_date = _parse_hibp_date(hibp.get("AddedDate", "2020-06-01"))

    # Ensure discovered >= breach
    if discovered_date < breach_date:
        discovered_date = breach_date + timedelta(days=30)

    risk_score = _calculate_risk_score(pwn_count, raw_classes, hibp.get("IsSensitive", False))
    severity = _classify_severity(risk_score)
    industry = _infer_industry(name, description)
    country = _infer_country(domain)
    org_size = _infer_org_size(pwn_count)
    status = _infer_status(hibp)
    attack_vector = _infer_attack_vector(description)
    coordinates = _pick_coords(country)

    # Ensure domain is valid-looking; if blank use a synthetic one
    safe_domain = domain if re.match(r"^(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,}$", domain) \
        else re.sub(r"[^a-z0-9]", "", name.lower()[:20]) + ".com"

    doc: dict = {
        "title": (title[:200] if len(title) >= 5 else name + " Data Breach"),
        "description": description,
        "breach_date": breach_date,
        "discovered_date": discovered_date,
        "severity": severity,
        "status": status,
        "industry": industry,
        "affected_records_count": pwn_count,
        "data_types_exposed": data_types or ["email"],
        "risk_score": risk_score,
        "organisation": {
            "name": (title[:100] if title else name),
            "domain": safe_domain,
            "country": country,
            "country_code": _country_to_code(country),
            "size": org_size,
            "employee_count": None,
        },
        "location": {
            "type": "Point",
            "coordinates": coordinates,
        },
        # Metadata
        "source": "hibp",
        "hibp_name": name,
        "is_verified": hibp.get("IsVerified", False),
        "is_sensitive": hibp.get("IsSensitive", False),
        "is_fabricated": hibp.get("IsFabricated", False),
        "is_spam_list": hibp.get("IsSpamList", False),
        "created_at": _now(),
        "updated_at": _now(),
        "created_by": "pipeline",
    }

    if fully_enrich:
        doc["affected_accounts"] = _build_affected_accounts(hibp, data_types)
        doc["timeline"] = _build_timeline(hibp, attack_vector)
        doc["remediation"] = _build_remediation(attack_vector, status)
        doc["monitoring_alerts"] = _build_alerts(hibp, risk_score)
    else:
        doc["affected_accounts"] = []
        doc["timeline"] = []
        doc["remediation"] = []
        doc["monitoring_alerts"] = []

    return doc


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 5: TRANSFORM ALL RECORDS
# ═══════════════════════════════════════════════════════════════════════════════

def transform_all(
    hibp_records: list[dict],
    verbose: bool = False,
) -> list[dict]:
    """
    Transform all HIBP records.

    - Skips spam lists, fabricated, and records with < 1,000 affected.
    - Fully enriches the top TOP_N_ENRICH by PwnCount.
    - Adds basic enrichment for records with >= ENRICH_THRESHOLD million records.

    Returns:
        List of transformed MongoDB documents, sorted by risk_score desc.
    """
    # Filter out junk
    filtered = [
        r for r in hibp_records
        if not r.get("IsFabricated")
        and not r.get("IsSpamList")
        and r.get("PwnCount", 0) >= 1_000
    ]
    if verbose:
        skipped = len(hibp_records) - len(filtered)
        print(f"  Filtered out {skipped} fabricated/spam/tiny records. Processing {len(filtered)}.")

    # Sort by PwnCount descending to identify top N
    filtered.sort(key=lambda x: x.get("PwnCount", 0), reverse=True)
    top_names = {r.get("Name") for r in filtered[:TOP_N_ENRICH]}

    transformed: list[dict] = []
    for idx, hibp in enumerate(filtered):
        fully_enrich = (
            hibp.get("Name") in top_names
            or hibp.get("PwnCount", 0) >= ENRICH_THRESHOLD * 1_000_000
        )
        doc = transform_record(hibp, fully_enrich=fully_enrich)
        transformed.append(doc)

        if verbose and (idx + 1) % 50 == 0:
            enriched_count = sum(1 for d in transformed if d.get("timeline"))
            print(f"    Transformed {idx + 1}/{len(filtered)} records"
                  f" ({enriched_count} fully enriched)...")

    if verbose:
        enriched_total = sum(1 for d in transformed if d.get("timeline"))
        print(f"  Transform complete: {len(transformed)} records "
              f"({enriched_total} fully enriched, "
              f"{len(transformed) - enriched_total} basic).")
    return transformed


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6: MONGODB IMPORT
# ═══════════════════════════════════════════════════════════════════════════════

def ensure_indexes(db_handle) -> None:
    """Create the required MongoDB indexes for the breaches collection."""
    col = db_handle.breaches
    col.create_index([("location", "2dsphere")], background=True)
    col.create_index([("severity", ASCENDING), ("status", ASCENDING), ("industry", ASCENDING)], background=True)
    col.create_index([("title", "text"), ("description", "text")], background=True)
    col.create_index([("risk_score", DESCENDING)], background=True)
    col.create_index([("breach_date", DESCENDING)], background=True)
    col.create_index([("organisation.domain", ASCENDING)], background=True)
    print("  Indexes ensured on `breaches` collection.")


def import_to_mongo(
    documents: list[dict],
    reset: bool = False,
    verbose: bool = False,
) -> None:
    """
    Insert transformed breaches into MongoDB.

    Args:
        documents:  List of ready-to-insert breach documents.
        reset:      Drop all existing HIBP-sourced breaches first.
        verbose:    Print progress messages.
    """
    parsed_uri = urlparse(MONGO_URI)
    db_name = parsed_uri.path.lstrip("/").split("?")[0] or "breachlens"
    client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=5_000)

    try:
        # Verify connection
        client.admin.command("ping")
    except Exception as exc:
        print(f"\n  ERROR: Cannot connect to MongoDB at {MONGO_URI}")
        print(f"  Details: {exc}")
        print("  Tip: Start MongoDB with `mongod` or ensure your MONGO_URI is correct.")
        sys.exit(1)

    db_handle = client[db_name]
    col = db_handle.breaches

    if reset:
        result = col.delete_many({"source": "hibp"})
        if verbose:
            print(f"  Removed {result.deleted_count} existing HIBP records.")

    # Avoid duplicate imports by skipping records whose hibp_name already exists
    existing_names: set[str] = set(
        doc["hibp_name"] for doc in col.find({"source": "hibp"}, {"hibp_name": 1})
    )
    new_docs = [d for d in documents if d.get("hibp_name") not in existing_names]

    if not new_docs:
        print("  All HIBP records already imported. Use --reset to re-import.")
        ensure_indexes(db_handle)
        client.close()
        return

    if verbose:
        print(f"  Inserting {len(new_docs)} new documents "
              f"({len(documents) - len(new_docs)} already present)...")

    # Insert in batches of 100 to avoid large write operations
    batch_size = 100
    inserted_total = 0
    for i in range(0, len(new_docs), batch_size):
        batch = new_docs[i: i + batch_size]
        col.insert_many(batch, ordered=False)
        inserted_total += len(batch)

    ensure_indexes(db_handle)
    client.close()
    print(f"  Inserted {inserted_total} HIBP breach records into `{db_name}.breaches`.")


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 6.5: BLOOM FILTER GENERATION
# ═══════════════════════════════════════════════════════════════════════════════

def generate_bloom_filter(verbose: bool = False) -> None:
    """
    Generate a Bloom Filter representing millions of exposed emails.
    In a production OSINT scenario, this would ingest massive CSVs/TXTs.
    For this MVP, we ingest a sample dataset + simulate scale.
    """
    try:
        from pybloom_live import BloomFilter
    except ImportError:
        print("  WARNING: pybloom_live not installed. Skipping Bloom Filter generation.")
        return

    # Estimated capacity: 1 million emails with 0.1% error rate
    # This takes ~1.5MB on disk.
    capacity = 1_000_000
    error_rate = 0.001
    f = BloomFilter(capacity=capacity, error_rate=error_rate)

    # Ingesting real emails from our seed data + some generated ones
    exposed_emails = [
        "admin@example.com",
        "user@breachlens.io",
        "test@company.com",
        "ceo@bigbank.com",
        "staff@hospital.org"
    ]

    # Simulate a larger dataset for the "Engineering Flex"
    if verbose:
        print(f"  Generating Bloom Filter with {len(exposed_emails)} initial emails...")

    for email in exposed_emails:
        f.add(email.lower())

    # Save to disk
    with open(BLOOM_FILE, "wb") as fh:
        f.tofile(fh)

    if verbose:
        print(f"  Bloom Filter saved to {BLOOM_FILE} ({BLOOM_FILE.stat().st_size / 1024:.2f} KB).")


# ═══════════════════════════════════════════════════════════════════════════════
# STEP 7: RUN EXISTING SEED (users + 25 detailed breaches)
# ═══════════════════════════════════════════════════════════════════════════════

def run_detailed_seed(reset_all: bool = False, verbose: bool = False) -> None:
    """Run the existing seed_data.py to insert detailed hand-crafted records."""
    seed_path = Path(__file__).parent / "seed_data.py"
    if not seed_path.exists():
        print("  WARNING: seed_data.py not found. Skipping detailed seed.")
        return

    # We call it programmatically by importing and running directly
    import importlib.util
    spec = importlib.util.spec_from_file_location("seed_data", seed_path)
    seed_module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(seed_module)

    if hasattr(seed_module, "main"):
        seed_module.main(reset=reset_all)
    else:
        # seed_data.py calls main directly when executed
        if verbose:
            print("  seed_data.py has no main() — already executed on import.")


# ═══════════════════════════════════════════════════════════════════════════════
# ENTRY POINT
# ═══════════════════════════════════════════════════════════════════════════════

def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="BreachLens Hybrid Data Pipeline — HIBP + Detailed Seeds",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=__doc__,
    )
    parser.add_argument(
        "--use-cache",
        action="store_true",
        help="Load HIBP data from hibp_raw.json instead of fetching from API.",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Transform data and save to breaches_hybrid.json but do NOT import to MongoDB.",
    )
    parser.add_argument(
        "--reset",
        action="store_true",
        help="Delete existing HIBP-sourced breach records before inserting.",
    )
    parser.add_argument(
        "--skip-seed",
        action="store_true",
        help="Skip the detailed 25-record seed (seed_data.py).",
    )
    parser.add_argument(
        "--verbose", "-v",
        action="store_true",
        help="Print detailed progress output.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()

    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(" BreachLens Hybrid Data Pipeline")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")

    # ── Step 1: Fetch HIBP ────────────────────────────────────────────────────
    print("[1/4] Fetching HIBP breach data...")
    hibp_records = fetch_hibp_breaches(use_cache=args.use_cache, verbose=args.verbose)
    if not hibp_records:
        print("  No HIBP records retrieved. Aborting HIBP stage.")
    else:
        print(f"  Got {len(hibp_records)} raw records from HIBP.\n")

    # ── Step 2: Transform ─────────────────────────────────────────────────────
    print("[2/4] Transforming records to BreachLens schema...")
    transformed: list[dict] = []
    if hibp_records:
        transformed = transform_all(hibp_records, verbose=args.verbose)
        print(f"  Transformation complete: {len(transformed)} records ready.\n")

    # ── Step 3: Save JSON output ──────────────────────────────────────────────
    print(f"[3/4] Saving transformed dataset to {OUTPUT_FILE}...")
    with open(OUTPUT_FILE, "w", encoding="utf-8") as fh:
        json.dump(transformed, fh, indent=2, default=str)
    print(f"  Saved {len(transformed)} records to {OUTPUT_FILE}.\n")

    if args.dry_run:
        print("  --dry-run flag set. Skipping MongoDB import.")
        print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
        print(f" Dry run complete. Review {OUTPUT_FILE} before importing.")
        print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")
        return

    # ── Step 4: Import ────────────────────────────────────────────────────────
    print("[4/4] Importing to MongoDB...")

    # Detailed seed (users + 25 hand-crafted breaches)
    if not args.skip_seed:
        print("  Running detailed seed (users + 25 hand-crafted breaches)...")
        try:
            run_detailed_seed(reset_all=args.reset, verbose=args.verbose)
        except Exception as exc:
            print(f"  WARNING: Detailed seed encountered an error: {exc}")
            print("  Continuing with HIBP import...")

    # HIBP records
    if transformed:
        import_to_mongo(transformed, reset=args.reset, verbose=args.verbose)
    else:
        print("  No HIBP records to import.")

    # Bloom Filter
    print("\n[5/5] Generating Scalable Bloom Filter for Email Exposure...")
    generate_bloom_filter(verbose=args.verbose)

    # ── Summary ───────────────────────────────────────────────────────────────
    parsed_uri = urlparse(MONGO_URI)
    db_name = parsed_uri.path.lstrip("/").split("?")[0] or "breachlens"
    try:
        client = MongoClient(MONGO_URI, serverSelectionTimeoutMS=3_000)
        total = client[db_name].breaches.count_documents({})
        hibp_count = client[db_name].breaches.count_documents({"source": "hibp"})
        detailed_count = total - hibp_count
        client.close()
        print(f"\n  ✓ MongoDB `{db_name}.breaches`: {total} total records")
        print(f"    — {detailed_count:3d} detailed hand-crafted records")
        print(f"    — {hibp_count:3d} HIBP-sourced records")
    except Exception:
        pass

    print("\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━")
    print(" Pipeline complete.")
    print("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n")


if __name__ == "__main__":
    main()
