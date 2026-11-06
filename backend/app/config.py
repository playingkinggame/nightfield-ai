"""Central configuration. All secrets come from environment variables / .env and never leave the server."""
import logging
import os
import secrets
from dataclasses import dataclass, field

from dotenv import load_dotenv

load_dotenv()
log = logging.getLogger(__name__)


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


def _bool(name: str, default: bool = False) -> bool:
    return _env(name, str(default)).lower() in ("1", "true", "yes", "on")


def _jwt_secret() -> str:
    s = _env("JWT_SECRET")
    if not s:
        log.warning("JWT_SECRET is not set - using an ephemeral secret (tokens die on restart).")
        s = secrets.token_urlsafe(48)
    return s


@dataclass(frozen=True)
class Settings:
    groq_api_key: str = field(default_factory=lambda: _env("GROQ_API_KEY"))
    groq_model: str = field(default_factory=lambda: _env("GROQ_MODEL", "llama-3.3-70b-versatile"))
    gemini_api_key: str = field(default_factory=lambda: _env("GEMINI_API_KEY"))
    gemini_model: str = field(default_factory=lambda: _env("GEMINI_MODEL", "gemini-2.5-flash"))
    tavily_api_key: str = field(default_factory=lambda: _env("TAVILY_API_KEY"))
    serpapi_key: str = field(default_factory=lambda: _env("SERPAPI_KEY"))
    jwt_secret: str = field(default_factory=_jwt_secret)
    jwt_days: int = 7
    database_url: str = field(default_factory=lambda: _env("DATABASE_URL", "sqlite:///./nightfield.db"))
    frontend_origin: str = field(default_factory=lambda: _env("FRONTEND_ORIGIN", "http://localhost:3000"))
    redis_url: str = field(default_factory=lambda: _env("REDIS_URL"))
    use_groq_sentiment: bool = field(default_factory=lambda: _bool("USE_GROQ_SENTIMENT"))
    chat_rate_limit: int = field(default_factory=lambda: int(_env("CHAT_RATE_LIMIT_PER_MIN", "20")))
    trust_proxy: bool = field(default_factory=lambda: _bool("TRUST_PROXY"))
    log_level: str = field(default_factory=lambda: _env("LOG_LEVEL", "INFO"))
    http_timeout: float = 8.0
    http_retries: int = 2
    sse_heartbeat_seconds: float = 15.0
    starting_cash: float = 1_000_000.0

    @property
    def cors_origins(self) -> list[str]:
        configured = [o.strip().rstrip("/") for o in self.frontend_origin.split(",")]
        defaults = ["http://localhost:3000", "http://127.0.0.1:3000", "http://localhost:5173", "http://127.0.0.1:5173"]
        return list(dict.fromkeys(o for o in configured + defaults if o))


settings = Settings()
