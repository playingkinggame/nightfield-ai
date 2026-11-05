from fastapi import APIRouter, Query

from app.errors import BadRequest
from app.schemas import Candle, CompareOut, IndicatorsOut, NewsItem, SignalOut, StockQuote
from app.services import indicators, market, news

router = APIRouter(prefix="/api", tags=["stocks"])


@router.get("/stocks/{symbol}/quote", response_model=StockQuote)
async def quote(symbol: str):
    return await market.get_quote(symbol)


@router.get("/stocks/{symbol}/history", response_model=list[Candle])
async def history(symbol: str, period: str = Query("1M")):
    return await market.get_history(symbol, period)


@router.get("/stocks/{symbol}/news", response_model=list[NewsItem])
async def stock_news(symbol: str):
    return await news.get_news(symbol)


@router.get("/stocks/{symbol}/indicators", response_model=IndicatorsOut)
async def stock_indicators(symbol: str, period: str = Query("6M")):
    return await indicators.get_indicators(symbol, period)


@router.get("/stocks/{symbol}/signal", response_model=SignalOut)
async def stock_signal(symbol: str):
    return await indicators.build_signal(symbol)


@router.get("/compare", response_model=CompareOut)
async def compare(symbols: str = Query(...), period: str = Query("1Y")):
    syms = [s.strip() for s in symbols.split(",") if s.strip()]
    if not syms:
        raise BadRequest("symbols is required, e.g. ?symbols=TCS.NS,INFY.NS")
    return await indicators.compare(syms, period)
