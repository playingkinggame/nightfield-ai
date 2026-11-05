/**
 * Master Application Router for NIGHTFIELD
 * Features client-side routing, route-level code structure, and persistent film-grain layer.
 */

import React from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { LandingPage } from "./pages/LandingPage";
import { AuthPage } from "./pages/AuthPage";
import { TerminalLayout } from "./pages/TerminalLayout";
import { WatchlistView } from "./components/app/WatchlistView";
import { StockView } from "./components/app/StockView";
import { FundsView } from "./components/app/FundsView";
import { PortfolioView } from "./components/app/PortfolioView";
import { SettingsView } from "./components/app/SettingsView";

export default function App() {
  return (
    <BrowserRouter>
      {/* Subtle global film-grain overlay */}
      <div className="film-grain" />

      <Routes>
        {/* Landing Page with Valley Hero, 3D Tunnel, and Landing Sections */}
        <Route path="/" element={<LandingPage />} />

        {/* Minimal Luxury Auth */}
        <Route path="/login" element={<AuthPage />} />
        <Route path="/signup" element={<AuthPage />} />

        {/* App Terminal */}
        <Route path="/app" element={<TerminalLayout />}>
          <Route index element={<WatchlistView />} />
          <Route path="stock/:symbol" element={<StockView />} />
          <Route path="funds" element={<FundsView />} />
          <Route path="portfolio" element={<PortfolioView />} />
          <Route path="settings" element={<SettingsView />} />
          <Route path="*" element={<Navigate to="/app" replace />} />
        </Route>

        {/* Catch all */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
