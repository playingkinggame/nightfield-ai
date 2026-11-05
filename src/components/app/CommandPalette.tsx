/**
 * Global Command Palette for NIGHTFIELD (Cmd/Ctrl + K)
 * Instant debounced search for NSE/BSE equities, ETFs, and Indian Index Mutual Funds.
 */

import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Search, TrendingUp, Sparkles, X, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { api, SearchResult } from "../../lib/api";

interface CommandPaletteProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CommandPalette: React.FC<CommandPaletteProps> = ({ isOpen, onClose }) => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Debounced search
  useEffect(() => {
    if (!isOpen) {
      setQuery("");
      setResults([]);
      return;
    }

    // Auto-focus input on open
    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await api.search(query);
        setResults(res);
        setSelectedIndex(0);
      } catch {
        setResults([]);
      } finally {
        setIsLoading(false);
      }
    }, 120);

    return () => clearTimeout(handler);
  }, [query, isOpen]);

  // Keyboard navigation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Escape") {
      onClose();
    } else if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev < results.length - 1 ? prev + 1 : prev));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === "Enter" && results.length > 0) {
      e.preventDefault();
      handleSelect(results[selectedIndex]);
    }
  };

  const handleSelect = (item: SearchResult) => {
    onClose();
    if (item.type === "fund") {
      navigate(`/app/funds?code=${encodeURIComponent(item.symbol)}`);
    } else {
      navigate(`/app/stock/${encodeURIComponent(item.symbol)}`);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-[#05060b]/80 backdrop-blur-md">
      <div
        className="w-full max-w-2xl rounded-2xl bg-[#0c0e1a] border border-[#f3ecdc]/20 shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        onKeyDown={handleKeyDown}
      >
        {/* Search Input Bar */}
        <div className="flex items-center gap-3 px-5 py-4 border-b border-[#f3ecdc]/10 bg-[#090b14]">
          <Search className="w-5 h-5 text-[#ffb454]" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search company (TCS, RELIANCE) or index fund (Nifty 50, BeES)..."
            className="flex-1 bg-transparent text-sm sm:text-base font-sans text-[#f3ecdc] placeholder:text-[#f3ecdc]/40 focus:outline-none"
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="p-1 rounded text-[#f3ecdc]/40 hover:text-[#f3ecdc]"
            >
              <X className="w-4 h-4" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-2 py-0.5 rounded text-[11px] font-mono text-[#f3ecdc]/40 bg-[#f3ecdc]/10">
            ESC
          </kbd>
        </div>

        {/* Results list */}
        <div className="max-h-96 overflow-y-auto p-2">
          {isLoading ? (
            <div className="py-12 text-center text-xs font-mono text-[#f3ecdc]/40">
              Querying live exchange order book...
            </div>
          ) : results.length === 0 ? (
            <div className="py-12 text-center text-xs font-mono text-[#f3ecdc]/40">
              No ticker matches found for "{query}".
            </div>
          ) : (
            results.map((item, idx) => {
              const isSelected = idx === selectedIndex;
              const isUp = item.changePercent >= 0;
              return (
                <div
                  key={item.symbol}
                  onClick={() => handleSelect(item)}
                  onMouseEnter={() => setSelectedIndex(idx)}
                  className={`flex items-center justify-between p-3.5 rounded-xl cursor-pointer transition-colors ${
                    isSelected ? "bg-[#16192c] text-[#f3ecdc]" : "hover:bg-[#121424] text-[#f3ecdc]/80"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[#f3ecdc]/10 flex items-center justify-center font-mono text-xs font-bold text-[#f3ecdc]">
                      {item.type === "fund" ? "MF" : "EQ"}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-sm text-[#f3ecdc]">
                          {item.symbol.replace(".NS", "")}
                        </span>
                        <span className="text-[10px] font-mono text-[#f3ecdc]/40 px-1 rounded bg-[#f3ecdc]/5">
                          {item.exchange}
                        </span>
                      </div>
                      <div className="text-xs text-[#f3ecdc]/60 line-clamp-1">{item.name}</div>
                    </div>
                  </div>

                  <div className="text-right font-mono">
                    <div className="text-sm font-semibold text-[#f3ecdc] tabular-nums">
                      ₹{item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
                    </div>
                    <div
                      className={`text-[11px] flex items-center justify-end gap-0.5 ${
                        isUp ? "text-[#ffb454]" : "text-[#b48cff]"
                      }`}
                    >
                      {isUp ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                      <span>
                        {isUp ? "+" : ""}
                        {item.changePercent.toFixed(2)}%
                      </span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="flex items-center justify-between px-5 py-2.5 bg-[#080912] border-t border-[#f3ecdc]/10 text-[11px] font-mono text-[#f3ecdc]/40">
          <div className="flex items-center gap-3">
            <span>↑↓ Navigate</span>
            <span>↵ Select</span>
            <span>ESC Close</span>
          </div>
          <span className="text-[#6ff2c2]">NSE / BSE Live Link</span>
        </div>
      </div>
    </div>
  );
};
