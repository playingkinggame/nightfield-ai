# NIGHTFIELD backend

FastAPI backend for the NIGHTFIELD AI stock and index-fund research platform. Runs locally on free tiers only.

> **Educational research tool. Not financial advice.** Portfolio trading is paper-only (virtual money). Signals and backtests are not predictions.

## Setup

```bash
python -m venv .venv
source .venv/bin/activate            # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                 # then fill in keys
uvicorn app.main:app --reload --port 8000
```

Open http://localhost:8000/docs for the interactive API docs. Run tests with `pytest -q` (fully offline, network mocked).

## Free API keys

| Key | Where | Notes |
|---|---|---|
| `GROQ_API_KEY` | https://console.groq.com/keys | Primary LLM. Set `GROQ_MODEL` to change model. |
| `GEMINI_API_KEY` | https://aistudio.google.com/apikey | Fallback LLM when Groq returns 429/errors. `GEMINI_MODEL` configurable. |
| `TAVILY_API_KEY` | https://app.tavily.com | Web search + extra news. |
| `SERPAPI_KEY` | https://serpapi.com/manage-api-key | Optional search backup. |
| `JWT_SECRET` | `python -c "import secrets;print(secrets.token_urlsafe(48))"` | Required for stable logins. |

Everything works without the optional keys: chat needs at least one LLM key; search returns an explanatory empty result if no search key exists.

## Testing with curl

```bash
curl localhost:8000/api/health
curl "localhost:8000/api/search?q=tcs"
curl localhost:8000/api/stocks/TCS/quote            # no suffix -> tries TCS.NS first
curl "localhost:8000/api/stocks/^NSEI/history?period=6M"
curl localhost:8000/api/stocks/RELIANCE.NS/news
curl "localhost:8000/api/stocks/INFY.NS/indicators?period=6M"
curl "localhost:8000/api/compare?symbols=TCS.NS,INFY.NS&period=1Y"
curl localhost:8000/api/stocks/TCS.NS/signal
curl localhost:8000/api/funds
curl -X POST localhost:8000/api/backtest -H "content-type: application/json" \
  -d '{"symbol":"TCS.NS","strategy":"sma_cross","params":{"fast":20,"slow":50},"start":"2021-01-01","end":"2025-12-31"}'

# auth + paper trading
TOKEN=$(curl -s -X POST localhost:8000/api/auth/signup -H "content-type: application/json" \
  -d '{"email":"me@example.com","password":"supersecret1","name":"Me"}' | python -c "import sys,json;print(json.load(sys.stdin)['token'])")
curl -X POST localhost:8000/api/portfolio/trade -H "Authorization: Bearer $TOKEN" -H "content-type: application/json" \
  -d '{"symbol":"TCS.NS","side":"buy","quantity":5}'
curl localhost:8000/api/portfolio/summary -H "Authorization: Bearer $TOKEN"

# SSE chat (-N disables curl buffering)
curl -N -X POST localhost:8000/api/chat -H "content-type: application/json" \
  -d '{"message":"Give me a balanced view of TCS","symbol":"TCS.NS"}'

# live prices (needs `pip install websocket-client` or use wscat)
wscat -c "ws://localhost:8000/ws/prices?symbols=TCS.NS,^NSEI"
```

## Design notes and deviations

- **Indicators** are computed with plain pandas (no `pandas-ta`/`ta`) to avoid fragile native/version dependencies.
- **SSE** is written by hand (`StreamingResponse`) instead of `sse-starlette` so the frames match the frontend protocol byte for byte. A 15 s `: heartbeat` comment is sent while the agent is busy.
- **Intraday timestamps:** `1D` and `1W` candles use unix seconds (wall-clock exchange time, so charts show 9:15-15:30 IST). `1W` is intraday (30m) per the spec, and string dates would duplicate. Daily/weekly periods use `"YYYY-MM-DD"`.
- **Errors** are always `{"error","detail"}`. Provider failures give 502; unknown symbols give 404; no stack traces leave the server.
- **Agent tool failures** are reported as `status:"complete"` with details starting `Failed:` so the frontend's two-status protocol is never broken.
- **Rule enforcement in code:** the first model turn is buffered, so a model that skips tools and answers with numbers is nudged to call tools (rule 1). After the answer, numbers not found in tool results trigger a verification note. The disclaimer line is appended if the model forgot it. Fetched web/news content is tagged untrusted. `read_webpage` blocks non-http(s) schemes, non-80/443 ports and private/loopback/link-local IPs, and re-checks every redirect hop. Residual risk: DNS rebinding between the check and the connect.
- **Fund metadata** (`data/funds_meta.json`): AUM, expense ratio and top holdings are rough hand-curated placeholders, flagged "approximate" in each description. **Verify them before relying on them.** Scheme codes are resolved at runtime through mfapi search, so they are not hard-coded. NAV and returns are live. 1Y is absolute return; 3Y/5Y are CAGR; 0 means not enough history.
- **Watchlist** endpoints return `StockQuote[]`. `DELETE` works as `/api/watchlist/{symbol}` or `/api/watchlist?symbol=`. Chat history `POST` accepts `{messages:[...]}` or one message object.
- **Max drawdown** values are positive percentages. Portfolio drawdown replays *current* holdings over the last year.
- **Backtest:** signals are shifted one bar, costs are 0.1% + 0.05% slippage per trade side, and reported folds are sequential out-of-sample windows with parameters fixed in advance (no optimisation). Prices are close-to-close, dividend-adjusted.
- yfinance is unofficial: expect occasional throttling. Quotes are cached for 30 s, history 5 min, news 10 min, fund NAV 1 h.

## Deploy free on Render

1. Push this folder to GitHub.
2. Render dashboard -> **New -> Web Service** -> pick the repo, runtime **Python 3**.
3. Build command: `pip install -r requirements.txt`
   Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   (or choose **Docker**; the included Dockerfile honours `$PORT`).
4. Add the env vars from `.env.example`. Set `FRONTEND_ORIGIN` to your deployed frontend URL and `TRUST_PROXY=true`.
5. The free instance filesystem is ephemeral, so SQLite resets on redeploy. For persistent users, create a free Supabase project and set `DATABASE_URL` to its connection string (`postgresql://...` is auto-converted).
6. Free web services sleep after idle time, so the first request after a pause is slow.

## Free-tier limits (approximate - these change often; confirm on each provider's pricing page)

| Service | Typical free limit | Effect here |
|---|---|---|
| Groq | per-model RPM / daily request & token caps (tens of RPM, ~1k requests/day on 70B models) | 429 -> automatic Gemini fallback |
| Gemini API | per-model RPM / daily caps, lower for newer "pro" models | last-resort model |
| Tavily | ~1,000 credits/month | cached 10 min; falls back to SerpApi |
| SerpApi | ~100-250 searches/month | backup only |
| yfinance | unofficial, undocumented throttling | cache + 502 JSON on failure |
| mfapi.in | free, no key, fair use | NAV cached 1 h |
| Google News RSS | unofficial, no SLA | cached 10 min |
| Render free web service | ~512 MB RAM, sleeps when idle, ephemeral disk | use Supabase for DB |
| Supabase free | ~500 MB database, projects pause after inactivity | optional Postgres |
| This API's chat limiter | 20 requests/min per IP, 2000-char messages | in-memory, per process |

## Layout

```
app/main.py  config.py  db.py  cache.py  models.py  schemas.py  errors.py  upstream.py  security.py  ratelimit.py
app/routers/   stocks funds search auth portfolio chat backtest ws
app/services/  market funds news search indicators llm agent backtest
data/funds_meta.json   tests/   requirements.txt   .env.example   Dockerfile
```

*Educational research tool. Not financial advice.*
