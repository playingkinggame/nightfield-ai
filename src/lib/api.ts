/**
 * Central API Gateway for NIGHTFIELD
 * Single point of connection for both mock evaluation preview and production FastAPI backend.
 * Switching between mock and live backend is controlled by VITE_USE_MOCK.
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

const USE_MOCK = import.meta.env.VITE_USE_MOCK !== "false";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

export interface SearchResult {
  symbol: string;
  name: string;
  type: "stock" | "fund";
  exchange: string;
  price: number;
  changePercent: number;
}

export interface ChatToolCall {
  id: string;
  tool: string;
  status: "calling" | "complete";
  details: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  toolCalls?: ChatToolCall[];
  citations?: { title: string; url: string; source: string }[];
  keyData?: { label: string; value: string }[];
  timestamp: string;
}

export const api = {
  /**
   * Search stocks, ETFs and index funds
   */
  async search(query: string): Promise<SearchResult[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 90));
      if (!query || query.trim().length === 0) {
        return STOCKS_DATA.slice(0, 6).map((s) => ({
          symbol: s.symbol,
          name: s.name,
          type: "stock",
          exchange: s.exchange,
          price: s.price,
          changePercent: s.changePercent,
        }));
      }

      const q = query.toLowerCase();
      const matchedStocks: SearchResult[] = STOCKS_DATA.filter(
        (s) =>
          s.symbol.toLowerCase().includes(q) ||
          s.name.toLowerCase().includes(q) ||
          s.sector.toLowerCase().includes(q)
      ).map((s) => ({
        symbol: s.symbol,
        name: s.name,
        type: "stock",
        exchange: s.exchange,
        price: s.price,
        changePercent: s.changePercent,
      }));

      const matchedFunds: SearchResult[] = FUNDS_DATA.filter(
        (f) =>
          f.code.toLowerCase().includes(q) ||
          f.name.toLowerCase().includes(q) ||
          f.category.toLowerCase().includes(q)
      ).map((f) => ({
        symbol: f.code,
        name: f.name,
        type: "fund",
        exchange: "MF",
        price: f.nav,
        changePercent: f.changePercent,
      }));

      return [...matchedStocks, ...matchedFunds];
    }

    const res = await fetch(`${API_URL}/api/search?q=${encodeURIComponent(query)}`);
    if (!res.ok) throw new Error("Search request failed");
    return res.json();
  },

  /**
   * Get single stock quote with complete metrics
   */
  async getQuote(symbol: string): Promise<StockQuote> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 60));
      const found = STOCKS_DATA.find(
        (s) => s.symbol.toUpperCase() === symbol.toUpperCase() || s.symbol.replace(".NS", "").toUpperCase() === symbol.toUpperCase()
      );
      if (found) return found;

      // Fallback dynamic quote if unknown symbol
      return {
        symbol: symbol.toUpperCase(),
        name: `${symbol.toUpperCase()} Enterprise`,
        exchange: "NSE",
        sector: "Market Equities",
        price: 2450.0,
        change: 18.5,
        changePercent: 0.76,
        open: 2432.0,
        high: 2468.0,
        low: 2420.0,
        previousClose: 2431.5,
        volume: 3400000,
        marketCapCr: 450000,
        pe: 26.5,
        eps: 92.4,
        fiftyTwoWeekHigh: 2700.0,
        fiftyTwoWeekLow: 1850.0,
        beta: 1.02,
        dividendYield: 1.05,
        sparkline: [2410, 2425, 2418, 2440, 2435, 2450],
        colorType: "amber",
      };
    }

    const res = await fetch(`${API_URL}/api/stocks/${symbol}/quote`);
    if (!res.ok) throw new Error("Quote fetch failed");
    return res.json();
  },

  /**
   * Get candle price history
   */
  async getHistory(
    symbol: string,
    period: "1D" | "1W" | "1M" | "6M" | "1Y" | "5Y" = "1M"
  ): Promise<CandleData[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 70));
      const quote = await api.getQuote(symbol);
      return generateCandleHistory(quote.price, period);
    }

    const res = await fetch(`${API_URL}/api/stocks/${symbol}/history?period=${period}`);
    if (!res.ok) throw new Error("History fetch failed");
    return res.json();
  },

  /**
   * Get stock related news
   */
  async getNews(symbol: string): Promise<NewsItem[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 50));
      return MOCK_NEWS[symbol] || MOCK_NEWS.default;
    }

    const res = await fetch(`${API_URL}/api/stocks/${symbol}/news`);
    if (!res.ok) throw new Error("News fetch failed");
    return res.json();
  },

  /**
   * Get index fund details
   */
  async getFund(code: string): Promise<FundData> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 60));
      const fund = FUNDS_DATA.find((f) => f.code.toUpperCase() === code.toUpperCase());
      if (fund) return fund;
      return FUNDS_DATA[0];
    }

    const res = await fetch(`${API_URL}/api/funds/${code}/nav`);
    if (!res.ok) throw new Error("Fund fetch failed");
    return res.json();
  },

  /**
   * Get all index funds
   */
  async getAllFunds(): Promise<FundData[]> {
    if (USE_MOCK) {
      await new Promise((r) => setTimeout(r, 50));
      return FUNDS_DATA;
    }

    const res = await fetch(`${API_URL}/api/funds`);
    if (!res.ok) throw new Error("Funds listing failed");
    return res.json();
  },

  /**
   * Stream research AI conversation with tool calls & citations
   */
  async streamChat({
    message,
    symbolContext,
    onToolCall,
    onChunk,
    onComplete,
    onError,
  }: {
    message: string;
    symbolContext?: string;
    onToolCall: (toolCall: ChatToolCall) => void;
    onChunk: (text: string) => void;
    onComplete: (metadata: { citations: { title: string; url: string; source: string }[]; keyData?: { label: string; value: string }[] }) => void;
    onError: (err: Error) => void;
  }): Promise<() => void> {
    let aborted = false;
    const abort = () => {
      aborted = true;
    };

    if (USE_MOCK) {
      const runMockStream = async () => {
        try {
          const sym = symbolContext || (message.toUpperCase().includes("TCS") ? "TCS.NS" : message.toUpperCase().includes("RELIANCE") ? "RELIANCE.NS" : "NIFTY 50");

          // Step 1: Simulate first tool call
          await new Promise((r) => setTimeout(r, 400));
          if (aborted) return;
          onToolCall({
            id: "tool-1",
            tool: `get_price_history("${sym}")`,
            status: "calling",
            details: "Fetching 1Y adjusted closing prices and momentum indicators...",
          });

          await new Promise((r) => setTimeout(r, 700));
          if (aborted) return;
          onToolCall({
            id: "tool-1",
            tool: `get_price_history("${sym}")`,
            status: "complete",
            details: "Retrieved 250 daily bars. 50-DMA: ₹3,980. RSI: 54.2.",
          });

          // Step 2: Second tool call
          await new Promise((r) => setTimeout(r, 400));
          if (aborted) return;
          onToolCall({
            id: "tool-2",
            tool: `get_regulatory_filings("${sym}")`,
            status: "calling",
            details: "Parsing latest quarterly results & investor presentation...",
          });

          await new Promise((r) => setTimeout(r, 700));
          if (aborted) return;
          onToolCall({
            id: "tool-2",
            tool: `get_regulatory_filings("${sym}")`,
            status: "complete",
            details: "Operating margin confirmed at 25.4%. Zero long-term debt.",
          });

          // Step 3: Stream synthesized analytical thesis
          const sampleParagraphs = [
            `### Fundamental & Valuation Analysis: **${sym}**\n\n`,
            `Based on freshly verified market ticks and audited filings, `,
            `${sym} is currently exhibiting sustained earnings compound power. `,
            `The company's Trailing Twelve Month (TTM) P/E ratio is trading within its 3-year historical median band of 28.4x to 31.2x. `,
            `Operating margins of **25.4%** remain best-in-class against peers, sustained by continuous deal pipeline expansion and cloud enterprise transformations.\n\n`,
            `**Key Takeaways for Investors:**\n`,
            `1. **Balance Sheet Fortitude:** Negligible net leverage with substantial free cash flow yield (>4.1%).\n`,
            `2. **Capital Return:** Steady dividend payout ratio exceeding 65% alongside periodic share repurchases.\n`,
            `3. **Technical Setup:** The price is resting comfortably above both the 50-day and 200-day simple moving averages, indicating constructive structural trend without signs of euphoria.\n\n`,
            `*Recommendation posture:* High-quality compounder for dollar-cost averaging / SIP into market pullbacks.`,
          ];

          for (const para of sampleParagraphs) {
            for (let i = 0; i < para.length; i += 6) {
              if (aborted) return;
              onChunk(para.slice(i, i + 6));
              await new Promise((r) => setTimeout(r, 18));
            }
          }

          onComplete({
            citations: [
              { title: "BSE Audited Financial Statements Q3", url: "https://www.bseindia.com", source: "BSE Corporate Disclosures" },
              { title: "NSE Live Real-Time Feed", url: "https://www.nseindia.com", source: "National Stock Exchange of India" },
              { title: "RBI Macroeconomic Credit Bulletin", url: "https://www.rbi.org.in", source: "Reserve Bank of India" },
            ],
            keyData: [
              { label: "P/E (TTM)", value: "31.2x" },
              { label: "ROCE", value: "48.2%" },
              { label: "50-DMA", value: "₹3,980.50" },
              { label: "FCF Yield", value: "4.15%" },
            ],
          });
        } catch (err) {
          onError(err instanceof Error ? err : new Error(String(err)));
        }
      };

      runMockStream();
      return abort;
    }

    // Live backend SSE implementation
    const controller = new AbortController();
    fetch(`${API_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message, symbol: symbolContext }),
      signal: controller.signal,
    })
      .then(async (response) => {
        if (!response.body) throw new Error("No response body");
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("event: tool")) {
              const dataLine = line.split("\n").find((l) => l.startsWith("data: "));
              if (dataLine) onToolCall(JSON.parse(dataLine.replace("data: ", "")));
            } else if (line.startsWith("data: ")) {
              const payload = line.replace("data: ", "");
              if (payload === "[DONE]") {
                onComplete({ citations: [] });
                return;
              }
              try {
                const parsed = JSON.parse(payload);
                if (parsed.chunk) onChunk(parsed.chunk);
                if (parsed.citations) onComplete({ citations: parsed.citations, keyData: parsed.keyData });
              } catch {
                onChunk(payload);
              }
            }
          }
        }
      })
      .catch((err) => {
        if (!aborted) onError(err);
      });

    return () => {
      aborted = true;
      controller.abort();
    };
  },
};
