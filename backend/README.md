# GaiaMind360 — Backend

## Stack

- **Python 3.11** + FastAPI
- **PostgreSQL** + Redis
- **ChromaDB** — vector semantic memory
- **Docker** + Docker Compose

## Architecture

```
Request
  │
  ▼
Security Middleware (rate limiting, JWT, input validation)
  │
  ▼
Routes (FastAPI routers)
  │
  ▼
CognitiveKernel v3 (Multi-LLM orchestration)
  │
  ├── GPT-4 / Gemini / Groq (LLaMA)
  ├── RAG Engine (ChromaDB + hybrid search)
  ├── Multi-Agent System
  └── Policy Engine (Reinforcement Learning)
  │
  ▼
Data Sources
  ├── World Bank API
  ├── UNEP SDG Database
  ├── Copernicus Sentinel-5P
  └── NASA EONET
```

## Running locally

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
python start.py
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs
