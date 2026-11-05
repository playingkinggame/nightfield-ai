"""Market data via yfinance (unofficial - may fail; failures become HTTP 502, empty data HTTP 404)."""
import asyncio
import calendar
import logging
import math

import pandas as pd
import yfinance as yf

from app.cache import cached
from app.errors import BadRequest, NotFoundError, UpstreamError, validate_symbol
from app.upstream import run_blocking

log = logging.getLogger(__name__)

NIFTY = [
    ("RELIANCE", "Reliance Industries"), ("TCS", "Tata Consultancy Services"), ("HDFCBANK", "HDFC Bank"),
    ("ICICIBANK", "ICICI Bank"), ("INFY", "Infosys"), ("BHARTIARTL", "Bharti Airtel"),
    ("SBIN", "State Bank of India"), ("ITC", "ITC Ltd"), ("LT", "Larsen & Toubro"),
    ("HINDUNILVR", "Hindustan Unilever"), ("KOTAKBANK", "Kotak Mahindra Bank"), ("AXISBANK", "Axis Bank"),
    ("BAJFINANCE", "Bajaj Finance"), ("MARUTI", "Maruti Suzuki"), ("SUNPHARMA", "Sun Pharmaceutical"),
    ("ASIANPAINT", "Asian Paints"), ("HCLTECH", "HCL Technologies"), ("TITAN", "Titan Company"),
    ("NTPC", "NTPC Ltd"), ("ULTRACEMCO", "UltraTech Cement"), ("ONGC", "Oil & Natural Gas Corp"),
    ("M&M", "Mahindra & Mahindra"), ("POWERGRID", "Power Grid Corp"), ("ADANIENT", "Adani Enterprises"),
    ("ADANIPORTS", "Adani Ports & SEZ"), ("WIPRO", "Wipro"), ("JSWSTEEL", "JSW Steel"),
    ("TATASTEEL", "Tata Steel"), ("COALINDIA", "Coal India"), ("BAJAJFINSV", "Bajaj Finserv"),
    ("NESTLEIND", "Nestle India"), ("TECHM", "Tech Mahindra"), ("INDUSINDBK", "IndusInd Bank"),
    ("HINDALCO", "Hindalco Industries"), ("GRASIM", "Grasim Industries"), ("CIPLA", "Cipla"),
    ("DRREDDY", "Dr. Reddy's Laboratories"), ("EICHERMOT", "Eicher Motors"), ("BRITANNIA", "Britannia Industries"),
    ("APOLLOHOSP", "Apollo Hospitals"), ("HEROMOTOCO", "Hero MotoCorp"), ("DIVISLAB", "Divi's Laboratories"),
    ("BPCL", "Bharat Petroleum"), ("TATACONSUM", "Tata Consumer Products"), ("SBILIFE", "SBI Life Insurance"),
    ("HDFCLIFE", "HDFC Life Insurance"), ("BAJAJ-AUTO", "Bajaj Auto"), ("SHRIRAMFIN", "Shriram Finance"),
    ("TRENT", "Trent Ltd"), ("JIOFIN", "Jio Financial Services"), ("BEL", "Bharat Electronics"),
    ("HAL", "Hindustan Aeronautics"), ("IRCTC", "IRCTC"), ("DMART", "Avenue Supermarts (DMart)"),
    ("PIDILITIND", "Pidilite Industries"), ("VEDL", "Vedanta Ltd"), ("ETERNAL", "Eternal (Zomato)"),
]
INDICES = {"^NSEI": "Nifty 50", "^BSESN": "Sensex", "^NSEBANK": "Bank Nifty"}
NAME_BY_BASE = {s: n for s, n in NIFTY}

# period -> (yfinance period, interval, intraday?)
PERIODS = {
    "1D": ("5d", "5m", True), "1W": ("5d", "30m", True), "1M": ("1mo", "1d", False),
    "6M": ("6mo", "1d", False), "1Y": ("1y", "1d", False), "5Y": ("5y", "1wk", False),
}


# ---------------- helpers ----------------
def num(x, nd: int = 2) -> float:
    try:
        f = float(x)
    except (TypeError, ValueError):
        return 0.0
    return round(f, nd) if math.isfinite(f) else 0.0


def base_of(sym: str) -> str:
    return sym.split(".")[0].lstrip("^")


def exchange_for(sym: str) -> str:
    return "BSE" if sym.endswith(".BO") or sym.startswith("^BSE") else "NSE"


def display_name(sym: str, fallback: str = "") -> str:
    return INDICES.get(sym) or fallback or NAME_BY_BASE.get(base_of(sym)) or base_of(sym)


def company_hint(sym: str) -> str:
    return INDICES.get(sym) or NAME_BY_BASE.get(base_of(sym)) or base_of(sym)


def color_type(sym: str, quote_type: str, change_pct: float) -> str:
    if sym.startswith("^") or (quote_type or "").upper() in ("ETF", "MUTUALFUND", "INDEX"):
        return "mint"
    if change_pct >= 1:
        return "coral"
    if change_pct >= 0:
        return "amber"
    return "orchid"


def normalize_candles(df, intraday: bool) -> list[dict]:
    """Ascending, unique timestamps (TradingView lightweight-charts crashes on duplicates)."""
    if df is None or len(df) == 0:
        return []
    df = df.dropna(subset=["Open", "High", "Low", "Close"])
    by_time: dict = {}
    for ts, row in df.iterrows():
        # intraday: wall-clock exchange time encoded as unix seconds so charts show IST session hours
        t = calendar.timegm(ts.timetuple()) if intraday else ts.strftime("%Y-%m-%d")
        vol = row.get("Volume", 0)
        by_time[t] = {
            "time": t, "open": num(row["Open"]), "high": num(row["High"]),
            "low": num(row["Low"]), "close": num(row["Close"]),
            "volume": int(num(vol, 0)),
        }
    return [by_time[k] for k in sorted(by_time)]


# ---------------- blocking yfinance calls (patched in tests) ----------------
def _fetch_history_blocking(sym, period, interval, start=None, end=None, adjust=False):
    t = yf.Ticker(sym)
    if start:
        return t.history(start=start, end=end, interval=interval, auto_adjust=adjust)
    return t.history(period=period, interval=interval, auto_adjust=adjust)


def _fi(fi, key):
    try:
        v = fi[key]
        return v if v is not None and math.isfinite(float(v)) else None
    except Exception:  # noqa: BLE001
        return None


def _fetch_quote_blocking(sym: str) -> dict:
    t = yf.Ticker(sym)
    hist = t.history(period="3mo", interval="1d", auto_adjust=False).dropna(subset=["Close"])
    if hist.empty:
        raise NotFoundError(f"No market data found for {sym}. Check the symbol, or Yahoo Finance may be throttling - retry shortly.")
    last = hist.iloc[-1]
    prev_close = float(hist["Close"].iloc[-2]) if len(hist) > 1 else float(last["Close"])
    fast: dict = {}
    try:
        fi = t.fast_info
        fast = {k: _fi(fi, k) for k in ("last_price", "previous_close", "open", "day_high", "day_low",
                                        "last_volume", "year_high", "year_low", "market_cap", "quote_type")}
        try:
            fast["quote_type"] = fi["quote_type"]
        except Exception:  # noqa: BLE001
            fast["quote_type"] = ""
    except Exception as e:  # noqa: BLE001
        log.info("fast_info unavailable for %s: %s", sym, e)
    return {
        "price": fast.get("last_price") or float(last["Close"]),
        "previousClose": fast.get("previous_close") or prev_close,
        "open": fast.get("open") or float(last["Open"]),
        "high": fast.get("day_high") or float(last["High"]),
        "low": fast.get("day_low") or float(last["Low"]),
        "volume": fast.get("last_volume") or float(last.get("Volume", 0) or 0),
        "yearHigh": fast.get("year_high"), "yearLow": fast.get("year_low"),
        "marketCap": fast.get("market_cap"), "quoteType": fast.get("quote_type") or "",
        "closes": [float(x) for x in hist["Close"].tail(30)],
    }


def _fetch_info_blocking(sym: str) -> dict:
    info = yf.Ticker(sym).info
    if not info or len(info) < 3:
        raise RuntimeError("empty info")
    return info


def _fetch_quick_blocking(sym: str) -> dict:
    t = yf.Ticker(sym)
    price = prev = None
    try:
        fi = t.fast_info
        price, prev = _fi(fi, "last_price"), _fi(fi, "previous_close")
    except Exception:  # noqa: BLE001
        pass
    if not price or not prev:
        h = t.history(period="5d", interval="1d", auto_adjust=False).dropna(subset=["Close"])
        if h.empty:
            raise NotFoundError(f"No market data found for {sym}.")
        price = float(h["Close"].iloc[-1])
        prev = float(h["Close"].iloc[-2]) if len(h) > 1 else price
    return {"price": float(price), "prev": float(prev)}


def _search_yahoo_blocking(q: str) -> list[dict]:
    res = yf.Search(q, max_results=10, news_count=0)
    return list(getattr(res, "quotes", []) or [])


# ---------------- public async API ----------------
@cached(3600, "resolve")
async def resolve_symbol(raw: str) -> str:
    """TCS -> TCS.NS (falls back to TCS.BO). Symbols with '.' or '^' pass through."""
    sym = validate_symbol(raw)
    if "." in sym or sym.startswith("^"):
        return sym
    for suffix in (".NS", ".BO"):
        df = await run_blocking(_fetch_history_blocking, sym + suffix, "5d", "1d", label="Yahoo Finance")
        if df is not None and len(df) > 0:
            return sym + suffix
    raise NotFoundError(f"Could not find '{sym}' on NSE or BSE. Try the full symbol, e.g. {sym}.NS")


async def get_info(sym: str) -> dict:
    """Best-effort fundamentals dict (never raises). Cached 1h on success only."""
    try:
        return await _get_info_cached(sym)
    except Exception as e:  # noqa: BLE001
        log.warning("info unavailable for %s: %s", sym, e)
        return {}


@cached(3600, "info")
async def _get_info_cached(sym: str) -> dict:
    return await asyncio.wait_for(asyncio.to_thread(_fetch_info_blocking, sym), 8)


@cached(30, "quote")
async def get_quote(symbol: str) -> dict:
    sym = await resolve_symbol(symbol)
    raw = await run_blocking(_fetch_quote_blocking, sym, label="Yahoo Finance quote")
    info = await get_info(sym)
    price = num(raw["price"])
    prev = num(raw["previousClose"])
    change = round(price - prev, 2) if prev else 0.0
    pct = round(change / prev * 100, 2) if prev else 0.0
    qtype = raw.get("quoteType") or info.get("quoteType") or ""
    div = info.get("dividendYield")
    if div is None and info.get("trailingAnnualDividendYield") is not None:
        div = float(info["trailingAnnualDividendYield"]) * 100
    mcap = raw.get("marketCap") or info.get("marketCap") or 0
    closes = [num(c) for c in raw.get("closes", [])]
    return {
        "symbol": sym,
        "name": display_name(sym, info.get("longName") or info.get("shortName") or ""),
        "exchange": exchange_for(sym),
        "sector": info.get("sector") or ("Index" if sym.startswith("^") else "N/A"),
        "price": price, "change": change, "changePercent": pct,
        "open": num(raw["open"]), "high": num(raw["high"]), "low": num(raw["low"]),
        "previousClose": prev, "volume": int(num(raw["volume"], 0)),
        "marketCapCr": num(float(mcap) / 1e7 if mcap else 0),
        "pe": num(info.get("trailingPE")), "eps": num(info.get("trailingEps")),
        "fiftyTwoWeekHigh": num(raw.get("yearHigh") or info.get("fiftyTwoWeekHigh")),
        "fiftyTwoWeekLow": num(raw.get("yearLow") or info.get("fiftyTwoWeekLow")),
        "beta": num(info.get("beta")), "dividendYield": num(div),
        "sparkline": closes, "colorType": color_type(sym, qtype, pct),
    }


@cached(30, "quick")
async def quick_quote(symbol: str) -> dict:
    sym = await resolve_symbol(symbol)
    raw = await run_blocking(_fetch_quick_blocking, sym, label="Yahoo Finance quote")
    price, prev = num(raw["price"]), num(raw["prev"])
    change = round(price - prev, 2) if prev else 0.0
    return {"symbol": sym, "name": display_name(sym), "exchange": exchange_for(sym), "price": price,
            "change": change, "changePercent": round(change / prev * 100, 2) if prev else 0.0}


@cached(300, "history")
async def get_history(symbol: str, period: str = "1M") -> list[dict]:
    p = (period or "").upper()
    if p not in PERIODS:
        raise BadRequest("period must be one of 1D, 1W, 1M, 6M, 1Y, 5Y")
    yf_period, interval, intraday = PERIODS[p]
    sym = await resolve_symbol(symbol)
    df = await run_blocking(_fetch_history_blocking, sym, yf_period, interval, label="Yahoo Finance history")
    if p == "1D" and df is not None and len(df) > 0:
        df = df[df.index.date == df.index[-1].date()]  # last trading session only
    candles = normalize_candles(df, intraday)
    if not candles:
        raise NotFoundError(f"No price history found for {sym}.")
    return candles


@cached(300, "daily")
async def get_daily(symbol: str, yf_period: str = "1y") -> list[dict]:
    """Daily candles for indicators/compare/portfolio."""
    sym = await resolve_symbol(symbol)
    df = await run_blocking(_fetch_history_blocking, sym, yf_period, "1d", label="Yahoo Finance history")
    candles = normalize_candles(df, intraday=False)
    if not candles:
        raise NotFoundError(f"No price history found for {sym}.")
    return candles


@cached(3600, "range")
async def get_range(symbol: str, start: str, end: str) -> list[dict]:
    """Dividend/split-adjusted daily candles between two dates (used by backtests)."""
    sym = await resolve_symbol(symbol)
    df = await run_blocking(_fetch_history_blocking, sym, None, "1d", start=start, end=end, adjust=True,
                            label="Yahoo Finance history")
    candles = normalize_candles(df, intraday=False)
    if not candles:
        raise NotFoundError(f"No price history found for {sym} between {start} and {end}.")
    return candles


@cached(3600, "fundamentals")
async def get_fundamentals(symbol: str) -> dict:
    sym = await resolve_symbol(symbol)
    info = await get_info(sym)
    if not info:
        raise UpstreamError("Yahoo Finance fundamentals are unavailable right now - please retry shortly.")

    def pct(k):
        v = info.get(k)
        return num(v * 100) if isinstance(v, (int, float)) else 0.0

    out = {
        "symbol": sym, "name": display_name(sym, info.get("longName") or info.get("shortName") or ""),
        "sector": info.get("sector") or "N/A", "industry": info.get("industry") or "N/A",
        "marketCapCr": num((info.get("marketCap") or 0) / 1e7),
        "pe": num(info.get("trailingPE")), "forwardPe": num(info.get("forwardPE")),
        "eps": num(info.get("trailingEps")), "priceToBook": num(info.get("priceToBook")),
        "roePercent": pct("returnOnEquity"), "debtToEquity": num(info.get("debtToEquity")),
        "profitMarginPercent": pct("profitMargins"), "revenueGrowthPercent": pct("revenueGrowth"),
        "dividendYield": num(info.get("dividendYield")), "beta": num(info.get("beta")),
        "fiftyTwoWeekHigh": num(info.get("fiftyTwoWeekHigh")), "fiftyTwoWeekLow": num(info.get("fiftyTwoWeekLow")),
    }
    keys = {"pe": "trailingPE", "forwardPe": "forwardPE", "eps": "trailingEps", "priceToBook": "priceToBook",
            "roePercent": "returnOnEquity", "debtToEquity": "debtToEquity", "profitMarginPercent": "profitMargins",
            "revenueGrowthPercent": "revenueGrowth", "beta": "beta"}
    out["missingFields"] = [k for k, ik in keys.items() if info.get(ik) is None]  # 0 here means "not available"
    return out


def _rank(q: str, sym: str, name: str) -> int:
    ql, sl, nl = q.lower(), sym.lower(), name.lower()
    if sl == ql or sl.split(".")[0] == ql:
        return 0
    if sl.startswith(ql):
        return 1
    if nl.startswith(ql):
        return 2
    if ql in nl or ql in sl:
        return 3
    return 99


@cached(300, "search_stocks")
async def search_stocks(q: str, limit: int = 12) -> list[dict]:
    q = q.strip()
    found: dict[str, dict] = {}
    pool = [(f"{s}.NS", n) for s, n in NIFTY] + [(k, v) for k, v in INDICES.items()]
    for sym, name in sorted(pool, key=lambda p: _rank(q, p[0], p[1])):
        if _rank(q, sym, name) < 99:
            found[sym] = {"symbol": sym, "name": name}
    if len(found) < limit:
        try:
            quotes = await asyncio.wait_for(asyncio.to_thread(_search_yahoo_blocking, q), 6)
            for it in quotes:
                s = it.get("symbol", "")
                if s.endswith((".NS", ".BO")) and s not in found:
                    found[s] = {"symbol": s, "name": it.get("longname") or it.get("shortname") or base_of(s)}
        except Exception as e:  # noqa: BLE001
            log.info("yahoo search failed: %s", e)
    items = list(found.values())[:limit]
    prices = await asyncio.gather(*[quick_quote(i["symbol"]) for i in items], return_exceptions=True)
    out = []
    for it, p in zip(items, prices):
        ok = isinstance(p, dict)
        out.append({"symbol": it["symbol"], "name": it["name"], "type": "stock",
                    "exchange": exchange_for(it["symbol"]),
                    "price": p["price"] if ok else 0, "changePercent": p["changePercent"] if ok else 0})
    return out
