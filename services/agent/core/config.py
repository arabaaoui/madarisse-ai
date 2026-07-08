"""Application settings — loaded from environment variables."""

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8")

    # Supabase
    SUPABASE_URL: str
    SUPABASE_SERVICE_ROLE_KEY: str  # pour les tâches système uniquement
    SUPABASE_JWT_SECRET: str        # pour valider les JWT utilisateurs

    # Internal auth (Next.js BFF → agent)
    AGENT_SERVICE_SECRET: str

    # LiteLLM
    LITELLM_API_BASE: str = "http://localhost:4000"

    # App
    WEB_APP_URL: str = "http://localhost:3000"
    DEBUG: bool = False

    # LLM defaults
    FAST_MODEL: str = "fast"    # alias LiteLLM
    STRONG_MODEL: str = "strong"  # alias LiteLLM


settings = Settings()
