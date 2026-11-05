/**
 * Terminal Settings & Disclosures View for NIGHTFIELD (/app/settings)
 */

import React, { useState } from "react";
import { Settings, ShieldCheck, Database, RefreshCw, Trash2, CheckCircle2 } from "lucide-react";
import { APP_NAME } from "../../lib/constants";

export const SettingsView: React.FC = () => {
  const [cleared, setCleared] = useState(false);
  const useMock = import.meta.env.VITE_USE_MOCK !== "false";
  const apiUrl = import.meta.env.VITE_API_URL || "http://localhost:8000";

  const handleClearCache = () => {
    localStorage.removeItem("nightfield_paper_portfolio");
    setCleared(true);
    setTimeout(() => setCleared(false), 2000);
  };

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-display text-[#f3ecdc] tracking-tight">
          Terminal Settings & Infrastructure
        </h1>
        <p className="text-xs sm:text-sm text-[#f3ecdc]/60 mt-1 font-sans">
          Manage local analytical cache, data feeds, and compliance parameters.
        </p>
      </div>

      <div className="rounded-2xl bg-[#0a0c16] border border-[#f3ecdc]/12 p-6 space-y-6 font-mono text-xs">
        <div>
          <h2 className="text-sm font-bold text-[#f3ecdc] mb-3 flex items-center gap-2">
            <Database className="w-4 h-4 text-[#ffb454]" />
            <span>Data Ingestion & Connectivity</span>
          </h2>
          <div className="space-y-3 bg-[#101222] p-4 rounded-xl border border-[#f3ecdc]/10">
            <div className="flex justify-between items-center">
              <span className="text-[#f3ecdc]/60">Data Mode</span>
              <span className="px-2 py-0.5 rounded bg-[#6ff2c2]/15 text-[#6ff2c2]">
                {useMock ? "Deterministic Mock Mode (Demo Active)" : "Live FastAPI Backend"}
              </span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#f3ecdc]/60">API Gateway Endpoint</span>
              <span className="text-[#f3ecdc]">{apiUrl}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#f3ecdc]/60">Primary Benchmark</span>
              <span className="text-[#f3ecdc]">NSE NIFTY 50 Total Returns Index (TRI)</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-[#f3ecdc]/60">Reporting Currency</span>
              <span className="text-[#f3ecdc]">INR (₹)</span>
            </div>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-[#f3ecdc] mb-3 flex items-center gap-2">
            <RefreshCw className="w-4 h-4 text-[#6ff2c2]" />
            <span>Local Analytical Cache</span>
          </h2>
          <div className="bg-[#101222] p-4 rounded-xl border border-[#f3ecdc]/10 flex items-center justify-between">
            <div>
              <div className="text-[#f3ecdc] font-semibold">Reset Paper Portfolio Data</div>
              <div className="text-[11px] text-[#f3ecdc]/50 mt-0.5">
                Clears saved virtual trade orders and resets capital back to ₹10,00,000.
              </div>
            </div>
            <button
              onClick={handleClearCache}
              className="px-3.5 py-2 rounded-xl bg-[#ff6f91]/15 text-[#ff6f91] hover:bg-[#ff6f91]/25 border border-[#ff6f91]/30 transition-all cursor-pointer flex items-center gap-2"
            >
              {cleared ? <CheckCircle2 className="w-4 h-4" /> : <Trash2 className="w-4 h-4" />}
              <span>{cleared ? "Cleared" : "Clear Cache"}</span>
            </button>
          </div>
        </div>

        <div>
          <h2 className="text-sm font-bold text-[#f3ecdc] mb-3 flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#ffb454]" />
            <span>Statutory Disclaimers & Licensing</span>
          </h2>
          <div className="bg-[#101222] p-4 rounded-xl border border-[#f3ecdc]/10 text-[#f3ecdc]/70 leading-relaxed font-sans text-xs space-y-2">
            <p>
              {APP_NAME} is an autonomous software interface engineered for research and computational modeling.
              Nothing presented within this terminal constitutes financial advice, a solicitation to buy or sell securities,
              or an endorsement of any particular investment vehicle.
            </p>
            <p>
              Always conduct independent due diligence with certified fiduciary professionals.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
