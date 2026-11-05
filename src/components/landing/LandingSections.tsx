/**
 * STAGE 3: Landing Sections for NIGHTFIELD
 * Features:
 * 1. "Ask anything" auto-playing interactive AI research console with animated tool calls & cited sources
 * 2. Three core feature panels: Research Agent, Charts & Indicators, Paper Trading
 * 3. Transparent disclosure section: "What this is not"
 * 4. Minimalist footer with legal disclaimer
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Sparkles,
  Search,
  FileText,
  BarChart3,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  ExternalLink,
  CheckCircle2,
  Cpu,
  Layers,
  LineChart,
  Wallet,
} from "lucide-react";
import { APP_NAME } from "../../lib/constants";

export const LandingSections: React.FC = () => {
  // Auto-playing interactive demo in "Ask anything" section
  const [activeTab, setActiveTab] = useState<"reliance" | "funds" | "it">("reliance");
  const [demoStep, setDemoStep] = useState(0);

  const DEMO_CASES = {
    reliance: {
      query: "Analyze Reliance Industries Q3 cash flows and capital expenditure trajectory",
      tools: [
        { name: "get_filings(RELIANCE, Q3)", label: "Parsing BSE quarterly disclosure...", status: "complete" },
        { name: "get_segment_revenue(JIO, RETAIL)", label: "Extracted telecom ARPU: ₹195.10 (+7.4% YoY)", status: "complete" },
        { name: "dcf_valuation_model(WACC: 11.2%)", label: "Estimated intrinsic fair value range: ₹3,120 – ₹3,350", status: "complete" },
      ],
      response:
        "Reliance Industries demonstrated accelerating operational cash flow of ₹38,400 Cr in the trailing quarter. Telecom and retail now contribute 52% of consolidated EBITDA, de-risking the traditional oil-to-chemicals refining cycle. Net debt-to-equity stands at a conservative 0.38x.",
      citations: [
        { source: "Reliance Industries Investor Deck Q3", url: "#" },
        { source: "BSE Audited Financial Disclosures", url: "#" },
        { source: "TRAI Telecom Subscription Digest", url: "#" },
      ],
      metrics: [
        { label: "Consolidated EBITDA", value: "₹44,678 Cr" },
        { label: "Net Debt / Equity", value: "0.38x" },
        { label: "ROCE (Annualized)", value: "11.8%" },
      ],
    },
    funds: {
      query: "Which Nifty 50 Index Fund offers the lowest tracking error and expense ratio?",
      tools: [
        { name: "fetch_mutual_fund_schemes(INDEX_LARGE)", label: "Queried 14 Nifty 50 direct growth plans...", status: "complete" },
        { name: "calc_tracking_error(3Y_WINDOW)", label: "Analyzed daily tracking variance against benchmark...", status: "complete" },
      ],
      response:
        "Navi Nifty 50 Index Fund leads on total expense ratio (0.06%), while UTI Nifty 50 Index Fund Direct-Growth maintains the longest 10-year track record with a minimal 3-year tracking error of 0.03%. For exchange liquidity, Nippon India ETF Nifty BeES delivers the tightest bid-ask spread.",
      citations: [
        { source: "AMFI India Daily NAV Factsheet", url: "#" },
        { source: "CRISIL Mutual Fund Rankings", url: "#" },
      ],
      metrics: [
        { label: "Lowest Expense Ratio", value: "0.06%" },
        { label: "3Y Tracking Error", value: "0.03%" },
        { label: "Avg Daily Liquidity", value: "₹32.4 Cr" },
      ],
    },
    it: {
      query: "Compare TCS and Infosys operating margins and client renewal rates",
      tools: [
        { name: "compare_peers(TCS, INFY, METRIC: EBIT)", label: "Retrieved audited EBIT margins for 8 quarters...", status: "complete" },
        { name: "analyze_transcripts(CALL_NOTES)", label: "Parsed AI deal pipeline and TCV bookings...", status: "complete" },
      ],
      response:
        "TCS preserves superior operating resilience with a 25.4% EBIT margin compared to Infosys at 21.1%. However, Infosys exhibits faster ramp in large generative AI enterprise contracts with $3.2B in Net New TCV. Both balance sheets maintain zero debt and return >85% free cash flow via dividends.",
      citations: [
        { source: "TCS Earnings Transcript", url: "#" },
        { source: "Infosys SEC Form 6-K", url: "#" },
      ],
      metrics: [
        { label: "TCS EBIT Margin", value: "25.4%" },
        { label: "INFY EBIT Margin", value: "21.1%" },
        { label: "Combined FCF Yield", value: "4.3%" },
      ],
    },
  };

  const currentCase = DEMO_CASES[activeTab];

  // Animate demo progression on tab change
  useEffect(() => {
    setDemoStep(0);
    const t1 = setTimeout(() => setDemoStep(1), 350);
    const t2 = setTimeout(() => setDemoStep(2), 900);
    const t3 = setTimeout(() => setDemoStep(3), 1450);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
    };
  }, [activeTab]);

  return (
    <div className="relative bg-[#05060b] text-[#f3ecdc] z-10">
      {/* SECTION 1: Ask Anything */}
      <section className="py-24 sm:py-32 px-6 sm:px-12 max-w-7xl mx-auto">
        <div className="flex flex-col items-center text-center mb-12 sm:mb-16">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-[#ffb454] mb-3">
            Autonomous Financial Intelligence
          </p>
          <h2 className="text-3xl sm:text-5xl md:text-6xl font-display tracking-tight text-[#f3ecdc] max-w-3xl">
            Ask anything. Watch the reasoning unfold.
          </h2>
          <p className="mt-4 text-[#f3ecdc]/70 text-base sm:text-lg max-w-xl font-normal">
            No hallucinated generic answers. Every statement is grounded in real-time order books,
            statutory filings, and quantitative calculators.
          </p>

          {/* Interactive Case Selectors */}
          <div className="flex flex-wrap items-center justify-center gap-2 mt-8 p-1.5 rounded-full bg-[#121420] border border-[#f3ecdc]/10">
            <button
              onClick={() => setActiveTab("reliance")}
              className={`px-4 py-2 text-xs font-mono rounded-full transition-all cursor-pointer ${
                activeTab === "reliance"
                  ? "bg-[#f3ecdc] text-[#151510] font-semibold shadow-sm"
                  : "text-[#f3ecdc]/70 hover:text-[#f3ecdc]"
              }`}
            >
              Reliance Cash Flow
            </button>
            <button
              onClick={() => setActiveTab("funds")}
              className={`px-4 py-2 text-xs font-mono rounded-full transition-all cursor-pointer ${
                activeTab === "funds"
                  ? "bg-[#f3ecdc] text-[#151510] font-semibold shadow-sm"
                  : "text-[#f3ecdc]/70 hover:text-[#f3ecdc]"
              }`}
            >
              Index Funds Alpha
            </button>
            <button
              onClick={() => setActiveTab("it")}
              className={`px-4 py-2 text-xs font-mono rounded-full transition-all cursor-pointer ${
                activeTab === "it"
                  ? "bg-[#f3ecdc] text-[#151510] font-semibold shadow-sm"
                  : "text-[#f3ecdc]/70 hover:text-[#f3ecdc]"
              }`}
            >
              TCS vs Infosys
            </button>
          </div>
        </div>

        {/* Mock Terminal Card */}
        <div className="relative rounded-2xl bg-[#0a0c16] border border-[#f3ecdc]/15 shadow-2xl overflow-hidden max-w-4xl mx-auto">
          {/* Terminal Window Chrome */}
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-[#f3ecdc]/10 bg-[#080912]">
            <div className="flex items-center gap-2">
              <div className="w-2.5 h-2.5 rounded-full bg-[#ff6f91]/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#ffb454]/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-[#6ff2c2]/70" />
              <span className="ml-3 font-mono text-[11px] text-[#f3ecdc]/50 tracking-wider">
                nightfield-agent · session active
              </span>
            </div>
            <div className="flex items-center gap-2 text-[11px] font-mono text-[#6ff2c2]">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Verified Data Grounding</span>
            </div>
          </div>

          <div className="p-6 sm:p-8 space-y-6">
            {/* User Prompt */}
            <div className="flex items-start gap-3">
              <div className="w-7 h-7 rounded-full bg-[#f3ecdc]/10 flex items-center justify-center shrink-0 text-xs font-mono text-[#f3ecdc]">
                U
              </div>
              <div className="text-sm sm:text-base font-normal text-[#f3ecdc] pt-0.5">
                {currentCase.query}
              </div>
            </div>

            {/* Agent Reasoning & Tool Calls */}
            <div className="space-y-4 pt-2">
              <div className="text-xs font-mono uppercase tracking-widest text-[#f3ecdc]/50 flex items-center gap-2">
                <Cpu className="w-3.5 h-3.5 text-[#ffb454]" />
                <span>Autonomous Tool Invocations</span>
              </div>

              {/* Animated Tool Call Chips */}
              <div className="space-y-2">
                {currentCase.tools.map((tool, idx) => (
                  <div
                    key={idx}
                    className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 rounded-xl border text-xs font-mono transition-all duration-300 ${
                      demoStep >= idx + 1
                        ? "bg-[#121424] border-[#f3ecdc]/20 opacity-100 translate-y-0"
                        : "bg-[#090b14] border-transparent opacity-30 translate-y-2"
                    }`}
                  >
                    <div className="flex items-center gap-2 text-[#ffb454]">
                      <Search className="w-3.5 h-3.5 shrink-0" />
                      <code className="text-[#f3ecdc] font-semibold">{tool.name}</code>
                    </div>
                    <span className="text-[#f3ecdc]/60 text-[11px]">{tool.label}</span>
                  </div>
                ))}
              </div>

              {/* Synthesized Response */}
              {demoStep >= 2 && (
                <div className="mt-6 pt-6 border-t border-[#f3ecdc]/10 space-y-4 animate-fade-in">
                  <p className="text-sm sm:text-base text-[#f3ecdc]/90 leading-relaxed font-normal">
                    {currentCase.response}
                  </p>

                  {/* Quantitative Metrics Row */}
                  <div className="grid grid-cols-3 gap-3 pt-2">
                    {currentCase.metrics.map((m, idx) => (
                      <div key={idx} className="p-3 rounded-lg bg-[#141626] border border-[#f3ecdc]/10">
                        <div className="text-[11px] font-mono text-[#f3ecdc]/50">{m.label}</div>
                        <div className="text-sm sm:text-base font-mono font-bold text-[#f3ecdc] mt-0.5 tabular-nums">
                          {m.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Sources Cited */}
                  <div className="pt-3">
                    <div className="text-[11px] font-mono text-[#f3ecdc]/50 mb-2">Primary Sources Cited:</div>
                    <div className="flex flex-wrap gap-2">
                      {currentCase.citations.map((c, idx) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1.5 text-xs font-mono text-[#6ff2c2] hover:underline"
                        >
                          <FileText className="w-3 h-3" />
                          <span>{c.source}</span>
                          {idx < currentCase.citations.length - 1 && (
                            <span className="text-[#f3ecdc]/30">·</span>
                          )}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 2: Three Feature Panels */}
      <section className="py-24 px-6 sm:px-12 max-w-7xl mx-auto border-t border-[#f3ecdc]/10">
        <div className="text-center mb-16 sm:mb-20">
          <p className="text-xs font-mono uppercase tracking-[0.25em] text-[#b48cff] mb-3">
            Core Architecture
          </p>
          <h2 className="text-3xl sm:text-5xl font-display tracking-tight text-[#f3ecdc]">
            Engineered for precision. Crafted for clarity.
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* Feature 1: Research Agent */}
          <div className="rounded-2xl p-7 bg-[#0d0f1c] border border-[#f3ecdc]/12 flex flex-col justify-between hover:border-[#ffb454]/40 transition-colors group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#ffb454]/10 border border-[#ffb454]/25 flex items-center justify-center text-[#ffb454] mb-6">
                <Cpu className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-[#f3ecdc] mb-3 font-sans">
                Autonomous Research Agent
              </h3>
              <p className="text-sm text-[#f3ecdc]/70 leading-relaxed font-normal">
                Dispatches parallel sub-tasks across SEC filings, BSE disclosures, quarterly earnings calls,
                and technical indicators to build comprehensive investor theses in seconds.
              </p>
            </div>

            {/* Mini Visual */}
            <div className="mt-8 p-4 rounded-xl bg-[#070810] border border-[#f3ecdc]/10 font-mono text-xs space-y-2">
              <div className="flex items-center justify-between text-[#6ff2c2]">
                <span>&gt; pipeline_active</span>
                <span className="text-[10px] text-[#f3ecdc]/40">4 tools bound</span>
              </div>
              <div className="h-1.5 w-full bg-[#151828] rounded-full overflow-hidden">
                <div className="h-full bg-gradient-to-r from-[#ffb454] to-[#6ff2c2] w-4/5 animate-pulse" />
              </div>
              <div className="text-[10px] text-[#f3ecdc]/50">Synthesized 14 sources in 1.4s</div>
            </div>
          </div>

          {/* Feature 2: Charts and Indicators */}
          <div className="rounded-2xl p-7 bg-[#0d0f1c] border border-[#f3ecdc]/12 flex flex-col justify-between hover:border-[#b48cff]/40 transition-colors group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#b48cff]/10 border border-[#b48cff]/25 flex items-center justify-center text-[#b48cff] mb-6">
                <LineChart className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-[#f3ecdc] mb-3 font-sans">
                Professional Lightweight Charts
              </h3>
              <p className="text-sm text-[#f3ecdc]/70 leading-relaxed font-normal">
                Full TradingView lightweight candlestick charting with seamless range selection (1D to 5Y),
                SMA 50/200 overlays, RSI divergence, and integrated volume histograms.
              </p>
            </div>

            {/* Mini Visual */}
            <div className="mt-8 p-4 rounded-xl bg-[#070810] border border-[#f3ecdc]/10 font-mono text-xs">
              <div className="flex justify-between text-[#f3ecdc]/60 mb-2">
                <span>RSI (14): 58.4</span>
                <span className="text-[#ffb454]">SMA 50 &gt; 200</span>
              </div>
              <div className="flex items-end gap-1 h-10 pt-2">
                {[30, 45, 40, 60, 55, 75, 70, 85, 90, 80, 95].map((val, i) => (
                  <div
                    key={i}
                    style={{ height: `${val}%` }}
                    className="flex-1 rounded-xs bg-[#b48cff]/60"
                  />
                ))}
              </div>
            </div>
          </div>

          {/* Feature 3: Paper Trading */}
          <div className="rounded-2xl p-7 bg-[#0d0f1c] border border-[#f3ecdc]/12 flex flex-col justify-between hover:border-[#6ff2c2]/40 transition-colors group">
            <div>
              <div className="w-12 h-12 rounded-xl bg-[#6ff2c2]/10 border border-[#6ff2c2]/25 flex items-center justify-center text-[#6ff2c2] mb-6">
                <Wallet className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold text-[#f3ecdc] mb-3 font-sans">
                Institutional Paper Portfolio
              </h3>
              <p className="text-sm text-[#f3ecdc]/70 leading-relaxed font-normal">
                Execute virtual trades with ₹10,00,000 simulated capital. Track live unrealized P&L,
                benchmark correlation against Nifty 50, and monitor max drawdown risk metrics.
              </p>
            </div>

            {/* Mini Visual */}
            <div className="mt-8 p-4 rounded-xl bg-[#070810] border border-[#f3ecdc]/10 font-mono text-xs space-y-1.5">
              <div className="flex justify-between">
                <span className="text-[#f3ecdc]/50">Simulated Capital</span>
                <span className="text-[#f3ecdc] font-bold">₹10,00,000</span>
              </div>
              <div className="flex justify-between text-[#6ff2c2]">
                <span>Unrealized P&L</span>
                <span>+₹42,850 (+4.28%)</span>
              </div>
              <div className="flex justify-between text-[#f3ecdc]/40 text-[10px]">
                <span>Max Drawdown</span>
                <span>-2.1% (Low Risk)</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* SECTION 3: What This Is Not */}
      <section id="what-this-is-not" className="py-20 px-6 sm:px-12 max-w-4xl mx-auto border-t border-[#f3ecdc]/10">
        <div className="p-8 sm:p-10 rounded-2xl bg-[#090b14] border border-[#f3ecdc]/15">
          <div className="flex items-center gap-3 text-[#ff6f91] mb-4">
            <ShieldAlert className="w-5 h-5" />
            <h3 className="text-xs font-mono uppercase tracking-[0.2em] font-semibold">
              Transparent Mandate · What This Is Not
            </h3>
          </div>

          <h4 className="text-2xl sm:text-3xl font-display text-[#f3ecdc] mb-4">
            Intellectual honesty over automated hype.
          </h4>

          <div className="space-y-4 text-sm sm:text-base text-[#f3ecdc]/75 leading-relaxed font-normal">
            <p>
              <strong>1. Not financial advice:</strong> NIGHTFIELD is an educational and analytical
              research cockpit. We do not provide SEBI-registered investment advisories, buy/sell
              recommendations, or portfolio management services.
            </p>
            <p>
              <strong>2. No guaranteed returns:</strong> Financial markets are non-linear and subject
              to macroeconomic uncertainty. Algorithms and quantitative ratios are reflective of past
              disclosures, not deterministic predictions of future earnings.
            </p>
            <p>
              <strong>3. Always backtest and independently verify:</strong> Never execute capital
              decisions based solely on an automated model. Cross-reference all findings against statutory
              audits, primary exchanges, and your personal risk tolerance.
            </p>
          </div>

          <div className="mt-8 pt-6 border-t border-[#f3ecdc]/10 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <span className="text-xs font-mono text-[#f3ecdc]/50">
              Verified compliance with educational software standards.
            </span>
            <Link
              to="/app"
              className="inline-flex items-center gap-2 text-xs font-mono text-[#ffb454] hover:text-[#f3ecdc] transition-colors"
            >
              <span>Explore Research Terminal</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* FOOTER */}
      <footer className="py-12 px-6 sm:px-12 border-t border-[#f3ecdc]/10 bg-[#040508] text-xs font-mono text-[#f3ecdc]/60">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <span className="text-sm font-semibold tracking-tight text-[#f3ecdc]">{APP_NAME}</span>
            <span className="text-[#f3ecdc]/30">·</span>
            <span>Educational research tool. Not financial advice.</span>
          </div>

          <div className="flex items-center gap-6 text-[#f3ecdc]/50">
            <Link to="/app" className="hover:text-[#f3ecdc] transition-colors">
              Terminal
            </Link>
            <Link to="/app/funds" className="hover:text-[#f3ecdc] transition-colors">
              Index Funds
            </Link>
            <Link to="/app/portfolio" className="hover:text-[#f3ecdc] transition-colors">
              Paper Trading
            </Link>
            <Link to="/login" className="hover:text-[#f3ecdc] transition-colors">
              Account
            </Link>
          </div>

          <div>
            <span>© {new Date().getFullYear()} {APP_NAME}. All rights reserved.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};
