"""Honest, simple backtester: next-bar execution (signals shifted one bar), 0.1% cost + 0.05% slippage per trade
side, walk-forward fold reporting, buy-and-hold comparison. No parameter optimisation => no curve fitting."""
import math
from datetime import date, datetime, timedelta

import numpy as np
import pandas as pd

from app.errors import BadRequest
from app.services import indicators, market

COST = 0.001
SLIPPAGE = 0.0005
WARNING = ("Past performance does not predict future results. Backtests use historical data, ignore taxes, "
           "liquidity and real execution, and can be overfit. Educational use only.")


def _metrics(ret: pd.Series) -> dict:
    eq = (1 + ret).cumprod()
    days = max((eq.index[-1] - eq.index[0]).days, 1)
    cagr = (eq.iloc[-1] ** (365.25 / days) - 1) * 100 if eq.iloc[-1] > 0 else -100.0
    dd = abs((eq / eq.cummax() - 1).min()) * 100
    sd = ret.std()
    sh = (ret.mean() - indicators.RISK_FREE / 252) / sd * math.sqrt(252) if sd and sd > 0 else 0.0
    return {"cagr": round(float(cagr), 2), "maxDrawdown": round(float(dd), 2), "sharpe": round(float(sh), 2),
            "totalReturn": round(float(eq.iloc[-1] - 1) * 100, 2)}


def _signals(close: pd.Series, strategy: str, params: dict) -> tuple[pd.Series, int, dict]:
    if strategy == "sma_cross":
        fast, slow = int(params.get("fast", 20)), int(params.get("slow", 50))
        if not (2 <= fast < slow <= 400):
            raise BadRequest("sma_cross needs 2 <= fast < slow <= 400.")
        f, s = close.rolling(fast).mean(), close.rolling(slow).mean()
        sig = (f > s).astype(int).where(s.notna(), 0)
        return sig, slow, {"fast": fast, "slow": slow}
    n = int(params.get("period", 14))
    lo, hi = float(params.get("buyBelow", 30)), float(params.get("sellAbove", 55))
    if not (2 <= n <= 100 and 0 < lo < hi < 100):
        raise BadRequest("rsi_meanrev needs 2 <= period <= 100 and 0 < buyBelow < sellAbove < 100.")
    r = indicators.rsi(close, n)
    pos, out = 0, []
    for v in r:
        if not np.isnan(v):
            if pos == 0 and v < lo:
                pos = 1
            elif pos == 1 and v > hi:
                pos = 0
        out.append(pos)
    return pd.Series(out, index=close.index), n, {"period": n, "buyBelow": lo, "sellAbove": hi}


def simulate(close: pd.Series, strategy: str, params: dict, folds: int = 4) -> dict:
    sig, warmup, used = _signals(close, strategy, params)
    pos = sig.shift(1).fillna(0)                      # decide on bar t, act on bar t+1 -> no look-ahead
    ret = close.pct_change().fillna(0)
    turnover = pos.diff().abs().fillna(0)
    strat = pos * ret - turnover * (COST + SLIPPAGE)
    start = min(warmup, len(close) - 2)
    strat, bh, pos = strat.iloc[start:], ret.iloc[start:], pos.iloc[start:]
    if len(strat) < 30:
        raise BadRequest("Not enough data after indicator warm-up. Use a longer date range.")
    eq, beq = (1 + strat).cumprod(), (1 + bh).cumprod()
    step = max(1, len(eq) // 500)
    curve = [{"time": t.strftime("%Y-%m-%d"), "strategy": round(float(eq[t]) * 100, 2),
              "buyHold": round(float(beq[t]) * 100, 2)} for t in eq.index[::step]]
    chunks = np.array_split(np.arange(len(strat)), max(2, min(folds, 8)))
    fold_rows = []
    for i, idx in enumerate(chunks, 1):
        if len(idx) < 5:
            continue
        s, b = strat.iloc[idx], bh.iloc[idx]
        fold_rows.append({"fold": i, "start": s.index[0].strftime("%Y-%m-%d"), "end": s.index[-1].strftime("%Y-%m-%d"),
                          "strategyReturn": round(float((1 + s).prod() - 1) * 100, 2),
                          "buyHoldReturn": round(float((1 + b).prod() - 1) * 100, 2),
                          "sharpe": _metrics(s)["sharpe"]})
    m = _metrics(strat)
    return {"params": used, "equityCurve": curve, **m,
            "tradeCount": int((pos.diff() == 1).sum()), "buyAndHold": _metrics(bh), "walkForward": fold_rows,
            "assumptions": {"transactionCostPct": COST * 100, "slippagePct": SLIPPAGE * 100,
                            "execution": "signal on bar close, position taken for the next bar's return",
                            "walkForward": "sequential out-of-sample windows with parameters fixed in advance"},
            "warning": WARNING}


async def run_backtest(symbol: str, strategy: str, params: dict, start: str | None, end: str | None) -> dict:
    try:
        end_d = datetime.strptime(end, "%Y-%m-%d").date() if end else date.today()
        start_d = datetime.strptime(start, "%Y-%m-%d").date() if start else end_d - timedelta(days=365 * 5)
    except ValueError:
        raise BadRequest("start and end must be YYYY-MM-DD.")
    if start_d >= end_d or (end_d - start_d).days < 200:
        raise BadRequest("Date range must be at least ~200 days and start must precede end.")
    sym = await market.resolve_symbol(symbol)
    candles = await market.get_range(sym, start_d.isoformat(), end_d.isoformat())
    close = indicators.to_df(candles)["close"]
    res = simulate(close, strategy, params or {})
    return {"symbol": sym, "strategy": strategy, "start": close.index[0].strftime("%Y-%m-%d"),
            "end": close.index[-1].strftime("%Y-%m-%d"), **res}
