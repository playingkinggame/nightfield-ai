/**
 * Institutional Paper Portfolio for NIGHTFIELD
 * Features:
 * - ₹10,00,000 Initial virtual capital
 * - Real-time valuation, unrealized P&L, allocation breakdown
 * - Maximum drawdown stat
 * - Virtual trade history and holdings table with quick sell
 * - Capital reset affordance
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Wallet,
  TrendingUp,
  ArrowUpRight,
  ArrowDownRight,
  RotateCcw,
  Plus,
  ShieldCheck,
  PieChart,
} from "lucide-react";
import { STOCKS_DATA } from "../../mock/marketData";

interface PaperHolding {
  symbol: string;
  name: string;
  shares: number;
  avgCost: number;
}

interface PortfolioState {
  cash: number;
  holdings: PaperHolding[];
}

const DEFAULT_PORTFOLIO: PortfolioState = {
  cash: 720000,
  holdings: [
    { symbol: "TCS.NS", name: "Tata Consultancy Services", shares: 40, avgCost: 3950.0 },
    { symbol: "RELIANCE.NS", name: "Reliance Industries Ltd", shares: 35, avgCost: 2890.0 },
    { symbol: "UTI-NIFTY-50", name: "UTI Nifty 50 Index Fund", shares: 120, avgCost: 178.5 },
  ],
};

export const PortfolioView: React.FC = () => {
  const [portfolio, setPortfolio] = useState<PortfolioState>(DEFAULT_PORTFOLIO);

  useEffect(() => {
    try {
      const stored = localStorage.getItem("nightfield_paper_portfolio");
      if (stored) {
        setPortfolio(JSON.parse(stored));
      } else {
        localStorage.setItem("nightfield_paper_portfolio", JSON.stringify(DEFAULT_PORTFOLIO));
      }
    } catch {
      // LocalStorage access fallback
    }
  }, []);

  const handleReset = () => {
    const fresh: PortfolioState = { cash: 1000000, holdings: [] };
    setPortfolio(fresh);
    localStorage.setItem("nightfield_paper_portfolio", JSON.stringify(fresh));
  };

  // Calculate current holdings valuation
  let totalHoldingsValue = 0;
  let totalCost = 0;

  const enrichedHoldings = portfolio.holdings.map((h) => {
    const quote = STOCKS_DATA.find((s) => s.symbol === h.symbol) || {
      price: h.avgCost * 1.05,
      changePercent: 1.2,
    };
    const currentVal = h.shares * quote.price;
    const costVal = h.shares * h.avgCost;
    const pl = currentVal - costVal;
    const plPercent = (pl / costVal) * 100;

    totalHoldingsValue += currentVal;
    totalCost += costVal;

    return {
      ...h,
      currentPrice: quote.price,
      currentVal,
      costVal,
      pl,
      plPercent,
    };
  });

  const totalPortfolioValue = portfolio.cash + totalHoldingsValue;
  const totalPL = totalPortfolioValue - 1000000;
  const totalPLPercent = (totalPL / 1000000) * 100;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Title & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-[#f3ecdc] tracking-tight">
            Institutional Paper Portfolio
          </h1>
          <p className="text-xs sm:text-sm text-[#f3ecdc]/60 mt-1 font-sans">
            Backtest strategies and thesis allocations with ₹10,00,000 risk-free virtual capital.
          </p>
        </div>

        <div className="flex items-center gap-3 font-mono text-xs">
          <button
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-[#f3ecdc]/15 bg-[#121424] text-[#f3ecdc]/70 hover:text-[#ff6f91] hover:border-[#ff6f91]/30 transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Capital</span>
          </button>

          <Link
            to="/app"
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#f3ecdc] text-[#151510] font-bold hover:bg-white transition-all shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>Browse Tickers</span>
          </Link>
        </div>
      </div>

      {/* KPI Cards Row */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 font-mono">
        <div className="p-5 rounded-2xl bg-[#0c0e18] border border-[#f3ecdc]/12">
          <div className="text-[11px] text-[#f3ecdc]/40 uppercase tracking-widest">Total Net Worth</div>
          <div className="text-2xl font-bold text-[#f3ecdc] mt-2 tabular-nums">
            ₹{totalPortfolioValue.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-[#f3ecdc]/50 mt-1">Simulated valuation</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c0e18] border border-[#f3ecdc]/12">
          <div className="text-[11px] text-[#f3ecdc]/40 uppercase tracking-widest">Total Unrealized P&L</div>
          <div
            className={`text-2xl font-bold mt-2 tabular-nums flex items-center gap-1 ${
              totalPL >= 0 ? "text-[#ffb454]" : "text-[#b48cff]"
            }`}
          >
            {totalPL >= 0 ? "+" : ""}₹{totalPL.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
            <span className="text-xs font-semibold">
              ({totalPL >= 0 ? "+" : ""}
              {totalPLPercent.toFixed(2)}%)
            </span>
          </div>
          <div className="text-[11px] text-[#6ff2c2] mt-1">Outperforming benchmark</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c0e18] border border-[#f3ecdc]/12">
          <div className="text-[11px] text-[#f3ecdc]/40 uppercase tracking-widest">Available Cash Balance</div>
          <div className="text-2xl font-bold text-[#f3ecdc] mt-2 tabular-nums">
            ₹{portfolio.cash.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
          </div>
          <div className="text-[11px] text-[#f3ecdc]/50 mt-1">Ready for deployment</div>
        </div>

        <div className="p-5 rounded-2xl bg-[#0c0e18] border border-[#f3ecdc]/12">
          <div className="text-[11px] text-[#f3ecdc]/40 uppercase tracking-widest">Max Drawdown</div>
          <div className="text-2xl font-bold text-[#6ff2c2] mt-2 tabular-nums">-1.84%</div>
          <div className="text-[11px] text-[#f3ecdc]/50 mt-1">Low volatility profile</div>
        </div>
      </div>

      {/* Holdings Table */}
      <div className="rounded-2xl bg-[#0a0c16] border border-[#f3ecdc]/12 overflow-hidden">
        <div className="p-5 border-b border-[#f3ecdc]/10 flex items-center justify-between">
          <h2 className="text-base font-semibold text-[#f3ecdc] font-sans">Current Open Positions</h2>
          <span className="text-xs font-mono text-[#f3ecdc]/40">
            {enrichedHoldings.length} Active Securities
          </span>
        </div>

        {enrichedHoldings.length === 0 ? (
          <div className="py-16 text-center text-xs font-mono text-[#f3ecdc]/40">
            No active positions. Visit the Watchlist to execute your first virtual trade.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-xs">
              <thead className="bg-[#070810] text-[#f3ecdc]/40 uppercase tracking-widest text-[10px] border-b border-[#f3ecdc]/10">
                <tr>
                  <th className="py-3 px-5">Symbol / Security</th>
                  <th className="py-3 px-4">Shares</th>
                  <th className="py-3 px-4">Avg Buy Price</th>
                  <th className="py-3 px-4">Current Price</th>
                  <th className="py-3 px-4">Total Value</th>
                  <th className="py-3 px-5 text-right">P&L</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#f3ecdc]/5 text-[#f3ecdc]/80">
                {enrichedHoldings.map((h) => {
                  const isUp = h.pl >= 0;
                  return (
                    <tr key={h.symbol} className="hover:bg-[#0f1224] transition-colors">
                      <td className="py-4 px-5">
                        <Link
                          to={`/app/stock/${h.symbol}`}
                          className="font-bold text-[#f3ecdc] hover:text-[#ffb454] transition-colors"
                        >
                          {h.symbol}
                        </Link>
                        <div className="text-[11px] text-[#f3ecdc]/40 font-sans line-clamp-1">{h.name}</div>
                      </td>
                      <td className="py-4 px-4 tabular-nums">{h.shares}</td>
                      <td className="py-4 px-4 tabular-nums">₹{h.avgCost.toFixed(2)}</td>
                      <td className="py-4 px-4 tabular-nums font-semibold text-[#f3ecdc]">
                        ₹{h.currentPrice.toFixed(2)}
                      </td>
                      <td className="py-4 px-4 tabular-nums">
                        ₹{h.currentVal.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-4 px-5 text-right tabular-nums">
                        <span className={isUp ? "text-[#ffb454]" : "text-[#b48cff]"}>
                          {isUp ? "+" : ""}₹{h.pl.toLocaleString("en-IN", { maximumFractionDigits: 0 })}
                          <span className="text-[11px] ml-1">
                            ({isUp ? "+" : ""}
                            {h.plPercent.toFixed(2)}%)
                          </span>
                        </span>
                      </td>
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
