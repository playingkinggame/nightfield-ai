"""Pydantic v2 models. Python fields are snake_case; JSON is camelCase via alias generator.
Services return camelCase dicts, which validate through the aliases (populate_by_name=True)."""
from typing import Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field
from pydantic.alias_generators import to_camel


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=to_camel, populate_by_name=True)


# ---------- market ----------
class SearchResult(CamelModel):
    symbol: str
    name: str
    type: Literal["stock", "fund"]
    exchange: str
    price: float = 0
    change_percent: float = 0


class StockQuote(CamelModel):
    symbol: str
    name: str
    exchange: Literal["NSE", "BSE"]
    sector: str
    price: float
    change: float
    change_percent: float
    open: float
    high: float
    low: float
    previous_close: float
    volume: int
    market_cap_cr: float
    pe: float
    eps: float
    fifty_two_week_high: float
    fifty_two_week_low: float
    beta: float
    dividend_yield: float
    sparkline: list[float]
    color_type: Literal["amber", "coral", "mint", "orchid"]


class Candle(CamelModel):
    time: Union[str, int]
    open: float
    high: float
    low: float
    close: float
    volume: int


class NewsItem(CamelModel):
    id: str
    title: str
    source: str
    time_ago: str
    url: str
    sentiment: Literal["Bullish", "Neutral", "Cautious"]
    impact: Literal["High", "Medium", "Low"]


class Holding(CamelModel):
    symbol: str
    name: str
    percentage: float


class FundData(CamelModel):
    code: str
    name: str
    category: str
    nav: float
    change_percent: float
    aum_cr: float
    expense_ratio: float
    one_year_return: float
    three_year_return: float
    five_year_return: float
    risk_rating: Literal["Very High", "Moderate", "Low"]
    top_holdings: list[Holding]
    description: str


class SeriesPoint(CamelModel):
    time: str
    value: float


class IndicatorsOut(CamelModel):
    sma20: float
    sma50: float
    ema20: float
    rsi14: float
    macd: float
    macd_signal: float
    volatility: float      # annualised %, over the selected period
    max_drawdown: float    # % magnitude (positive number)
    sharpe: float          # annualised, risk-free 6.5%
    series: dict[str, list[SeriesPoint]] = {}


class CompareSeries(CamelModel):
    symbol: str
    name: str
    series: list[SeriesPoint]   # rebased to 100
    return_pct: float
    volatility: float
    max_drawdown: float


class CompareOut(CamelModel):
    period: str
    symbols: list[CompareSeries]


class SignalComponent(CamelModel):
    name: str
    score: int
    max_score: int
    summary: str
    metrics: dict[str, Any]


class SignalOut(CamelModel):
    symbol: str
    signal: Literal["Bullish lean", "Neutral", "Cautious lean"]
    score: int
    max_score: int
    components: list[SignalComponent]
    label: str
    as_of: str


# ---------- backtest ----------
class BacktestIn(CamelModel):
    symbol: str
    strategy: Literal["sma_cross", "rsi_meanrev"]
    params: dict[str, float] = Field(default_factory=dict)
    start: str | None = None
    end: str | None = None


# ---------- auth ----------
class SignupIn(CamelModel):
    email: str
    password: str = Field(min_length=8, max_length=72)
    name: str = Field(min_length=1, max_length=120)


class LoginIn(CamelModel):
    email: str
    password: str = Field(max_length=72)


class UserOut(CamelModel):
    id: int
    email: str
    name: str


class AuthOut(CamelModel):
    token: str
    user: UserOut


# ---------- user data ----------
class WatchlistAdd(CamelModel):
    symbol: str


class TradeIn(CamelModel):
    symbol: str
    side: Literal["buy", "sell"]
    quantity: int = Field(gt=0, le=1_000_000)


class HoldingOut(CamelModel):
    symbol: str
    name: str
    quantity: int
    avg_price: float
    current_price: float
    value: float
    pnl: float
    pnl_percent: float
    stale: bool = False


class TradeRecord(CamelModel):
    id: int
    symbol: str
    side: str
    quantity: int
    price: float
    created_at: str


class PortfolioOut(CamelModel):
    cash: float
    holdings: list[HoldingOut]
    trades: list[TradeRecord]


class TradeOut(CamelModel):
    trade: TradeRecord
    cash: float
    holding: HoldingOut | None = None


class AllocationItem(CamelModel):
    symbol: str
    name: str
    value: float
    percentage: float


class SummaryOut(CamelModel):
    cash: float
    invested: float
    current_value: float
    total_value: float
    pnl: float
    pnl_percent: float
    holdings: list[HoldingOut]
    allocation: list[AllocationItem]
    max_drawdown: float
    note: str


# ---------- chat ----------
class ChatTurn(CamelModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=4000)


class ChatIn(CamelModel):
    message: str = Field(min_length=1, max_length=2000)
    symbol: str | None = Field(default=None, max_length=20)
    history: list[ChatTurn] | None = None   # optional: previous turns for context


class ChatMessageIn(CamelModel):
    role: Literal["user", "assistant"]
    content: str = Field(max_length=20000)
    symbol: str | None = None
    citations: list[dict[str, Any]] | None = None
    key_data: list[dict[str, Any]] | None = None
    tools: list[dict[str, Any]] | None = None


class ChatHistoryPost(CamelModel):
    messages: list[ChatMessageIn] = Field(max_length=100)


class ChatMessageOut(CamelModel):
    id: int
    role: str
    content: str
    symbol: str | None = None
    citations: list[dict[str, Any]] = []
    key_data: list[dict[str, Any]] = []
    tools: list[dict[str, Any]] = []
    created_at: str
