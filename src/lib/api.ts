/**
 * Central API Gateway for NIGHTFIELD.
 * Live mode  : every call goes to the FastAPI backend (see http.ts for base URL + auth).
 * Mock mode  : VITE_USE_MOCK=true serves deterministic sample data (demo without a backend).
 */

import {
  STOCKS_DATA,
  FUNDS_DATA,
  MOCK_NEWS,
  generateCandleHistory,
  StockQuote,
  FundData,
  CandleData,
  NewsItem,
} from "../mock/marketData";
import { MARKET_INDICES } from "./constants";
import { USE_MOCK, WS_URL, ApiRequestError, request, toError, authHeaders, API_URL } from "./http";
import { mockStore } from "./mockStore";
import type {
  SearchResult, IndexQuote, Portfolio, PortfolioSummary, TradeResult, Indicators, Signal, CompareResult,
  PriceTick, ChatToolCall, ChatCitation, ChatKeyData, ChatMessage,
} from "./types";

export type { SearchResult, ChatToolCall, ChatMessage, IndexQuote, Portfolio, PortfolioSummary, TradeResult, Indicators, Signal, CompareResult, PriceTick };
export { ApiRequestError, USE_MOCK };

export type Period = "1D" | "1W" | "1M" | "6M" | "1Y" | "5Y";

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));
const enc = encodeURIComponent;
const unavailableInDemo = (what: string) => new ApiRequestError(`${what} needs the live backend (demo mode is on).`, 0, "demo_mode");

const findMock = (symbol: string): StockQuote | undefined =>
  STOCKS_DATA.find(
    (s) => s.symbol.toUpperCase() === symbol.toUpperCase() || s.symbol.replace(".NS", "").toUpperCase() === symbol.toUpperCase()
  );

export const api = {
  // ------------------------------------------------------------------ market data
  async search(query: string): Promise<SearchResult[]> {
    if (USE_MOCK) {
      await delay(90);
      const q = query.trim().toLowerCase();
      const stocks: SearchResult[] = STOCKS_DATA.filter(
        (s) => !q || s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q)
      ).map((s) => ({ symbol: s.symbol, name: s.name, type: "stock", exchange: s.exchange, price: s.price, changePercent: s.changePercent }));
      const funds: SearchResult[] = q
        ? FUNDS_DATA.filter((f) => f.code.toLowerCase().includes(q) || f.name.toLowerCase().includes(q)).map((f) => ({
            symbol: f.code, name: f.name, type: "fund", exchange: "MF", price: f.nav, changePercent: f.changePercent,
          }))
        : [];
      return [...stocks.slice(0, q ? 20 : 6), ...funds];
    }
    // Empty query: show the popular list instead of hitting the search endpoint with q=""
    if (!query.trim()) {
      const popular = await api.getPopular();
      return popular.map((s) => ({ symbol: s.symbol, name: s.name, type: "stock" as const, exchange: s.exchange, price: s.price, changePercent: s.changePercent }));
    }
    return request<SearchResult[]>(`/api/search?q=${enc(query.trim())}`);
  },

  async getQuote(symbol: string): Promise<StockQuote> {
    if (USE_MOCK) {
      await delay(60);
      const found = findMock(symbol);
      if (!found) throw new ApiRequestError(`No quote found for ${symbol}.`, 404, "not_found");
      return found;
    }
    return request<StockQuote>(`/api/stocks/${enc(symbol)}/quote`);
  },

  async getHistory(symbol: string, period: Period = "1M"): Promise<CandleData[]> {
    if (USE_MOCK) {
      await delay(70);
      return generateCandleHistory((await api.getQuote(symbol)).price, period);
    }
    return request<CandleData[]>(`/api/stocks/${enc(symbol)}/history?period=${period}`);
  },

  async getNews(symbol: string): Promise<NewsItem[]> {
    if (USE_MOCK) {
      await delay(50);
      return MOCK_NEWS[symbol] || MOCK_NEWS.default;
    }
    return request<NewsItem[]>(`/api/stocks/${enc(symbol)}/news`);
  },

  async getIndicators(symbol: string, period = "6M"): Promise<Indicators> {
    if (USE_MOCK) throw unavailableInDemo("Technical indicators");
    return request<Indicators>(`/api/stocks/${enc(symbol)}/indicators?period=${period}`);
  },

  async getSignal(symbol: string): Promise<Signal> {
    if (USE_MOCK) throw unavailableInDemo("The signal summary");
    return request<Signal>(`/api/stocks/${enc(symbol)}/signal`);
  },

  async compare(symbols: string[], period = "1Y"): Promise<CompareResult> {
    if (USE_MOCK) throw unavailableInDemo("Compare mode");
    return request<CompareResult>(`/api/compare?symbols=${enc(symbols.join(","))}&period=${period}`);
  },

  async getIndices(): Promise<IndexQuote[]> {
    if (USE_MOCK) return MARKET_INDICES.map((i) => ({ ...i, delayed: false }));
    return request<IndexQuote[]>("/api/market/indices");
  },

  async getPopular(): Promise<StockQuote[]> {
    if (USE_MOCK) return STOCKS_DATA.filter((s) => s.colorType !== "mint").slice(0, 8);
    return request<StockQuote[]>("/api/market/popular");
  },

  // ------------------------------------------------------------------ funds
  async getFund(code: string): Promise<FundData> {
    if (USE_MOCK) {
      const fund = FUNDS_DATA.find((f) => f.code.toUpperCase() === code.toUpperCase());
      if (!fund) throw new ApiRequestError(`Fund ${code} not found.`, 404, "not_found");
      return fund;
    }
    return request<FundData>(`/api/funds/${enc(code)}/nav`);
  },

  async getAllFunds(): Promise<FundData[]> {
    if (USE_MOCK) return FUNDS_DATA;
    return request<FundData[]>("/api/funds");
  },

  // ------------------------------------------------------------------ watchlist (auth required in live mode)
  async getWatchlist(): Promise<StockQuote[]> {
    if (USE_MOCK) return mockStore.watchlist();
    return request<StockQuote[]>("/api/watchlist", { auth: true });
  },
  async addToWatchlist(symbol: string): Promise<StockQuote[]> {
    if (USE_MOCK) return mockStore.addWatch(symbol);
    return request<StockQuote[]>("/api/watchlist", { method: "POST", body: { symbol }, auth: true });
  },
  async removeFromWatchlist(symbol: string): Promise<StockQuote[]> {
    if (USE_MOCK) return mockStore.removeWatch(symbol);
    return request<StockQuote[]>(`/api/watchlist/${enc(symbol)}`, { method: "DELETE", auth: true });
  },

  // ------------------------------------------------------------------ paper portfolio (auth required in live mode)
  async getPortfolio(): Promise<Portfolio> {
    if (USE_MOCK) return mockStore.portfolio();
    return request<Portfolio>("/api/portfolio", { auth: true });
  },
  async getPortfolioSummary(): Promise<PortfolioSummary> {
    if (USE_MOCK) return mockStore.summary();
    return request<PortfolioSummary>("/api/portfolio/summary", { auth: true });
  },
  async trade(symbol: string, side: "buy" | "sell", quantity: number): Promise<TradeResult> {
    if (USE_MOCK) {
      try {
        return mockStore.trade(symbol, side, quantity);
      } catch (e) {
        throw new ApiRequestError((e as Error).message, 400, "bad_request");
      }
    }
    return request<TradeResult>("/api/portfolio/trade", { method: "POST", body: { symbol, side, quantity }, auth: true });
  },
  async resetPortfolio(): Promise<Portfolio> {
    if (USE_MOCK) return mockStore.reset();
    return request<Portfolio>("/api/portfolio/reset", { method: "POST", auth: true });
  },

  // ------------------------------------------------------------------ live prices (WebSocket)
  /**
   * Subscribe to price ticks for up to 10 symbols. Auto-reconnects with backoff.
   * Returns an unsubscribe function. In mock mode no ticks are emitted.
   */
  subscribePrices(symbols: string[], onTick: (t: PriceTick) => void, onStatus?: (connected: boolean) => void): () => void {
    const list = [...new Set(symbols.filter(Boolean))].slice(0, 10);
    if (USE_MOCK || list.length === 0 || typeof WebSocket === "undefined") return () => {};

    let ws: WebSocket | null = null;
    let closed = false;
    let attempt = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;

    const connect = () => {
      if (closed) return;
      ws = new WebSocket(`${WS_URL}/ws/prices?symbols=${enc(list.join(","))}`);
      ws.onopen = () => {
        attempt = 0;
        onStatus?.(true);
      };
      ws.onmessage = (ev) => {
        try {
          onTick(JSON.parse(ev.data) as PriceTick);
        } catch {
          /* ignore malformed frame */
        }
      };
      ws.onclose = () => {
        onStatus?.(false);
        if (closed) return;
        timer = setTimeout(connect, Math.min(30000, 1000 * 2 ** attempt++));
      };
      ws.onerror = () => ws?.close();
    };
    connect();

    return () => {
      closed = true;
      if (timer) clearTimeout(timer);
      ws?.close();
    };
  },

  // ------------------------------------------------------------------ AI chat (SSE)
  async streamChat({
    message,
    symbolContext,
    history,
    onToolCall,
    onChunk,
    onComplete,
    onError,
  }: {
    message: string;
    symbolContext?: string;
    history?: { role: "user" | "assistant"; content: string }[];
    onToolCall: (toolCall: ChatToolCall) => void;
    onChunk: (text: string) => void;
    onComplete: (metadata: { citations: ChatCitation[]; keyData?: ChatKeyData[] }) => void;
    onError: (err: Error) => void;
  }): Promise<() => void> {
    if (USE_MOCK) return runMockChat({ message, symbolContext, onToolCall, onChunk, onComplete, onError });

    const controller = new AbortController();
    let aborted = false;
    let finished = false;
    let citations: ChatCitation[] = [];
    let keyData: ChatKeyData[] | undefined;

    const finish = () => {
      if (finished || aborted) return;
      finished = true;
      onComplete({ citations, keyData });
    };

    const handleBlock = (block: string) => {
      let event = "message";
      const dataLines: string[] = [];
      for (const raw of block.split("\n")) {
        if (raw.startsWith(":")) continue; // SSE comment / heartbeat
        if (raw.startsWith("event:")) event = raw.slice(6).trim();
        else if (raw.startsWith("data:")) dataLines.push(raw.slice(5).replace(/^ /, ""));
      }
      if (dataLines.length === 0) return;
      const payload = dataLines.join("\n");
      if (payload === "[DONE]") return finish();
      try {
        const parsed = JSON.parse(payload);
        if (event === "tool") onToolCall(parsed as ChatToolCall);
        else if (typeof parsed.chunk === "string") onChunk(parsed.chunk);
        else if (parsed.citations || parsed.keyData) {
          citations = parsed.citations ?? [];
          keyData = parsed.keyData ?? undefined;
        }
      } catch {
        /* ignore non-JSON frame */
      }
    };

    (async () => {
      try {
        const response = await fetch(`${API_URL}/api/chat`, {
          method: "POST",
          headers: { "Content-Type": "application/json", ...authHeaders() },
          body: JSON.stringify({ message, symbol: symbolContext || null, history: history?.slice(-8) ?? null }),
          signal: controller.signal,
        });
        if (!response.ok) throw await toError(response);
        if (!response.body) throw new Error("The server returned an empty response.");

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, "\n");
          const blocks = buffer.split("\n\n");
          buffer = blocks.pop() ?? "";
          blocks.forEach(handleBlock);
        }
        if (buffer.trim()) handleBlock(buffer);
        finish();
      } catch (err) {
        if (aborted || (err as Error).name === "AbortError") return;
        onError(err instanceof ApiRequestError ? err : new ApiRequestError(`Cannot reach the backend at ${API_URL}. Is it running?`, 0, "network_error"));
      }
    })();

    return () => {
      aborted = true;
      controller.abort();
    };
  },
};

/** Scripted demo stream used only when VITE_USE_MOCK=true. */
function runMockChat(p: {
  message: string;
  symbolContext?: string;
  onToolCall: (t: ChatToolCall) => void;
  onChunk: (t: string) => void;
  onComplete: (m: { citations: ChatCitation[]; keyData?: ChatKeyData[] }) => void;
  onError: (e: Error) => void;
}): () => void {
  let aborted = false;
  (async () => {
    try {
      const sym = p.symbolContext || "NIFTY 50";
      await delay(300);
      if (aborted) return;
      p.onToolCall({ id: "t1", tool: `get_price_history("${sym}")`, status: "calling", details: "Fetching 1Y prices..." });
      await delay(500);
      if (aborted) return;
      p.onToolCall({ id: "t1", tool: `get_price_history("${sym}")`, status: "complete", details: "Demo data retrieved." });
      const text = `**Demo mode** - this is a scripted reply for ${sym}. Start the backend and set VITE_USE_MOCK=false for live AI research.`;
      for (let i = 0; i < text.length; i += 6) {
        if (aborted) return;
        p.onChunk(text.slice(i, i + 6));
        await delay(18);
      }
      p.onComplete({ citations: [], keyData: [] });
    } catch (e) {
      p.onError(e instanceof Error ? e : new Error(String(e)));
    }
  })();
  return () => {
    aborted = true;
  };
}
