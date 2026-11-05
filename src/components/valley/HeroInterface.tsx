/**
 * Interface layer for Stage 1: Data Valley Hero
 * Cream-on-dark interface layer with exact desktop & mobile sizing,
 * magnetic hover round CTA button, audio toggle, and intro sequence.
 */

import React, { useState, useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ArrowRight, Volume2, VolumeX } from "lucide-react";
import { ambientSound } from "../../lib/audio";
import { APP_NAME } from "../../lib/constants";

interface HeroInterfaceProps {
  isSceneReady: boolean;
  onHoverCTAStart: () => void;
  onHoverCTAEnd: () => void;
  visibleOpacity?: number; // for cross-fading into tunnel
  onSkip?: () => void; // jump straight to the landing sections
}

export const HeroInterface: React.FC<HeroInterfaceProps> = ({
  isSceneReady,
  onHoverCTAStart,
  onHoverCTAEnd,
  visibleOpacity = 1,
  onSkip,
}) => {
  const navigate = useNavigate();
  const [isIntroComplete, setIsIntroComplete] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const [isMagnetic, setIsMagnetic] = useState(false);
  const magneticBtnRef = useRef<HTMLButtonElement>(null);
  const [btnOffset, setBtnOffset] = useState({ x: 0, y: 0 });

  // Handle scene ready fade-out loader & fade-in interface
  useEffect(() => {
    if (isSceneReady) {
      const timer = setTimeout(() => {
        setIsIntroComplete(true);
      }, 950);
      return () => clearTimeout(timer);
    }
  }, [isSceneReady]);

  // Audio toggle handler
  const handleToggleAudio = () => {
    const muted = ambientSound.toggleMute();
    setIsMuted(muted);
  };

  // Magnetic hover effect on 58u round button
  const handlePointerMove = (e: React.PointerEvent<HTMLButtonElement>) => {
    if (!magneticBtnRef.current) return;
    const rect = magneticBtnRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    const distFactor = 0.35;
    const dx = (e.clientX - centerX) * distFactor;
    const dy = (e.clientY - centerY) * distFactor;
    setBtnOffset({ x: dx, y: dy });
  };

  const handlePointerEnter = () => {
    setIsMagnetic(true);
    onHoverCTAStart();
    ambientSound.startHoverMuffle();
  };

  const handlePointerLeave = () => {
    setIsMagnetic(false);
    setBtnOffset({ x: 0, y: 0 });
    onHoverCTAEnd();
    ambientSound.stopHoverMuffle();
  };

  return (
    <>
      {/* Intro Loader: Black full-screen cover with single pulsing 9u cream dot */}
      <div
        className={`fixed inset-0 z-50 bg-[#05060b] flex items-center justify-center pointer-events-none transition-opacity duration-1000 ${
          isIntroComplete ? "opacity-0" : "opacity-100"
        }`}
      >
        <div
          className="rounded-full bg-[#f3ecdc] animate-pulse"
          style={{
            width: "calc(9 * var(--u))",
            height: "calc(9 * var(--u))",
            minWidth: "9px",
            minHeight: "9px",
          }}
        />
      </div>

      {/* Main Interface Layer (pointer-events-none except interactive elements) */}
      <div
        className="fixed inset-0 z-20 pointer-events-none select-none transition-opacity duration-700"
        style={{
          opacity: isIntroComplete ? visibleOpacity : 0,
          transitionDuration: isIntroComplete ? "1600ms" : "0ms",
        }}
      >
        {/* Header */}
        <header
          className="w-full flex items-center justify-between"
          style={{
            paddingTop: "calc(24 * var(--u))",
            paddingLeft: "calc(44 * var(--u))",
            paddingRight: "calc(44 * var(--u))",
          }}
        >
          {/* Wordmark */}
          <Link
            to="/"
            className="pointer-events-auto text-[#f3ecdc] font-medium tracking-tight hover:opacity-85 transition-opacity"
            style={{
              fontSize: "calc(26 * var(--u))",
            }}
          >
            {APP_NAME}
          </Link>

          {/* Right Nav */}
          <div
            className="flex items-center"
            style={{
              gap: "calc(44 * var(--u))",
            }}
          >
            <nav className="hidden md:flex items-center gap-[calc(44*var(--u))]">
              <Link
                to="/app"
                className="pointer-events-auto text-[#f3ecdc]/70 hover:text-[#f3ecdc] uppercase font-mono transition-colors"
                style={{
                  fontSize: "calc(14.5 * var(--u))",
                  letterSpacing: "0.16em",
                }}
              >
                Terminal
              </Link>
              <Link
                to="/app/funds"
                className="pointer-events-auto text-[#f3ecdc]/70 hover:text-[#f3ecdc] uppercase font-mono transition-colors"
                style={{
                  fontSize: "calc(14.5 * var(--u))",
                  letterSpacing: "0.16em",
                }}
              >
                Markets
              </Link>
              <button
                type="button"
                onClick={onSkip}
                className="pointer-events-auto text-[#f3ecdc]/70 hover:text-[#f3ecdc] uppercase font-mono transition-colors cursor-pointer"
                style={{
                  fontSize: "calc(14.5 * var(--u))",
                  letterSpacing: "0.16em",
                }}
              >
                How it works
              </button>
            </nav>

            {/* Pill CTA button */}
            <Link
              to="/app"
              className="pointer-events-auto inline-flex items-center justify-center font-medium rounded-full bg-[#f3ecdc] text-[#151510] hover:bg-white active:scale-95 transition-all shadow-md"
              style={{
                height: "calc(46 * var(--u))",
                paddingLeft: "calc(26 * var(--u))",
                paddingRight: "calc(26 * var(--u))",
                fontSize: "calc(14 * var(--u))",
              }}
            >
              Start researching
            </Link>
          </div>
        </header>

        {/* Center Hero */}
        <div
          className="absolute inset-x-0 flex flex-col items-center text-center px-5"
          style={{
            top: "50%",
            transform: "translateY(-46%)",
          }}
        >
          {/* Soft dark scrim so the headline stays readable over the flowers */}
          <div
            className="pointer-events-none absolute -z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[110%] h-[160%]"
            style={{
              background:
                "radial-gradient(ellipse at center, rgba(5,6,11,0.78) 0%, rgba(5,6,11,0.5) 40%, rgba(5,6,11,0) 70%)",
            }}
          />
          {/* Display Headline: Instrument Serif, tight tracking, no wrap on desktop */}
          <h1
            className="font-display font-normal text-[#f3ecdc] whitespace-normal md:whitespace-nowrap tracking-tight leading-[0.92]"
            style={{
              fontSize: "max(52px, calc(150 * var(--u)))",
              textShadow: "0 2px 40px rgba(5,6,11,0.9)",
            }}
          >
            See the market bloom.
          </h1>

          {/* Caption */}
          <p
            className="text-[#f3ecdc]/80 font-normal leading-[1.3] max-w-[58ch]"
            style={{
              marginTop: "calc(48 * var(--u))",
              fontSize: "max(17px, calc(20 * var(--u)))",
            }}
          >
            AI that reads the news, the charts and the filings, so you don't have to.
          </p>

          {/* Magnetic Round Arrow Button */}
          <div
            style={{
              marginTop: "calc(34 * var(--u))",
            }}
          >
            <button
              ref={magneticBtnRef}
              onClick={() => navigate("/app")}
              onPointerMove={handlePointerMove}
              onPointerEnter={handlePointerEnter}
              onPointerLeave={handlePointerLeave}
              aria-label="Enter research terminal"
              className="pointer-events-auto group relative rounded-full flex items-center justify-center transition-colors duration-300 cursor-pointer"
              style={{
                width: "calc(58 * var(--u))",
                height: "calc(58 * var(--u))",
                border: "1.5px solid #f3ecdc",
                transform: `translate(${btnOffset.x}px, ${btnOffset.y}px)`,
                transition: isMagnetic ? "background-color 0.25s, color 0.25s" : "all 0.35s ease-out",
              }}
            >
              {/* Inner fill on hover */}
              <div
                className="absolute inset-0 rounded-full bg-[#f3ecdc] transition-opacity duration-300 opacity-0 group-hover:opacity-100"
                style={{ transform: "scale(1.02)" }}
              />

              {/* Lucide Arrow */}
              <ArrowRight
                className="relative z-10 text-[#f3ecdc] group-hover:text-[#151510] transition-transform duration-300 group-hover:translate-x-0.5"
                style={{
                  width: "calc(22 * var(--u))",
                  height: "calc(22 * var(--u))",
                }}
              />
            </button>
          </div>
        </div>

        {/* Bottom Bar: Explore & Sound Toggle */}
        <div
          className="absolute flex items-center justify-between w-full pointer-events-none"
          style={{
            bottom: "calc(44 * var(--u))",
            paddingLeft: "calc(44 * var(--u))",
            paddingRight: "calc(44 * var(--u))",
          }}
        >
          {/* Subtle indicator left (desktop) */}
          <div className="hidden md:flex items-center gap-2 text-[#f3ecdc]/40 font-mono text-[11px] uppercase tracking-widest">
            <span className="w-1.5 h-1.5 rounded-full bg-[#6ff2c2]" />
            <span>Interactive Data Garden</span>
          </div>

          {/* Right cluster on desktop, centered on mobile */}
          <div className="flex items-center gap-4 mx-auto md:mx-0 md:ml-auto">
            <span
              className="font-mono uppercase text-[#f3ecdc]/70"
              style={{
                fontSize: "calc(12.5 * var(--u))",
                letterSpacing: "0.16em",
              }}
            >
              Scroll to explore
            </span>

            {/* 1px 26u divider */}
            <div
              className="bg-[#f3ecdc]/25"
              style={{
                width: "1px",
                height: "calc(26 * var(--u))",
              }}
            />

            {/* 28u speaker toggle button */}
            <button
              onClick={handleToggleAudio}
              aria-label={isMuted ? "Unmute generative ambient sound" : "Mute ambient sound"}
              className="pointer-events-auto rounded-full flex items-center justify-center text-[#f3ecdc]/75 hover:text-[#f3ecdc] hover:bg-[#f3ecdc]/10 active:scale-95 transition-all cursor-pointer"
              style={{
                width: "calc(28 * var(--u))",
                height: "calc(28 * var(--u))",
              }}
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4" />
              ) : (
                <Volume2 className="w-4 h-4 text-[#ffb454]" />
              )}
            </button>
          </div>
        </div>
      </div>
    </>
  );
};
