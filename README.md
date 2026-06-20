<div align="center">

<img src="public/og-image.png" alt="GaiaMind360" width="100%" style="border-radius:12px" />

# GaiaMind360

**Environmental AI Platform — Real-Time Planetary Intelligence**

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python)](backend/requirements.txt)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](package.json)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.111-009688?logo=fastapi)](backend/requirements.txt)
[![CesiumJS](https://img.shields.io/badge/CesiumJS-1.123-blue)](https://cesium.com)
[![Build](https://img.shields.io/badge/build-passing-brightgreen)](.github/workflows/ci.yml)
[![Countries](https://img.shields.io/badge/countries-195-orange)]()
[![Languages](https://img.shields.io/badge/i18n-EN%20%7C%20PT%20%7C%20ES%20%7C%20FR-blueviolet)]()

[**Live Demo**](https://gaiamind360.com) · [**API Docs**](https://gaiamind360.com/docs) · [**Manifesto**](https://gaiamind360.com/manifesto) · [**Research**](https://gaiamind360.com/research)

> Master's thesis project — Universidad Europea · Diatezilua Katendi Nzita

</div>

---

## What is GaiaMind360?

GaiaMind360 is an open-source environmental AI platform that makes planetary intelligence accessible to researchers, policy makers, educators, and citizens. It combines large language models, real-time satellite data, and reinforcement learning into a single, coherent interface.

**Gaia** — the AI assistant at the core — answers questions about climate, biodiversity, emissions, and sustainability using live data from World Bank, UNEP, NASA, and Copernicus Sentinel.

---

## Key Features

| Feature | Description |
|---|---|
| 🌍 **Digital Twin Earth** | Real-time 3D globe (CesiumJS) with CO₂, temperature anomaly, deforestation and ocean health overlays |
| 🤖 **AI Chat (Gaia)** | Multi-LLM environmental assistant (GPT-4, Gemini, Groq/LLaMA) with Zero-PII architecture |
| 📊 **Predictive Analytics** | Climate scenario forecasting to 2100 using scikit-learn and Stable-Baselines3 |
| 🏛️ **Policy Simulator** | Reinforcement learning engine to simulate environmental impact of policy decisions |
| 🔬 **Research Module** | AI-assisted synthesis with citation-aware environmental research |
| 🌐 **195 Countries** | Real data from World Bank API, UNEP SDG, Copernicus Sentinel-5P, NASA EONET |
| 🕐 **Time Machine** | Historical (1950–present) and projected (present–2100) environmental data playback |
| 🔒 **Zero-PII** | Opaque UUID routing — no personal data passed to any LLM |

---

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                        Frontend (React)                      │
│  Home · Chat · Map · Insights · Research · Manifesto · API  │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS / WebSocket
┌──────────────────────────▼──────────────────────────────────┐
│                    Backend (FastAPI)                          │
│                                                              │
│  ┌─────────────────┐  ┌──────────────┐  ┌────────────────┐  │
│  │ CognitiveKernel │  │ PolicyEngine │  │  DigitalTwin   │  │
│  │      v3         │  │   (RL/ML)    │  │   Service      │  │
│  └────────┬────────┘  └──────────────┘  └────────────────┘  │
│           │                                                  │
│  ┌────────▼────────────────────────────────────────────┐    │
│  │              Multi-LLM Orchestrator                  │    │
│  │  GPT-4 · Gemini · Groq (LLaMA) · Local fallback    │    │
│  └─────────────────────────────────────────────────────┘    │
└──────────────────────────┬──────────────────────────────────┘
                           │
┌──────────────────────────▼──────────────────────────────────┐
│                     External Data APIs                       │
│  World Bank · UNEP SDG · Copernicus Sentinel · NASA EONET   │
│  Open-Meteo · Tavily Search · OpenStreetMap                 │
└─────────────────────────────────────────────────────────────┘
```

---

## Tech Stack

### Frontend
- **React 18** + TypeScript + Vite
- **CesiumJS 1.123** — 3D Digital Twin Earth
- **Leaflet** + react-leaflet — 2D interactive map
- Tailwind CSS + Framer Motion
- i18next — EN, PT, ES, FR

### Backend
- **FastAPI** + Python 3.11
- **PostgreSQL** + Redis
- **ChromaDB** — vector semantic memory
- Docker + Docker Compose

### AI / ML
- OpenAI GPT-4, Google Gemini, Groq (LLaMA 3)
- scikit-learn, CatBoost — climate predictions
- Stable-Baselines3 — policy simulation (RL)
- SHAP — model explainability

### Data Sources
- [World Bank Open Data API](https://data.worldbank.org)
- [UNEP SDG Database](https://unstats.un.org/sdgs)
- [Copernicus Sentinel-5P](https://sentinel.esa.int)
- [NASA EONET](https://eonet.gsfc.nasa.gov)
- [Open-Meteo](https://open-meteo.com)

---

## Getting Started

### Prerequisites
- Node.js 22+
- Python 3.11+
- Docker + Docker Compose

### Frontend

```bash
npm install
npm run dev
```

Access: http://localhost:3000

### Backend

```bash
cd backend
cp .env.example .env
pip install -r requirements.txt
python start.py
```

API: http://localhost:8000  
Docs: http://localhost:8000/docs

### Full stack with Docker

```bash
docker-compose up --build
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```env
# AI Providers (at least one required)
OPENAI_API_KEY=
GOOGLE_API_KEY=
GROQ_API_KEY=

# Database
DATABASE_URL=postgresql://user:password@localhost:5433/gaiamind

# Auth
JWT_SECRET_KEY=

# Cesium Ion (for Digital Twin terrain)
VITE_CESIUM_ION_TOKEN=
```

---

## API Reference

Base URL: `https://gaiamind360.com/api/v1`

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/chat` | AI chat with Gaia |
| `GET` | `/global-data/worldbank/{country}` | World Bank indicators |
| `GET` | `/global-data/unep/sdg/{goal}` | UN SDG data |
| `GET` | `/global-data/country/{country}` | Full environmental profile |
| `GET` | `/digital-twin/layers/sustainability` | TSI GeoJSON (195 countries) |
| `GET` | `/health` | System health check |

Full interactive docs at `/docs` (Swagger UI).

---

## Terra Sustainability Index (TSI)

The TSI is a composite score (0–100) computed per country from:

- CO₂ emissions per capita (World Bank)
- Renewable energy share (World Bank)
- Forest area percentage (World Bank)
- Biodiversity protection index
- SDG progress score (UNEP)

A score of 100 = maximum sustainability. Displayed as a choropleth layer on the Digital Twin Earth.

---

## Project Structure

```
gaiamind360/
├── src/                        # React frontend
│   ├── components/             # UI components
│   ├── features/digital-twin/  # CesiumJS Digital Twin Earth
│   ├── services/               # API clients & AI orchestration
│   ├── hooks/                  # React hooks
│   └── locales/                # i18n (en, pt, es, fr)
├── backend/
│   ├── app/
│   │   ├── routes/             # FastAPI endpoints
│   │   ├── models/             # Data schemas
│   │   ├── config.py           # Configuration management
│   │   └── main.py             # Application entry point
│   ├── Dockerfile
│   └── requirements.txt
├── public/
│   ├── robots.txt
│   ├── sitemap.xml
│   └── llms.txt
├── nginx/
└── docker-compose.yml
```

---

## Academic Context

GaiaMind360 is the practical implementation of a Master's thesis in Technology and Digital Innovation at **Universidad Europea**. The platform operationalises the research on AI-assisted environmental decision-making and the concept of **planetary digital twins** for policy analysis.

---

## Roadmap

- [ ] Mobile app (React Native)
- [ ] HuggingFace model card + dataset
- [ ] Public API with rate limiting & API keys
- [ ] Webhook integrations (Slack, Teams, email alerts)
- [ ] Offline mode for low-connectivity regions

---

## Contributing

Contributions, issues, and feature requests are welcome.  
Please read the contributing guidelines before submitting a pull request.

---

## License

MIT License — see [LICENSE](LICENSE) for details.

---

## Acknowledgements

- [Cesium](https://cesium.com) — 3D geospatial platform
- [World Bank Open Data](https://data.worldbank.org) — economic & environmental indicators
- [UNEP](https://www.unep.org) — SDG data
- [NASA](https://nasa.gov) — Earth observation data
- [OpenStreetMap](https://openstreetmap.org) contributors

---

<div align="center">

**Built with 🌍 by [Diatezilua Katendi Nzita](https://github.com/GaiaMindApp)**  
Universidad Europea · Master's in Technology and Digital Innovation

[gaiamind360.com](https://gaiamind360.com)

</div>
