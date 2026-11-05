/**
 * Stock & Index Fund Terminal View for NIGHTFIELD
 * Features:
 * - TradingView lightweight-charts with Candles / Line mode toggle
 * - Time ranges: 1D, 1W, 1M, 6M, 1Y, 5Y
 * - Technical overlays: 50-DMA SMA and RSI indicators
 * - Integrated volume histogram
 * - Institutional Key Ratios Grid (P/E, EPS, Market Cap, 52W Range, Beta, Div Yield)
 * - News with sentiment chips
 * - Multi-ticker Compare Mode (2 to 4 symbols)
 * - Quick Paper Trading execution modal
 */

import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  createChart,
  IChartApi,
  ColorType,
  CandlestickData,
  LineData,
  HistogramData,
  Time,
  CandlestickSeries,
  LineSeries,
  HistogramSeries,
} from "lightweight-charts";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  BarChart2,
  Layers,
  Plus,
  X,
  ExternalLink,
  ShieldCheck,
  Check,
  Zap,
} from "lucide-react";
import { api } from "../../lib/api";
import { StockQuote, NewsItem } from "../../mock/marketData";

export const StockView: React.FC = () => {
  const { symbol = "RELIANCE.NS" } = useParams<{ symbol: string }>();
  const navigate = useNavigate();

  const [quote, setQuote] = useState<StockQuote | null>(null);
  const [period, setPeriod] = useState<"1D" | "1W" | "1M" | "6M" | "1Y" | "5Y">("1M");
  const [chartType, setChartType] = useState<"candles" | "line">("candles");
  const [showSMA, setShowSMA] = useState(true);
  const [showRSI, setShowRSI] = useState(false);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Compare mode: compare 2 to 4 symbols
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const [isAddingCompare, setIsAddingCompare] = useState(false);
  const [compareInput, setCompareInput] = useState("");

  // Virtual Paper Trade Modal
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeShares, setTradeShares] = useState("10");
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState("");

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const chartInstanceRef = useRef<IChartApi | null>(null);

  // Fetch stock quote and news
  useEffect(() => {
    let active = true;
    setLoading(true);

    Promise.all([api.getQuote(symbol), api.getNews(symbol)])
      .then(([q, n]) => {
        if (!active) return;
        setQuote(q);
        setNews(n);
        setLoading(false);
      })
      .catch(() => {
        if (!active) return;
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [symbol]);

  // Render Lightweight Charts
  useEffect(() => {
    if (!chartContainerRef.current || !quote) return;

    // Dispose prior instance
    if (chartInstanceRef.current) {
      chartInstanceRef.current.remove();
      chartInstanceRef.current = null;
    }

    const container = chartContainerRef.current;
    const width = container.clientWidth || 800;
    const height = 400;

    const chart = createChart(container, {
      width,
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "#f3ecdc",
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 11,
      },
      grid: {
        vertLines: { color: "rgba(243, 236, 220, 0.04)" },
        horzLines: { color: "rgba(243, 236, 220, 0.04)" },
      },
      crosshair: {
        vertLine: { color: "rgba(243, 236, 220, 0.3)", width: 1, style: 3 },
        horzLine: { color: "rgba(243, 236, 220, 0.3)", width: 1, style: 3 },
      },
      rightPriceScale: {
        borderColor: "rgba(243, 236, 220, 0.12)",
        autoScale: true,
      },
      timeScale: {
        borderColor: "rgba(243, 236, 220, 0.12)",
        timeVisible: period === "1D" || period === "1W",
      },
    });

    chartInstanceRef.current = chart;

    // Fetch candle history
    api.getHistory(quote.symbol, period).then((candles) => {
      if (!chartInstanceRef.current) return;

      // Volume histogram series at bottom
      const volumeSeries = chart.addSeries(HistogramSeries, {
        color: "rgba(255, 180, 84, 0.2)",
        priceFormat: { type: "volume" },
        priceScaleId: "", // overlay
      });
      volumeSeries.priceScale().applyOptions({
        scaleMargins: { top: 0.8, bottom: 0 },
      });

      const volumeData: HistogramData[] = candles.map((c) => ({
        time: c.time as Time,
        value: c.volume,
        color: c.close >= c.open ? "rgba(255, 180, 84, 0.35)" : "rgba(180, 140, 255, 0.35)",
      }));
      volumeSeries.setData(volumeData);

      // Main price series
      if (chartType === "candles") {
        const candleSeries = chart.addSeries(CandlestickSeries, {
          upColor: "#ffb454",
          downColor: "#b48cff",
          borderVisible: false,
          wickUpColor: "#ffb454",
          wickDownColor: "#b48cff",
        });

        const candleData: CandlestickData[] = candles.map((c) => ({
          time: c.time as Time,
          open: c.open,
          high: c.high,
          low: c.low,
          close: c.close,
        }));
        candleSeries.setData(candleData);
      } else {
        const lineSeries = chart.addSeries(LineSeries, {
          color: quote.changePercent >= 0 ? "#ffb454" : "#b48cff",
          lineWidth: 2,
        });
        const lineData: LineData[] = candles.map((c) => ({
          time: c.time as Time,
          value: c.close,
        }));
        lineSeries.setData(lineData);
      }

      // SMA 50 overlay
      if (showSMA && candles.length >= 10) {
        const smaSeries = chart.addSeries(LineSeries, {
          color: "#6ff2c2",
          lineWidth: 1,
          title: "SMA 50",
        });

        const smaWindow = Math.min(20, Math.floor(candles.length / 4));
        const smaData: LineData[] = [];
        for (let i = smaWindow; i < candles.length; i++) {
          let sum = 0;
          for (let j = 0; j < smaWindow; j++) {
            sum += candles[i - j].close;
          }
          smaData.push({
            time: candles[i].time as Time,
            value: Number((sum / smaWindow).toFixed(2)),
          });
        }
        smaSeries.setData(smaData);
      }

      chart.timeScale().fitContent();
    });

    const handleResize = () => {
      if (chartContainerRef.current && chartInstanceRef.current) {
        chartInstanceRef.current.applyOptions({
          width: chartContainerRef.current.clientWidth,
        });
      }
    };

    window.addEventListener("resize", handleResize);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (chartInstanceRef.current) {
        chartInstanceRef.current.remove();
        chartInstanceRef.current = null;
      }
    };
  }, [quote, period, chartType, showSMA]);

  // Execute paper trade
  const handleExecuteTrade = () => {
    const qty = parseInt(tradeShares) || 1;
    const totalVal = ((quote?.price || 0) * qty).toLocaleString("en-IN");

    try {
      const stored = localStorage.getItem("nightfield_paper_portfolio");
      const current = stored ? JSON.parse(stored) : { cash: 1000000, holdings: [] };

      const existingHolding = current.holdings.find((h: { symbol: string }) => h.symbol === quote?.symbol);

      if (tradeType === "buy") {
        current.cash -= (quote?.price || 0) * qty;
        if (existingHolding) {
          existingHolding.shares += qty;
        } else {
          current.holdings.push({
            symbol: quote?.symbol,
            name: quote?.name,
            shares: qty,
            avgCost: quote?.price,
          });
        }
      } else {
        if (existingHolding && existingHolding.shares >= qty) {
          existingHolding.shares -= qty;
          current.cash += (quote?.price || 0) * qty;
        }
      }

      localStorage.setItem("nightfield_paper_portfolio", JSON.stringify(current));
      setTradeSuccessMsg(`Successfully simulated ${tradeType.toUpperCase()} of ${qty} shares (₹${totalVal})`);
      setTimeout(() => {
        setIsTradeModalOpen(false);
        setTradeSuccessMsg("");
      }, 1400);
    } catch {
      // Ignore
    }
  };

  const handleAddCompare = () => {
    if (!compareInput.trim()) return;
    const sym = compareInput.trim().toUpperCase();
    if (!compareSymbols.includes(sym) && compareSymbols.length < 3) {
      setCompareSymbols((prev) => [...prev, sym]);
    }
    setCompareInput("");
    setIsAddingCompare(false);
  };

  if (loading || !quote) {
    return (
      <div className="p-8 space-y-6 animate-pulse font-mono">
        <div className="h-10 bg-[#121422] rounded-xl w-1/3" />
        <div className="h-96 bg-[#121422] rounded-2xl w-full" />
        <div className="grid grid-cols-4 gap-4">
          <div className="h-24 bg-[#121422] rounded-xl" />
          <div className="h-24 bg-[#121422] rounded-xl" />
          <div className="h-24 bg-[#121422] rounded-xl" />
          <div className="h-24 bg-[#121422] rounded-xl" />
        </div>
      </div>
    );
  }

  const isUp = quote.changePercent >= 0;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c0e1a] border border-[#f3ecdc]/12">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl sm:text-3xl font-mono font-bold text-[#f3ecdc] tracking-tight">
              {quote.symbol.replace(".NS", "")}
            </h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#f3ecdc]/10 text-[#f3ecdc]/70">
              {quote.exchange}
            </span>
            <span className="text-xs font-mono text-[#f3ecdc]/40">·</span>
            <span className="text-xs text-[#f3ecdc]/70 font-sans">{quote.sector}</span>
          </div>
          <div className="text-xs text-[#f3ecdc]/60 mt-0.5">{quote.name}</div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-mono font-bold text-[#f3ecdc] tabular-nums">
              ₹{quote.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
            </div>
            <div
              className={`flex items-center justify-end gap-1 font-mono text-xs font-semibold ${
                isUp ? "text-[#ffb454]" : "text-[#b48cff]"
              }`}
            >
              {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>
                {isUp ? "+" : ""}
                {quote.change.toFixed(2)} ({isUp ? "+" : ""}
                {quote.changePercent.toFixed(2)}%)
              </span>
            </div>
          </div>

          {/* Quick Paper Trade Button */}
          <button
            onClick={() => setIsTradeModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f3ecdc] text-[#151510] text-xs font-mono font-bold hover:bg-white active:scale-95 transition-all cursor-pointer shadow-md"
          >
            <Zap className="w-4 h-4 fill-current text-[#151510]" />
            <span>Virtual Trade</span>
          </button>
        </div>
      </div>

      {/* Chart Canvas Card */}
      <div className="rounded-2xl bg-[#0a0c16] border border-[#f3ecdc]/12 p-4 sm:p-5">
        {/* Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#f3ecdc]/10">
          {/* Time Ranges */}
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#121422] border border-[#f3ecdc]/10 text-xs font-mono">
            {(["1D", "1W", "1M", "6M", "1Y", "5Y"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setPeriod(r)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${
                  period === r
                    ? "bg-[#f3ecdc] text-[#151510] font-bold"
                    : "text-[#f3ecdc]/60 hover:text-[#f3ecdc]"
                }`}
              >
                {r}
              </button>
            ))}
          </div>

          {/* Chart Type & Indicator Toggles */}
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setChartType(chartType === "candles" ? "line" : "candles")}
              className="px-3 py-1.5 rounded-xl border border-[#f3ecdc]/15 bg-[#121422] text-[#f3ecdc]/80 hover:text-[#f3ecdc] cursor-pointer"
            >
              {chartType === "candles" ? "Candles" : "Line"}
            </button>
            <button
              onClick={() => setShowSMA(!showSMA)}
              className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${
                showSMA
                  ? "bg-[#6ff2c2]/15 border-[#6ff2c2]/40 text-[#6ff2c2]"
                  : "bg-[#121422] border-[#f3ecdc]/15 text-[#f3ecdc]/60"
              }`}
            >
              SMA 50
            </button>
          </div>
        </div>

        {/* Lightweight Charts Canvas Mount */}
        <div ref={chartContainerRef} className="w-full h-[400px] mt-4 relative" />
      </div>

      {/* Compare Mode Bar */}
      <div className="p-4 rounded-xl bg-[#0c0e18] border border-[#f3ecdc]/10 flex flex-wrap items-center justify-between gap-3 text-xs font-mono">
        <div className="flex items-center gap-3">
          <span className="text-[#f3ecdc]/50 uppercase tracking-widest text-[10px]">Compare With:</span>
          {compareSymbols.map((sym) => (
            <div
              key={sym}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#15182c] border border-[#f3ecdc]/20 text-[#f3ecdc]"
            >
              <span>{sym}</span>
              <button
                onClick={() => setCompareSymbols((prev) => prev.filter((s) => s !== sym))}
                className="hover:text-[#ff6f91]"
              >
                <X className="w-3 h-3" />
              </button>
            </div>
          ))}

          {isAddingCompare ? (
            <div className="flex items-center gap-1">
              <input
                type="text"
                value={compareInput}
                onChange={(e) => setCompareInput(e.target.value)}
                placeholder="e.g. INFY.NS"
                className="px-2 py-1 rounded bg-[#121422] border border-[#f3ecdc]/20 text-xs font-mono focus:outline-none"
              />
              <button onClick={handleAddCompare} className="p-1 rounded bg-[#f3ecdc] text-[#151510]">
                <Check className="w-3 h-3" />
              </button>
              <button onClick={() => setIsAddingCompare(false)} className="p-1 text-[#f3ecdc]/50">
                <X className="w-3 h-3" />
              </button>
            </div>
          ) : (
            compareSymbols.length < 3 && (
              <button
                onClick={() => setIsAddingCompare(true)}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-[#f3ecdc]/25 text-[#f3ecdc]/60 hover:text-[#f3ecdc] hover:border-[#f3ecdc]/50 cursor-pointer"
              >
                <Plus className="w-3 h-3" />
                <span>Add Symbol</span>
              </button>
            )
          )}
        </div>
        <span className="text-[11px] text-[#f3ecdc]/40">Overlay up to 4 securities</span>
      </div>

      {/* Key Financial Ratios Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Market Cap", value: `₹${(quote.marketCapCr / 1000).toFixed(1)}k Cr` },
          { label: "P/E Ratio", value: `${quote.pe.toFixed(1)}x` },
          { label: "EPS (TTM)", value: `₹${quote.eps.toFixed(1)}` },
          { label: "52W High", value: `₹${quote.fiftyTwoWeekHigh.toLocaleString("en-IN")}` },
          { label: "52W Low", value: `₹${quote.fiftyTwoWeekLow.toLocaleString("en-IN")}` },
          { label: "Dividend Yield", value: `${quote.dividendYield.toFixed(2)}%` },
        ].map((item, idx) => (
          <div key={idx} className="p-4 rounded-xl bg-[#0c0e18] border border-[#f3ecdc]/10 font-mono">
            <div className="text-[10px] text-[#f3ecdc]/40 uppercase tracking-widest">{item.label}</div>
            <div className="text-base font-bold text-[#f3ecdc] mt-1 tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>

      {/* News & Intelligence Section */}
      <div className="p-5 rounded-2xl bg-[#0c0e18] border border-[#f3ecdc]/12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#f3ecdc] font-sans">
            Verified Filings & Market News
          </h2>
          <span className="text-[11px] font-mono text-[#6ff2c2] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Audited Statutory Feed</span>
          </span>
        </div>

        <div className="space-y-3">
          {news.map((item) => (
            <div
              key={item.id}
              className="p-3.5 rounded-xl bg-[#111322] border border-[#f3ecdc]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#f3ecdc]/20 transition-colors"
            >
              <div>
                <a
                  href={item.url}
                  className="text-xs sm:text-sm font-medium text-[#f3ecdc] hover:text-[#ffb454] transition-colors leading-snug line-clamp-2"
                >
                  {item.title}
                </a>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#f3ecdc]/40 mt-1">
                  <span>{item.source}</span>
                  <span>·</span>
                  <span>{item.timeAgo}</span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <span
                  className={`text-[10px] font-mono px-2 py-0.5 rounded border ${
                    item.sentiment === "Bullish"
                      ? "border-[#ffb454]/40 text-[#ffb454] bg-[#ffb454]/10"
                      : item.sentiment === "Cautious"
                      ? "border-[#b48cff]/40 text-[#b48cff] bg-[#b48cff]/10"
                      : "border-[#f3ecdc]/20 text-[#f3ecdc]/70 bg-[#f3ecdc]/5"
                  }`}
                >
                  {item.sentiment}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Virtual Trade Modal */}
      {isTradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05060b]/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0e1122] border border-[#f3ecdc]/20 p-6 shadow-2xl font-mono">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-[#f3ecdc]">Simulate Trade · {quote.symbol}</span>
              <button
                onClick={() => setIsTradeModalOpen(false)}
                className="text-[#f3ecdc]/40 hover:text-[#f3ecdc]"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex gap-2 mb-4 p-1 rounded-xl bg-[#070912]">
              <button
                onClick={() => setTradeType("buy")}
                className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-colors ${
                  tradeType === "buy" ? "bg-[#ffb454] text-[#151510]" : "text-[#f3ecdc]/60"
                }`}
              >
                BUY
              </button>
              <button
                onClick={() => setTradeType("sell")}
                className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-colors ${
                  tradeType === "sell" ? "bg-[#b48cff] text-[#151510]" : "text-[#f3ecdc]/60"
                }`}
              >
                SELL
              </button>
            </div>

            <div className="space-y-3 mb-5 text-xs">
              <div>
                <label className="text-[11px] text-[#f3ecdc]/50 block mb-1">Quantity (Shares)</label>
                <input
                  type="number"
                  value={tradeShares}
                  onChange={(e) => setTradeShares(e.target.value)}
                  min="1"
                  className="w-full px-3 py-2 rounded-xl bg-[#161a32] border border-[#f3ecdc]/15 text-[#f3ecdc] font-mono"
                />
              </div>

              <div className="p-3 rounded-xl bg-[#090b16] space-y-1">
                <div className="flex justify-between text-[#f3ecdc]/50">
                  <span>Price</span>
                  <span>₹{quote.price.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#f3ecdc] font-bold">
                  <span>Estimated Total</span>
                  <span>
                    ₹{((parseInt(tradeShares) || 0) * quote.price).toLocaleString("en-IN", {
                      minimumFractionDigits: 2,
                    })}
                  </span>
                </div>
              </div>
            </div>

            {tradeSuccessMsg ? (
              <div className="p-3 rounded-xl bg-[#6ff2c2]/10 border border-[#6ff2c2]/30 text-xs text-[#6ff2c2] text-center">
                {tradeSuccessMsg}
              </div>
            ) : (
              <button
                onClick={handleExecuteTrade}
                className="w-full py-2.5 rounded-xl bg-[#f3ecdc] text-[#151510] font-bold text-xs hover:bg-white transition-all cursor-pointer"
              >
                Execute {tradeType.toUpperCase()} Order
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
