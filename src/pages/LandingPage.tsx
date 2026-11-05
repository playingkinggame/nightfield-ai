/**
 * Master Landing Page for NIGHTFIELD
 * Harmoniously combines:
 * Stage 1: Data Valley Hero (WebGL procedural garden)
 * Stage 2: Perspective Tunnel of Stocks (3D spatial corridor)
 * Stage 3: Landing Sections (AI research console, feature panels, disclosures)
 */

import React, { useState, useEffect } from "react";
import { ValleyScene } from "../components/valley/ValleyScene";
import { HeroInterface } from "../components/valley/HeroInterface";
import { PerspectiveTunnel } from "../components/tunnel/PerspectiveTunnel";
import { LandingSections } from "../components/landing/LandingSections";
import { STOCKS_DATA } from "../mock/marketData";
import { Link } from "react-router-dom";
import { APP_NAME } from "../lib/constants";

export const LandingPage: React.FC = () => {
  const [scrollProgress, setScrollProgress] = useState(0);
  const [isHoveringCTA, setIsHoveringCTA] = useState(false);
  const [isSceneReady, setIsSceneReady] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  // "journey" = fixed valley + tunnel (no page scroll). "landing" = normal scrolling page.
  const [phase, setPhase] = useState<"journey" | "landing">("journey");

  const goToLanding = (targetId?: string) => {
    setPhase("landing");
    window.scrollTo(0, 0);
    if (targetId) {
      setTimeout(() => document.getElementById(targetId)?.scrollIntoView({ behavior: "smooth" }), 80);
    }
  };

  const replayJourney = () => {
    setScrollProgress(0);
    setIsSceneReady(false);
    setPhase("journey");
    window.scrollTo(0, 0);
  };

  // Lock page scroll during the journey so the wheel flies the camera instead
  useEffect(() => {
    if (prefersReducedMotion) return;
    document.body.style.overflow = phase === "journey" ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [phase, prefersReducedMotion]);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);
    const handler = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handler);
    return () => mediaQuery.removeEventListener("change", handler);
  }, []);

  // When the tunnel reaches the end, hand over to the normal scrolling page
  const handleTunnelComplete = () => {
    goToLanding();
  };

  // Cross-fade opacity calculation:
  // 0.0 -> 0.55: valley 1.0, tunnel 0.0
  // 0.55 -> 0.75: cross-fade
  // 0.75 -> 1.0: tunnel 1.0
  const tunnelOpacity = Math.max(0, Math.min(1, (scrollProgress - 0.52) / 0.2));
  const valleyOpacity = 1 - tunnelOpacity;
  // The headline UI fades away as soon as you start flying, so it never ghosts through the tunnel
  const heroUiOpacity = Math.max(0, Math.min(1, 1 - scrollProgress / 0.22));

  return (
    <div className="relative w-full min-h-screen bg-[#05060b] text-[#f3ecdc] overflow-x-hidden">
      {/* Reduced Motion Fallback */}
      {prefersReducedMotion ? (
        <div className="min-h-screen pt-20 px-6 sm:px-12 max-w-7xl mx-auto flex flex-col justify-center">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h1 className="text-5xl sm:text-7xl font-display text-[#f3ecdc] mb-4">
              See the market bloom.
            </h1>
            <p className="text-lg text-[#f3ecdc]/70 mb-8">
              AI that reads the news, the charts and the filings, so you don't have to.
            </p>
            <Link
              to="/app"
              className="inline-flex items-center px-6 py-3 rounded-full bg-[#f3ecdc] text-[#151510] font-medium"
            >
              Start researching
            </Link>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 mb-24">
            {STOCKS_DATA.slice(0, 6).map((s) => (
              <div key={s.symbol} className="p-5 rounded-xl bg-[#0c0e18] border border-[#f3ecdc]/15">
                <div className="flex justify-between items-center mb-2">
                  <span className="font-mono font-bold">{s.symbol}</span>
                  <span className="font-mono text-xs text-[#ffb454]">₹{s.price}</span>
                </div>
                <div className="text-xs text-[#f3ecdc]/60">{s.name}</div>
              </div>
            ))}
          </div>

          <LandingSections />
        </div>
      ) : phase === "journey" ? (
        <>
          {/* STAGE 1: Data Valley fixed behind hero */}
          <div
            className="fixed inset-0 z-0 pointer-events-auto transition-opacity duration-500"
            style={{ opacity: valleyOpacity, display: valleyOpacity <= 0.01 ? "none" : "block" }}
          >
            <ValleyScene
              scrollProgress={scrollProgress}
              onScrollProgressChange={setScrollProgress}
              isHoveringCTA={isHoveringCTA}
              onSceneReady={() => setIsSceneReady(true)}
            />
          </div>

          {/* STAGE 1 Interface Layer */}
          <div
            style={{
              opacity: heroUiOpacity,
              display: heroUiOpacity <= 0.01 ? "none" : "block",
            }}
          >
            <HeroInterface
              isSceneReady={isSceneReady}
              onHoverCTAStart={() => setIsHoveringCTA(true)}
              onHoverCTAEnd={() => setIsHoveringCTA(false)}
              visibleOpacity={1}
              onSkip={() => goToLanding("landing-content")}
            />
          </div>

          {/* STAGE 2: 3D Tunnel of Stocks (fixed full screen over the valley) */}
          <div
            className="fixed inset-0 z-10 transition-opacity duration-500"
            style={{
              opacity: tunnelOpacity,
              display: tunnelOpacity <= 0.01 ? "none" : "block",
            }}
          >
            <PerspectiveTunnel onTunnelComplete={handleTunnelComplete} />
          </div>

          {/* Quick jump past the intro */}
          <div className="fixed bottom-6 left-6 z-30 pointer-events-auto hidden md:block">
            <button
              onClick={() => goToLanding()}
              className="text-[11px] font-mono text-[#f3ecdc]/50 hover:text-[#f3ecdc] px-3 py-1.5 rounded-full border border-[#f3ecdc]/15 bg-[#05060b]/60 backdrop-blur-sm transition-all cursor-pointer"
            >
              Skip intro →
            </button>
          </div>
        </>
      ) : (
        <>
          {/* STAGE 3: normal scrolling landing page */}
          <div className="fixed top-0 inset-x-0 z-30 flex items-center justify-between px-5 sm:px-10 h-14 bg-[#05060b]/80 backdrop-blur border-b border-[#f3ecdc]/10">
            <button onClick={replayJourney} className="font-display text-xl tracking-tight cursor-pointer">
              {APP_NAME}
            </button>
            <div className="flex items-center gap-3">
              <button
                onClick={replayJourney}
                className="hidden sm:block text-[11px] font-mono uppercase tracking-[0.16em] text-[#f3ecdc]/60 hover:text-[#f3ecdc] cursor-pointer"
              >
                Replay valley
              </button>
              <Link
                to="/app"
                className="inline-flex items-center h-9 px-5 rounded-full bg-[#f3ecdc] text-[#151510] text-sm font-medium hover:bg-white transition-colors"
              >
                Start researching
              </Link>
            </div>
          </div>
          <div id="landing-content" className="relative z-20 bg-[#05060b] pt-14">
            <LandingSections />
          </div>
        </>
      )}
    </div>
  );
};
