"""
GaiaMind360 — Backend Startup
"""
import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

os.environ["PYTHONUTF8"] = "1"
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"] = "False"

_backend_dir = Path(__file__).parent
load_dotenv(_backend_dir / ".env", override=False)

sys.path.insert(0, str(_backend_dir))

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)


def check_dependencies():
    critical = [
        ("fastapi",    "FastAPI"),
        ("uvicorn",    "Uvicorn"),
        ("sqlalchemy", "SQLAlchemy"),
        ("jose",       "python-jose"),
        ("passlib",    "passlib"),
    ]
    ok = True
    for module, name in critical:
        try:
            __import__(module)
        except ImportError:
            logger.error("❌ %s not installed — pip install -r requirements.txt", name)
            ok = False
    return ok


def start_server():
    import uvicorn

    port    = int(os.getenv("API_PORT", 8000))
    host    = os.getenv("API_HOST", "0.0.0.0")
    reload  = os.getenv("RELOAD", "false").lower() == "true"
    workers = int(os.getenv("API_WORKERS", 2 if not reload else 1))

    logger.info("=" * 50)
    logger.info("🚀 GaiaMind360 API starting")
    logger.info("   Host   : %s", host)
    logger.info("   Port   : %d", port)
    logger.info("   Docs   : http://localhost:%d/docs", port)
    logger.info("=" * 50)

    uvicorn.run(
        "app.main:app",
        host=host,
        port=port,
        reload=reload,
        workers=workers if not reload else None,
        log_level="info",
        server_header=False,
    )


def main():
    if not check_dependencies():
        sys.exit(1)

    from app.config import settings
    settings.validate_startup()

    start_server()


if __name__ == "__main__":
    main()
