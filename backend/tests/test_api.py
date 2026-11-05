"""10 offline tests - all network access is mocked."""
import asyncio
import json
import uuid

import pandas as pd
import pytest

from app.errors import BadRequest, UpstreamError
from app.services import agent, funds, market, search
from app.services.llm import LLMClient, LLMResult, TextDelta, ToolCall

QUOTE_KEYS = {"symbol", "name", "exchange", "sector", "price", "change", "changePercent", "open", "high", "low",
              "previousClose", "volume", "marketCapCr", "pe", "eps", "fiftyTwoWeekHigh", "fiftyTwoWeekLow", "beta",
              "dividendYield", "sparkline", "colorType"}


def fake_raw(*_a, **_k):
    return {"price": 3500.0, "previousClose": 3400.0, "open": 3410.0, "high": 3520.0, "low": 3400.0,
            "volume": 1_200_000, "yearHigh": 4000.0, "yearLow": 3000.0, "marketCap": 1.27e13, "quoteType": "EQUITY",
            "closes": [3300.0 + i for i in range(30)]}


@pytest.fixture()
def mock_quote(monkeypatch):
    monkeypatch.setattr(market, "_fetch_quote_blocking", fake_raw)
    monkeypatch.setattr(market, "_fetch_info_blocking", lambda s: {
        "longName": "Tata Consultancy Services", "sector": "Technology", "trailingPE": 31.2, "trailingEps": 112.2,
        "beta": 0.8, "dividendYield": 1.4, "marketCap": 1.27e13, "quoteType": "EQUITY"})


def test_01_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200 and r.json() == {"status": "ok"}


def test_02_search_shape(client, monkeypatch):
    async def stocks(q, limit=12):
        return [{"symbol": "TCS.NS", "name": "Tata Consultancy Services", "type": "stock", "exchange": "NSE",
                 "price": 3500.0, "changePercent": 2.9}]

    async def fnds(q, limit=4):
        return [{"symbol": "120716", "name": "UTI Nifty 50 Index Fund", "type": "fund", "exchange": "MF",
                 "price": 150.5, "changePercent": 0.4}]

    monkeypatch.setattr(market, "search_stocks", stocks)
    monkeypatch.setattr(funds, "search_funds_priced", fnds)
    data = client.get("/api/search", params={"q": "tcs"}).json()
    assert len(data) == 2
    for item in data:
        assert set(item) == {"symbol", "name", "type", "exchange", "price", "changePercent"}
    assert {d["type"] for d in data} == {"stock", "fund"}


def test_03_quote_shape_and_color(client, mock_quote):
    r = client.get("/api/stocks/TCS.NS/quote")
    assert r.status_code == 200
    q = r.json()
    assert set(q) == QUOTE_KEYS
    assert q["exchange"] == "NSE" and q["colorType"] == "coral"      # +2.94% >= 1
    assert q["marketCapCr"] == pytest.approx(1_270_000, rel=0.01)    # INR crore
    assert len(q["sparkline"]) == 30 and q["pe"] == 31.2
    assert all(v is not None for v in q.values())                    # never null


def test_04_history_sorted_unique(client, monkeypatch):
    idx = pd.to_datetime(["2025-01-03 09:15", "2025-01-01 09:15", "2025-01-02 09:15", "2025-01-02 15:30"])
    df = pd.DataFrame({"Open": [3, 1, 2, 2.5], "High": [4, 2, 3, 3.5], "Low": [2, 0.5, 1, 2],
                       "Close": [3.5, 1.5, 2.5, 2.8], "Volume": [10, 20, 30, 40]}, index=idx)
    monkeypatch.setattr(market, "_fetch_history_blocking", lambda *a, **k: df)
    r = client.get("/api/stocks/INFY.NS/history", params={"period": "6M"})
    assert r.status_code == 200
    times = [c["time"] for c in r.json()]
    assert times == sorted(times) and len(times) == len(set(times)) == 3   # duplicate day collapsed
    assert set(r.json()[0]) == {"time", "open", "high", "low", "close", "volume"}
    intraday = client.get("/api/stocks/INFY.NS/history", params={"period": "1W"}).json()
    assert all(isinstance(c["time"], int) for c in intraday)               # unix seconds for intraday


def test_05_invalid_symbol_and_period(client):
    r = client.get("/api/stocks/BAD$YM/quote")
    assert r.status_code == 400
    assert set(r.json()) == {"error", "detail"}
    r2 = client.get("/api/stocks/TCS.NS/history", params={"period": "9Y"})
    assert r2.status_code == 400 and set(r2.json()) == {"error", "detail"}


def test_06_upstream_failure_is_502_json(client, monkeypatch):
    def boom(*a, **k):
        raise RuntimeError("yahoo exploded <traceback>")

    monkeypatch.setattr(market, "_fetch_quote_blocking", boom)
    import app.upstream as up

    async def no_sleep(_):  # skip the real retry back-off in tests
        return None

    monkeypatch.setattr(up.asyncio, "sleep", no_sleep)
    r = client.get("/api/stocks/TCS.NS/quote")
    assert r.status_code == 502
    body = r.json()
    assert body["error"] == "upstream_error" and "Traceback" not in json.dumps(body) and "exploded" not in json.dumps(body)


def test_07_fund_nav_shape(client, monkeypatch):
    rows = [{"date": f"{d:02d}-01-{y}", "nav": str(100 + (2025 - y) * -12 + d)} for y in range(2019, 2026) for d in (1, 15)]
    rows.reverse()  # mfapi returns newest first

    async def fake_fetch(url, **k):
        return {"meta": {"scheme_name": "Test Nifty 50 Index Fund", "scheme_category": "Other Scheme - Index Funds",
                         "fund_house": "Test AMC", "scheme_type": "Open Ended"}, "data": rows}

    monkeypatch.setattr(funds, "fetch_json", fake_fetch)
    r = client.get("/api/funds/120716/nav")
    assert r.status_code == 200
    f = r.json()
    assert set(f) == {"code", "name", "category", "nav", "changePercent", "aumCr", "expenseRatio", "oneYearReturn",
                      "threeYearReturn", "fiveYearReturn", "riskRating", "topHoldings", "description"}
    assert f["riskRating"] == "Very High" and f["threeYearReturn"] != 0 and f["nav"] > 0
    assert client.get("/api/funds/abc/nav").status_code == 400


def test_08_auth_watchlist_guard_and_paper_trading(client, monkeypatch, mock_quote):
    assert client.get("/api/watchlist").status_code == 401
    email = f"{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/auth/signup", json={"email": email, "password": "supersecret1", "name": "Asha"})
    assert r.status_code == 200 and set(r.json()) == {"token", "user"}
    hdr = {"Authorization": f"Bearer {r.json()['token']}"}
    assert client.get("/api/auth/me", headers=hdr).json()["email"] == email
    assert client.post("/api/auth/login", json={"email": email, "password": "wrongpass"}).status_code == 401

    async def quick(symbol):
        return {"symbol": "TCS.NS", "name": "TCS", "exchange": "NSE", "price": 3500.0, "change": 0, "changePercent": 0}

    monkeypatch.setattr(market, "quick_quote", quick)
    ok = client.post("/api/portfolio/trade", headers=hdr, json={"symbol": "TCS.NS", "side": "buy", "quantity": 10})
    assert ok.status_code == 200 and ok.json()["cash"] == pytest.approx(1_000_000 - 35_000)
    assert client.post("/api/portfolio/trade", headers=hdr, json={"symbol": "TCS.NS", "side": "sell", "quantity": 11}).status_code == 400
    assert client.post("/api/portfolio/trade", headers=hdr, json={"symbol": "TCS.NS", "side": "buy", "quantity": 1000}).status_code == 400
    pf = client.get("/api/portfolio", headers=hdr).json()
    assert pf["holdings"][0]["quantity"] == 10


class FakeLLM(LLMClient):
    name = "fake"

    def __init__(self):
        self.n = 0

    async def generate(self, messages, tools):
        self.n += 1
        if self.n == 1:
            yield LLMResult(text="", tool_calls=[ToolCall(id="c1", name="get_quote", args={"symbol": "TCS.NS"})])
        else:
            yield TextDelta("TCS trades at ")
            yield TextDelta("₹3,500.00 today. ")
            yield LLMResult(text="TCS trades at ₹3,500.00 today. ", tool_calls=[])


def parse_sse(raw: str):
    events = []
    for block in raw.split("\n\n"):
        if not block.strip() or block.startswith(":"):
            continue
        ev, data = None, None
        for line in block.split("\n"):
            if line.startswith("event:"):
                ev = line[6:].strip()
            elif line.startswith("data:"):
                data = line[5:].strip()
        events.append((ev, data))
    return events


def test_09_chat_sse_protocol(client, monkeypatch, mock_quote):
    monkeypatch.setattr(agent, "build_llm_chain", lambda: [FakeLLM()])
    with client.stream("POST", "/api/chat", json={"message": "How is TCS doing?", "symbol": "TCS.NS"}) as r:
        assert r.status_code == 200
        assert r.headers["content-type"].startswith("text/event-stream")
        assert r.headers["cache-control"] == "no-cache" and r.headers["x-accel-buffering"] == "no"
        raw = "".join(r.iter_text())
    assert raw.endswith("data: [DONE]\n\n")
    ev = parse_sse(raw)
    tools = [json.loads(d) for e, d in ev if e == "tool"]
    assert [t["status"] for t in tools] == ["calling", "complete"] and tools[0]["id"] == "t1"
    assert set(tools[0]) == {"id", "tool", "status", "details"} and tools[0]["tool"] == "get_quote"
    chunks = [json.loads(d)["chunk"] for e, d in ev if e is None and d != "[DONE]" and "chunk" in json.loads(d)]
    text = "".join(chunks)
    assert "₹3,500.00" in text and text.strip().endswith("Educational research, not financial advice.")
    meta = [json.loads(d) for e, d in ev if e is None and d != "[DONE]" and "keyData" in json.loads(d)][0]
    assert meta["citations"] == [] and 3 <= len(meta["keyData"]) <= 6
    assert {"label", "value"} == set(meta["keyData"][0])
    # validation: message length cap
    assert client.post("/api/chat", json={"message": "x" * 2001}).status_code == 422


def test_10_ssrf_guard():
    for bad in ("http://127.0.0.1/admin", "http://localhost/", "http://169.254.169.254/latest/meta-data/",
                "http://10.0.0.5/", "file:///etc/passwd", "ftp://example.com/x", "http://[::1]/", "http://example.com:22/"):
        with pytest.raises(BadRequest):
            asyncio.run(search.assert_public_url(bad))
