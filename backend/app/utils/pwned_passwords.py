"""
pwned_passwords.py — Utility for checking password exposure using k-Anonymity.
Uses the free api.pwnedpasswords.com service.
"""
import hashlib
import requests
from typing import Tuple

def check_password_exposure(password: str) -> Tuple[bool, int]:
    """
    Check if a password has been exposed in a breach using k-Anonymity.
    This version takes the raw password (not ideal for client-side privacy).
    """
    if not password:
        return False, 0

    sha1_hash = hashlib.sha1(password.encode("utf-8"), usedforsecurity=False).hexdigest().upper()
    prefix = sha1_hash[:5]
    suffix = sha1_hash[5:]

    try:
        results = get_pwned_suffixes(prefix)
        return suffix in results, results.get(suffix, 0)
    except Exception as exc:
        raise RuntimeError("Pwned Passwords API unavailable") from exc

def get_pwned_suffixes(prefix: str) -> dict[str, int]:
    """
    Query the Pwned Passwords API for all suffixes matching a 5-char SHA-1 prefix.
    Returns a dictionary of {suffix: count}.
    """
    if not prefix or len(prefix) != 5:
        return {}

    url = f"https://api.pwnedpasswords.com/range/{prefix.upper()}"
    response = requests.get(url, timeout=5)

    if response.status_code != 200:
        raise RuntimeError("Pwned Passwords API unavailable")

    results = {}
    for line in response.text.splitlines():
        if ":" in line:
            res_suffix, count_str = line.split(":")
            results[res_suffix.upper()] = int(count_str)

    return results
