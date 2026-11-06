/** API response types shared by api.ts, mockStore.ts and the views. They mirror backend/app/schemas.py (camelCase). */

export interface SearchResult {
  symbol: string;
  name: string;
  type: "stock" | "fund";
  exchange: string;
  price: number;
  changePercent: number;
}

export interface IndexQuote {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  isUp: boolean;
  delayed?: boolean;
}

export interface Holding {
  symbol: string;
  name: string;
  quantity: number;
  avgPrice: number;
  currentPrice: number;
  value: number;
  pnl: number;
  pnlPercent: number;
  stale: boolean;
}

export interface TradeRecord {
  id: number;
  symbol: string;
  side: "buy" | "sell";
  quantity: number;
  price: number;
  createdAt: string;
}

export interface Portfolio {
  cash: number;
  holdings: Holding[];
  trades: TradeRecord[];
}

export interface TradeResult {
  trade: TradeRecord;
  cash: number;
  holding: Holding | null;
}

export interface PortfolioSummary {
  cash: number;
  invested: number;
  currentValue: number;
  totalValue: number;
  pnl: number;
  pnlPercent: number;
  holdings: Holding[];
  allocation: { symbol: string; name: string; value: number; percentage: number }[];
  maxDrawdown: number;
  note: string;
}

export interface Indicators {
  sma20: number;
  sma50: number;
  ema20: number;
  rsi14: number;
  macd: number;
  macdSignal: number;
  volatility: number;
  maxDrawdown: number;
  sharpe: number;
  series: Record<string, { time: string; value: number }[]>;
}

export interface Signal {
  symbol: string;
  signal: "Bullish lean" | "Neutral" | "Cautious lean";
  score: number;
  maxScore: number;
  components: { name: string; score: number; maxScore: number; summary: string; metrics: Record<string, unknown> }[];
  label: string;
  asOf: string;
}

export interface CompareResult {
  period: string;
  symbols: { symbol: string; name: string; series: { time: string; value: number }[]; returnPct: number }[];
}

export interface PriceTick {
  symbol: string;
  price?: number;
  change?: number;
  changePercent?: number;
  ts?: number;
  delayed?: boolean;
  error?: string;
}

export interface ChatToolCall {
  id: string;
  tool: string;
  status: "calling" | "complete";
  details: string;
}

export interface ChatCitation {
  title: string;
  url: string;
  source: string;
}

export interface ChatKeyData {
  label: string;
  value: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ChatToolCall[];
  citations?: ChatCitation[];
  keyData?: ChatKeyData[];
  timestamp: string;
}
