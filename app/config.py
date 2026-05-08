from functools import lru_cache

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    app_name: str = Field("Satellite Tracker", alias="APP_NAME")
    app_version: str = Field("1.0.0", alias="APP_VERSION")
    environment: str = Field("development", alias="APP_ENVIRONMENT")
    debug: bool = Field(True, alias="APP_DEBUG")

    database_url: str = Field(
        "postgresql+psycopg2://tracker:tracker_dev_password@localhost:5432/satellite_tracker",
        alias="DATABASE_URL",
    )
    test_database_url: str = Field("sqlite:///./test_satellite_tracker.db", alias="TEST_DATABASE_URL")

    secret_key: str = Field("dev-secret-key-change-in-production-min-32-chars", alias="SECRET_KEY")
    jwt_algorithm: str = Field("HS256", alias="JWT_ALGORITHM")
    access_token_expire_minutes: int = Field(15, alias="ACCESS_TOKEN_EXPIRE_MINUTES")
    refresh_token_expire_days: int = Field(7, alias="REFRESH_TOKEN_EXPIRE_DAYS")

    redis_url: str = Field("redis://localhost:6379", alias="REDIS_URL")
    celery_broker_url: str | None = Field(None, alias="CELERY_BROKER_URL")
    celery_result_backend: str | None = Field(None, alias="CELERY_RESULT_BACKEND")

    allowed_origins: str = Field("http://localhost:3000,http://localhost:8000", alias="ALLOWED_ORIGINS")
    log_level: str = Field("INFO", alias="LOG_LEVEL")

    tle_url: str = Field("https://celestrak.org/NORAD/elements/stations.txt", alias="TLE_URL")
    tle_cache_path: str = Field("data/stations.tle", alias="TLE_CACHE_PATH")
    prediction_days: int = Field(12, alias="PREDICTION_DAYS")
    min_pass_elevation: float = Field(10.0, alias="MIN_PASS_ELEVATION")

    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

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
