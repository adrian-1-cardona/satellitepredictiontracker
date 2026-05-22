from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_SECRET_KEY = "dev-secret-key-change-in-production-min-32-chars"
DEFAULT_DATABASE_URL = "postgresql+psycopg2://tracker:tracker_dev_password@localhost:5432/satellite_tracker"
DEFAULT_REDIS_URL = "redis://localhost:6379"
PLACEHOLDER_SECRET_KEYS = {
    DEFAULT_SECRET_KEY,
    "dev-secret-key-change-before-production-min-32-chars",
    "your-secret-key-here-min-32-chars",
}
PLACEHOLDER_ADMIN_TOKENS = {
    "",
    "admin",
    "change-me",
    "dev-admin-token",
    "dev-admin-token-change-in-production",
    "your-admin-token-here",
}
PLACEHOLDER_DB_PASSWORDS = {
    "",
    "tracker_dev_password",
    "password",
    "postgres",
    "change-me",
}


class Settings(BaseSettings):
    app_name: str = Field("Satellite Tracker", alias="APP_NAME")
    app_version: str = Field("1.0.0", alias="APP_VERSION")
    environment: str = Field("development", alias="APP_ENVIRONMENT")
    debug: bool = Field(True, alias="APP_DEBUG")
    production: bool = Field(False, alias="APP_PRODUCTION")

    database_url: str = Field(DEFAULT_DATABASE_URL, alias="DATABASE_URL")
    test_database_url: str = Field("sqlite:///./test_satellite_tracker.db", alias="TEST_DATABASE_URL")
    db_password: str = Field("", alias="DB_PASSWORD")
    db_pool_size: int = Field(20, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(40, alias="DB_MAX_OVERFLOW")
    db_connect_timeout: int = Field(10, alias="DB_CONNECT_TIMEOUT")
    db_pool_recycle: int = Field(3600, alias="DB_POOL_RECYCLE")

    secret_key: str = Field(DEFAULT_SECRET_KEY, alias="SECRET_KEY")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(15, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(7, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    redis_url: str = Field(DEFAULT_REDIS_URL, alias="REDIS_URL")
    celery_broker_url: str | None = Field(None, alias="CELERY_BROKER_URL")
    celery_result_backend: str | None = Field(None, alias="CELERY_RESULT_BACKEND")

    allowed_origins: str = Field("http://localhost:3000,http://localhost:8000", alias="ALLOWED_ORIGINS")
    log_level: str = Field("INFO", alias="LOG_LEVEL")
    log_format: str = Field("json", alias="LOG_FORMAT")

    rate_limit_requests: int = Field(100, alias="RATE_LIMIT_REQUESTS")
    rate_limit_window: int = Field(60, alias="RATE_LIMIT_WINDOW")

    tle_url: str = Field("https://celestrak.org/NORAD/elements/stations.txt", alias="TLE_URL")
    tle_cache_path: str = Field("data/stations.tle", alias="TLE_CACHE_PATH")
    prediction_days: int = Field(12, alias="PREDICTION_DAYS")
    min_pass_elevation: float = Field(10.0, alias="MIN_PASS_ELEVATION")

    admin_token: str = Field("", alias="ADMIN_TOKEN")
    force_https: bool = Field(False, alias="FORCE_HTTPS")
    request_body_max_bytes: int = Field(10 * 1024 * 1024, alias="REQUEST_BODY_MAX_BYTES")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if not self.production:
            return self

        if self.debug:
            raise ValueError("APP_DEBUG must be false when APP_PRODUCTION is true")
        if len(self.secret_key) < 32 or self.secret_key in PLACEHOLDER_SECRET_KEYS:
            raise ValueError("SECRET_KEY must be a non-placeholder value of at least 32 characters in production")
        if len(self.admin_token) < 24 or self.admin_token in PLACEHOLDER_ADMIN_TOKENS:
            raise ValueError("ADMIN_TOKEN must be configured with a non-placeholder value in production")
        if self.db_password in PLACEHOLDER_DB_PASSWORDS:
            raise ValueError("DB_PASSWORD must be configured with a non-placeholder value in production")
        if self.database_url == DEFAULT_DATABASE_URL or "tracker_dev_password" in self.database_url:
            raise ValueError("DATABASE_URL must not use development credentials in production")
        if self.redis_url == DEFAULT_REDIS_URL:
            raise ValueError("REDIS_URL must point at the production Redis service")

        return self

    @property
    def cors_origins(self) -> list[str]:
        return [origin.strip() for origin in self.allowed_origins.split(",") if origin.strip()]

    @property
    def broker_url(self) -> str:
        return self.celery_broker_url or f"{self.redis_url}/0"

    @property
    def result_backend(self) -> str:
        return self.celery_result_backend or f"{self.redis_url}/1"



@lru_cache
def get_settings() -> Settings:
    return Settings()
