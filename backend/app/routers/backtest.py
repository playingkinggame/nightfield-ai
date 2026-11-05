from fastapi import APIRouter

from app.schemas import BacktestIn
from app.services import backtest

router = APIRouter(prefix="/api", tags=["backtest"])


@router.post("/backtest")
async def run(body: BacktestIn):
    return await backtest.run_backtest(body.symbol, body.strategy, body.params, body.start, body.end)
