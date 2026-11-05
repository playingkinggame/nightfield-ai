from fastapi import APIRouter

from app.schemas import FundData
from app.services import funds

router = APIRouter(prefix="/api/funds", tags=["funds"])


@router.get("", response_model=list[FundData])
async def list_funds():
    return await funds.list_funds()


@router.get("/{code}/nav", response_model=FundData)
async def fund_nav(code: str):
    return await funds.get_fund(code)
