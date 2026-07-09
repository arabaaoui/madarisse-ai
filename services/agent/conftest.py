"""
Fixture globale : injecte les variables d'environnement minimales
avant que pydantic-settings instancie Settings() au moment de l'import.
"""
import os

# Ces valeurs doivent être définies AVANT tout import de core.*
os.environ.setdefault("SUPABASE_URL", "https://test.supabase.co")
os.environ.setdefault("SUPABASE_SERVICE_ROLE_KEY", "test-service-role-key")
os.environ.setdefault("SUPABASE_JWT_SECRET", "test-jwt-secret-32-chars-minimum!!")
os.environ.setdefault("AGENT_SERVICE_SECRET", "test-agent-secret")
