# NIGHTFIELD

AI-powered stock and index fund research platform where markets bloom like a living night garden.

## Tech Stack
- **Framework**: React 19 + TypeScript + Vite
- **Styling**: Tailwind CSS v4 (`dark` class enabled by default)
- **3D & WebGL**: Three.js (procedural custom ShaderMaterial petal bloom garden & Catmull-Rom spline camera)
- **3D Spatial Tunnel**: Framer Motion 3D perspective corridor
- **Financial Charting**: TradingView `lightweight-charts` (Candlesticks, Line, 50-DMA, RSI, Volume)
- **Routing**: `react-router-dom`
- **Audio**: Web Audio API (procedural generative harmonic pad with low-pass hover filter, zero external sound files, starts muted)

## Setup & Running

```bash
# 1. Install dependencies
npm install

# 2. Run development server (runs on port 3000)
npm run dev

# 3. Build for production
npm run build
```

## Environment Variables

Defined in `.env.example`:
- `VITE_USE_MOCK`: Set to `"true"` (default) to run full demo with high-fidelity NSE/BSE equities, benchmark index funds, and simulated SSE streaming. Set to `"false"` to connect to your live FastAPI backend.
- `VITE_API_URL`: Base URL for your live FastAPI backend (default: `http://localhost:8000`).
- `GEMINI_API_KEY`: Injected automatically at runtime in AI Studio for server-side intelligence.

## Architecture

- **`src/components/valley/`**: WebGL Data Valley featuring 7,500 procedural blooming flower sprites, mouse screen-space repulsion, ~40 hero ticker anchors, and cream-on-dark interface layer with magnetic CTA.
- **`src/components/tunnel/`**: 3D spatial tunnel with 12 live stock and index fund cards, golden-angle placement, and real SVG sparklines.
- **`src/components/landing/`**: Auto-playing AI research demo with animated tool call chips, three feature panels, and statutory disclosures.
- **`src/components/app/`**: Institutional research terminal with live NSE/BSE indices strip, TradingView lightweight-charts, key financial ratios, news sentiment, Paper Portfolio, and real-time streaming AI Research Chat Dock.
- **`src/lib/api.ts`**: Single gateway supporting both deterministic mock mode and live SSE streaming from FastAPI backend.
