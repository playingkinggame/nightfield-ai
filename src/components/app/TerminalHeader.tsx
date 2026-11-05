/**
 * Terminal Header for NIGHTFIELD
 * Features:
 * - Live NSE/BSE ticker strip (Nifty 50, Sensex, Bank Nifty, Nifty IT) with micro-ticks
 * - Global Cmd+K Search trigger
 * - Indian Standard Time (IST) market clock
 * - AI Chat Dock toggle
 */

import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  Search,
  Sparkles,
  PanelRightClose,
  PanelRightOpen,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
  Circle,
} from "lucide-react";
import { MARKET_INDICES, APP_NAME } from "../../lib/constants";

interface TerminalHeaderProps {
  onOpenSearch: () => void;
  isChatOpen: boolean;
  onToggleChat: () => void;
}

export const TerminalHeader: React.FC<TerminalHeaderProps> = ({
  onOpenSearch,
  isChatOpen,
  onToggleChat,
}) => {
  const [indices, setIndices] = useState(MARKET_INDICES);
  const [istTime, setIstTime] = useState("");

  // Live IST Clock and subtle realistic market micro-fluctuations
  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      // Format in IST (Asia/Kolkata)
      const formatted = now.toLocaleTimeString("en-IN", {
        timeZone: "Asia/Kolkata",
        hour12: false,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      });
      setIstTime(`${formatted} IST`);
    };

    updateTime();
    const timeInterval = setInterval(updateTime, 1000);

    // Micro-ticks every 4 seconds
    const tickInterval = setInterval(() => {
      setIndices((prev) =>
        prev.map((idx) => {
          const delta = (Math.random() - 0.48) * 4.5;
          const newPrice = Number((idx.price + delta).toFixed(2));
          return {
            ...idx,
            price: newPrice,
          };
        })
      );
    }, 3800);

    return () => {
      clearInterval(timeInterval);
      clearInterval(tickInterval);
    };
  }, []);

  return (
    <header className="h-14 border-b border-[#f3ecdc]/10 bg-[#080a14] px-4 flex items-center justify-between gap-4 sticky top-0 z-30 select-none">
      {/* Brand & Market Strip */}
      <div className="flex items-center gap-6 min-w-0 flex-1 overflow-hidden">
        <Link
          to="/"
          className="font-display text-xl text-[#f3ecdc] tracking-tight shrink-0 hover:opacity-85 transition-opacity"
        >
          {APP_NAME}
        </Link>

        {/* Live Index Tickers */}
        <div className="hidden lg:flex items-center gap-4 text-xs font-mono overflow-x-auto py-1 scrollbar-none">
          {indices.map((idx) => (
            <div
              key={idx.symbol}
              className="flex items-center gap-2 px-2.5 py-1 rounded bg-[#101322] border border-[#f3ecdc]/10 shrink-0"
            >
              <span className="font-semibold text-[#f3ecdc]/90">{idx.symbol}</span>
              <span className="text-[#f3ecdc] tabular-nums font-bold">
                {idx.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
              </span>
              <span
                className={`flex items-center text-[11px] ${
                  idx.isUp ? "text-[#ffb454]" : "text-[#b48cff]"
                }`}
              >
                {idx.isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                {idx.isUp ? "+" : ""}
                {idx.changePercent.toFixed(2)}%
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Center Search Trigger (Cmd + K) */}
      <div className="shrink-0 w-[260px] md:w-[340px]">
        <button
          onClick={onOpenSearch}
          className="w-full flex items-center justify-between px-3.5 py-1.5 rounded-xl bg-[#121528] border border-[#f3ecdc]/15 text-xs text-[#f3ecdc]/50 hover:border-[#f3ecdc]/40 hover:text-[#f3ecdc] transition-all cursor-pointer"
        >
          <div className="flex items-center gap-2">
            <Search className="w-3.5 h-3.5 text-[#ffb454]" />
            <span className="font-sans">Search stocks, ETFs, index funds...</span>
          </div>
          <div className="flex items-center gap-1 font-mono text-[10px] text-[#f3ecdc]/40">
            <kbd className="px-1.5 py-0.5 rounded bg-[#f3ecdc]/10">⌘</kbd>
            <kbd className="px-1.5 py-0.5 rounded bg-[#f3ecdc]/10">K</kbd>
          </div>
        </button>
      </div>

      {/* Right Controls: IST Clock, Market Status, Chat Dock Toggle */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs font-mono text-[#f3ecdc]/60">
          <Clock className="w-3.5 h-3.5 text-[#f3ecdc]/40" />
          <span>{istTime}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-[#6ff2c2] ml-1" />
          <span className="text-[11px] text-[#6ff2c2]">NSE Live</span>
        </div>

        {/* AI Dock Toggle Button */}
        <button
          onClick={onToggleChat}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-xl text-xs font-mono transition-all cursor-pointer border ${
            isChatOpen
              ? "bg-[#ffb454]/15 border-[#ffb454]/40 text-[#ffb454]"
              : "bg-[#121528] border-[#f3ecdc]/15 text-[#f3ecdc]/80 hover:text-[#f3ecdc] hover:border-[#f3ecdc]/40"
          }`}
          title="Toggle AI Research Assistant"
        >
          <Sparkles className="w-3.5 h-3.5 text-[#ffb454]" />
          <span className="hidden sm:inline font-medium">Research AI</span>
          {isChatOpen ? (
            <PanelRightClose className="w-3.5 h-3.5 opacity-60" />
          ) : (
            <PanelRightOpen className="w-3.5 h-3.5 opacity-60" />
          )}
        </button>
      </div>
    </header>
  );
};
