/**
 * Terminal Sidebar Left Rail for NIGHTFIELD
 * Features:
 * - Watchlist / Equities overview
 * - Benchmark Index Funds directory
 * - Institutional Paper Portfolio
 * - Terminal Settings & Disclosures
 * - User session and back-to-valley navigation
 */

import React, { useState, useEffect } from "react";
import { Link, useLocation } from "react-router-dom";
import {
  LineChart,
  Layers,
  Wallet,
  Settings,
  Compass,
  LogOut,
  UserCheck,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import { auth, User } from "../../lib/auth";

export const TerminalSidebar: React.FC = () => {
  const location = useLocation();
  const [user, setUser] = useState<User | null>(auth.getUser());

  useEffect(() => {
    return auth.subscribe((u) => setUser(u));
  }, []);

  const navItems = [
    { label: "Watchlist", path: "/app", icon: LineChart },
    { label: "Index Funds", path: "/app/funds", icon: Layers },
    { label: "Paper Portfolio", path: "/app/portfolio", icon: Wallet },
    { label: "Settings", path: "/app/settings", icon: Settings },
  ];

  return (
    <aside className="w-16 md:w-56 h-[calc(100vh-3.5rem)] bg-[#070912] border-r border-[#f3ecdc]/10 flex flex-col justify-between shrink-0 select-none">
      {/* Top Nav Group */}
      <div className="p-3 space-y-1.5">
        <div className="hidden md:block px-3 py-2 text-[10px] font-mono text-[#f3ecdc]/40 uppercase tracking-widest">
          Terminal Desk
        </div>

        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive =
            item.path === "/app"
              ? location.pathname === "/app" || location.pathname.startsWith("/app/stock")
              : location.pathname.startsWith(item.path);

          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono transition-all ${
                isActive
                  ? "bg-[#14182c] text-[#f3ecdc] font-semibold border border-[#f3ecdc]/15 shadow-sm"
                  : "text-[#f3ecdc]/60 hover:text-[#f3ecdc] hover:bg-[#0f1120]"
              }`}
              title={item.label}
            >
              <Icon className={`w-4 h-4 ${isActive ? "text-[#ffb454]" : "text-[#f3ecdc]/50"}`} />
              <span className="hidden md:inline">{item.label}</span>
            </Link>
          );
        })}

        <div className="pt-4 border-t border-[#f3ecdc]/10">
          <Link
            to="/"
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-mono text-[#f3ecdc]/60 hover:text-[#f3ecdc] hover:bg-[#0f1120] transition-colors"
            title="Return to Valley Hero"
          >
            <Compass className="w-4 h-4 text-[#6ff2c2]" />
            <span className="hidden md:inline">Data Valley</span>
          </Link>
        </div>
      </div>

      {/* User Section Bottom */}
      <div className="p-3 border-t border-[#f3ecdc]/10 bg-[#06070e]">
        {user ? (
          <div className="flex items-center justify-between">
            <div className="hidden md:flex items-center gap-2.5 overflow-hidden">
              <div className="w-7 h-7 rounded-full bg-[#ffb454]/20 border border-[#ffb454]/40 flex items-center justify-center font-mono text-xs text-[#ffb454] shrink-0 font-bold">
                {user.name.charAt(0)}
              </div>
              <div className="overflow-hidden">
                <div className="text-xs font-mono text-[#f3ecdc] truncate font-medium">{user.name}</div>
                <div className="text-[10px] font-mono text-[#6ff2c2] truncate">Simulated Desk</div>
              </div>
            </div>

            <button
              onClick={() => auth.signOut()}
              className="p-1.5 rounded-lg text-[#f3ecdc]/40 hover:text-[#ff6f91] hover:bg-[#ff6f91]/10 transition-colors mx-auto md:mx-0"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            to="/login"
            className="flex items-center justify-center gap-2 w-full py-2 rounded-xl border border-[#f3ecdc]/15 bg-[#121528] text-xs font-mono text-[#f3ecdc] hover:bg-[#181b32] transition-colors"
          >
            <UserCheck className="w-4 h-4 text-[#ffb454]" />
            <span className="hidden md:inline">Sign In</span>
          </Link>
        )}
      </div>
    </aside>
  );
};
