/**
 * Watchlist Overview for NIGHTFIELD (/app)
 * Primary desk displaying active equities, sector filters, sparklines,
 * valuation multiples, and immediate one-click navigation to full analysis.
 */

import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  ArrowUpRight,
  ArrowDownRight,
  TrendingUp,
  Search,
  Filter,
  Layers,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { STOCKS_DATA, StockQuote } from "../../mock/marketData";

export const WatchlistView: React.FC = () => {
  const navigate = useNavigate();
  const [filter, setFilter] = useState<"all" | "tech" | "finance" | "funds">("all");
  const [searchQuery, setSearchQuery] = useState("");

  const filteredStocks = STOCKS_DATA.filter((s) => {
    const matchesSearch =
      s.symbol.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.sector.toLowerCase().includes(searchQuery.toLowerCase());

    if (!matchesSearch) return false;

    if (filter === "tech") return s.sector.includes("Technology");
    if (filter === "finance") return s.sector.includes("Banking") || s.sector.includes("Financial");
    if (filter === "funds") return s.sector.includes("Index") || s.colorType === "mint";
    return true;
  });

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-[#f3ecdc] tracking-tight">
            NSE & BSE Watchlist Desk
          </h1>
          <p className="text-xs sm:text-sm text-[#f3ecdc]/60 mt-1 font-sans">
            Real-time equity quotes with continuous order flow, sentiment tracking, and valuation indicators.
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-[#0c0e1a] border border-[#f3ecdc]/10 text-xs font-mono">
          <button
            onClick={() => setFilter("all")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filter === "all" ? "bg-[#f3ecdc] text-[#151510] font-bold" : "text-[#f3ecdc]/60 hover:text-[#f3ecdc]"
            }`}
          >
            All Securities
          </button>
          <button
            onClick={() => setFilter("tech")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filter === "tech" ? "bg-[#f3ecdc] text-[#151510] font-bold" : "text-[#f3ecdc]/60 hover:text-[#f3ecdc]"
            }`}
          >
            Tech & IT
          </button>
          <button
            onClick={() => setFilter("finance")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filter === "finance" ? "bg-[#f3ecdc] text-[#151510] font-bold" : "text-[#f3ecdc]/60 hover:text-[#f3ecdc]"
            }`}
          >
            Banking
          </button>
          <button
            onClick={() => setFilter("funds")}
            className={`px-3 py-1.5 rounded-lg transition-colors cursor-pointer ${
              filter === "funds" ? "bg-[#f3ecdc] text-[#151510] font-bold" : "text-[#f3ecdc]/60 hover:text-[#f3ecdc]"
            }`}
          >
            Index Funds
          </button>
        </div>
      </div>

      {/* Securities Grid Table */}
      <div className="rounded-2xl bg-[#0a0c16] border border-[#f3ecdc]/12 overflow-hidden">
        <div className="p-4 border-b border-[#f3ecdc]/10 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono text-[#f3ecdc]/70">
            <span className="font-bold text-[#f3ecdc]">{filteredStocks.length}</span>
            <span>Securities Tracked</span>
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

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-xs">
            <thead className="bg-[#070810] text-[#f3ecdc]/40 uppercase tracking-widest text-[10px] border-b border-[#f3ecdc]/10">
              <tr>
                <th className="py-3 px-5">Symbol</th>
                <th className="py-3 px-4">Company Name</th>
                <th className="py-3 px-4">Price (INR)</th>
                <th className="py-3 px-4">24h Change</th>
                <th className="py-3 px-4">P/E Ratio</th>
                <th className="py-3 px-4">Market Cap</th>
                <th className="py-3 px-5 text-right">Trend Sparkline</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#f3ecdc]/5 text-[#f3ecdc]/80">
              {filteredStocks.map((stock) => {
                const isUp = stock.changePercent >= 0;
                const isFund = stock.colorType === "mint";
                const strokeColor = isFund ? "#6ff2c2" : isUp ? "#ffb454" : "#b48cff";

                // Mini sparkline points
                const pts = stock.sparkline;
                const min = Math.min(...pts);
                const max = Math.max(...pts);
                const r = max - min || 1;
                const sw = 90;
                const sh = 24;
                const polyPoints = pts
                  .map((v, i) => `${(i / (pts.length - 1)) * sw},${sh - ((v - min) / r) * (sh - 6) - 3}`)
                  .join(" ");

                return (
                  <tr
                    key={stock.symbol}
                    onClick={() => navigate(`/app/stock/${stock.symbol}`)}
                    className="hover:bg-[#111325] transition-colors cursor-pointer group"
                  >
                    <td className="py-4 px-5">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[#f3ecdc] group-hover:text-[#ffb454] transition-colors">
                          {stock.symbol.replace(".NS", "")}
                        </span>
                        <span className="text-[10px] text-[#f3ecdc]/40 px-1 rounded bg-[#f3ecdc]/5">
                          {stock.exchange}
                        </span>
                      </div>
                    </td>

                    <td className="py-4 px-4 font-sans text-xs text-[#f3ecdc]/70">
                      {stock.name}
                    </td>

                    <td className="py-4 px-4 font-bold text-[#f3ecdc] tabular-nums">
                      ₹{stock.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </td>

                    <td className="py-4 px-4 tabular-nums">
                      <span
                        className={`flex items-center gap-0.5 font-semibold ${
                          isUp ? "text-[#ffb454]" : "text-[#b48cff]"
                        }`}
                      >
                        {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                        {isUp ? "+" : ""}
                        {stock.changePercent.toFixed(2)}%
                      </span>
                    </td>

                    <td className="py-4 px-4 tabular-nums text-[#f3ecdc]/60">
                      {stock.pe > 0 ? `${stock.pe.toFixed(1)}x` : "—"}
                    </td>

                    <td className="py-4 px-4 tabular-nums text-[#f3ecdc]/60">
                      ₹{(stock.marketCapCr / 1000).toFixed(1)}k Cr
                    </td>

                    <td className="py-4 px-5 text-right">
                      <svg viewBox={`0 0 ${sw} ${sh}`} className="w-20 h-6 inline-block">
                        <polyline
                          fill="none"
                          stroke={strokeColor}
                          strokeWidth="1.5"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          points={polyPoints}
                        />
                      </svg>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
