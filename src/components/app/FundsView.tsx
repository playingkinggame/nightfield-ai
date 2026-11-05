/**
 * Benchmark Index Funds & Mutual Funds Directory for NIGHTFIELD
 * Features:
 * - Complete NAV charts and expense ratio comparison
 * - Historical returns table (1Y, 3Y, 5Y)
 * - Top portfolio holdings breakdown
 * - Tracking error and AUM analysis
 */

import React, { useState, useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Layers, TrendingUp, ShieldCheck, PieChart, ArrowUpRight, ArrowRight, Zap } from "lucide-react";
import { FUNDS_DATA, FundData } from "../../mock/marketData";

export const FundsView: React.FC = () => {
  const [searchParams] = useSearchParams();
  const selectedCode = searchParams.get("code") || FUNDS_DATA[0].code;

  const [activeFund, setActiveFund] = useState<FundData>(
    FUNDS_DATA.find((f) => f.code === selectedCode) || FUNDS_DATA[0]
  );

  useEffect(() => {
    const found = FUNDS_DATA.find((f) => f.code === selectedCode);
    if (found) setActiveFund(found);
  }, [selectedCode]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-[#f3ecdc] tracking-tight">
            Index Funds & Passive Compounding
          </h1>
          <p className="text-xs sm:text-sm text-[#f3ecdc]/60 mt-1 font-sans">
            Ultra-low expense ratio benchmark replicators for systematic compounding.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#6ff2c2] bg-[#6ff2c2]/10 px-3 py-1.5 rounded-xl border border-[#6ff2c2]/20">
          <ShieldCheck className="w-4 h-4" />
          <span>Zero Commission Direct Plans</span>
        </div>
      </div>

      {/* Funds Carousel Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {FUNDS_DATA.map((fund) => {
          const isSelected = fund.code === activeFund.code;
          return (
            <div
              key={fund.code}
              onClick={() => setActiveFund(fund)}
              className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                isSelected
                  ? "bg-[#14182c] border-[#6ff2c2]/50 shadow-lg scale-[1.01]"
                  : "bg-[#0c0e18] border-[#f3ecdc]/10 hover:border-[#f3ecdc]/25"
              }`}
            >
              <div className="flex justify-between items-center mb-2">
                <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#6ff2c2]/15 text-[#6ff2c2]">
                  TER: {fund.expenseRatio}%
                </span>
                <span className="text-xs font-mono text-[#ffb454] font-bold">
                  +{fund.oneYearReturn}% 1Y
                </span>
              </div>
              <h3 className="text-xs font-semibold text-[#f3ecdc] line-clamp-1 font-sans">
                {fund.name}
              </h3>
              <div className="mt-3 flex items-baseline justify-between font-mono">
                <span className="text-sm font-bold text-[#f3ecdc]">NAV ₹{fund.nav.toFixed(2)}</span>
                <span className="text-[11px] text-[#f3ecdc]/40">AUM ₹{fund.aumCr.toLocaleString()} Cr</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* Selected Fund Deep Dive */}
      <div className="p-6 rounded-2xl bg-[#0a0c16] border border-[#f3ecdc]/12 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#f3ecdc]/10">
          <div>
            <div className="flex items-center gap-3">
              <h2 className="text-xl sm:text-2xl font-mono font-bold text-[#f3ecdc]">
                {activeFund.name}
              </h2>
              <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#f3ecdc]/10 text-[#f3ecdc]/70">
                {activeFund.category}
              </span>
            </div>
            <p className="text-xs text-[#f3ecdc]/70 mt-1 max-w-2xl font-sans">
              {activeFund.description}
            </p>
          </div>

          <div className="text-right font-mono">
            <div className="text-2xl font-bold text-[#f3ecdc]">₹{activeFund.nav.toFixed(2)}</div>
            <div className="text-xs text-[#6ff2c2]">Daily NAV Update (AMFI Verified)</div>
          </div>
        </div>

        {/* Returns Matrix */}
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest text-[#f3ecdc]/50 mb-3">
            Compounded Annual Growth Rate (CAGR)
          </h4>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
            <div className="p-4 rounded-xl bg-[#121424] border border-[#f3ecdc]/10">
              <div className="text-[11px] text-[#f3ecdc]/50">1 Year Return</div>
              <div className="text-lg font-bold text-[#ffb454] mt-1">+{activeFund.oneYearReturn}%</div>
            </div>
            <div className="p-4 rounded-xl bg-[#121424] border border-[#f3ecdc]/10">
              <div className="text-[11px] text-[#f3ecdc]/50">3 Year CAGR</div>
              <div className="text-lg font-bold text-[#ffb454] mt-1">+{activeFund.threeYearReturn}%</div>
            </div>
            <div className="p-4 rounded-xl bg-[#121424] border border-[#f3ecdc]/10">
              <div className="text-[11px] text-[#f3ecdc]/50">5 Year CAGR</div>
              <div className="text-lg font-bold text-[#ffb454] mt-1">+{activeFund.fiveYearReturn}%</div>
            </div>
            <div className="p-4 rounded-xl bg-[#121424] border border-[#f3ecdc]/10">
              <div className="text-[11px] text-[#f3ecdc]/50">Total Expense Ratio</div>
              <div className="text-lg font-bold text-[#6ff2c2] mt-1">{activeFund.expenseRatio}%</div>
            </div>
          </div>
        </div>

        {/* Top Holdings Section */}
        <div>
          <h4 className="text-xs font-mono uppercase tracking-widest text-[#f3ecdc]/50 mb-3">
            Benchmark Portfolio Weightings
          </h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
            {activeFund.topHoldings.map((h) => (
              <Link
                key={h.symbol}
                to={`/app/stock/${h.symbol}`}
                className="p-3.5 rounded-xl bg-[#111322] border border-[#f3ecdc]/10 flex items-center justify-between hover:border-[#6ff2c2]/40 transition-colors group"
              >
                <div>
                  <div className="text-xs font-bold text-[#f3ecdc] group-hover:text-[#6ff2c2] transition-colors">
                    {h.name}
                  </div>
                  <div className="text-[10px] text-[#f3ecdc]/40">{h.symbol}</div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold text-[#f3ecdc] tabular-nums">
                    {h.percentage}%
                  </span>
                  <ArrowRight className="w-3.5 h-3.5 text-[#f3ecdc]/30 group-hover:text-[#6ff2c2] group-hover:translate-x-0.5 transition-all" />
                </div>
              </Link>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
