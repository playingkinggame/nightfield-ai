/**
 * Paper Portfolio for NIGHTFIELD (/app/portfolio)
 * Backed by the FastAPI backend (virtual INR 10,00,000, no real money):
 *   GET /api/portfolio, GET /api/portfolio/summary, POST /api/portfolio/trade, POST /api/portfolio/reset
 * Valuations use the same ~15-min delayed quotes as the rest of the terminal and refresh every 30s.
 */

import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { RotateCcw, Plus, Loader2, X, AlertTriangle } from "lucide-react";
import { api, PortfolioSummary, Portfolio } from "../../lib/api";
import { auth, User } from "../../lib/auth";
import { usePolling } from "../../lib/hooks";

const START_CAPITAL = 1_000_000;
const inr = (n: number, d = 0) => n.toLocaleString("en-IN", { maximumFractionDigits: d, minimumFractionDigits: d });
const signed = (n: number, d = 0) => `${n >= 0 ? "+" : "-"}₹${inr(Math.abs(n), d)}`;

export const PortfolioView: React.FC = () => {
  const [user, setUser] = useState<User | null>(auth.getUser());
  useEffect(() => auth.subscribe(setUser), []);

  const { data, error, loading, refresh } = usePolling<{ summary: PortfolioSummary; portfolio: Portfolio } | null>(
    async () => {
      if (!user) return null;
      const [summary, portfolio] = await Promise.all([api.getPortfolioSummary(), api.getPortfolio()]);
      return { summary, portfolio };
    },
    30000,
    [user?.id]
  );

  const [sellTarget, setSellTarget] = useState<{ symbol: string; max: number } | null>(null);
  const [sellQty, setSellQty] = useState("1");
  const [busy, setBusy] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [confirmReset, setConfirmReset] = useState(false);

  if (!user) {
    return (
      <div className="p-6 max-w-xl mx-auto mt-16 text-center space-y-4 font-mono">
        <h1 className="text-2xl font-display text-[#f3ecdc]">Paper Portfolio</h1>
        <p className="text-xs text-[#f3ecdc]/60 font-sans">
          Sign in to trade with ₹10,00,000 of virtual capital. Your positions are saved to your account.
        </p>
        <Link to="/login" className="inline-block px-5 py-2.5 rounded-xl bg-[#f3ecdc] text-[#151510] text-xs font-bold">
          Sign in to continue
        </Link>
      </div>
    );
  }

  const summary = data?.summary;
  const trades = data?.portfolio.trades ?? [];

  const doSell = async () => {
    if (!sellTarget) return;
    const qty = parseInt(sellQty, 10);
    if (!qty || qty < 1 || qty > sellTarget.max) {
      setActionError(`Enter a quantity between 1 and ${sellTarget.max}.`);
      return;
    }
    setBusy(true);
    setActionError(null);
    try {
      await api.trade(sellTarget.symbol, "sell", qty);
      setSellTarget(null);
      await refresh();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const doReset = async () => {
    setBusy(true);
    setActionError(null);
    try {
      await api.resetPortfolio();
      setConfirmReset(false);
      await refresh();
    } catch (e) {
      setActionError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const totalPL = summary ? summary.totalValue - START_CAPITAL : 0;
  const totalPLPct = (totalPL / START_CAPITAL) * 100;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-[#f3ecdc] tracking-tight">Paper Portfolio</h1>
          <p className="text-xs sm:text-sm text-[#f3ecdc]/60 mt-1 font-sans">
            Practice with ₹10,00,000 of virtual capital. Prices are ~15 min delayed; no real money is involved.
          </p>
        </div>
        <div className="flex items-center gap-3 font-mono text-xs">
          {confirmReset ? (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-[#ff6f91]/40 bg-[#ff6f91]/10 text-[#ff6f91]">
              <span>Wipe all positions & history?</span>
              <button onClick={doReset} disabled={busy} className="font-bold underline cursor-pointer">Yes, reset</button>
              <button onClick={() => setConfirmReset(false)} className="text-[#f3ecdc]/60 cursor-pointer">Cancel</button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#f3ecdc]/15 bg-[#121424] text-[#f3ecdc]/70 hover:text-[#ff6f91] hover:border-[#ff6f91]/30 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>Reset Capital</span>
            </button>
          )}
          <Link to="/app" className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f3ecdc] text-[#151510] font-bold hover:bg-white transition-all shadow-sm">
            <Plus className="w-4 h-4" />
            <span>Browse Tickers</span>
          </Link>
        </div>
      </div>

      {actionError && (
        <div className="p-3 rounded-lg bg-[#ff6f91]/10 border border-[#ff6f91]/30 text-xs font-mono text-[#ff6f91] flex items-center gap-2">
          <AlertTriangle className="w-4 h-4" /> {actionError}
        </div>
      )}

      {loading && !summary ? (
        <div className="py-20 text-center text-xs font-mono text-[#f3ecdc]/40 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading portfolio...
        </div>
      ) : error && !summary ? (
        <div className="py-20 text-center text-xs font-mono space-y-3">
          <div className="text-[#ff6f91]">{error.message}</div>
          <button onClick={() => refresh()} className="px-3 py-1.5 rounded-lg border border-[#f3ecdc]/20 text-[#f3ecdc] cursor-pointer">Retry</button>
        </div>
      ) : summary ? (
        <>
          {/* KPI row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono">
            <Kpi label="Total Net Worth" value={`₹${inr(summary.totalValue)}`} sub="Cash + holdings at delayed prices" />
            <Kpi
              label="Total P&L vs ₹10L start"
              value={`${signed(totalPL)} (${totalPL >= 0 ? "+" : ""}${totalPLPct.toFixed(2)}%)`}
              tone={totalPL >= 0 ? "up" : "down"}
              sub={`Open positions: ${signed(summary.pnl)} (${summary.pnlPercent.toFixed(2)}%)`}
            />
            <Kpi label="Available Cash" value={`₹${inr(summary.cash)}`} sub="Ready for deployment" />
            <Kpi label="Max Drawdown (1Y replay)" value={summary.maxDrawdown ? `-${summary.maxDrawdown.toFixed(2)}%` : "—"} tone="mint" sub="Current holdings replayed over 1 year" />
          </div>

          {/* Allocation */}
          {summary.allocation.length > 0 && (
            <div className="rounded-2xl bg-[#0c0e18] border border-[#f3ecdc]/12 p-5 font-mono">
              <div className="text-[11px] text-[#f3ecdc]/40 uppercase tracking-widest mb-3">Allocation</div>
              <div className="flex h-3 rounded-full overflow-hidden bg-[#121424]">
                {summary.allocation.map((a, i) => (
                  <div
                    key={a.symbol}
                    style={{ width: `${a.percentage}%`, background: a.symbol === "CASH" ? "#6ff2c2" : ["#ffb454", "#b48cff", "#ff6f91", "#7aa2ff", "#f3ecdc"][i % 5] }}
                    title={`${a.symbol} ${a.percentage.toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-5 gap-y-1 mt-3 text-[11px] text-[#f3ecdc]/60">
                {summary.allocation.map((a) => (
                  <span key={a.symbol}>
                    {a.symbol.replace(/\.(NS|BO)$/, "")} {a.percentage.toFixed(1)}%
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Holdings */}
          <div className="rounded-2xl bg-[#0a0c16] border border-[#f3ecdc]/12 overflow-hidden">
            <div className="p-5 border-b border-[#f3ecdc]/10 flex items-center justify-between">
              <h2 className="text-base font-semibold text-[#f3ecdc] font-sans">Current Open Positions</h2>
              <span className="text-xs font-mono text-[#f3ecdc]/40">{summary.holdings.length} Active Securities</span>
            </div>
            {summary.holdings.length === 0 ? (
              <div className="py-16 text-center text-xs font-mono text-[#f3ecdc]/40">
                No active positions. Open any stock and use "Virtual Trade" to place your first order.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#070810] text-[#f3ecdc]/40 uppercase tracking-widest text-[10px] border-b border-[#f3ecdc]/10">
                    <tr>
                      <th className="py-3 px-5">Symbol / Security</th>
                      <th className="py-3 px-4">Shares</th>
                      <th className="py-3 px-4">Avg Buy</th>
                      <th className="py-3 px-4">Current</th>
                      <th className="py-3 px-4">Value</th>
                      <th className="py-3 px-4 text-right">P&L</th>
                      <th className="py-3 px-5" />
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3ecdc]/5 text-[#f3ecdc]/80">
                    {summary.holdings.map((h) => {
                      const up = h.pnl >= 0;
                      return (
                        <tr key={h.symbol} className="hover:bg-[#0f1224] transition-colors">
                          <td className="py-4 px-5">
                            <Link to={`/app/stock/${encodeURIComponent(h.symbol)}`} className="font-bold text-[#f3ecdc] hover:text-[#ffb454] transition-colors">
                              {h.symbol}
                            </Link>
                            <div className="text-[11px] text-[#f3ecdc]/40 font-sans line-clamp-1">{h.name}</div>
                          </td>
                          <td className="py-4 px-4 tabular-nums">{h.quantity}</td>
                          <td className="py-4 px-4 tabular-nums">₹{inr(h.avgPrice, 2)}</td>
                          <td className="py-4 px-4 tabular-nums font-semibold text-[#f3ecdc]">
                            ₹{inr(h.currentPrice, 2)}
                            {h.stale && <span className="ml-1 text-[10px] text-[#ff6f91]" title="Live price unavailable - showing cost basis">stale</span>}
                          </td>
                          <td className="py-4 px-4 tabular-nums">₹{inr(h.value)}</td>
                          <td className={`py-4 px-4 text-right tabular-nums ${up ? "text-[#ffb454]" : "text-[#b48cff]"}`}>
                            {signed(h.pnl)}
                            <span className="text-[11px] ml-1">({up ? "+" : ""}{h.pnlPercent.toFixed(2)}%)</span>
                          </td>
                          <td className="py-4 px-5 text-right">
                            <button
                              onClick={() => { setSellTarget({ symbol: h.symbol, max: h.quantity }); setSellQty(String(h.quantity)); setActionError(null); }}
                              className="px-2.5 py-1 rounded-lg border border-[#b48cff]/40 text-[#b48cff] hover:bg-[#b48cff]/10 cursor-pointer"
                            >
                              Sell
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Trade history */}
          {trades.length > 0 && (
            <div className="rounded-2xl bg-[#0a0c16] border border-[#f3ecdc]/12 overflow-hidden">
              <div className="p-5 border-b border-[#f3ecdc]/10">
                <h2 className="text-base font-semibold text-[#f3ecdc] font-sans">Recent Trades</h2>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left font-mono text-xs">
                  <thead className="bg-[#070810] text-[#f3ecdc]/40 uppercase tracking-widest text-[10px] border-b border-[#f3ecdc]/10">
                    <tr>
                      <th className="py-3 px-5">When</th><th className="py-3 px-4">Side</th><th className="py-3 px-4">Symbol</th>
                      <th className="py-3 px-4">Qty</th><th className="py-3 px-4">Price</th><th className="py-3 px-5 text-right">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#f3ecdc]/5 text-[#f3ecdc]/80">
                    {trades.map((t) => (
                      <tr key={t.id}>
                        <td className="py-3 px-5 text-[#f3ecdc]/50">{new Date(t.createdAt).toLocaleString("en-IN")}</td>
                        <td className={`py-3 px-4 font-bold ${t.side === "buy" ? "text-[#ffb454]" : "text-[#b48cff]"}`}>{t.side.toUpperCase()}</td>
                        <td className="py-3 px-4">{t.symbol}</td>
                        <td className="py-3 px-4 tabular-nums">{t.quantity}</td>
                        <td className="py-3 px-4 tabular-nums">₹{inr(t.price, 2)}</td>
                        <td className="py-3 px-5 text-right tabular-nums">₹{inr(t.price * t.quantity)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          <p className="text-[11px] font-mono text-[#f3ecdc]/40">{summary.note}</p>
        </>
      ) : null}

      {/* Sell modal */}
      {sellTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#05060b]/80 backdrop-blur-sm">
          <div className="w-full max-w-sm rounded-2xl bg-[#0e1122] border border-[#f3ecdc]/20 p-6 shadow-2xl font-mono text-xs space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-bold text-[#f3ecdc]">Sell · {sellTarget.symbol}</span>
              <button onClick={() => setSellTarget(null)} className="text-[#f3ecdc]/40 hover:text-[#f3ecdc] cursor-pointer"><X className="w-4 h-4" /></button>
            </div>
            <label className="block text-[#f3ecdc]/50">Quantity (you hold {sellTarget.max})</label>
            <input
              type="number" min={1} max={sellTarget.max} value={sellQty} onChange={(e) => setSellQty(e.target.value)}
              className="w-full px-3 py-2 rounded-xl bg-[#161a32] border border-[#f3ecdc]/15 text-[#f3ecdc]"
            />
            <button onClick={doSell} disabled={busy} className="w-full py-2.5 rounded-xl bg-[#f3ecdc] text-[#151510] font-bold disabled:opacity-60 cursor-pointer flex items-center justify-center gap-2">
              {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />} Execute SELL Order
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const Kpi: React.FC<{ label: string; value: string; sub?: string; tone?: "up" | "down" | "mint" }> = ({ label, value, sub, tone }) => (
  <div className="p-5 rounded-2xl bg-[#0c0e18] border border-[#f3ecdc]/12">
    <div className="text-[11px] text-[#f3ecdc]/40 uppercase tracking-widest">{label}</div>
    <div className={`text-xl font-bold mt-2 tabular-nums ${tone === "up" ? "text-[#ffb454]" : tone === "down" ? "text-[#b48cff]" : tone === "mint" ? "text-[#6ff2c2]" : "text-[#f3ecdc]"}`}>
      {value}
    </div>
    {sub && <div className="text-[11px] text-[#f3ecdc]/50 mt-1">{sub}</div>}
  </div>
);
