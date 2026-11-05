/**
 * STAGE 2: 3D Perspective Tunnel of Stocks
 * Based on 21st.dev component with 12 live stock/fund cards, SVG sparklines,
 * golden-angle placement, spring smoothing, pointer parallax, and smooth route navigation.
 */

import React, { useEffect, useRef, useState } from "react";
import {
  motion,
  useTransform,
  useReducedMotion,
  useMotionValue,
  useSpring,
  MotionValue,
} from "framer-motion";
import { useNavigate } from "react-router-dom";
import { ArrowUpRight, ArrowDownRight, TrendingUp } from "lucide-react";
import { STOCKS_DATA, StockQuote } from "../../mock/marketData";

interface TunnelCardData {
  item: StockQuote;
  angleCos: number;
  angleSin: number;
  radiusFactorX: number;
  radiusFactorY: number;
  rotationZ: number;
  index: number;
}

const TUNNEL_CARDS: TunnelCardData[] = STOCKS_DATA.map((item, i) => {
  const goldenAngle = i * 137.5 * (Math.PI / 180);
  const radiusFactorX = 0.28 + (i % 3) * 0.08;
  const radiusFactorY = 0.26 + (i % 2) * 0.09;

  return {
    item,
    angleCos: Math.cos(goldenAngle),
    angleSin: Math.sin(goldenAngle),
    radiusFactorX,
    radiusFactorY,
    rotationZ: (i % 2 === 0 ? 1 : -1) * (3 + (i % 5) * 2),
    index: i,
  };
});

const SPRING_CONFIG = { stiffness: 60, damping: 25, mass: 0.5 };

interface StageDimensions {
  width: number;
  height: number;
  isMobile: boolean;
}

function useCameraParallax(enabled: boolean) {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);
  const x = useSpring(rawX, SPRING_CONFIG);
  const y = useSpring(rawY, SPRING_CONFIG);

  useEffect(() => {
    if (!enabled) return;
    const onMove = (e: PointerEvent) => {
      rawX.set((e.clientX / window.innerWidth - 0.5) * 2);
      rawY.set((e.clientY / window.innerHeight - 0.5) * 2);
    };
    window.addEventListener("pointermove", onMove, { passive: true });
    return () => window.removeEventListener("pointermove", onMove);
  }, [enabled, rawX, rawY]);

  return { x, y };
}

interface TunnelCardProps {
  card: TunnelCardData;
  progress: MotionValue<number>;
  pointer: { x: MotionValue<number>; y: MotionValue<number> };
  total: number;
  stage: StageDimensions;
  onSelect: (symbol: string) => void;
}

function TunnelCard({ card, progress, pointer, total, stage, onSelect }: TunnelCardProps) {
  const staggerSpan = 0.55;
  const start = (card.index / total) * (1 - staggerSpan);
  const end = start + staggerSpan;

  const localProgress = useTransform(progress, [start, end], [0, 1]);

  const farZ = stage.isMobile ? -1200 : -1700;
  const nearZ = stage.isMobile ? 350 : 500;
  const z = useTransform(localProgress, [0, 1], [farZ, nearZ]);

  const opacity = useTransform(localProgress, [0, 0.18, 0.82, 0.98], [0, 1, 1, 0]);

  const cardWidth = stage.isMobile
    ? Math.max(150, Math.min(200, stage.width * 0.42))
    : Math.max(200, Math.min(300, stage.width * 0.19));

  const baseX = card.angleCos * (stage.width * card.radiusFactorX);
  const baseY = card.angleSin * (stage.height * card.radiusFactorY);
  const panStrength = stage.isMobile ? 20 : 45;

  const transform = useTransform(
    [z, pointer.x, pointer.y],
    ([currZ, px, py]: number[]) => {
      const offsetX = baseX - px * panStrength;
      const offsetY = baseY - py * panStrength;
      return `translate3d(calc(-50% + ${offsetX}px), calc(-50% + ${offsetY}px), ${currZ}px) rotateZ(${card.rotationZ}deg)`;
    }
  );

  const isUp = card.item.changePercent >= 0;
  const isFund = card.item.colorType === "mint";
  const accentColor = isFund ? "#6ff2c2" : isUp ? "#ffb454" : "#b48cff";

  // Build SVG sparkline path
  const pts = card.item.sparkline;
  const minVal = Math.min(...pts);
  const maxVal = Math.max(...pts);
  const range = maxVal - minVal || 1;
  const w = 180;
  const h = 50;
  const svgPoints = pts
    .map((v, idx) => {
      const px = (idx / (pts.length - 1)) * w;
      const py = h - ((v - minVal) / range) * (h - 10) - 5;
      return `${px},${py}`;
    })
    .join(" ");

  return (
    <motion.div
      style={{
        width: cardWidth,
        transform,
        opacity,
        zIndex: card.index + 1,
      }}
      onClick={() => onSelect(card.item.symbol)}
      className="pointer-events-auto absolute left-1/2 top-1/2 aspect-[4/5] will-change-transform select-none cursor-pointer"
    >
      <div
        className="group relative h-full w-full overflow-hidden rounded-2xl bg-[#0c0e18]/90 p-4 sm:p-5 flex flex-col justify-between shadow-2xl transition-all duration-300 hover:scale-[1.03]"
        style={{
          border: `1px solid ${accentColor}33`,
          boxShadow: `0 10px 30px -10px ${accentColor}25`,
        }}
      >
        {/* Subtle accent glow halo */}
        <div
          className="absolute -top-16 -right-16 w-32 h-32 rounded-full blur-2xl opacity-30 transition-opacity group-hover:opacity-60 pointer-events-none"
          style={{ backgroundColor: accentColor }}
        />

        {/* Card Header */}
        <div>
          <div className="flex items-center justify-between">
            <span className="font-mono text-xs sm:text-sm font-bold tracking-tight text-[#f3ecdc]">
              {card.item.symbol.replace(".NS", "")}
            </span>
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded border"
              style={{
                borderColor: `${accentColor}40`,
                color: accentColor,
              }}
            >
              {card.item.exchange}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-[#f3ecdc]/60 line-clamp-1 mt-0.5 font-normal">
            {card.item.name}
          </p>
        </div>

        {/* Price & Change Section */}
        <div className="my-auto">
          <div className="font-mono text-xl sm:text-2xl font-bold text-[#f3ecdc] tracking-tight">
            ₹{card.item.price.toLocaleString("en-IN", { minimumFractionDigits: 2 })}
          </div>
          <div className="flex items-center gap-1 mt-1 font-mono text-xs font-medium" style={{ color: accentColor }}>
            {isUp ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
            <span>
              {isUp ? "+" : ""}
              {card.item.changePercent.toFixed(2)}%
            </span>
          </div>
        </div>

        {/* Tiny Sparkline */}
        <div className="w-full pt-2 border-t border-[#f3ecdc]/10">
          <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-8 overflow-visible">
            <defs>
              <linearGradient id={`grad-${card.index}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={accentColor} stopOpacity="0.4" />
                <stop offset="100%" stopColor={accentColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>
            <polygon
              points={`0,${h} ${svgPoints} ${w},${h}`}
              fill={`url(#grad-${card.index})`}
            />
            <polyline
              fill="none"
              stroke={accentColor}
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
              points={svgPoints}
            />
          </svg>
          <div className="flex items-center justify-between text-[10px] font-mono text-[#f3ecdc]/40 mt-1">
            <span>Vol {((card.item.volume || 1000000) / 100000).toFixed(1)}L</span>
            <span>Click to analyze</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

interface PerspectiveTunnelProps {
  onTunnelComplete?: () => void;
}

export const PerspectiveTunnel: React.FC<PerspectiveTunnelProps> = ({ onTunnelComplete }) => {
  const navigate = useNavigate();
  const containerRef = useRef<HTMLDivElement>(null);
  const reduce = useReducedMotion();

  const [stage, setStage] = useState<StageDimensions>({
    width: 1440,
    height: 900,
    isMobile: false,
  });

  const [tunnelProgressValue, setTunnelProgressValue] = useState(0);

  useEffect(() => {
    const updateDimensions = () => {
      setStage({
        width: window.innerWidth,
        height: window.innerHeight,
        isMobile: window.innerWidth < 768,
      });
    };

    updateDimensions();
    window.addEventListener("resize", updateDimensions);
    return () => window.removeEventListener("resize", updateDimensions);
  }, []);

  // Raw motion value controlled directly by mouse wheel / touch trackpad
  const rawProgress = useMotionValue(0);
  const smoothProgress = useSpring(rawProgress, {
    stiffness: 80,
    damping: 30,
    restDelta: 0.0001,
  });

  useEffect(() => {
    const unsubscribe = smoothProgress.on("change", (latest) => {
      setTunnelProgressValue(latest);
      if (latest >= 0.98 && onTunnelComplete) {
        onTunnelComplete();
      }
    });
    return () => unsubscribe();
  }, [smoothProgress, onTunnelComplete]);

  // Handle wheel scrolling locally inside the viewport container
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const handleWheel = (e: WheelEvent) => {
      const current = rawProgress.get();
      // If at end and scrolling down, allow normal page scroll
      if (current >= 0.99 && e.deltaY > 0) {
        return;
      }
      // If at start and scrolling up, allow normal page scroll
      if (current <= 0.01 && e.deltaY < 0) {
        return;
      }

      e.preventDefault();
      const delta = e.deltaY * 0.0008; // smooth speed of tunnel travel
      const next = Math.min(1, Math.max(0, current + delta));
      rawProgress.set(next);
    };

    el.addEventListener("wheel", handleWheel, { passive: false });
    return () => el.removeEventListener("wheel", handleWheel);
  }, [rawProgress]);

  const pointer = useCameraParallax(!reduce);

  const titleScale = useTransform(smoothProgress, [0, 0.5, 1], [0.8, 1, 1.25]);
  const titleOpacity = useTransform(smoothProgress, [0, 0.12, 0.85, 1], [0.35, 1, 1, 0]);
  const promptOpacity = useTransform(smoothProgress, [0, 0.12], [1, 0]);

  return (
    <div
      ref={containerRef}
      id="tunnel-section"
      className="relative h-[100svh] w-screen overflow-hidden bg-[#05060b] text-[#f3ecdc] select-none flex items-center justify-center"
      style={{
        perspective: stage.isMobile ? "900px" : "1200px",
        transformStyle: "preserve-3d",
      }}
    >
      {/* Background Grid & Atmospheric Glow */}
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(rgba(243,236,220,0.06)_1px,transparent_1px)] [background-size:32px_32px] [mask-image:radial-gradient(ellipse_70%_70%_at_50%_50%,#000_60%,transparent_100%)] opacity-60" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(180,140,255,0.08)_0%,transparent_75%)]" />

      {/* Depth Ring Guides */}
      <div className="pointer-events-none absolute h-[52vmin] w-[52vmin] rounded-full border border-[#b48cff]/15" />
      <div className="pointer-events-none absolute h-[78vmin] w-[78vmin] rounded-full border border-dashed border-[#f3ecdc]/10" />

      {/* Central Anchor Typography */}
      <motion.div
        style={{ scale: titleScale, opacity: titleOpacity }}
        className="pointer-events-none z-0 flex flex-col items-center text-center px-6 max-w-2xl"
      >
        <p className="text-xs font-mono uppercase tracking-[0.35em] text-[#ffb454] mb-3">
          The whole market
        </p>
        <h2 className="text-4xl sm:text-6xl md:text-7xl font-display tracking-tight leading-[0.95] text-[#f3ecdc]">
          Every company. Every fund.
          <br />
          <span className="italic text-[#f3ecdc]/80">One question away.</span>
        </h2>
        <p className="mt-4 max-w-[38ch] text-sm sm:text-base font-normal text-[#f3ecdc]/70">
          Scroll to fly through the market.
        </p>
      </motion.div>

      {/* Scroll Prompt */}
      <motion.div
        style={{ opacity: promptOpacity }}
        className="pointer-events-none absolute bottom-8 z-20 flex flex-col items-center gap-2 text-xs font-mono uppercase tracking-[0.25em] text-[#f3ecdc]/50"
      >
        <span>Scroll through corridor</span>
        <div className="h-6 w-px bg-gradient-to-b from-[#ffb454] to-transparent" />
      </motion.div>

      {/* 3D Z-Space Plane */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ transformStyle: "preserve-3d" }}
      >
        {TUNNEL_CARDS.map((card, i) => (
          <TunnelCard
            key={card.item.symbol}
            card={card}
            progress={smoothProgress}
            pointer={pointer}
            total={TUNNEL_CARDS.length}
            stage={stage}
            onSelect={(symbol) => navigate(`/app/stock/${symbol}`)}
          />
        ))}
      </div>
    </div>
  );
};
