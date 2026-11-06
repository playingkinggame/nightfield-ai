/**
 * Index Funds & Mutual Funds for NIGHTFIELD (/app/funds)
 * Data: GET /api/funds (curated list, live NAV + CAGR from mfapi.in) and GET /api/funds/{code}/nav
 * Opening /app/funds?code=120716 (e.g. from search) loads that scheme even if it's not in the curated list.
 * AUM, expense ratio and top holdings are curated approximations (not live) - shown as such.
 */

import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ShieldCheck, ArrowRight, Loader2 } from "lucide-react";
import { api } from "../../lib/api";
import { usePolling } from "../../lib/hooks";
import type { FundData } from "../../mock/marketData";

const pct = (n: number) => `${n > 0 ? "+" : ""}${n.toFixed(2)}%`;
const known = (n: number, fmt: (x: number) => string) => (n > 0 ? fmt(n) : "N/A");

export const FundsView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedCode = searchParams.get("code");

  const { data: funds, error, loading, refresh } = usePolling(() => api.getAllFunds(), 10 * 60 * 1000);
  const [extra, setExtra] = useState<FundData | null>(null); // scheme opened by code but not in curated list
  const [extraError, setExtraError] = useState<string | null>(null);

  const list = funds ?? [];
  const fromList = selectedCode ? list.find((f) => f.code === selectedCode) : list[0];

  useEffect(() => {
    setExtra(null);
    setExtraError(null);
    if (!selectedCode || !funds || funds.some((f) => f.code === selectedCode)) return;
    let alive = true;
    api.getFund(selectedCode).then((f) => alive && setExtra(f)).catch((e) => alive && setExtraError((e as Error).message));
    return () => {
      alive = false;
    };
  }, [selectedCode, funds]);

  const active = extra ?? fromList ?? null;

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-display text-[#f3ecdc] tracking-tight">Index Funds & Passive Compounding</h1>
          <p className="text-xs sm:text-sm text-[#f3ecdc]/60 mt-1 font-sans">
            Low-cost benchmark replicators. NAV and returns are live from AMFI data via mfapi.in.
          </p>
        </div>
        <div className="flex items-center gap-2 text-xs font-mono text-[#6ff2c2] bg-[#6ff2c2]/10 px-3 py-1.5 rounded-xl border border-[#6ff2c2]/20">
          <ShieldCheck className="w-4 h-4" />
          <span>Direct plans have no commission</span>
        </div>
      </div>

      {loading && !funds ? (
        <div className="py-20 text-center text-xs font-mono text-[#f3ecdc]/40 flex items-center justify-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin" /> Loading funds...
        </div>
      ) : error && !funds ? (
        <div className="py-20 text-center text-xs font-mono space-y-3">
          <div className="text-[#ff6f91]">{error.message}</div>
          <button onClick={() => refresh()} className="px-3 py-1.5 rounded-lg border border-[#f3ecdc]/20 text-[#f3ecdc] cursor-pointer">Retry</button>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {list.map((fund) => {
              const isSelected = active?.code === fund.code;
              return (
                <div
                  key={fund.code}
                  onClick={() => setSearchParams({ code: fund.code })}
                  className={`p-4 rounded-2xl cursor-pointer transition-all border ${
                    isSelected ? "bg-[#14182c] border-[#6ff2c2]/50 shadow-lg scale-[1.01]" : "bg-[#0c0e18] border-[#f3ecdc]/10 hover:border-[#f3ecdc]/25"
                  }`}
                >
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-[#6ff2c2]/15 text-[#6ff2c2]">
                      TER: {known(fund.expenseRatio, (x) => `${x}%`)}
                    </span>
                    <span className={`text-xs font-mono font-bold ${fund.oneYearReturn >= 0 ? "text-[#ffb454]" : "text-[#b48cff]"}`}>
                      {pct(fund.oneYearReturn)} 1Y
                    </span>
                  </div>
                  <h3 className="text-xs font-semibold text-[#f3ecdc] line-clamp-1 font-sans">{fund.name}</h3>
                  <div className="mt-3 flex items-baseline justify-between font-mono">
                    <span className="text-sm font-bold text-[#f3ecdc]">NAV ₹{fund.nav.toFixed(2)}</span>
                    <span className="text-[11px] text-[#f3ecdc]/40">AUM {known(fund.aumCr, (x) => `₹${x.toLocaleString("en-IN")} Cr`)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {extraError && <div className="text-xs font-mono text-[#ff6f91]">Could not load fund {selectedCode}: {extraError}</div>}

          {active && (
            <div className="p-6 rounded-2xl bg-[#0a0c16] border border-[#f3ecdc]/12 space-y-6">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-[#f3ecdc]/10">
                <div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <h2 className="text-xl sm:text-2xl font-mono font-bold text-[#f3ecdc]">{active.name}</h2>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#f3ecdc]/10 text-[#f3ecdc]/70">{active.category}</span>
                    <span className="text-xs font-mono px-2 py-0.5 rounded bg-[#f3ecdc]/10 text-[#f3ecdc]/70">Risk: {active.riskRating}</span>
                  </div>
                  <p className="text-xs text-[#f3ecdc]/70 mt-1 max-w-2xl font-sans">{active.description}</p>
                </div>
                <div className="text-right font-mono">
                  <div className="text-2xl font-bold text-[#f3ecdc]">₹{active.nav.toFixed(2)}</div>
                  <div className={`text-xs ${active.changePercent >= 0 ? "text-[#6ff2c2]" : "text-[#ff6f91]"}`}>
                    {pct(active.changePercent)} · latest published NAV
                  </div>
                </div>
              </div>

              <div>
                <h4 className="text-xs font-mono uppercase tracking-widest text-[#f3ecdc]/50 mb-3">Compounded Annual Growth Rate (CAGR)</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                  {[
                    ["1 Year Return", active.oneYearReturn],
                    ["3 Year CAGR", active.threeYearReturn],
                    ["5 Year CAGR", active.fiveYearReturn],
                  ].map(([label, v]) => (
                    <div key={label as string} className="p-4 rounded-xl bg-[#121424] border border-[#f3ecdc]/10">
                      <div className="text-[11px] text-[#f3ecdc]/50">{label}</div>
                      <div className={`text-lg font-bold mt-1 ${(v as number) >= 0 ? "text-[#ffb454]" : "text-[#b48cff]"}`}>
                        {(v as number) === 0 ? "N/A" : pct(v as number)}
                      </div>
                    </div>
                  ))}
                  <div className="p-4 rounded-xl bg-[#121424] border border-[#f3ecdc]/10">
                    <div className="text-[11px] text-[#f3ecdc]/50">Total Expense Ratio</div>
                    <div className="text-lg font-bold text-[#6ff2c2] mt-1">{known(active.expenseRatio, (x) => `${x}%`)}</div>
                  </div>
                </div>
              </div>

              {active.topHoldings.length > 0 && (
                <div>
                  <h4 className="text-xs font-mono uppercase tracking-widest text-[#f3ecdc]/50 mb-3">Approximate Top Holdings</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 font-mono">
                    {active.topHoldings.map((h) => (
                      <Link
                        key={h.symbol}
                        to={`/app/stock/${encodeURIComponent(h.symbol)}`}
                        className="p-3.5 rounded-xl bg-[#111322] border border-[#f3ecdc]/10 flex items-center justify-between hover:border-[#6ff2c2]/40 transition-colors group"
                      >
                        <div>
                          <div className="text-xs font-bold text-[#f3ecdc] group-hover:text-[#6ff2c2] transition-colors">{h.name}</div>
                          <div className="text-[10px] text-[#f3ecdc]/40">{h.symbol}</div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-[#f3ecdc] tabular-nums">{h.percentage}%</span>
                          <ArrowRight className="w-3.5 h-3.5 text-[#f3ecdc]/30 group-hover:text-[#6ff2c2] group-hover:translate-x-0.5 transition-all" />
                        </div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};
