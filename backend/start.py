"""
backend/start.py — GaiaMind Backend Startup
Uso: conda activate gaiamind && python start.py
"""

import os
import sys
import logging
from pathlib import Path
from dotenv import load_dotenv

# ── Encoding UTF-8 forçado (Windows) ────────────────────────────────────────
os.environ["PYTHONUTF8"] = "1"

# ── Bloquear catboost (ABI incompativel com numpy 2.x no Windows) ───────────
# catboost 1.2.x foi compilado contra numpy 1.x e crasha com numpy 2.4.x.
# Os modelos catboost (.pkl) nao sao usados no pipeline activo do GaiaMind.
_catboost_dummy = type(sys)('catboost')
_catboost_dummy.CatBoostClassifier = None
_catboost_dummy.CatBoostRegressor  = None
_catboost_dummy.Pool                = None
sys.modules['catboost'] = _catboost_dummy
# ─────────────────────────────────────────────────────────────────────

# ── Telemetria desactivada ────────────────────────────────────────────────────
os.environ["ANONYMIZED_TELEMETRY"] = "False"
os.environ["CHROMA_TELEMETRY"]     = "False"

# ── Carregar .env do backend (onde estão DATABASE_URL, REDIS_URL, etc.) ───────
_backend_dir = Path(__file__).parent
_env_file    = _backend_dir / ".env"
load_dotenv(_env_file, override=False)
_test_env_file = _backend_dir / ".env.test"
if _test_env_file.exists() and (
    os.environ.get("TESTING", "").lower() == "true"
    or os.environ.get("ENVIRONMENT", "").lower() == "test"
):
    load_dotenv(_test_env_file, override=True)

# ── Path ──────────────────────────────────────────────────────────────────────
sys.path.insert(0, str(_backend_dir))

# ── Logging ───────────────────────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(message)s",
    datefmt="%H:%M:%S",
)
logger = logging.getLogger(__name__)

# ─────────────────────────────────────────────────────────────────────────────

def check_env():
    """Verifica variáveis de ambiente críticas."""
    logger.info("🔍 Verificando variáveis de ambiente...")

    db_url = os.getenv("DATABASE_URL", "")
    if "sqlite" in db_url:
        logger.warning("⚠️  DATABASE_URL aponta para SQLite — recomendado PostgreSQL em produção")
    elif "postgresql" in db_url:
        logger.info("✅ DATABASE_URL → PostgreSQL")
    else:
        logger.warning("⚠️  DATABASE_URL não definida — será usado SQLite por defeito")

    redis_url = os.getenv("REDIS_URL", "")
    if redis_url:
        logger.info("✅ REDIS_URL definida → rate limit distribuído activo")
    else:
        logger.warning("⚠️  REDIS_URL não definida → rate limit em memória (apenas dev)")

    # AI provider
    provider = os.getenv("AI_PROVIDER", "groq")
    groq_key  = os.getenv("GROQ_API_KEY", "")
    openai_key = os.getenv("OPENAI_API_KEY", "")
    gemini_key = os.getenv("GEMINI_API_KEY", "")

    if groq_key:
        logger.info("✅ Groq API Key configurada")
    if openai_key:
        logger.info("✅ OpenAI API Key configurada")
    if gemini_key:
        logger.info("✅ Gemini API Key configurada")
    if not any([groq_key, openai_key, gemini_key]):
        logger.warning("⚠️  Nenhuma API Key de LLM configurada — respostas serão mock")

    logger.info(f"   Provider principal: {provider}")
    logger.info(f"   Ambiente: {os.getenv('ENVIRONMENT', 'development')}")
    logger.info(f"   Modo: {os.getenv('MODE', 'production')}")


def check_docker_services():
    """Verifica se PostgreSQL e Redis estão acessíveis."""
    db_url    = os.getenv("DATABASE_URL", "")
    redis_url = os.getenv("REDIS_URL", "")

    # ── PostgreSQL ────────────────────────────────────────────────────────────
    if "postgresql" in db_url:
        logger.info("🐘 Verificando PostgreSQL...")
        try:
            import psycopg2
            conn = psycopg2.connect(db_url, connect_timeout=5)
            conn.close()
            logger.info("✅ PostgreSQL acessível")
        except Exception as e:
            logger.error("❌ PostgreSQL inacessível: %s", e)
            logger.error("   Verifica se o Docker está a correr:")
            logger.error("   docker-compose -f docker-compose.services.yml up -d")
            return False

    # ── Redis ─────────────────────────────────────────────────────────────────
    if redis_url:
        logger.info("🔴 Verificando Redis...")
        try:
            import redis as redis_lib
            r = redis_lib.from_url(redis_url, socket_connect_timeout=3)
            r.ping()
            logger.info("✅ Redis acessível")
        except Exception as e:
            logger.warning("⚠️  Redis inacessível: %s", e)
            logger.warning("   Rate limit vai usar memória local como fallback")
            # Não bloqueia o arranque — o rate_limit.py tem fallback automático

    return True


def check_dependencies():
    """Verifica dependências Python críticas."""
    logger.info("📦 Verificando dependências...")
    critical = [
        ("fastapi",    "FastAPI"),
        ("uvicorn",    "Uvicorn"),
        ("sqlalchemy", "SQLAlchemy"),
        ("jose",       "python-jose (JWT)"),
        ("passlib",    "passlib (bcrypt)"),
    ]
    ok = True
    for module, name in critical:
        try:
            __import__(module)
            logger.info("✅ %s", name)
        except ImportError:
            logger.error("❌ %s não instalado — pip install -r requirements.txt", name)
            ok = False
    return ok


def initialize_database():
    """Cria tabelas se não existirem."""
    logger.info("🗄️  Inicializando base de dados...")
    try:
        from app.database.db import create_tables
        create_tables()
        logger.info("✅ Base de dados pronta")
        return True
    except Exception as e:
        logger.error("❌ Erro na base de dados: %s", e)
        return False


def start_server():
    """Inicia o servidor Uvicorn — com SSL opcional via mkcert."""
    import uvicorn

    port    = int(os.getenv("API_PORT", 8000))
    host    = os.getenv("API_HOST", "0.0.0.0")
    reload  = os.getenv("RELOAD", "false").lower() == "true"
    # Workers: configuravel via API_WORKERS no .env
    # Dev: 1 | Demo/producao: 2 | Servidor dedicado: 4
    # Nota: cada worker carrega TF + sentence-transformers (~800MB RAM)
    # Com tf_keras instalado correctamente o ABI numpy e estavel em multi-worker
    _default_workers = 2 if not reload else 1
    workers = int(os.getenv("API_WORKERS", _default_workers))

    # ── SSL opcional ─────────────────────────────────────────────────────────
    # Activar: define USE_HTTPS=true no .env e coloca os certificados em ssl/
    # Gerar certificados: mkcert localhost 127.0.0.1 ::1
    #                     (mover ficheiros para backend/../ssl/)
    ssl_dir      = _backend_dir.parent / "ssl"
    ssl_certfile = ssl_dir / "localhost.pem"
    ssl_keyfile  = ssl_dir / "localhost-key.pem"
    use_https    = (
        os.getenv("USE_HTTPS", "false").lower() == "true"
        and ssl_certfile.exists()
        and ssl_keyfile.exists()
    )

    protocol = "https" if use_https else "http"
    logger.info("=" * 55)
    logger.info("🚀 GaiaMind API a iniciar")
    logger.info("   Host     : %s", host)
    logger.info("   Porta    : %d", port)
    logger.info("   Protocolo: %s", protocol.upper())
    logger.info("   Reload   : %s", reload)
    logger.info("   Workers  : %d", workers)
    logger.info("   Docs     : %s://localhost:%d/docs", protocol, port)
    if use_https:
        logger.info("   Cert     : %s", ssl_certfile)
    logger.info("=" * 55)

    uvicorn_kwargs = dict(
        host=host,
        port=port,
        reload=reload,
        workers=workers if not reload else None,
        log_level="info",
        timeout_keep_alive=30,
        proxy_headers=False,
        server_header=False,  # Remove "Server: uvicorn" header (security)
    )

    if use_https:
        uvicorn_kwargs["ssl_certfile"] = str(ssl_certfile)
        uvicorn_kwargs["ssl_keyfile"]  = str(ssl_keyfile)

    uvicorn.run("app.main:app", **uvicorn_kwargs)


def main():
    logger.info("=" * 55)
    logger.info("GaiaMind - Inicializacao")
    logger.info("=" * 55)

    # PRIMEIRO: TF antes de qualquer modulo com numpy compilado.
    # Garante que o ABI do numpy fica fixado pelo TF antes de
    # xgboost/sklearn/scipy serem importados pelo uvicorn/app.main.
    os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
    os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")
    import logging as _logging
    _logging.getLogger('tensorflow').setLevel(_logging.ERROR)
    _logging.getLogger('tf_keras').setLevel(_logging.ERROR)
    import sys as _sys
    logger.info("Python: %s", _sys.executable)
    logger.info("tf_keras path check...")
    try:
        import importlib.util as _ilu
        _spec = _ilu.find_spec('tf_keras')
        logger.info("tf_keras encontrado em: %s", _spec.origin if _spec else 'NAO ENCONTRADO')
    except Exception:
        pass
    try:
        import tensorflow as _tf_pre   # noqa: F401
        import tf_keras as _tfk_pre    # noqa: F401
        logger.info("TF pre-carregado (numpy ABI fixado)")
    except ImportError as _e:
        # tf_keras nao instalado neste ambiente -- tentar so tensorflow
        logger.warning("tf_keras nao encontrado: %s -- tentando apenas tensorflow", _e)
        try:
            import tensorflow as _tf_pre   # noqa: F401
            logger.info("TF pre-carregado (sem tf_keras)")
        except Exception as _e2:
            logger.warning("TF nao disponivel: %s", _e2)
    except Exception as _e:
        logger.warning("TF pre-load falhou: %s", _e)

    from app.config import settings
    settings.validate_startup()

    # 1. Variáveis de ambiente
    check_env()

    # 2. Dependências Python
    if not check_dependencies():
        logger.error("Instala as dependências: pip install -r requirements.txt")
        sys.exit(1)

    # 3. Serviços externos (PostgreSQL, Redis)
    if not check_docker_services():
        logger.error("Inicia os serviços Docker antes de continuar:")
        logger.error("  docker-compose -f docker-compose.services.yml up -d")
        sys.exit(1)

    # 4. Base de dados — criar tabelas se não existirem
    if not initialize_database():
        logger.error("Erro crítico na base de dados. Verifica DATABASE_URL.")
        sys.exit(1)

    # 4b. Pre-carregar CognitiveKernel (v3) antes do uvicorn arrancar.
    # CRITICO: TF deve ser importado ANTES do uvicorn carregar app.main.
    # O uvicorn importa app.main que carrega xgboost/sklearn/scipy com numpy 2.x.
    # Se TF for importado depois, o ABI de numpy ja esta 'contaminado'.
    # Forcando a importacao aqui garante que TF regista o numpy correcto primeiro.
    logger.info("Pre-carregando CognitiveKernel v3...")
    try:
        os.environ.setdefault("TF_ENABLE_ONEDNN_OPTS", "0")
        os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")  # suprimir logs TF
        # Passo 1: importar TF primeiro para registar ABI numpy
        import tensorflow as _tf  # noqa: F401
        import tf_keras as _tfk   # noqa: F401
        # Passo 2: agora instanciar o CK com TF ja no sys.modules
        from app.services.cognitive_kernel import get_cognitive_kernel
        get_cognitive_kernel()
        logger.info("CognitiveKernel v3 pronto (TF pre-carregado)")
    except Exception as e:
        logger.warning("CognitiveKernel nao disponivel: %s", e)
        logger.warning("   O sistema continua com fallback LLM directo.")

    # 5. Servidor
    start_server()


if __name__ == "__main__":
    main()
