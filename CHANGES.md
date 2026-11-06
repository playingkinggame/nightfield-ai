# What was fixed / wired

## Backend (FastAPI)
- NEW `GET /api/market/indices` (Nifty 50, Sensex, Bank Nifty, Nifty IT) and `GET /api/market/popular` (default watchlist).
- NEW `POST /api/portfolio/reset` (wipe positions + trades, restore virtual cash).
- WebSocket `/ws/prices` now also sends `change`; quick-quote cache TTL 30s -> 15s.
- CORS now accepts a comma-separated `FRONTEND_ORIGIN` plus localhost/127.0.0.1 on ports 3000 and 5173.
- New tests: `backend/tests/test_wiring.py`.

## Frontend
- NEW `lib/http.ts` (base URL, JWT header, backend `{error, detail}` parsing), `lib/types.ts`, `lib/hooks.ts`
  (`usePolling`, `useLivePrices`), `lib/mockStore.ts` (demo-mode only).
- `lib/api.ts` rewritten: all endpoints wired, WebSocket subscription, mock mode is now opt-in (`VITE_USE_MOCK=true`).
- Chat bugs fixed: citations/key-data were wiped by the `[DONE]` frame, `response.ok` was never checked,
  tool-call list used a stale closure, history was never sent.
- `lib/auth.ts`: real signup/login/me against the backend with JWT (fake local login removed; Google button removed
  because the backend has no OAuth).
- Header: fake `Math.random()` index ticks removed; real index data + real NSE open/closed status.
- Watchlist, Portfolio, Funds, Stock pages now use backend data (previously hardcoded mock / localStorage).
- Stock page: live WebSocket price, 30s refresh, working compare chart, indicators + signal panels,
  watchlist star, real trade execution, proper error state, chart no longer rebuilt on every tick,
  "SMA 50" mislabel fixed.
- `package.json`: removed unused `express`, `@google/genai`, `dotenv`, `@types/express`.
- `.env.example` no longer lists backend secrets.

## Not changed
- Landing page / 3D valley / tunnel still use sample data from `src/mock/marketData.ts` (decorative).
- `.env`, `backend/.env` and `nightfield.db` were removed from this zip - create your own from the `.env.example` files.
