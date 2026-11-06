/**
 * Stock & Index Terminal View for NIGHTFIELD (/app/stock/:symbol)
 * Everything on this page comes from the FastAPI backend:
 *   quote (+30s refresh, +/ws/prices live ticks), history candles, news, indicators, signal,
 *   multi-symbol compare, watchlist toggle and paper-trade execution.
 * Prices are ~15 minutes delayed (Yahoo Finance).
 */

import React, { useState, useEffect, useRef, useMemo } from "react";
import { useParams, Link } from "react-router-dom";
import {
  createChart, IChartApi, ColorType, CandlestickData, LineData, HistogramData, Time,
  CandlestickSeries, LineSeries, HistogramSeries,
} from "lightweight-charts";
import { ArrowUpRight, ArrowDownRight, Plus, X, ShieldCheck, Check, Zap, Star, Loader2, Radio, AlertTriangle } from "lucide-react";
import { api, Indicators, Signal, CompareResult, Period } from "../../lib/api";
import { auth, User } from "../../lib/auth";
import { useLivePrices } from "../../lib/hooks";
import type { StockQuote, NewsItem } from "../../mock/marketData";

const COMPARE_COLORS = ["#ffb454", "#6ff2c2", "#b48cff", "#ff6f91"];
const CHART_THEME = {
  layout: { background: { type: ColorType.Solid, color: "transparent" }, textColor: "#f3ecdc", fontFamily: "'JetBrains Mono', monospace", fontSize: 11 },
  grid: { vertLines: { color: "rgba(243, 236, 220, 0.04)" }, horzLines: { color: "rgba(243, 236, 220, 0.04)" } },
  rightPriceScale: { borderColor: "rgba(243, 236, 220, 0.12)", autoScale: true },
};

export const StockView: React.FC = () => {
  const { symbol = "RELIANCE.NS" } = useParams<{ symbol: string }>();

  const [user, setUser] = useState<User | null>(auth.getUser());
  useEffect(() => auth.subscribe(setUser), []);

  const [baseQuote, setBaseQuote] = useState<StockQuote | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [period, setPeriod] = useState<Period>("1M");
  const [chartType, setChartType] = useState<"candles" | "line">("candles");
  const [showSMA, setShowSMA] = useState(true);
  const [chartError, setChartError] = useState<string | null>(null);

  const [indicators, setIndicators] = useState<Indicators | null>(null);
  const [signal, setSignal] = useState<Signal | null>(null);
  const [analyticsError, setAnalyticsError] = useState<string | null>(null);

  const [watching, setWatching] = useState(false);
  const [watchBusy, setWatchBusy] = useState(false);

  // Compare mode
  const [compareSymbols, setCompareSymbols] = useState<string[]>([]);
  const [isAddingCompare, setIsAddingCompare] = useState(false);
  const [compareInput, setCompareInput] = useState("");
  const [compareData, setCompareData] = useState<CompareResult | null>(null);
  const [compareError, setCompareError] = useState<string | null>(null);
  const [compareLoading, setCompareLoading] = useState(false);

  // Paper trade modal
  const [isTradeModalOpen, setIsTradeModalOpen] = useState(false);
  const [tradeType, setTradeType] = useState<"buy" | "sell">("buy");
  const [tradeShares, setTradeShares] = useState("10");
  const [tradeBusy, setTradeBusy] = useState(false);
  const [tradeError, setTradeError] = useState<string | null>(null);
  const [tradeSuccessMsg, setTradeSuccessMsg] = useState("");

  const chartContainerRef = useRef<HTMLDivElement>(null);
  const compareContainerRef = useRef<HTMLDivElement>(null);
  const upRef = useRef(true); // read by the chart effect without re-creating the chart on every tick

  // ---- load quote + news (news failure is non-fatal) -------------------------------------------
  useEffect(() => {
    let active = true;
    setLoading(true);
    setLoadError(null);
    setBaseQuote(null);
    setCompareSymbols([]);
    Promise.allSettled([api.getQuote(symbol), api.getNews(symbol)]).then(([q, n]) => {
      if (!active) return;
      if (q.status === "fulfilled") setBaseQuote(q.value);
      else setLoadError((q.reason as Error)?.message || "Could not load this symbol.");
      setNews(n.status === "fulfilled" ? n.value : []);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, [symbol]);

  const resolvedSymbol = baseQuote?.symbol;

  // ---- silent quote refresh every 30s (the WebSocket covers faster ticks) -----------------------
  useEffect(() => {
    if (!resolvedSymbol) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      api.getQuote(resolvedSymbol).then(setBaseQuote).catch(() => {});
    }, 30000);
    return () => clearInterval(id);
  }, [resolvedSymbol]);

  // ---- live ticks -------------------------------------------------------------------------------
  const { ticks, connected } = useLivePrices(resolvedSymbol ? [resolvedSymbol] : []);
  const quote: StockQuote | null = useMemo(() => {
    if (!baseQuote) return null;
    const t = ticks[baseQuote.symbol.toUpperCase()];
    if (!t || typeof t.price !== "number") return baseQuote;
    const change = t.change ?? (baseQuote.previousClose ? t.price - baseQuote.previousClose : baseQuote.change);
    const pct = t.changePercent ?? (baseQuote.previousClose ? (change / baseQuote.previousClose) * 100 : baseQuote.changePercent);
    return { ...baseQuote, price: t.price, change: Number(change.toFixed(2)), changePercent: Number(pct.toFixed(2)) };
  }, [baseQuote, ticks]);
  upRef.current = (quote?.changePercent ?? 0) >= 0;

  // ---- indicators + signal (backend analytics) --------------------------------------------------
  useEffect(() => {
    if (!resolvedSymbol) return;
    let active = true;
    setIndicators(null);
    setSignal(null);
    setAnalyticsError(null);
    Promise.allSettled([api.getIndicators(resolvedSymbol, "6M"), api.getSignal(resolvedSymbol)]).then(([i, s]) => {
      if (!active) return;
      if (i.status === "fulfilled") setIndicators(i.value);
      if (s.status === "fulfilled") setSignal(s.value);
      if (i.status === "rejected" && s.status === "rejected") setAnalyticsError((i.reason as Error)?.message || "Analytics unavailable.");
    });
    return () => {
      active = false;
    };
  }, [resolvedSymbol]);

  // ---- watchlist membership ---------------------------------------------------------------------
  useEffect(() => {
    setWatching(false);
    if (!user || !resolvedSymbol) return;
    let active = true;
    api.getWatchlist().then((list) => active && setWatching(list.some((q) => q.symbol === resolvedSymbol))).catch(() => {});
    return () => {
      active = false;
    };
  }, [user?.id, resolvedSymbol]);

  const toggleWatch = async () => {
    if (!resolvedSymbol) return;
    setWatchBusy(true);
    try {
      const list = watching ? await api.removeFromWatchlist(resolvedSymbol) : await api.addToWatchlist(resolvedSymbol);
      setWatching(list.some((q) => q.symbol === resolvedSymbol));
    } catch {
      /* surfaced by unchanged star state */
    } finally {
      setWatchBusy(false);
    }
  };

  // ---- main price chart (re-built only when symbol/period/type/SMA change - NOT on price ticks) -
  useEffect(() => {
    const container = chartContainerRef.current;
    if (!container || !resolvedSymbol) return;
    let disposed = false;
    setChartError(null);

    const chart: IChartApi = createChart(container, {
      ...CHART_THEME,
      width: container.clientWidth || 800,
      height: 400,
      crosshair: {
        vertLine: { color: "rgba(243, 236, 220, 0.3)", width: 1, style: 3 },
        horzLine: { color: "rgba(243, 236, 220, 0.3)", width: 1, style: 3 },
      },
      timeScale: { borderColor: "rgba(243, 236, 220, 0.12)", timeVisible: period === "1D" || period === "1W" },
    });

    api
      .getHistory(resolvedSymbol, period)
      .then((candles) => {
        if (disposed) return;
        if (candles.length === 0) {
          setChartError("No price history available for this range.");
          return;
        }
        const volume = chart.addSeries(HistogramSeries, { color: "rgba(255, 180, 84, 0.2)", priceFormat: { type: "volume" }, priceScaleId: "" });
        volume.priceScale().applyOptions({ scaleMargins: { top: 0.8, bottom: 0 } });
        volume.setData(
          candles.map((c): HistogramData => ({
            time: c.time as Time, value: c.volume,
            color: c.close >= c.open ? "rgba(255, 180, 84, 0.35)" : "rgba(180, 140, 255, 0.35)",
          }))
        );

        if (chartType === "candles") {
          const s = chart.addSeries(CandlestickSeries, {
            upColor: "#ffb454", downColor: "#b48cff", borderVisible: false, wickUpColor: "#ffb454", wickDownColor: "#b48cff",
          });
          s.setData(candles.map((c): CandlestickData => ({ time: c.time as Time, open: c.open, high: c.high, low: c.low, close: c.close })));
        } else {
          const s = chart.addSeries(LineSeries, { color: upRef.current ? "#ffb454" : "#b48cff", lineWidth: 2 });
          s.setData(candles.map((c): LineData => ({ time: c.time as Time, value: c.close })));
        }

        // Simple moving average over the visible candles (window adapts to short ranges)
        const win = Math.min(20, Math.max(2, Math.floor(candles.length / 4)));
        if (showSMA && candles.length > win) {
          const sma = chart.addSeries(LineSeries, { color: "#6ff2c2", lineWidth: 1, title: `SMA ${win}` });
          const out: LineData[] = [];
          for (let i = win - 1; i < candles.length; i++) {
            let sum = 0;
            for (let j = 0; j < win; j++) sum += candles[i - j].close;
            out.push({ time: candles[i].time as Time, value: Number((sum / win).toFixed(2)) });
          }
          sma.setData(out);
        }
        chart.timeScale().fitContent();
      })
      .catch((e: Error) => !disposed && setChartError(e.message));

    const onResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener("resize", onResize);
    return () => {
      disposed = true;
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [resolvedSymbol, period, chartType, showSMA]);

  // ---- compare data -----------------------------------------------------------------------------
  useEffect(() => {
    setCompareData(null);
    setCompareError(null);
    if (!resolvedSymbol || compareSymbols.length === 0) return;
    let active = true;
    setCompareLoading(true);
    const p = period === "1D" || period === "1W" ? "1M" : period; // compare uses daily data
    api
      .compare([resolvedSymbol, ...compareSymbols], p)
      .then((d) => active && setCompareData(d))
      .catch((e: Error) => active && setCompareError(e.message))
      .finally(() => active && setCompareLoading(false));
    return () => {
      active = false;
    };
  }, [resolvedSymbol, compareSymbols, period]);

  // ---- compare chart (rebased to 100) -----------------------------------------------------------
  useEffect(() => {
    const container = compareContainerRef.current;
    if (!container || !compareData) return;
    const chart = createChart(container, {
      ...CHART_THEME, width: container.clientWidth || 800, height: 280,
      timeScale: { borderColor: "rgba(243, 236, 220, 0.12)" },
    });
    compareData.symbols.forEach((s, i) => {
      const line = chart.addSeries(LineSeries, { color: COMPARE_COLORS[i % COMPARE_COLORS.length], lineWidth: 2, title: s.symbol.replace(/\.(NS|BO)$/, "") });
      line.setData(s.series.map((p): LineData => ({ time: p.time as Time, value: p.value })));
    });
    chart.timeScale().fitContent();
    const onResize = () => chart.applyOptions({ width: container.clientWidth });
    window.addEventListener("resize", onResize);
    return () => {
      window.removeEventListener("resize", onResize);
      chart.remove();
    };
  }, [compareData]);

  const handleAddCompare = () => {
    const sym = compareInput.trim().toUpperCase();
    if (sym && !compareSymbols.includes(sym) && sym !== resolvedSymbol && compareSymbols.length < 3) {
      setCompareSymbols((prev) => [...prev, sym]);
    }
    setCompareInput("");
    setIsAddingCompare(false);
  };

  // ---- paper trade ------------------------------------------------------------------------------
  const openTrade = () => {
    setTradeError(null);
    setTradeSuccessMsg("");
    setIsTradeModalOpen(true);
  };

  const handleExecuteTrade = async () => {
    const qty = parseInt(tradeShares, 10);
    if (!quote || !qty || qty < 1) {
      setTradeError("Enter a whole number of shares (1 or more).");
      return;
    }
    setTradeBusy(true);
    setTradeError(null);
    try {
      const res = await api.trade(quote.symbol, tradeType, qty);
      setTradeSuccessMsg(
        `${tradeType.toUpperCase()} ${res.trade.quantity} @ ₹${res.trade.price.toLocaleString("en-IN")} filled. Cash left: ₹${res.cash.toLocaleString("en-IN", { maximumFractionDigits: 0 })}`
      );
      setTimeout(() => {
        setIsTradeModalOpen(false);
        setTradeSuccessMsg("");
      }, 2200);
    } catch (e) {
      setTradeError((e as Error).message);
    } finally {
      setTradeBusy(false);
    }
  };

  // ---- render -----------------------------------------------------------------------------------
  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-pulse font-mono">
        <div className="h-10 bg-[#121422] rounded-xl w-1/3" />
        <div className="h-96 bg-[#121422] rounded-2xl w-full" />
        <div className="grid grid-cols-4 gap-4">
          {[0, 1, 2, 3].map((i) => <div key={i} className="h-24 bg-[#121422] rounded-xl" />)}
        </div>
      </div>
    );
  }

  if (loadError || !quote) {
    return (
      <div className="p-8 max-w-xl mx-auto mt-16 text-center font-mono space-y-4">
        <AlertTriangle className="w-8 h-8 text-[#ff6f91] mx-auto" />
        <div className="text-sm text-[#f3ecdc]">Couldn't load {symbol}</div>
        <div className="text-xs text-[#ff6f91]">{loadError ?? "Unknown error"}</div>
        <Link to="/app" className="inline-block px-4 py-2 rounded-xl border border-[#f3ecdc]/20 text-xs text-[#f3ecdc]">Back to watchlist</Link>
      </div>
    );
  }

  const isUp = quote.changePercent >= 0;
  const ratio = (v: number, f: (n: number) => string) => (v > 0 ? f(v) : "—");

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Header card */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-[#0c0e1a] border border-[#f3ecdc]/12">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl sm:text-3xl font-mono font-bold text-[#f3ecdc] tracking-tight">{quote.symbol.replace(/\.(NS|BO)$/, "")}</h1>
            <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#f3ecdc]/10 text-[#f3ecdc]/70">{quote.exchange}</span>
            <span className="text-xs font-mono text-[#f3ecdc]/40">·</span>
            <span className="text-xs text-[#f3ecdc]/70 font-sans">{quote.sector}</span>
            <button
              onClick={user ? toggleWatch : undefined}
              disabled={watchBusy || !user}
              title={user ? (watching ? "Remove from watchlist" : "Add to watchlist") : "Sign in to use a watchlist"}
              className={`p-1.5 rounded-lg border transition-colors ${watching ? "border-[#ffb454]/50 text-[#ffb454] bg-[#ffb454]/10" : "border-[#f3ecdc]/15 text-[#f3ecdc]/50"} ${user ? "cursor-pointer hover:text-[#ffb454]" : "opacity-50"}`}
            >
              {watchBusy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Star className={`w-3.5 h-3.5 ${watching ? "fill-current" : ""}`} />}
            </button>
          </div>
          <div className="text-xs text-[#f3ecdc]/60 mt-0.5">{quote.name}</div>
        </div>

        <div className="flex items-center gap-6">
          <div className="text-right">
            <div className="text-2xl sm:text-3xl font-mono font-bold text-[#f3ecdc] tabular-nums">
              ₹{quote.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </div>
            <div className={`flex items-center justify-end gap-1 font-mono text-xs font-semibold ${isUp ? "text-[#ffb454]" : "text-[#b48cff]"}`}>
              {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
              <span>{isUp ? "+" : ""}{quote.change.toFixed(2)} ({isUp ? "+" : ""}{quote.changePercent.toFixed(2)}%)</span>
            </div>
            <div className={`flex items-center justify-end gap-1 text-[10px] font-mono mt-0.5 ${connected ? "text-[#6ff2c2]" : "text-[#f3ecdc]/40"}`}>
              <Radio className="w-3 h-3" /> {connected ? "streaming · ~15m delayed" : "~15m delayed · refreshes every 30s"}
            </div>
          </div>

          <button
            onClick={openTrade}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#f3ecdc] text-[#151510] text-xs font-mono font-bold hover:bg-white active:scale-95 transition-all cursor-pointer shadow-md"
          >
            <Zap className="w-4 h-4 fill-current text-[#151510]" />
            <span>Virtual Trade</span>
          </button>
        </div>
      </div>

      {/* Chart card */}
      <div className="rounded-2xl bg-[#0a0c16] border border-[#f3ecdc]/12 p-4 sm:p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 pb-4 border-b border-[#f3ecdc]/10">
          <div className="flex items-center gap-1 p-1 rounded-xl bg-[#121422] border border-[#f3ecdc]/10 text-xs font-mono">
            {(["1D", "1W", "1M", "6M", "1Y", "5Y"] as const).map((r) => (
              <button
                key={r}
                onClick={() => setPeriod(r)}
                className={`px-2.5 py-1 rounded-lg transition-colors cursor-pointer ${period === r ? "bg-[#f3ecdc] text-[#151510] font-bold" : "text-[#f3ecdc]/60 hover:text-[#f3ecdc]"}`}
              >
                {r}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 text-xs font-mono">
            <button
              onClick={() => setChartType(chartType === "candles" ? "line" : "candles")}
              className="px-3 py-1.5 rounded-xl border border-[#f3ecdc]/15 bg-[#121422] text-[#f3ecdc]/80 hover:text-[#f3ecdc] cursor-pointer"
            >
              {chartType === "candles" ? "Candles" : "Line"}
            </button>
            <button
              onClick={() => setShowSMA(!showSMA)}
              className={`px-3 py-1.5 rounded-xl border transition-colors cursor-pointer ${showSMA ? "bg-[#6ff2c2]/15 border-[#6ff2c2]/40 text-[#6ff2c2]" : "bg-[#121422] border-[#f3ecdc]/15 text-[#f3ecdc]/60"}`}
            >
              SMA
            </button>
          </div>
        </div>
        <div className="relative mt-4">
          <div ref={chartContainerRef} className="w-full h-[400px]" />
          {chartError && (
            <div className="absolute inset-0 flex items-center justify-center text-xs font-mono text-[#ff6f91] bg-[#0a0c16]/80">{chartError}</div>
          )}
        </div>
      </div>

      {/* Compare bar + chart */}
      <div className="p-4 rounded-xl bg-[#0c0e18] border border-[#f3ecdc]/10 space-y-4 text-xs font-mono">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 flex-wrap">
            <span className="text-[#f3ecdc]/50 uppercase tracking-widest text-[10px]">Compare With:</span>
            {compareSymbols.map((sym) => (
              <div key={sym} className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#15182c] border border-[#f3ecdc]/20 text-[#f3ecdc]">
                <span>{sym}</span>
                <button onClick={() => setCompareSymbols((prev) => prev.filter((s) => s !== sym))} className="hover:text-[#ff6f91]">
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
            {isAddingCompare ? (
              <div className="flex items-center gap-1">
                <input
                  autoFocus
                  type="text"
                  value={compareInput}
                  onChange={(e) => setCompareInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCompare()}
                  placeholder="e.g. INFY.NS"
                  className="px-2 py-1 rounded bg-[#121422] border border-[#f3ecdc]/20 text-xs font-mono focus:outline-none"
                />
                <button onClick={handleAddCompare} className="p-1 rounded bg-[#f3ecdc] text-[#151510]"><Check className="w-3 h-3" /></button>
                <button onClick={() => setIsAddingCompare(false)} className="p-1 text-[#f3ecdc]/50"><X className="w-3 h-3" /></button>
              </div>
            ) : (
              compareSymbols.length < 3 && (
                <button
                  onClick={() => setIsAddingCompare(true)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded-lg border border-dashed border-[#f3ecdc]/25 text-[#f3ecdc]/60 hover:text-[#f3ecdc] hover:border-[#f3ecdc]/50 cursor-pointer"
                >
                  <Plus className="w-3 h-3" /> <span>Add Symbol</span>
                </button>
              )
            )}
          </div>
          <span className="text-[11px] text-[#f3ecdc]/40">Performance rebased to 100 · up to 4 securities</span>
        </div>

        {compareSymbols.length > 0 && (
          <div>
            {compareLoading && <div className="py-8 text-center text-[#f3ecdc]/40 flex items-center justify-center gap-2"><Loader2 className="w-4 h-4 animate-spin" /> Comparing...</div>}
            {compareError && <div className="py-4 text-center text-[#ff6f91]">{compareError}</div>}
            {compareData && (
              <>
                <div className="flex flex-wrap gap-4 mb-2">
                  {compareData.symbols.map((s, i) => (
                    <span key={s.symbol} className="flex items-center gap-1.5 text-[#f3ecdc]/80">
                      <span className="w-2.5 h-2.5 rounded-full" style={{ background: COMPARE_COLORS[i % COMPARE_COLORS.length] }} />
                      {s.symbol.replace(/\.(NS|BO)$/, "")}
                      <span className={s.returnPct >= 0 ? "text-[#ffb454]" : "text-[#b48cff]"}>{s.returnPct >= 0 ? "+" : ""}{s.returnPct.toFixed(2)}%</span>
                    </span>
                  ))}
                </div>
                <div ref={compareContainerRef} className="w-full h-[280px]" />
              </>
            )}
          </div>
        )}
      </div>

      {/* Key ratios */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3">
        {[
          { label: "Market Cap", value: ratio(quote.marketCapCr, (v) => `₹${(v / 1000).toFixed(1)}k Cr`) },
          { label: "P/E Ratio", value: ratio(quote.pe, (v) => `${v.toFixed(1)}x`) },
          { label: "EPS (TTM)", value: ratio(quote.eps, (v) => `₹${v.toFixed(1)}`) },
          { label: "52W High", value: ratio(quote.fiftyTwoWeekHigh, (v) => `₹${v.toLocaleString("en-IN")}`) },
          { label: "52W Low", value: ratio(quote.fiftyTwoWeekLow, (v) => `₹${v.toLocaleString("en-IN")}`) },
          { label: "Dividend Yield", value: ratio(quote.dividendYield, (v) => `${v.toFixed(2)}%`) },
        ].map((item) => (
          <div key={item.label} className="p-4 rounded-xl bg-[#0c0e18] border border-[#f3ecdc]/10 font-mono">
            <div className="text-[10px] text-[#f3ecdc]/40 uppercase tracking-widest">{item.label}</div>
            <div className="text-base font-bold text-[#f3ecdc] mt-1 tabular-nums">{item.value}</div>
          </div>
        ))}
      </div>

      {/* Technical indicators + signal (from /indicators and /signal) */}
      {(indicators || signal || analyticsError) && (
        <div className="p-5 rounded-2xl bg-[#0c0e18] border border-[#f3ecdc]/12 space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <h2 className="text-base font-semibold text-[#f3ecdc] font-sans">Technical Snapshot (6M, daily)</h2>
            {signal && (
              <span className={`text-xs font-mono px-2.5 py-1 rounded border ${
                signal.signal === "Bullish lean" ? "border-[#ffb454]/40 text-[#ffb454] bg-[#ffb454]/10"
                : signal.signal === "Cautious lean" ? "border-[#b48cff]/40 text-[#b48cff] bg-[#b48cff]/10"
                : "border-[#f3ecdc]/20 text-[#f3ecdc]/70 bg-[#f3ecdc]/5"}`}>
                {signal.signal} · {signal.score}/{signal.maxScore}
              </span>
            )}
          </div>
          {analyticsError && <div className="text-xs font-mono text-[#ff6f91]">{analyticsError}</div>}
          {indicators && (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-8 gap-3 font-mono">
              {[
                ["RSI 14", indicators.rsi14.toFixed(1)],
                ["SMA 20", `₹${indicators.sma20.toLocaleString("en-IN")}`],
                ["SMA 50", `₹${indicators.sma50.toLocaleString("en-IN")}`],
                ["EMA 20", `₹${indicators.ema20.toLocaleString("en-IN")}`],
                ["MACD", indicators.macd.toFixed(2)],
                ["Volatility", `${indicators.volatility.toFixed(1)}%`],
                ["Max DD", `-${indicators.maxDrawdown.toFixed(1)}%`],
                ["Sharpe", indicators.sharpe.toFixed(2)],
              ].map(([l, v]) => (
                <div key={l} className="p-3 rounded-xl bg-[#111322] border border-[#f3ecdc]/10">
                  <div className="text-[10px] text-[#f3ecdc]/40 uppercase tracking-widest">{l}</div>
                  <div className="text-sm font-bold text-[#f3ecdc] mt-1 tabular-nums">{v}</div>
                </div>
              ))}
            </div>
          )}
          {signal && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {signal.components.map((c) => (
                <div key={c.name} className="p-3 rounded-xl bg-[#111322] border border-[#f3ecdc]/10 text-xs">
                  <div className="flex justify-between font-mono text-[#f3ecdc]">
                    <span className="font-semibold">{c.name}</span>
                    <span className="text-[#f3ecdc]/50">{c.score}/{c.maxScore}</span>
                  </div>
                  <div className="text-[#f3ecdc]/60 mt-1 font-sans">{c.summary}</div>
                </div>
              ))}
            </div>
          )}
          {signal && <p className="text-[11px] font-mono text-[#f3ecdc]/40">{signal.label}</p>}
        </div>
      )}

      {/* News */}
      <div className="p-5 rounded-2xl bg-[#0c0e18] border border-[#f3ecdc]/12 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#f3ecdc] font-sans">Market News</h2>
          <span className="text-[11px] font-mono text-[#6ff2c2] flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" /> <span>Live headlines · sentiment is keyword-based</span>
          </span>
        </div>
        <div className="space-y-3">
          {news.length === 0 && <div className="py-6 text-center text-xs font-mono text-[#f3ecdc]/40">No recent headlines found for this symbol.</div>}
          {news.map((item) => (
            <div key={item.id} className="p-3.5 rounded-xl bg-[#111322] border border-[#f3ecdc]/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:border-[#f3ecdc]/20 transition-colors">
              <div>
                <a href={item.url} target="_blank" rel="noopener noreferrer" className="text-xs sm:text-sm font-medium text-[#f3ecdc] hover:text-[#ffb454] transition-colors leading-snug line-clamp-2">
                  {item.title}
                </a>
                <div className="flex items-center gap-2 text-[11px] font-mono text-[#f3ecdc]/40 mt-1">
                  <span>{item.source}</span><span>·</span><span>{item.timeAgo}</span>
                </div>
              </div>
              <span className={`shrink-0 text-[10px] font-mono px-2 py-0.5 rounded border ${
                item.sentiment === "Bullish" ? "border-[#ffb454]/40 text-[#ffb454] bg-[#ffb454]/10"
                : item.sentiment === "Cautious" ? "border-[#b48cff]/40 text-[#b48cff] bg-[#b48cff]/10"
                : "border-[#f3ecdc]/20 text-[#f3ecdc]/70 bg-[#f3ecdc]/5"}`}>
                {item.sentiment}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Trade modal */}
      {isTradeModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05060b]/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0e1122] border border-[#f3ecdc]/20 p-6 shadow-2xl font-mono">
            <div className="flex justify-between items-center mb-4">
              <span className="text-sm font-bold text-[#f3ecdc]">Paper Trade · {quote.symbol}</span>
              <button onClick={() => setIsTradeModalOpen(false)} className="text-[#f3ecdc]/40 hover:text-[#f3ecdc]"><X className="w-4 h-4" /></button>
            </div>

            {!user ? (
              <div className="text-xs text-center space-y-4 py-4">
                <p className="text-[#f3ecdc]/70 font-sans">Sign in to place virtual trades. Your positions are saved to your account.</p>
                <Link to="/login" className="inline-block px-4 py-2 rounded-xl bg-[#f3ecdc] text-[#151510] font-bold">Sign in</Link>
              </div>
            ) : (
              <>
                <div className="flex gap-2 mb-4 p-1 rounded-xl bg-[#070912]">
                  {(["buy", "sell"] as const).map((t) => (
                    <button
                      key={t}
                      onClick={() => setTradeType(t)}
                      className={`flex-1 py-1.5 text-xs rounded-lg font-bold transition-colors ${tradeType === t ? (t === "buy" ? "bg-[#ffb454]" : "bg-[#b48cff]") + " text-[#151510]" : "text-[#f3ecdc]/60"}`}
                    >
                      {t.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div className="space-y-3 mb-5 text-xs">
                  <div>
                    <label className="text-[11px] text-[#f3ecdc]/50 block mb-1">Quantity (Shares)</label>
                    <input type="number" value={tradeShares} onChange={(e) => setTradeShares(e.target.value)} min="1" step="1"
                      className="w-full px-3 py-2 rounded-xl bg-[#161a32] border border-[#f3ecdc]/15 text-[#f3ecdc] font-mono" />
                  </div>
                  <div className="p-3 rounded-xl bg-[#090b16] space-y-1">
                    <div className="flex justify-between text-[#f3ecdc]/50"><span>Indicative price</span><span>₹{quote.price.toFixed(2)}</span></div>
                    <div className="flex justify-between text-[#f3ecdc] font-bold">
                      <span>Estimated Total</span>
                      <span>₹{((parseInt(tradeShares, 10) || 0) * quote.price).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>
                    <div className="text-[10px] text-[#f3ecdc]/40 pt-1">Fills at the server's latest (delayed) price. Virtual money only.</div>
                  </div>
                </div>
                {tradeError && <div className="mb-3 p-2.5 rounded-lg bg-[#ff6f91]/10 border border-[#ff6f91]/30 text-xs text-[#ff6f91]">{tradeError}</div>}
                {tradeSuccessMsg ? (
                  <div className="p-3 rounded-xl bg-[#6ff2c2]/10 border border-[#6ff2c2]/30 text-xs text-[#6ff2c2] text-center">{tradeSuccessMsg}</div>
                ) : (
                  <button
                    onClick={handleExecuteTrade}
                    disabled={tradeBusy}
                    className="w-full py-2.5 rounded-xl bg-[#f3ecdc] text-[#151510] font-bold text-xs hover:bg-white transition-all cursor-pointer disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    {tradeBusy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Execute {tradeType.toUpperCase()} Order
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
