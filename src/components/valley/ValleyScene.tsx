/**
 * STAGE 1: WebGL Data Valley for NIGHTFIELD
 * 7,500 procedural point-sprite blooming flowers with custom petal ShaderMaterial,
 * CatmullRomCurve3 camera flight, mouse screen-space repulsion, real ticker anchors,
 * floating dust particles, light rays, speed vignette, and hover transition dispersion.
 */

import React, { useEffect, useRef, useState, useCallback } from "react";
import * as THREE from "three";
import { ambientSound } from "../../lib/audio";
import { STOCKS_DATA, StockQuote } from "../../mock/marketData";

export interface ValleySceneProps {
  scrollProgress: number; // 0 to 1
  onScrollProgressChange?: (progress: number) => void;
  isHoveringCTA: boolean;
  onSceneReady?: () => void;
}

interface HeroFlowerTicker {
  symbol: string;
  priceStr: string;
  changeStr: string;
  isPositive: boolean;
  position: THREE.Vector3;
  screenPos: { x: number; y: number; visible: boolean; opacity: number };
}

export const ValleyScene: React.FC<ValleySceneProps> = ({
  scrollProgress,
  onScrollProgressChange,
  isHoveringCTA,
  onSceneReady,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [heroTickers, setHeroTickers] = useState<HeroFlowerTicker[]>([]);
  const heroTickersRef = useRef<HeroFlowerTicker[]>([]);
  const scrollRef = useRef(scrollProgress);
  const targetScrollRef = useRef(scrollProgress);
  const isHoveringRef = useRef(isHoveringCTA);
  const dispersionRef = useRef(0);
  const scrollSpeedRef = useRef(0);
  const mouseRef = useRef(new THREE.Vector2(0, 0));
  const mouseVelRef = useRef(new THREE.Vector2(0, 0));

  // Sync props to refs
  useEffect(() => {
    isHoveringRef.current = isHoveringCTA;
  }, [isHoveringCTA]);

  useEffect(() => {
    targetScrollRef.current = scrollProgress;
  }, [scrollProgress]);

  // Touch and wheel handling for virtual scroller
  useEffect(() => {
    const el = window;
    let touchStartY = 0;

    const onWheel = (e: WheelEvent) => {
      // If we are on landing hero zone (progress < 0.6), capture wheel
      if (scrollRef.current < 0.6 || e.deltaY < 0) {
        const delta = e.deltaY * 0.00045;
        const next = Math.max(0, Math.min(1, targetScrollRef.current + delta));
        targetScrollRef.current = next;
        if (onScrollProgressChange) onScrollProgressChange(next);
      }
    };

    const onTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        touchStartY = e.touches[0].clientY;
      }
    };

    const onTouchMove = (e: TouchEvent) => {
      if (e.touches.length > 0) {
        const deltaY = (touchStartY - e.touches[0].clientY) * 0.0025; // 20x responsive touch multiplier
        touchStartY = e.touches[0].clientY;
        const next = Math.max(0, Math.min(1, targetScrollRef.current + deltaY));
        targetScrollRef.current = next;
        if (onScrollProgressChange) onScrollProgressChange(next);
      }
    };

    const onMouseMove = (e: MouseEvent) => {
      const ndcX = (e.clientX / window.innerWidth) * 2 - 1;
      const ndcY = -(e.clientY / window.innerHeight) * 2 + 1;
      mouseVelRef.current.set(ndcX - mouseRef.current.x, ndcY - mouseRef.current.y);
      mouseRef.current.set(ndcX, ndcY);
    };

    el.addEventListener("wheel", onWheel, { passive: true });
    el.addEventListener("touchstart", onTouchStart, { passive: true });
    el.addEventListener("touchmove", onTouchMove, { passive: true });
    el.addEventListener("mousemove", onMouseMove, { passive: true });

    return () => {
      el.removeEventListener("wheel", onWheel);
      el.removeEventListener("touchstart", onTouchStart);
      el.removeEventListener("touchmove", onTouchMove);
      el.removeEventListener("mousemove", onMouseMove);
    };
  }, [onScrollProgressChange]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Detect software WebGL
    const glProbe = document.createElement("canvas").getContext("webgl2");
    let isSoftwareGl = false;
    if (glProbe) {
      const ext = glProbe.getExtension("WEBGL_debug_renderer_info");
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : glProbe.RENDERER;
      const gpu = String(glProbe.getParameter(param));
      glProbe.getExtension("WEBGL_lose_context")?.loseContext();
      isSoftwareGl = /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    }

    const renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: !isSoftwareGl,
      powerPreference: "high-performance",
      alpha: true,
    });
    renderer.setPixelRatio(isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.15;

    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0x05060b, 0.0048);

    const camera = new THREE.PerspectiveCamera(58, window.innerWidth / window.innerHeight, 0.1, 1200);

    // Build CatmullRomCurve3 flight path
    const flightControlPoints = [
      new THREE.Vector3(0, 16, 280),
      new THREE.Vector3(-25, 14, 190),
      new THREE.Vector3(20, 18, 90),
      new THREE.Vector3(-15, 12, -10),
      new THREE.Vector3(28, 17, -110),
      new THREE.Vector3(-18, 14, -210),
      new THREE.Vector3(0, 22, -310),
    ];
    const flightCurve = new THREE.CatmullRomCurve3(flightControlPoints, false, "centripetal", 0.5);

    // Generate Procedural Terrain and Flowers
    const FLOWER_COUNT = isSoftwareGl ? 3500 : 7500;
    const positions = new Float32Array(FLOWER_COUNT * 3);
    const colors = new Float32Array(FLOWER_COUNT * 3);
    const baseSizes = new Float32Array(FLOWER_COUNT);
    const dispersions = new Float32Array(FLOWER_COUNT * 3);
    const tickerIndices = new Float32Array(FLOWER_COUNT);

    // Color definitions
    const colorAmber = new THREE.Color(0xffb454);
    const colorCoral = new THREE.Color(0xff6f91);
    const colorMint = new THREE.Color(0x6ff2c2);
    const colorOrchid = new THREE.Color(0xb48cff);
    const colorViolet = new THREE.Color(0x6366f1);
    const colorLeaf = new THREE.Color(0x1a332a);

    // Procedural terrain height function using layered sine waves
    const getTerrainHeight = (x: number, z: number) => {
      const valleyTrough = Math.pow(x / 45, 2) * 1.8; // creates U-shaped canyon
      const hillWaves =
        Math.sin(x * 0.04) * 8.0 +
        Math.cos(z * 0.035) * 6.5 +
        Math.sin(x * 0.08 + z * 0.06) * 3.5;
      return -10 + valleyTrough + hillWaves;
    };

    // Hero ticker assignments
    const heroList: HeroFlowerTicker[] = [];
    const tickerPositions: THREE.Vector3[] = [];

    // Pre-calculate hero ticker points evenly distributed along the flight path
    for (let i = 0; i < Math.min(36, STOCKS_DATA.length * 3); i++) {
      const stock = STOCKS_DATA[i % STOCKS_DATA.length];
      const curveT = 0.05 + (i / 36) * 0.9;
      const pathPoint = flightCurve.getPointAt(curveT);
      const side = i % 2 === 0 ? 1 : -1;
      const offsetX = side * (12 + (i % 5) * 4);
      const pos = new THREE.Vector3(
        pathPoint.x + offsetX,
        getTerrainHeight(pathPoint.x + offsetX, pathPoint.z) + 1.2,
        pathPoint.z + (Math.random() - 0.5) * 15
      );
      tickerPositions.push(pos);

      heroList.push({
        symbol: stock.symbol.replace(".NS", ""),
        priceStr: `₹${stock.price.toLocaleString("en-IN")}`,
        changeStr: `${stock.changePercent >= 0 ? "+" : ""}${stock.changePercent.toFixed(2)}%`,
        isPositive: stock.changePercent >= 0,
        position: pos,
        screenPos: { x: -999, y: -999, visible: false, opacity: 0 },
      });
    }

    heroTickersRef.current = heroList;
    setHeroTickers([...heroList]);

    let heroIndexCounter = 0;

    for (let i = 0; i < FLOWER_COUNT; i++) {
      // Distribute points in a 160 x 640 corridor
      const x = (Math.random() - 0.5) * 170;
      const z = 290 - Math.random() * 620;
      const y = getTerrainHeight(x, z);

      positions[i * 3] = x;
      positions[i * 3 + 1] = y;
      positions[i * 3 + 2] = z;

      // Dispersions: random vector radiating outward for hover transition
      const angle = Math.random() * Math.PI * 2;
      const lift = Math.random() * 1.5 + 0.3;
      dispersions[i * 3] = Math.cos(angle) * (15 + Math.random() * 25);
      dispersions[i * 3 + 1] = lift * (20 + Math.random() * 20);
      dispersions[i * 3 + 2] = Math.sin(angle) * (15 + Math.random() * 25);

      // Check if this point matches a hero ticker
      if (heroIndexCounter < tickerPositions.length && i % Math.floor(FLOWER_COUNT / 40) === 0) {
        const tp = tickerPositions[heroIndexCounter];
        positions[i * 3] = tp.x;
        positions[i * 3 + 1] = tp.y;
        positions[i * 3 + 2] = tp.z;
        tickerIndices[i] = heroIndexCounter;
        baseSizes[i] = 46.0; // Hero flowers are prominent

        const stock = STOCKS_DATA[heroIndexCounter % STOCKS_DATA.length];
        const col =
          stock.colorType === "mint"
            ? colorMint
            : stock.changePercent >= 1.0
            ? colorCoral
            : stock.changePercent >= 0
            ? colorAmber
            : colorOrchid;

        colors[i * 3] = col.r;
        colors[i * 3 + 1] = col.g;
        colors[i * 3 + 2] = col.b;

        heroIndexCounter++;
        continue;
      }

      tickerIndices[i] = -1.0;

      // Regular flowers and deep foliage
      const isFoliage = Math.random() < 0.28;
      if (isFoliage) {
        colors[i * 3] = colorLeaf.r + (Math.random() - 0.5) * 0.05;
        colors[i * 3 + 1] = colorLeaf.g + (Math.random() - 0.5) * 0.05;
        colors[i * 3 + 2] = colorLeaf.b;
        baseSizes[i] = 10.0 + Math.random() * 8.0;
      } else {
        // Market distribution: warm amber/coral for gains, violet/orchid for dips, mint for funds
        const roll = Math.random();
        let c: THREE.Color;
        let size = 18.0 + Math.random() * 22.0;

        if (roll < 0.42) {
          c = colorAmber;
        } else if (roll < 0.65) {
          c = colorCoral;
          size += 6.0;
        } else if (roll < 0.82) {
          c = colorOrchid;
        } else if (roll < 0.92) {
          c = colorMint;
        } else {
          c = colorViolet;
        }

        colors[i * 3] = c.r;
        colors[i * 3 + 1] = c.g;
        colors[i * 3 + 2] = c.b;
        baseSizes[i] = size;
      }
    }

    const flowerGeometry = new THREE.BufferGeometry();
    flowerGeometry.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    flowerGeometry.setAttribute("aColor", new THREE.BufferAttribute(colors, 3));
    flowerGeometry.setAttribute("aBaseSize", new THREE.BufferAttribute(baseSizes, 1));
    flowerGeometry.setAttribute("aDispersion", new THREE.BufferAttribute(dispersions, 3));

    // Custom ShaderMaterial: 5-Petal procedural fragment shader with bright radiating center
    const flowerShaderMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uTime: { value: 0 },
        uCameraPos: { value: new THREE.Vector3() },
        uMouse: { value: new THREE.Vector2() },
        uDispersionFactor: { value: 0 },
        uScrollSpeed: { value: 0 },
        uPixelRatio: { value: Math.min(window.devicePixelRatio, 2) },
      },
      vertexShader: `
        attribute vec3 aColor;
        attribute float aBaseSize;
        attribute vec3 aDispersion;

        uniform float uTime;
        uniform vec3 uCameraPos;
        uniform vec2 uMouse;
        uniform float uDispersionFactor;
        uniform float uScrollSpeed;
        uniform float uPixelRatio;

        varying vec3 vColor;
        varying float vDist;
        varying float vProximity;

        void main() {
          vColor = aColor;

          // Wind sway
          vec3 pos = position;
          pos.x += sin(uTime * 1.8 + position.z * 0.05) * 0.35;
          pos.y += cos(uTime * 1.4 + position.x * 0.05) * 0.25;

          // Disperse into floating particles on CTA hover
          pos += aDispersion * (uDispersionFactor * 1.8);

          vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
          gl_Position = projectionMatrix * mvPosition;

          // Calculate distance from camera
          float d = length(mvPosition.xyz);
          vDist = d;

          // Distance bloom factor (approaching flowers bloom from small to full size)
          float bloom = clamp((220.0 - d) / 120.0, 0.2, 1.35);

          // Speed stretch factor
          float stretch = 1.0 + clamp(uScrollSpeed * 12.0, 0.0, 0.8);

          // Screen space point size (capped so near flowers never blow up into huge stars)
          float rawSize = aBaseSize * bloom * stretch * (150.0 / -mvPosition.z);
          gl_PointSize = clamp(rawSize, 1.5, 78.0) * uPixelRatio;

          // Proximity to screen mouse for interactive glow
          vec2 screenPos = gl_Position.xy / gl_Position.w;
          float mouseDist = length(screenPos - uMouse);
          vProximity = 1.0 - clamp(mouseDist / 0.55, 0.0, 1.0);
        }
      `,
      fragmentShader: `
        varying vec3 vColor;
        varying float vDist;
        varying float vProximity;

        void main() {
          vec2 coord = gl_PointCoord - vec2(0.5);
          float r = length(coord) * 2.0;

          if (r > 1.0) discard;

          // Soft rounded 5-petal bloom with a warm glowing heart
          float theta = atan(coord.y, coord.x);
          float petalEdge = 0.74 + 0.1 * cos(theta * 5.0);       // gently scalloped round bloom
          float petalBody = 1.0 - smoothstep(petalEdge * 0.3, petalEdge, r);
          float core = exp(-r * r * 38.0);                      // bright centre
          float halo = exp(-r * r * 7.0) * 0.22;                // soft glow
          float alpha = clamp(petalBody * 0.62 + core * 0.9 + halo, 0.0, 1.0);

          // Fog fade
          float fogFactor = smoothstep(320.0, 150.0, vDist);

          // Mouse proximity radiance boost
          vec3 col = vColor * (0.8 + 0.5 * petalBody);
          col = mix(col, vec3(1.0, 0.93, 0.78), core * 0.75);
          col += vColor * (vProximity * 0.55);

          gl_FragColor = vec4(col, alpha * fogFactor * 0.9);
        }
      `,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    const flowerPoints = new THREE.Points(flowerGeometry, flowerShaderMaterial);
    scene.add(flowerPoints);

    // Floating Atmospheric Dust Particles
    const DUST_COUNT = isSoftwareGl ? 400 : 1200;
    const dustPositions = new Float32Array(DUST_COUNT * 3);
    for (let i = 0; i < DUST_COUNT; i++) {
      dustPositions[i * 3] = (Math.random() - 0.5) * 160;
      dustPositions[i * 3 + 1] = 5 + Math.random() * 35;
      dustPositions[i * 3 + 2] = 280 - Math.random() * 600;
    }
    const dustGeometry = new THREE.BufferGeometry();
    dustGeometry.setAttribute("position", new THREE.BufferAttribute(dustPositions, 3));
    // Round, soft dust sprite (a plain PointsMaterial draws ugly grey squares)
    const dustCanvas = document.createElement("canvas");
    dustCanvas.width = dustCanvas.height = 64;
    const dctx = dustCanvas.getContext("2d")!;
    const grad = dctx.createRadialGradient(32, 32, 0, 32, 32, 32);
    grad.addColorStop(0, "rgba(255,244,220,1)");
    grad.addColorStop(0.35, "rgba(255,244,220,0.35)");
    grad.addColorStop(1, "rgba(255,244,220,0)");
    dctx.fillStyle = grad;
    dctx.fillRect(0, 0, 64, 64);
    const dustTexture = new THREE.CanvasTexture(dustCanvas);
    const dustMaterial = new THREE.PointsMaterial({
      color: 0xf3ecdc,
      map: dustTexture,
      size: 1.1,
      sizeAttenuation: true,
      transparent: true,
      opacity: 0.55,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });
    const dustPoints = new THREE.Points(dustGeometry, dustMaterial);
    scene.add(dustPoints);

    // Soft Ambient Horizon Glow Light
    const ambientLight = new THREE.AmbientLight(0x0a0c18, 1.2);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffb454, 1.8);
    dirLight.position.set(30, 60, 50);
    scene.add(dirLight);

    // Resize Handler
    const handleResize = () => {
      const w = window.innerWidth;
      const h = window.innerHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
      flowerShaderMaterial.uniforms.uPixelRatio.value = Math.min(window.devicePixelRatio, 2);
    };
    window.addEventListener("resize", handleResize);

    // Signal ready after initialization
    if (onSceneReady) {
      setTimeout(onSceneReady, 100);
    }

    // Animation Loop
    let animationFrameId = 0;
    let lastTime = performance.now();
    let isHidden = false;

    const onVisibilityChange = () => {
      isHidden = document.hidden;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);

    const tempVec = new THREE.Vector3();
    const lookAtVec = new THREE.Vector3();

    const render = () => {
      animationFrameId = requestAnimationFrame(render);
      if (isHidden) return;

      const now = performance.now();
      const delta = Math.min((now - lastTime) / 1000, 0.1);
      lastTime = now;

      // Smooth damped scroll progression
      // Idle forward drift when user is inactive
      // (stays inside the valley: it never drifts on into the tunnel by itself and never wraps around)
      if (
        !isHoveringRef.current &&
        targetScrollRef.current < 0.45 &&
        Math.abs(targetScrollRef.current - scrollRef.current) < 0.001
      ) {
        targetScrollRef.current += 0.00015;
      }

      const prevScroll = scrollRef.current;
      scrollRef.current = THREE.MathUtils.damp(scrollRef.current, targetScrollRef.current, 5.0, delta);
      const scrollSpeed = Math.abs(scrollRef.current - prevScroll) / delta;
      scrollSpeedRef.current = THREE.MathUtils.damp(scrollSpeedRef.current, scrollSpeed, 6.0, delta);

      // Hover Transition: ease flight to stop & disperse flowers outward
      const targetDispersion = isHoveringRef.current ? 1.0 : 0.0;
      dispersionRef.current = THREE.MathUtils.damp(dispersionRef.current, targetDispersion, 4.0, delta);

      flowerShaderMaterial.uniforms.uTime.value += delta;
      flowerShaderMaterial.uniforms.uDispersionFactor.value = dispersionRef.current;
      flowerShaderMaterial.uniforms.uScrollSpeed.value = scrollSpeedRef.current;
      flowerShaderMaterial.uniforms.uMouse.value.set(mouseRef.current.x, mouseRef.current.y);

      // Calculate camera position along Catmull-Rom spline
      const effectiveT = Math.max(0.001, Math.min(0.999, scrollRef.current * (1.0 - dispersionRef.current * 0.6)));
      flightCurve.getPointAt(effectiveT, tempVec);

      // Camera tilt toward mouse
      const mouseTiltX = mouseRef.current.x * 6.0;
      const mouseTiltY = mouseRef.current.y * 3.5;
      camera.position.set(tempVec.x + mouseTiltX, tempVec.y + mouseTiltY, tempVec.z);
      flowerShaderMaterial.uniforms.uCameraPos.value.copy(camera.position);

      // Look slightly ahead along the path
      const lookAheadT = Math.min(0.999, effectiveT + 0.04);
      flightCurve.getPointAt(lookAheadT, lookAtVec);
      lookAtVec.x += mouseRef.current.x * 4.0;
      lookAtVec.y += mouseRef.current.y * 2.0;
      camera.lookAt(lookAtVec);

      // Project hero ticker labels to screen space
      const halfW = window.innerWidth / 2;
      const halfH = window.innerHeight / 2;

      let updatedTickers = false;
      const currentTickers = heroTickersRef.current;

      for (let i = 0; i < currentTickers.length; i++) {
        const item = currentTickers[i];
        const dist = camera.position.distanceTo(item.position);

        // Fade in when camera is near (distance between 12 and 55)
        if (dist > 12 && dist < 65) {
          const projected = item.position.clone().project(camera);
          // Check if in front of camera
          if (projected.z < 1.0) {
            const sx = projected.x * halfW + halfW;
            const sy = -projected.y * halfH + halfH;
            const opacity = THREE.MathUtils.clamp((65 - dist) / 30, 0, 0.95);

            item.screenPos.x = sx;
            item.screenPos.y = sy;
            item.screenPos.visible = true;
            item.screenPos.opacity = opacity;
            updatedTickers = true;
            continue;
          }
        }
        if (item.screenPos.visible) {
          item.screenPos.visible = false;
          updatedTickers = true;
        }
      }

      if (updatedTickers) {
        setHeroTickers([...currentTickers]);
      }

      // Rotate dust particles slightly
      dustPoints.rotation.y += 0.0006;

      renderer.render(scene, camera);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      document.removeEventListener("visibilitychange", onVisibilityChange);

      // Dispose all Three.js resources
      flowerGeometry.dispose();
      flowerShaderMaterial.dispose();
      dustGeometry.dispose();
      dustMaterial.dispose();
      dustTexture.dispose();
      renderer.dispose();
    };
  }, []);

  return (
    <div ref={containerRef} className="fixed inset-0 w-full h-full overflow-hidden bg-[#05060b] z-0">
      <canvas id="valley" ref={canvasRef} className="w-full h-full block" />

      {/* Hero Tickers Projected Labels */}
      <div className="absolute inset-0 pointer-events-none overflow-hidden select-none z-10">
        {heroTickers.map((t, idx) => {
          if (!t.screenPos.visible) return null;
          return (
            <div
              key={idx}
              className="absolute transform -translate-x-1/2 -translate-y-full transition-opacity duration-200 pointer-events-none"
              style={{
                left: `${t.screenPos.x}px`,
                top: `${t.screenPos.y - 12}px`,
                opacity: t.screenPos.opacity,
              }}
            >
              <div className="flex items-center gap-1.5 px-2 py-0.5 rounded border border-[#f3ecdc]/15 bg-[#05060b]/80 backdrop-blur-sm text-[11px] font-mono tracking-wide shadow-lg">
                <span className="font-semibold text-[#f3ecdc]">{t.symbol}</span>
                <span className="text-[#f3ecdc]/60">{t.priceStr}</span>
                <span className={t.isPositive ? "text-[#ffb454]" : "text-[#b48cff]"}>{t.changeStr}</span>
              </div>
              <div className="w-px h-3 bg-gradient-to-b from-[#f3ecdc]/40 to-transparent mx-auto" />
            </div>
          );
        })}
      </div>

      {/* Speed-responsive Vignette */}
      <div
        className="pointer-events-none absolute inset-0 transition-opacity duration-300"
        style={{
          background: "radial-gradient(circle at center, transparent 40%, rgba(5,6,11,0.85) 100%)",
          opacity: 0.65 + scrollSpeedRef.current * 0.35,
        }}
      />
    </div>
  );
};
