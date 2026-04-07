"""
config.py — Configuration classes for BreachLens.
"""
import os
from datetime import timedelta
from dotenv import load_dotenv

load_dotenv()


class Config:
    """Base configuration."""
    SECRET_KEY: str = os.getenv("SECRET_KEY", "")
    MONGO_URI: str = os.getenv("MONGO_URI", "mongodb://localhost:27017/breachlens")

    # JWT expiry (used by auth_service.py when calling jwt.encode)
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(
        seconds=int(os.getenv("JWT_ACCESS_TOKEN_EXPIRES", 3600))
    )

    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS", "http://localhost:4200"
    ).split(",")

    SWAGGER_ENABLED: bool = os.getenv("SWAGGER_ENABLED", "true").lower() in ("true", "1", "yes")

    RATELIMIT_STORAGE_URL: str = os.getenv("RATELIMIT_STORAGE_URL", "memory://")
    RATELIMIT_ENABLED: bool = os.getenv("RATELIMIT_ENABLED", "true").lower() not in ("false", "0", "no")
    RATELIMIT_DEFAULT: str = "200 per day;50 per hour"

    # Flask-Caching configuration
    CACHE_TYPE: str = os.getenv("CACHE_TYPE", "SimpleCache")  # Options: SimpleCache, RedisCache, FileSystemCache
    CACHE_DEFAULT_TIMEOUT: int = int(os.getenv("CACHE_DEFAULT_TIMEOUT", 300))

    # Request logging settings
    REQUEST_IP_POLICY: str = os.getenv("REQUEST_IP_POLICY", "anonymize")  # Options: "full", "anonymize", "none"
    IP_ANONYMIZATION_SALT: str = os.getenv("IP_ANONYMIZATION_SALT", "")

    # Account lockout settings
    MAX_LOGIN_ATTEMPTS: int = int(os.getenv("MAX_LOGIN_ATTEMPTS", 5))
    LOCKOUT_DURATION_MINUTES: int = int(os.getenv("LOCKOUT_DURATION_MINUTES", 15))

    # Password reset settings
    PASSWORD_RESET_TOKEN_TTL_MINUTES: int = int(os.getenv("PASSWORD_RESET_TOKEN_TTL_MINUTES", 30))


class DevelopmentConfig(Config):
    """Development configuration."""
    DEBUG: bool = True


class TestingConfig(Config):
    """Testing configuration."""
    TESTING: bool = True
    SECRET_KEY: str = "test-secret-key-for-jwt-encoding"
    MONGO_URI: str = "mongodb://localhost:27017/breachlens_test"
    JWT_ACCESS_TOKEN_EXPIRES: timedelta = timedelta(hours=1)
    RATELIMIT_ENABLED: bool = False
    RATELIMIT_DEFAULT: str = "10000 per hour"
    WTF_CSRF_ENABLED: bool = False
    CACHE_TYPE: str = "NullCache"  # Disable caching in tests to avoid Python 3.14 serialization issues


class ProductionConfig(Config):
    """Production configuration with stricter secure defaults."""
    DEBUG: bool = False
    SWAGGER_ENABLED: bool = os.getenv("SWAGGER_ENABLED", "false").lower() in ("true", "1", "yes")
    RATELIMIT_STORAGE_URL: str = os.getenv("RATELIMIT_STORAGE_URL", "redis://localhost:6379/0")
    CACHE_TYPE: str = os.getenv("CACHE_TYPE", "RedisCache")


config: dict = {
    "development": DevelopmentConfig,
    "testing": TestingConfig,
    "production": ProductionConfig,
}
