"""Market overview endpoints used by the terminal header and the default watchlist."""
from fastapi import APIRouter

from app.schemas import IndexQuote, StockQuote
from app.services import market as market_svc

router = APIRouter(prefix="/api/market", tags=["market"])


@router.get("/indices", response_model=list[IndexQuote])
async def indices():
    return await market_svc.get_indices()


@router.get("/popular", response_model=list[StockQuote])
async def popular():
    return await market_svc.get_popular()
