# NIGHTFIELD

AI-powered stock and index fund research platform where markets bloom like a living night garden.

## Tech Stack
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (`dark` class enabled by default)
- **3D & WebGL**: Three.js (procedural custom ShaderMaterial petal bloom garden & Catmull-Rom spline camera)
- **3D Spatial Tunnel**: Framer Motion 3D perspective corridor
- **Financial Charting**: TradingView `lightweight-charts` (Candlesticks, Line, SMA, Volume, multi-symbol compare)
- **Routing**: `react-router-dom`
- **Audio**: Web Audio API (procedural generative harmonic pad with low-pass hover filter, zero external sound files, starts muted)

## Setup & Running

Two processes: the FastAPI backend (port 8000) and the Vite frontend (port 3000).

```bash
# 1. Backend
cd backend
python -m venv .venv && source .venv/bin/activate      # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env        # then fill in GROQ_API_KEY and/or GEMINI_API_KEY, and set a long random JWT_SECRET
uvicorn app.main:app --reload --port 8000

# 2. Frontend (new terminal, project root)
npm install
cp .env.example .env        # VITE_USE_MOCK="false", VITE_API_URL="http://localhost:8000"
npm run dev                 # http://localhost:3000
```

Run the backend tests with `cd backend && pytest -q` (all network calls are mocked).

## Environment Variables

Frontend (`.env`):
- `VITE_USE_MOCK`: `"false"` (default) uses the live FastAPI backend. `"true"` runs an offline demo with sample data.
- `VITE_API_URL`: backend base URL (default `http://localhost:8000`).

Backend (`backend/.env`): see `backend/.env.example` (LLM keys, `JWT_SECRET`, `DATABASE_URL`, `FRONTEND_ORIGIN`).
**Never commit `.env` files** - they hold API keys.

## How the data flows (frontend <-> backend)

| UI | Backend endpoint(s) | Notes |
|---|---|---|
| Header index strip | `GET /api/market/indices` | polled every 15s, Nifty 50 / Sensex / Bank Nifty / Nifty IT |
| Search (Cmd+K) | `GET /api/search` | stocks + mutual funds |
| Watchlist | `GET/POST/DELETE /api/watchlist`, `GET /api/market/popular` | guests see popular stocks |
| Stock page | `/api/stocks/{sym}/quote,history,news,indicators,signal`, `/api/compare` | + `WS /ws/prices` live ticks |
| Virtual Trade | `POST /api/portfolio/trade` | needs sign-in |
| Paper Portfolio | `GET /api/portfolio`, `/api/portfolio/summary`, `POST /api/portfolio/reset` | needs sign-in |
| Funds | `GET /api/funds`, `GET /api/funds/{code}/nav` | NAV/CAGR live from mfapi.in |
| Auth | `POST /api/auth/signup`, `/login`, `GET /api/auth/me` | JWT in localStorage |
| AI chat | `POST /api/chat` (SSE) | sends recent history; streams tool calls + citations |

**Real-time caveat:** market data comes from Yahoo Finance via `yfinance`. NSE/BSE quotes are ~15 minutes delayed and cached
for 15-30 seconds, so this is *near*-real-time, not tick-level. The UI labels this everywhere.

## Architecture

- **`src/components/valley/`**: WebGL Data Valley featuring 7,500 procedural blooming flower sprites, mouse screen-space repulsion, ~40 hero ticker anchors, and cream-on-dark interface layer with magnetic CTA.
- **`src/components/tunnel/`**: 3D spatial tunnel with 12 live stock and index fund cards, golden-angle placement, and real SVG sparklines.
- **`src/components/landing/`**: Auto-playing AI research demo with animated tool call chips, three feature panels, and statutory disclosures.
- **`src/components/app/`**: Institutional research terminal with live NSE/BSE indices strip, TradingView lightweight-charts, key financial ratios, news sentiment, Paper Portfolio, and real-time streaming AI Research Chat Dock.
- **`src/lib/api.ts`**: Single gateway for every backend call (live mode) with an optional offline mock mode. `http.ts` holds the base URL, JWT header and error parsing; `hooks.ts` has `usePolling` and `useLivePrices` (WebSocket).
