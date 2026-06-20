"""
GaiaMind Configuration Management
Environment-based settings for production and research modes
"""

from pydantic_settings import BaseSettings
from typing import Literal
import os
import logging
from sqlalchemy.engine.url import make_url

logger = logging.getLogger(__name__)


class Settings(BaseSettings):
    """Application settings with environment-based configuration"""
    
    # Deployment mode
    MODE: Literal["production", "research", "development"] = os.getenv("MODE", "production")
    ENABLE_LOCAL_ML: bool = os.getenv("ENABLE_LOCAL_ML", "false").lower() == "true"
    
    # Web API
    API_HOST: str = os.getenv("API_HOST", "0.0.0.0")
    API_PORT: int = int(os.getenv("API_PORT", "8000"))
    API_WORKERS: int = int(os.getenv("API_WORKERS", "4"))
    DEBUG: bool = MODE == "research"
    
    # AI Providers
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    GROQ_API_KEY: str = os.getenv("GROQ_API_KEY", "")
    OPENROUTER_API_KEY: str = os.getenv("OPENROUTER_API_KEY", "")
    GEMINI_API_KEY: str = os.getenv("GEMINI_API_KEY", "")
    HUGGINGFACE_API_KEY: str = os.getenv("HUGGINGFACE_API_KEY", "")
    
    # Model settings
    OPENAI_MODEL: str = os.getenv("OPENAI_MODEL", "gpt-4")
    GROQ_MODEL: str = os.getenv("GROQ_MODEL", "llama-3.3-70b-versatile")
    OPENROUTER_MODEL: str = os.getenv("OPENROUTER_MODEL", "openai/gpt-4")
    TEMPERATURE: float = float(os.getenv("TEMPERATURE", "0.7"))
    MAX_TOKENS: int = int(os.getenv("MAX_TOKENS", "2000"))
    
    # Provider priority
    AI_PROVIDER: str = os.getenv("AI_PROVIDER", "groq")
    
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "sqlite:///./gaiamind.db" if MODE in ("research", "development") else ""
    )
    REDIS_URL: str = os.getenv("REDIS_URL", "")

    # ML Service
    ML_SERVICE_URL: str = os.getenv("ML_SERVICE_URL", "http://localhost:8001")
    ML_SERVICE_TIMEOUT: int = int(os.getenv("ML_SERVICE_TIMEOUT", "30"))
    
    # Logging
    LOG_LEVEL: str = os.getenv("LOG_LEVEL", "DEBUG" if MODE == "research" else "INFO")
    
    # Features
    ENABLE_RAG: bool = os.getenv("ENABLE_RAG", "false").lower() == "true"
    ENABLE_FEEDBACK: bool = os.getenv("ENABLE_FEEDBACK", "true").lower() == "true"
    ENABLE_MEMORY: bool = os.getenv("ENABLE_MEMORY", "true").lower() == "true"
    
    # Legacy Pipeline (DEPRECATED - Removido em favor do Cognitive Kernel v3)
    ENABLE_LEGACY_PIPELINE: bool = False  # Permanentemente desativado

    # External Data APIs
    OPENAQ_API_KEY: str = os.getenv("OPENAQ_API_KEY", "")
    GFW_API_KEY: str = os.getenv("GFW_API_KEY", "")

    # News APIs (free tier)
    GUARDIAN_API_KEY: str = os.getenv("GUARDIAN_API_KEY", "")
    FREENEWSAPI_KEY: str = os.getenv("FREENEWSAPI_KEY", "")
    NEWSDATA_API_KEY: str = os.getenv("NEWSDATA_API_KEY", "")
    GNEWS_API_KEY: str = os.getenv("GNEWS_API_KEY", "")
    NEWSAPI_KEY: str = os.getenv("NEWSAPI_KEY", "")

    # Hugging Face (authenticated downloads, higher rate limits)
    HF_TOKEN: str = os.getenv("HF_TOKEN", "")

    # JWT
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "")
    JWT_ALGORITHM: str = "HS256"
    JWT_EXPIRATION_HOURS: int = int(os.getenv("JWT_EXPIRATION_HOURS", "24"))
    JWT_REFRESH_HOURS: int = int(os.getenv("JWT_REFRESH_HOURS", "168"))  # 7 dias
    # JWT hardening — audience + issuer validados em cada decode
    JWT_AUDIENCE: str = os.getenv("JWT_AUDIENCE", "gaiamind")
    JWT_ISSUER: str = os.getenv("JWT_ISSUER", "gaiamind-auth")

    # Brevo SMTP (email OTP)
    BREVO_SMTP_HOST: str = os.getenv("BREVO_SMTP_HOST", "smtp-relay.brevo.com")
    BREVO_SMTP_PORT: int = int(os.getenv("BREVO_SMTP_PORT", "587"))
    BREVO_SMTP_USER: str = os.getenv("BREVO_SMTP_USER", "")
    BREVO_SMTP_KEY: str = os.getenv("BREVO_SMTP_KEY", "")
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "noreply@gaiamind.app")

    # OAuth Social Login
    GOOGLE_CLIENT_ID: str = os.getenv("GOOGLE_CLIENT_ID", "")
    GOOGLE_CLIENT_SECRET: str = os.getenv("GOOGLE_CLIENT_SECRET", "")
    GITHUB_CLIENT_ID: str = os.getenv("GITHUB_CLIENT_ID", "")
    GITHUB_CLIENT_SECRET: str = os.getenv("GITHUB_CLIENT_SECRET", "")
    OAUTH_REDIRECT_BASE: str = os.getenv("OAUTH_REDIRECT_BASE", "http://localhost:3000")
    OAUTH_BACKEND_BASE: str = os.getenv("OAUTH_BACKEND_BASE", "http://localhost:8000")

    class Config:
        env_file = ".env"
        case_sensitive = True
        extra = "ignore"
    
    def validate_startup(self) -> None:
        """Validate configuration at startup"""
        is_prod = self.MODE == "production"

        # Segredos obrigatórios em produção
        if is_prod:
            _WEAK = {"change-me-in-production", "secret", "changeme", ""}
            if not self.JWT_SECRET_KEY or self.JWT_SECRET_KEY in _WEAK or len(self.JWT_SECRET_KEY) < 32:
                raise ValueError(
                    "JWT_SECRET_KEY não definida ou fraca em produção. "
                    "Gera com: openssl rand -hex 32"
                )
            if not self.DATABASE_URL or "user:pass" in self.DATABASE_URL:
                raise ValueError(
                    "DATABASE_URL não definida ou contém credenciais placeholder em produção."
                )
            if "sqlite" in self.DATABASE_URL:
                raise ValueError(
                    "DATABASE_URL em produção não pode usar SQLite. Use PostgreSQL seguro."
                )
            weak_password_markers = {"gaiamind2026", "password", "pass", "admin", "1234", "changeme", "secret"}
            if any(marker in self.DATABASE_URL.lower() for marker in weak_password_markers):
                raise ValueError(
                    "DATABASE_URL contém credenciais fracas ou padrão em produção. "
                    "Use uma senha forte e única."
                )
            try:
                url = make_url(self.DATABASE_URL)
                if url.drivername and url.drivername.startswith("postgresql"):
                    host = url.host or ""
                    if host not in ("localhost", "127.0.0.1", "::1"):
                        sslmode = (url.query or {}).get("sslmode", "").lower()
                        if not sslmode:
                            logger.warning(
                                "⚠️ PostgreSQL em produção sem sslmode configurado. "
                                "Considere sslmode=require para conexões remotas."
                            )
            except Exception as e:
                raise ValueError(
                    f"DATABASE_URL inválida ou insegura em produção: {e}"
                )

        available = []
        if self.OPENAI_API_KEY:
            available.append("OpenAI")
        if self.GROQ_API_KEY:
            available.append("Groq")
        if self.OPENROUTER_API_KEY:
            available.append("OpenRouter")
        if self.GEMINI_API_KEY:
            available.append("Gemini")
        if self.HUGGINGFACE_API_KEY:
            available.append("HuggingFace")
        
        if available:
            logger.info(f"✅ AI providers: {', '.join(available)}")
        else:
            logger.warning("⚠️  No AI provider. Using mock responses.")
        
        logger.info(f"✅ Configuration validated (mode={self.MODE})")

        # Export HF_TOKEN to os.environ for huggingface_hub/sentence-transformers
        if self.HF_TOKEN:
            os.environ["HF_TOKEN"] = self.HF_TOKEN


settings = Settings()

try:
    settings.validate_startup()
except ValueError as e:
    logger.error(f"❌ Configuration error: {e}")
    raise
