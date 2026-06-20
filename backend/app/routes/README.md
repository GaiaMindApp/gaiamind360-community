# GaiaMind360 — API Reference

## Endpoints

| Method | Endpoint | Description | Auth |
|--------|----------|-------------|------|
| `POST` | `/api/v1/chat` | AI chat with Gaia | Bearer |
| `GET` | `/api/global-data/worldbank/{country}` | World Bank indicators | Public |
| `GET` | `/api/global-data/unep/sdg/{goal}` | UN SDG data | Public |
| `GET` | `/api/global-data/country/{country}` | Full environmental profile | Public |
| `GET` | `/api/v1/digital-twin/layers/sustainability` | TSI GeoJSON (195 countries) | Public |
| `POST` | `/api/v1/policy-engine/simulate` | Policy simulation | Bearer |
| `GET` | `/health` | Health check | Public |

Full interactive docs: [gaiamind360.com/docs](https://gaiamind360.com/docs)
