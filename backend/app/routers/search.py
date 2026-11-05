import asyncio

from fastapi import APIRouter, Query

from app.schemas import SearchResult
from app.services import funds, market

router = APIRouter(prefix="/api", tags=["search"])


@router.get("/search", response_model=list[SearchResult])
async def search(q: str = Query("", max_length=60)):
    q = q.strip()
    if len(q) < 1:
        return []
    stocks, fnds = await asyncio.gather(market.search_stocks(q, 12), funds.search_funds_priced(q, 4),
                                        return_exceptions=True)
    stocks = stocks if isinstance(stocks, list) else []
    fnds = fnds if isinstance(fnds, list) else []
    if not stocks and not fnds and isinstance(stocks, Exception):
        raise stocks
    fnds = fnds[:4]
    return (stocks[: 12 - len(fnds)] + fnds)[:12]
