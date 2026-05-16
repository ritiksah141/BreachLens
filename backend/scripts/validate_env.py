"""
validate_env.py — Validate production config early.

Usage:
  python scripts/validate_env.py
"""
import os
import sys

from app import create_app


def main() -> int:
    env = os.getenv("FLASK_ENV", "production")
    try:
        create_app(env)
    except Exception as exc:  # noqa: BLE001
        print(f"Config validation failed: {exc}")
        return 1
    print("Config validation passed.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
