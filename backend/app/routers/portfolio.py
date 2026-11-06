"""Watchlist + PAPER-trading portfolio (virtual INR 10,00,000; no real money, no brokerage)."""
import asyncio
import logging

import pandas as pd
from fastapi import APIRouter, Depends, Query
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from app.config import settings
from app.db import get_db
from app.errors import BadRequest, NotFoundError, validate_symbol
from app.models import Position, Trade, User, WatchlistItem
from app.schemas import PortfolioOut, StockQuote, SummaryOut, TradeIn, TradeOut, WatchlistAdd
from app.security import get_current_user
from app.services import indicators, market

log = logging.getLogger(__name__)
router = APIRouter(prefix="/api", tags=["portfolio"])


# ---------------- watchlist ----------------
async def _watchlist_quotes(db: Session, user: User) -> list[dict]:
    rows = db.scalars(select(WatchlistItem).where(WatchlistItem.user_id == user.id).order_by(WatchlistItem.id)).all()
    res = await asyncio.gather(*[market.get_quote(r.symbol) for r in rows], return_exceptions=True)
    return [r for r in res if isinstance(r, dict)]


@router.get("/watchlist", response_model=list[StockQuote])
async def get_watchlist(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await _watchlist_quotes(db, user)


@router.post("/watchlist", response_model=list[StockQuote])
async def add_watchlist(body: WatchlistAdd, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sym = await market.resolve_symbol(validate_symbol(body.symbol))
    if not db.scalar(select(WatchlistItem).where(WatchlistItem.user_id == user.id, WatchlistItem.symbol == sym)):
        db.add(WatchlistItem(user_id=user.id, symbol=sym))
        db.commit()
    return await _watchlist_quotes(db, user)


async def _remove(symbol: str, user: User, db: Session):
    sym = validate_symbol(symbol)
    cands = {sym, sym + ".NS", sym + ".BO"}
    rows = db.scalars(select(WatchlistItem).where(WatchlistItem.user_id == user.id,
                                                  WatchlistItem.symbol.in_(cands))).all()
    for r in rows:
        db.delete(r)
    db.commit()
    return await _watchlist_quotes(db, user)


@router.delete("/watchlist/{symbol}", response_model=list[StockQuote])
async def delete_watchlist_path(symbol: str, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    return await _remove(symbol, user, db)


@router.delete("/watchlist", response_model=list[StockQuote])
async def delete_watchlist_query(symbol: str = Query(...), user: User = Depends(get_current_user),
                                 db: Session = Depends(get_db)):
    return await _remove(symbol, user, db)


# ---------------- portfolio ----------------
def _holding(p: Position, price: float | None) -> dict:
    stale = price is None
    cur = p.avg_price if stale else price
    value = cur * p.quantity
    cost = p.avg_price * p.quantity
    return {"symbol": p.symbol, "name": p.name, "quantity": p.quantity, "avgPrice": round(p.avg_price, 2),
            "currentPrice": round(cur, 2), "value": round(value, 2), "pnl": round(value - cost, 2),
            "pnlPercent": round((value / cost - 1) * 100, 2) if cost else 0.0, "stale": stale}


async def _holdings(db: Session, user: User) -> list[dict]:
    pos = db.scalars(select(Position).where(Position.user_id == user.id).order_by(Position.symbol)).all()
    quotes = await asyncio.gather(*[market.quick_quote(p.symbol) for p in pos], return_exceptions=True)
    return [_holding(p, q["price"] if isinstance(q, dict) and q.get("price") else None) for p, q in zip(pos, quotes)]


def _trade_rec(t: Trade) -> dict:
    return {"id": t.id, "symbol": t.symbol, "side": t.side, "quantity": t.quantity, "price": round(t.price, 2),
            "createdAt": t.created_at.isoformat()}


@router.get("/portfolio", response_model=PortfolioOut)
async def portfolio(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    trades = db.scalars(select(Trade).where(Trade.user_id == user.id).order_by(Trade.id.desc()).limit(50)).all()
    return {"cash": round(user.cash, 2), "holdings": await _holdings(db, user), "trades": [_trade_rec(t) for t in trades]}


@router.post("/portfolio/trade", response_model=TradeOut)
async def trade(body: TradeIn, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    sym = await market.resolve_symbol(validate_symbol(body.symbol))
    q = await market.quick_quote(sym)
    price = q["price"]
    if price <= 0:
        raise BadRequest("Live price unavailable for this symbol; cannot paper-trade it right now.")
    pos = db.scalar(select(Position).where(Position.user_id == user.id, Position.symbol == sym))
    cost = round(price * body.quantity, 2)
    if body.side == "buy":
        if cost > user.cash:
            raise BadRequest(f"Insufficient virtual cash: need ₹{cost:,.2f}, have ₹{user.cash:,.2f}.")
        user.cash = round(user.cash - cost, 2)
        if pos:
            total = pos.quantity + body.quantity
            pos.avg_price = (pos.avg_price * pos.quantity + price * body.quantity) / total
            pos.quantity = total
        else:
            pos = Position(user_id=user.id, symbol=sym, name=q["name"], quantity=body.quantity, avg_price=price)
            db.add(pos)
    else:
        if not pos or pos.quantity < body.quantity:
            have = pos.quantity if pos else 0
            raise BadRequest(f"Cannot sell {body.quantity} shares of {sym}: you hold {have}.")
        user.cash = round(user.cash + cost, 2)
        pos.quantity -= body.quantity
    t = Trade(user_id=user.id, symbol=sym, side=body.side, quantity=body.quantity, price=price)
    db.add(t)
    holding = _holding(pos, price) if pos and pos.quantity > 0 else None
    if pos and pos.quantity == 0:
        db.delete(pos)
    db.commit()
    db.refresh(t)
    return {"trade": _trade_rec(t), "cash": round(user.cash, 2), "holding": holding}


@router.post("/portfolio/reset", response_model=PortfolioOut)
async def reset_portfolio(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Wipe positions + trade history and restore the starting virtual cash."""
    db.execute(delete(Position).where(Position.user_id == user.id))
    db.execute(delete(Trade).where(Trade.user_id == user.id))
    user.cash = settings.starting_cash
    db.commit()
    return await portfolio(user, db)


async def _portfolio_drawdown(holdings: list[dict]) -> float:
    """Max drawdown of today's holdings replayed over the last year (not a record of actual paper-trade equity)."""
    if not holdings:
        return 0.0
    try:
        res = await asyncio.gather(*[market.get_daily(h["symbol"], "1y") for h in holdings])
        series = [indicators.to_df(c)["close"] * h["quantity"] for h, c in zip(holdings, res)]
        total = pd.concat(series, axis=1).sort_index().ffill().dropna().sum(axis=1)
        return round(indicators.max_drawdown(total), 2)
    except Exception as e:  # noqa: BLE001
        log.info("portfolio drawdown unavailable: %s", e)
        return 0.0


@router.get("/portfolio/summary", response_model=SummaryOut)
async def summary(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    holdings = await _holdings(db, user)
    invested = sum(h["avgPrice"] * h["quantity"] for h in holdings)
    current = sum(h["value"] for h in holdings)
    total = user.cash + current
    alloc = [{"symbol": h["symbol"], "name": h["name"], "value": h["value"],
              "percentage": round(h["value"] / total * 100, 2) if total else 0.0} for h in holdings]
    alloc.append({"symbol": "CASH", "name": "Virtual cash", "value": round(user.cash, 2),
                  "percentage": round(user.cash / total * 100, 2) if total else 0.0})
    return {"cash": round(user.cash, 2), "invested": round(invested, 2), "currentValue": round(current, 2),
            "totalValue": round(total, 2), "pnl": round(current - invested, 2),
            "pnlPercent": round((current / invested - 1) * 100, 2) if invested else 0.0,
            "holdings": holdings, "allocation": alloc, "maxDrawdown": await _portfolio_drawdown(holdings),
            "note": "Paper trading with virtual money. Drawdown replays current holdings over the last year."}
