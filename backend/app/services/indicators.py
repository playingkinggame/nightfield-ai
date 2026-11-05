"""Technical indicators, comparison, and the rule-based explainable signal (pure pandas, no TA lib needed)."""
import math
from datetime import datetime, timezone

import numpy as np
import pandas as pd

from app.errors import BadRequest, NotFoundError
from app.services import market

RISK_FREE = 0.065  # annual, India ~10Y G-Sec ballpark; used for Sharpe
PERIOD_DAYS = {"1M": 31, "6M": 183, "1Y": 365, "5Y": 1826}
ALLOWED = ("1D", "1W", "1M", "6M", "1Y", "5Y")


# ---------- primitives ----------
def to_df(candles: list[dict]) -> pd.DataFrame:
    df = pd.DataFrame(candles)
    df["time"] = pd.to_datetime(df["time"])
    return df.set_index("time").sort_index()


def sma(s: pd.Series, n: int) -> pd.Series:
    return s.rolling(n).mean()


def ema(s: pd.Series, n: int) -> pd.Series:
    return s.ewm(span=n, adjust=False, min_periods=n).mean()


def rsi(close: pd.Series, n: int = 14) -> pd.Series:
    d = close.diff()
    gain, loss = d.clip(lower=0), -d.clip(upper=0)
    ag = gain.ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    al = loss.ewm(alpha=1 / n, adjust=False, min_periods=n).mean()
    out = 100 - 100 / (1 + ag / al.replace(0, np.nan))
    return out.where(al != 0, 100.0).where(ag.notna())


def macd(close: pd.Series):
    line = ema(close, 12) - ema(close, 26)
    sig = line.ewm(span=9, adjust=False, min_periods=9).mean()
    return line, sig


def volatility(close: pd.Series) -> float:
    r = close.pct_change().dropna()
    return float(r.std() * math.sqrt(252) * 100) if len(r) > 2 else 0.0


def max_drawdown(close: pd.Series) -> float:
    if len(close) < 2:
        return 0.0
    return float(abs((close / close.cummax() - 1).min()) * 100)


def sharpe(close: pd.Series) -> float:
    r = close.pct_change().dropna()
    if len(r) < 3 or r.std() == 0:
        return 0.0
    return float((r.mean() - RISK_FREE / 252) / r.std() * math.sqrt(252))


def _last(s: pd.Series, nd: int = 2) -> float:
    s = s.dropna()
    return round(float(s.iloc[-1]), nd) if len(s) else 0.0


def _points(s: pd.Series, nd: int = 2) -> list[dict]:
    return [{"time": t.strftime("%Y-%m-%d"), "value": round(float(v), nd)} for t, v in s.dropna().items()]


# ---------- endpoints ----------
def _norm_period(period: str) -> str:
    p = (period or "").upper()
    if p not in ALLOWED:
        raise BadRequest("period must be one of 1D, 1W, 1M, 6M, 1Y, 5Y")
    return "1M" if p in ("1D", "1W") else p  # indicators need daily bars


async def get_indicators(symbol: str, period: str = "6M") -> dict:
    p = _norm_period(period)
    candles = await market.get_daily(symbol, "5y" if p == "5Y" else "2y")
    df = to_df(candles)
    close = df["close"]
    line, sig = macd(close)
    cut = df.index[-1] - pd.Timedelta(days=PERIOD_DAYS[p])
    window = close[close.index >= cut]
    s20, s50, e20, r14 = sma(close, 20), sma(close, 50), ema(close, 20), rsi(close, 14)
    sl = lambda s: s[s.index >= cut]  # noqa: E731
    return {
        "sma20": _last(s20), "sma50": _last(s50), "ema20": _last(e20), "rsi14": _last(r14),
        "macd": _last(line, 3), "macdSignal": _last(sig, 3),
        "volatility": round(volatility(window), 2), "maxDrawdown": round(max_drawdown(window), 2),
        "sharpe": round(sharpe(window), 2),
        "series": {"close": _points(sl(close)), "sma20": _points(sl(s20)), "sma50": _points(sl(s50)),
                   "ema20": _points(sl(e20)), "rsi14": _points(sl(r14)), "macd": _points(sl(line), 3),
                   "macdSignal": _points(sl(sig), 3)},
    }


async def compare(symbols: list[str], period: str = "1Y") -> dict:
    p = _norm_period(period)
    if not (2 <= len(symbols) <= 6):
        raise BadRequest("Provide between 2 and 6 comma-separated symbols.")
    import asyncio

    resolved = await asyncio.gather(*[market.resolve_symbol(s) for s in symbols])
    all_c = await asyncio.gather(*[market.get_daily(s, "5y" if p == "5Y" else "2y") for s in resolved])
    frames = {}
    for sym, c in zip(resolved, all_c):
        frames[sym] = to_df(c)["close"]
    df = pd.concat(frames, axis=1).sort_index().ffill().dropna()
    df = df[df.index >= df.index[-1] - pd.Timedelta(days=PERIOD_DAYS[p])]
    if len(df) < 2:
        raise NotFoundError("Not enough overlapping price history to compare these symbols.")
    out = []
    for sym in resolved:
        s = df[sym]
        out.append({
            "symbol": sym, "name": market.display_name(sym),
            "series": _points(s / s.iloc[0] * 100),
            "returnPct": round(float(s.iloc[-1] / s.iloc[0] - 1) * 100, 2),
            "volatility": round(volatility(s), 2), "maxDrawdown": round(max_drawdown(s), 2),
        })
    return {"period": p, "symbols": out}


async def build_signal(symbol: str) -> dict:
    sym = await market.resolve_symbol(symbol)
    df = to_df(await market.get_daily(sym, "2y"))
    close = df["close"]
    price = float(close.iloc[-1])
    s20, s50 = _last(sma(close, 20)), _last(sma(close, 50))
    s200 = _last(sma(close, 200)) if len(close) >= 200 else 0.0
    r14 = _last(rsi(close, 14))
    line, sig = macd(close)
    hist = _last(line - sig, 3)
    vol = round(volatility(close[close.index >= close.index[-1] - pd.Timedelta(days=365)]), 2)
    try:
        pe = (await market.get_quote(sym)).get("pe", 0.0)
    except Exception:  # noqa: BLE001
        pe = 0.0

    trend = (1 if price > s50 else -1) + (1 if s20 > s50 else -1)
    trend_txt = (f"Price {price:.2f} is {'above' if price > s50 else 'below'} the 50-day average ({s50:.2f}); "
                 f"20-day ({s20:.2f}) is {'above' if s20 > s50 else 'below'} 50-day.")
    mom = (1 if hist > 0 else -1) + (1 if 50 <= r14 <= 70 else -1 if r14 < 50 else 0)
    mom_txt = (f"RSI(14) is {r14:.1f} ({'overbought zone' if r14 > 70 else 'oversold zone' if r14 < 30 else 'neutral range'}); "
               f"MACD histogram is {hist:+.3f}.")
    if pe <= 0:
        val, val_txt = 0, "Trailing P/E not available (index, fund, or loss-making) - valuation scored neutral."
    else:
        val = 2 if pe < 15 else 1 if pe < 25 else 0 if pe < 40 else -1 if pe < 60 else -2
        val_txt = f"Trailing P/E is {pe:.1f}x (rule-of-thumb bands; not sector adjusted)."
    volsc = 1 if vol < 20 else 0 if vol < 35 else -1 if vol < 50 else -2
    vol_txt = f"Annualised volatility over the last year is {vol:.1f}% (lower is scored better)."
    total = trend + mom + val + volsc
    label = "Bullish lean" if total >= 3 else "Cautious lean" if total <= -3 else "Neutral"
    return {
        "symbol": sym, "signal": label, "score": total, "maxScore": 8,
        "components": [
            {"name": "trend", "score": trend, "maxScore": 2, "summary": trend_txt,
             "metrics": {"price": round(price, 2), "sma20": s20, "sma50": s50, "sma200": s200}},
            {"name": "momentum", "score": mom, "maxScore": 2, "summary": mom_txt,
             "metrics": {"rsi14": r14, "macdHistogram": hist}},
            {"name": "valuation", "score": val, "maxScore": 2, "summary": val_txt, "metrics": {"pe": pe}},
            {"name": "volatility", "score": volsc, "maxScore": 2, "summary": vol_txt,
             "metrics": {"annualisedVolatilityPct": vol}},
        ],
        "label": "Educational signal, not a prediction",
        "asOf": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
    }
