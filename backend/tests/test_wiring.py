"""Tests for the endpoints the frontend depends on: market strip, popular list, portfolio reset."""
import uuid

import pytest

from app.services import market


def _quick(sym):
    return {"symbol": sym, "name": sym, "exchange": "NSE", "price": 100.0, "change": 1.5, "changePercent": 1.52}


@pytest.fixture()
def fake_quick(monkeypatch):
    async def q(symbol):
        return _quick(symbol)

    monkeypatch.setattr(market, "quick_quote", q)


def test_indices_shape(client, fake_quick):
    r = client.get("/api/market/indices")
    assert r.status_code == 200
    data = r.json()
    assert {d["symbol"] for d in data} == set(market.INDICES)
    assert set(data[0]) == {"symbol", "name", "price", "change", "changePercent", "isUp", "delayed"}
    assert data[0]["isUp"] is True and data[0]["delayed"] is True


def test_indices_all_fail_is_502(client, monkeypatch):
    from app.errors import UpstreamError

    async def boom(symbol):
        raise UpstreamError("down")

    monkeypatch.setattr(market, "quick_quote", boom)
    r = client.get("/api/market/indices")
    assert r.status_code == 502


def test_popular_returns_quotes(client, monkeypatch):
    async def gq(symbol):
        return {"symbol": symbol, "name": symbol, "exchange": "NSE", "sector": "N/A", "price": 10.0, "change": 0.0,
                "changePercent": 0.0, "open": 10.0, "high": 10.0, "low": 10.0, "previousClose": 10.0, "volume": 1,
                "marketCapCr": 1.0, "pe": 1.0, "eps": 1.0, "fiftyTwoWeekHigh": 1.0, "fiftyTwoWeekLow": 1.0,
                "beta": 1.0, "dividendYield": 0.0, "sparkline": [1.0, 2.0], "colorType": "amber"}

    monkeypatch.setattr(market, "get_quote", gq)
    r = client.get("/api/market/popular")
    assert r.status_code == 200 and len(r.json()) == len(market.POPULAR)


def test_portfolio_reset_and_auth_guard(client, fake_quick):
    assert client.post("/api/portfolio/reset").status_code == 401
    email = f"{uuid.uuid4().hex[:8]}@example.com"
    r = client.post("/api/auth/signup", json={"email": email, "password": "supersecret1", "name": "Asha"})
    hdr = {"Authorization": f"Bearer {r.json()['token']}"}

    async def rs(symbol):
        return symbol

    market.resolve_symbol_orig = market.resolve_symbol
    try:
        market.resolve_symbol = rs
        t = client.post("/api/portfolio/trade", headers=hdr, json={"symbol": "TCS.NS", "side": "buy", "quantity": 5})
        assert t.status_code == 200
        assert len(client.get("/api/portfolio", headers=hdr).json()["holdings"]) == 1
        out = client.post("/api/portfolio/reset", headers=hdr).json()
    finally:
        market.resolve_symbol = market.resolve_symbol_orig
    assert out["holdings"] == [] and out["trades"] == [] and out["cash"] == 1_000_000
