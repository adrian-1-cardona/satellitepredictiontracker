from functools import lru_cache

from pydantic import Field, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


DEFAULT_SECRET_KEY = "dev-secret-key-change-in-production-min-32-chars"
PLACEHOLDER_SECRET_KEYS = {
    DEFAULT_SECRET_KEY,
    "dev-secret-key-change-before-production-min-32-chars",
    "your-secret-key-here-min-32-chars",
}


class Settings(BaseSettings):
    app_name: str = Field("Satellite Tracker", alias="APP_NAME")
    app_version: str = Field("1.0.0", alias="APP_VERSION")
    environment: str = Field("development", alias="APP_ENVIRONMENT")
    debug: bool = Field(True, alias="APP_DEBUG")
    production: bool = Field(False, alias="APP_PRODUCTION")

    database_url: str = Field(
        "postgresql+psycopg2://tracker:tracker_dev_password@localhost:5432/satellite_tracker",
        alias="DATABASE_URL",
    )
    test_database_url: str = Field("sqlite:///./test_satellite_tracker.db", alias="TEST_DATABASE_URL")
    db_pool_size: int = Field(10, alias="DB_POOL_SIZE")
    db_max_overflow: int = Field(20, alias="DB_MAX_OVERFLOW")

    secret_key: str = Field(DEFAULT_SECRET_KEY, alias="SECRET_KEY")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(15, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(7, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    redis_url: str = Field("redis://localhost:6379", alias="REDIS_URL")
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

    admin_token: str = Field("", alias="ADMIN_TOKEN")  # Required in production for private docs

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if not self.production:
            return self

        if self.debug:
            raise ValueError("APP_DEBUG must be false when APP_PRODUCTION is true")
        if len(self.secret_key) < 32 or self.secret_key in PLACEHOLDER_SECRET_KEYS:
            raise ValueError("SECRET_KEY must be a non-placeholder value of at least 32 characters in production")

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
