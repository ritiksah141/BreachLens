"""
pwned_passwords.py — Utility for checking password exposure using k-Anonymity.
Uses the free api.pwnedpasswords.com service.
"""
import hashlib
import requests
from typing import Tuple, Optional

def check_password_exposure(password: str) -> Tuple[bool, int]:
    """
    Check if a password has been exposed in a breach using k-Anonymity.

    Args:
        password: The raw password to check.

    Returns:
        A tuple of (is_exposed: bool, count: int).
    """
    if not password:
        return False, 0

    # 1. SHA-1 Hash the password
    sha1_hash = hashlib.sha1(password.encode('utf-8')).hexdigest().upper()

    # 2. Split into prefix (first 5 chars) and suffix (rest)
    prefix = sha1_hash[:5]
    suffix = sha1_hash[5:]

    try:
        # 3. Query the Pwned Passwords API with the prefix
        url = f"https://api.pwnedpasswords.com/range/{prefix}"
        response = requests.get(url, timeout=5)

        if response.status_code != 200:
            return False, 0

        # 4. Check if our suffix exists in the results
        # The API returns results in the format "SUFFIX:COUNT"
        lines = response.text.splitlines()
        for line in lines:
            if ":" in line:
                res_suffix, count_str = line.split(":")
                if res_suffix == suffix:
                    return True, int(count_str)

        return False, 0

    except Exception:
        # In case of API downtime or network issues, fail closed (say not exposed)
        # In a real production app, we might log this error.
        return False, 0
