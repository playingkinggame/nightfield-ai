/**
 * Watchlist Desk for NIGHTFIELD (/app)
 * - Signed in : the user's saved watchlist (GET/POST/DELETE /api/watchlist)
 * - Guest / empty list : popular NSE stocks (GET /api/market/popular)
 * Quotes re-poll every 30s; the first 10 rows also receive live ticks over the /ws/prices WebSocket.
 * Data is ~15 min delayed (Yahoo Finance).
 */

import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, Plus, X, RefreshCw, Loader2, Radio } from "lucide-react";
import { api } from "../../lib/api";
import { auth, User } from "../../lib/auth";
import { usePolling, useLivePrices } from "../../lib/hooks";
import type { StockQuote } from "../../mock/marketData";

type Filter = "all" | "tech" | "finance" | "funds";

export const WatchlistView: React.FC = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(auth.getUser());
  useEffect(() => auth.subscribe(setUser), []);

  const [filter, setFilter] = useState<Filter>("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [addInput, setAddInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, setData, error, loading, refresh } = usePolling<{ quotes: StockQuote[]; personal: boolean }>(
    async () => {
      if (user) {
        const quotes = await api.getWatchlist();
        if (quotes.length > 0) return { quotes, personal: true };
        return { quotes: await api.getPopular(), personal: false }; // empty list -> show suggestions
      }
      return { quotes: await api.getPopular(), personal: false };
    },
    30000,
    [user?.id]
  );

  const quotes = data?.quotes ?? [];
  const personal = data?.personal ?? false;

  const { ticks, connected } = useLivePrices(quotes.slice(0, 10).map((q) => q.symbol));
  const live = (q: StockQuote): StockQuote => {
    const t = ticks[q.symbol.toUpperCase()];
    return t && typeof t.price === "number"
      ? { ...q, price: t.price, change: t.change ?? q.change, changePercent: t.changePercent ?? q.changePercent }
      : q;
  };

  const filtered = useMemo(
    () =>
      quotes.filter((s) => {
        const q = searchQuery.toLowerCase();
        if (q && !(s.symbol.toLowerCase().includes(q) || s.name.toLowerCase().includes(q) || s.sector.toLowerCase().includes(q))) return false;
        if (filter === "tech") return s.sector.includes("Technology");
        if (filter === "finance") return s.sector.includes("Banking") || s.sector.includes("Financial");
        if (filter === "funds") return s.sector.includes("Index") || s.colorType === "mint";
        return true;
      }),
    [quotes, searchQuery, filter]
  );

  const mutate = async (fn: () => Promise<StockQuote[]>) => {
    setBusy(true);
    setActionError(null);
    try {
      const next = await fn();
      if (next.length === 0) refresh();
      else setData({ quotes: next, personal: true });
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const handleAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const sym = addInput.trim();
    if (!sym) return;
    mutate(() => api.addToWatchlist(sym)).then(() => setAddInput(""));
  };

  const tabs: [Filter, string][] = [["all", "All Securities"], ["tech", "Tech & IT"], ["finance", "Banking"], ["funds", "Index Funds"]];

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-[#f3ecdc] tracking-tight">NSE & BSE Watchlist Desk</h1>
          <p className="text-xs sm:text-sm text-[#f3ecdc]/60 mt-1 font-sans flex items-center gap-2 flex-wrap">
            <span>Market quotes delayed ~15 minutes (Yahoo Finance), refreshed automatically.</span>
            <span className={`inline-flex items-center gap-1 text-[11px] font-mono ${connected ? "text-[#6ff2c2]" : "text-[#f3ecdc]/40"}`}>
              <Radio className="w-3 h-3" />
              {connected ? "streaming" : "polling"}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0c0e1a] border border-[#f3ecdc]/10 text-xs font-mono">
          {tabs.map(([key, label]) => (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
                filter === key ? "bg-[#f3ecdc] text-[#151510] font-bold" : "text-[#f3ecdc]/60 hover:text-[#f3ecdc]"
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Guest / empty-state banner */}
      {!personal && (
        <div className="p-4 rounded-xl bg-[#0c0e18] border border-[#ffb454]/25 text-xs font-mono text-[#f3ecdc]/80 flex flex-wrap items-center justify-between gap-3">
          {user ? (
            <span>Your watchlist is empty - showing popular stocks. Add symbols below or use the star on any stock page.</span>
          ) : (
            <span>
              Showing popular stocks. <Link to="/login" className="text-[#ffb454] hover:underline">Sign in</Link> to save your own watchlist and paper-trade.
            </span>
          )}
        </div>
      )}

      {user && (
        <form onSubmit={handleAdd} className="flex items-center gap-2 text-xs font-mono">
          <input
            value={addInput}
            onChange={(e) => setAddInput(e.target.value)}
            placeholder="Add symbol e.g. INFY.NS or WIPRO"
            className="w-64 px-3 py-2 rounded-xl bg-[#121424] border border-[#f3ecdc]/10 text-[#f3ecdc] placeholder:text-[#f3ecdc]/40 focus:outline-none focus:border-[#f3ecdc]/40"
          />
          <button
            type="submit"
            disabled={busy || !addInput.trim()}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#f3ecdc] text-[#151510] font-bold disabled:opacity-50 cursor-pointer"
          >
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            Add
          </button>
          {actionError && <span className="text-[#ff6f91]">{actionError}</span>}
        </form>
      )}

      <div className="rounded-2xl bg-[#0a0c16] border border-[#f3ecdc]/12 overflow-hidden">
        <div className="p-4 border-b border-[#f3ecdc]/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-[#f3ecdc]/70">
            <span className="font-bold text-[#f3ecdc]">{filtered.length}</span>
            <span>{personal ? "Securities in your watchlist" : "Securities"}</span>
            <button onClick={() => refresh()} className="ml-2 p-1 rounded text-[#f3ecdc]/40 hover:text-[#f3ecdc] cursor-pointer" title="Refresh now">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="w-56">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Filter list..."
              className="w-full px-3 py-1 rounded-lg bg-[#121424] border border-[#f3ecdc]/10 text-xs text-[#f3ecdc] placeholder:text-[#f3ecdc]/40 focus:outline-none"
            />
          </div>
        </div>

        {loading && !data ? (
          <div className="py-16 text-center text-xs font-mono text-[#f3ecdc]/40 flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" /> Loading market data...
          </div>
        ) : error && !data ? (
          <div className="py-16 text-center text-xs font-mono space-y-3">
            <div className="text-[#ff6f91]">{error.message}</div>
            <button onClick={() => refresh()} className="px-3 py-1.5 rounded-lg border border-[#f3ecdc]/20 text-[#f3ecdc] cursor-pointer">Retry</button>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-16 text-center text-xs font-mono text-[#f3ecdc]/40">No securities match this filter.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#070810] text-[#f3ecdc]/40 uppercase tracking-widest text-[10px] border-b border-[#f3ecdc]/10">
                <tr>
                  <th className="py-3 px-5">Symbol</th>
                  <th className="py-3 px-4">Company Name</th>
                  <th className="py-3 px-4">Price (INR)</th>
                  <th className="py-3 px-4">Day Change</th>
                  <th className="py-3 px-4">P/E Ratio</th>
                  <th className="py-3 px-4">Market Cap</th>
                  <th className="py-3 px-5 text-right">Trend</th>
                  {personal && <th className="py-3 px-3" />}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3ecdc]/5 text-[#f3ecdc]/80">
                {filtered.map((raw) => {
                  const stock = live(raw);
                  const isUp = stock.changePercent >= 0;
                  const isFund = stock.colorType === "mint";
                  const stroke = isFund ? "#6ff2c2" : isUp ? "#ffb454" : "#b48cff";
                  const pts = stock.sparkline ?? [];
                  const min = Math.min(...pts);
                  const r = Math.max(...pts) - min || 1;
                  const sw = 90, sh = 24;
                  const poly = pts.length > 1
                    ? pts.map((v, i) => `${(i / (pts.length - 1)) * sw},${sh - ((v - min) / r) * (sh - 6) - 3}`).join(" ")
                    : "";
                  return (
                    <tr
                      key={stock.symbol}
                      onClick={() => navigate(`/app/stock/${encodeURIComponent(stock.symbol)}`)}
                      className="hover:bg-[#111325] transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-5">
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#f3ecdc] group-hover:text-[#ffb454] transition-colors">
                            {stock.symbol.replace(/\.(NS|BO)$/, "")}
                          </span>
                          <span className="text-[10px] text-[#f3ecdc]/40 px-1 rounded bg-[#f3ecdc]/5">{stock.exchange}</span>
                        </div>
                      </td>
                      <td className="py-4 px-4 font-sans text-xs text-[#f3ecdc]/70">{stock.name}</td>
                      <td className="py-4 px-4 font-bold text-[#f3ecdc] tabular-nums">
                        ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </td>
                      <td className="py-4 px-4 tabular-nums">
                        <span className={`flex items-center gap-0.5 font-semibold ${isUp ? "text-[#ffb454]" : "text-[#b48cff]"}`}>
                          {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                          {isUp ? "+" : ""}
                          {stock.changePercent.toFixed(2)}%
                        </span>
                      </td>
                      <td className="py-4 px-4 tabular-nums text-[#f3ecdc]/60">{stock.pe > 0 ? `${stock.pe.toFixed(1)}x` : "—"}</td>
                      <td className="py-4 px-4 tabular-nums text-[#f3ecdc]/60">
                        {stock.marketCapCr > 0 ? `₹${(stock.marketCapCr / 1000).toFixed(1)}k Cr` : "—"}
                      </td>
                      <td className="py-4 px-5 text-right">
                        {poly && (
                          <svg viewBox={`0 0 ${sw} ${sh}`} className="w-20 h-6 inline-block">
                            <polyline fill="none" stroke={stroke} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" points={poly} />
                          </svg>
                        )}
                      </td>
                      {personal && (
                        <td className="py-4 px-3 text-right">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              mutate(() => api.removeFromWatchlist(stock.symbol));
                            }}
                            className="p-1 rounded text-[#f3ecdc]/30 hover:text-[#ff6f91] hover:bg-[#ff6f91]/10 cursor-pointer"
                            title="Remove from watchlist"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
