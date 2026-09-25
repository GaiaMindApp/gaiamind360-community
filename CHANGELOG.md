# Changelog

All notable changes to GaiaMind360 are documented here.
Format follows [Keep a Changelog](https://keepachangelog.com/en/1.0.0/).

---

## [1.1.0] — 2026-09-25

### Added
- `llms-full.txt` — comprehensive LLM-readable reference with full architecture,
  API docs, TSI methodology, example queries and academic context
- `CITATION.cff` — standard academic citation file for GitHub, Zenodo and Google Scholar
- `CHANGELOG.md` — project activity log
- `CONTRIBUTING.md` — contribution guide for the community repository

### Fixed
- Global Map AI explanation text truncation bug in `_post_process`
- Global Map paragraph rendering — ReactMarkdown container CSS
- Railway deploy crash — SQLAlchemy 2.1 psycopg driver resolution
- GeoIP Redis cache — fallback responses no longer cached with 30-day TTL

---

## [1.0.0] — 2026-06-25

### Added
- **Gaia AI Assistant** — multi-LLM environmental chat (Groq LLaMA 3, Gemini,
  OpenAI GPT-4) with Zero-PII UUID routing and 4-language support (EN, PT, ES, FR)
- **Digital Twin Earth** — real-time 3D globe (CesiumJS 1.123) with CO₂,
  temperature anomaly, deforestation and ocean health overlays
- **Terra Sustainability Index (TSI)** — composite environmental score (0–100)
  for 195 countries from World Bank, UNEP SDG, and biodiversity data
- **Predictive Analytics** — climate scenario forecasting to 2100 (scikit-learn,
  CatBoost) with SHAP explainability
- **Policy Simulator** — reinforcement learning engine (Stable-Baselines3) for
  carbon tax, renewable mandates and reforestation impact simulation
- **Research Module** — AI-assisted environmental research with citation-aware
  synthesis (RAG: 836 chunks, 323 documents, sentence-transformers 384 dims)
- **Time Machine** — historical (1950–present) and projected (present–2100)
  environmental data playback
- **195 Countries** — real data from World Bank API, UNEP SDG, Copernicus
  Sentinel-5P, NASA EONET, Open-Meteo
- **i18n** — full interface in English, Portuguese, Spanish, French
- **CognitiveKernel v3** — multi-LLM orchestration with circuit breaker,
  retry with exponential backoff, and graceful degradation
- **Enterprise Auth** — JWT + MFA + OAuth (Google, GitHub) + Zero-PII architecture

---

## Links

- [Live Platform](https://gaiamind360.com)
- [API Documentation](https://gaiamind360.com/docs)
- [Research](https://gaiamind360.com/research)
