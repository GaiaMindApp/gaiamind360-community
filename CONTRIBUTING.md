# Contributing to GaiaMind360

Thank you for your interest in contributing to GaiaMind360.

This is the **community repository** — it contains the public-facing code and
documentation. The production backend runs on a private repository.

---

## Ways to Contribute

### 🐛 Report Bugs
Open an [Issue](https://github.com/GaiaMindApp/gaiamind360-community/issues) with:
- Steps to reproduce
- Expected vs actual behaviour
- Browser/OS if frontend issue
- API endpoint if backend issue

### 💡 Suggest Features
Open an [Issue](https://github.com/GaiaMindApp/gaiamind360-community/issues) with
the `enhancement` label. Describe the use case and why it matters for environmental
intelligence.

### 📖 Improve Documentation
- Fix typos or unclear explanations in the README
- Add examples to the API reference
- Translate documentation (EN, PT, ES, FR supported)

### 🌍 Data & Research
- Suggest new environmental data sources
- Report inaccurate TSI scores with evidence
- Contribute to the research module knowledge base

---

## Development Setup

### Frontend
```bash
npm install
npm run dev
# Access: http://localhost:3000
```

### Backend
```bash
cd backend
cp .env.example .env   # fill in at least one AI provider key
pip install -r requirements.txt
python start.py
# API: http://localhost:8000
# Docs: http://localhost:8000/docs
```

### Full stack
```bash
docker-compose up --build
```

---

## Pull Request Guidelines

1. Fork the repository
2. Create a branch: `git checkout -b fix/your-description`
3. Make your changes — keep them focused and minimal
4. Test locally before submitting
5. Open a PR with a clear description of what changed and why

---

## Questions?

Open an Issue or reach out via [gaiamind360.com](https://gaiamind360.com).
