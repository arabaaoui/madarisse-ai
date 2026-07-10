from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    supabase_url: str
    supabase_service_role_key: str
    mcp_api_key: str = "dev-mcp-key"

    class Config:
        env_file = ".env"


settings = Settings()
