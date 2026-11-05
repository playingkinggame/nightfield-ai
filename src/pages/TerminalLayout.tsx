/**
 * Terminal Master Layout for NIGHTFIELD (/app/*)
 * Houses header, command palette, left navigation rail, main viewport, and right AI research dock.
 */

import React, { useState, useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { TerminalHeader } from "../components/app/TerminalHeader";
import { TerminalSidebar } from "../components/app/TerminalSidebar";
import { AIChatDock } from "../components/app/AIChatDock";
import { CommandPalette } from "../components/app/CommandPalette";

export const TerminalLayout: React.FC = () => {
  const location = useLocation();
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isChatOpen, setIsChatOpen] = useState(false);

  // Extract active stock symbol if present in path (e.g. /app/stock/TCS.NS)
  const stockMatch = location.pathname.match(/\/app\/stock\/([^/?]+)/);
  const activeSymbol = stockMatch ? decodeURIComponent(stockMatch[1]) : undefined;

  // Global keyboard shortcut for Cmd/Ctrl + K
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  return (
    <div className="min-h-screen bg-[#05060b] text-[#f3ecdc] flex flex-col overflow-x-hidden selection:bg-[#ffb454]/20 selection:text-[#f3ecdc]">
      {/* Top Header */}
      <TerminalHeader
        onOpenSearch={() => setIsSearchOpen(true)}
        isChatOpen={isChatOpen}
        onToggleChat={() => setIsChatOpen((prev) => !prev)}
      />

      {/* Main Body */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Rail */}
        <TerminalSidebar />

        {/* Viewport Content */}
        <main className="flex-1 overflow-y-auto bg-[#05060b] pb-24">
          <Outlet />
        </main>

        {/* Collapsible Right AI Chat Dock */}
        <AIChatDock
          isOpen={isChatOpen}
          onClose={() => setIsChatOpen(false)}
          activeSymbol={activeSymbol}
        />
      </div>

      {/* Global Command Palette */}
      <CommandPalette isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />
    </div>
  );
};
