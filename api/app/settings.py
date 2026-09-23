"""Configuration, read from the environment (or `api/.env`, which is not tracked)."""

from functools import lru_cache
from zoneinfo import ZoneInfo

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql+psycopg://inspection:inspection@localhost:55432/inspection"
    # The zone the users are in. `inspectedAt` has no zone (DESIGN §1.1), so "not in the
    # future" is only meaningful against a clock read in this zone (DESIGN §7.8).
    app_time_zone: str = "Asia/Tokyo"

    @property
    def zone(self) -> ZoneInfo:
        return ZoneInfo(self.app_time_zone)


@lru_cache
def get_settings() -> Settings:
    return Settings()
