/**
 * Demo-mode (VITE_USE_MOCK=true) stand-in for the backend's per-user data.
 * Persists a paper portfolio + watchlist in localStorage so the UI is fully usable without the API.
 * NEVER used in live mode.
 */
import { STOCKS_DATA, StockQuote } from "../mock/marketData";
import type { Portfolio, PortfolioSummary, TradeResult, Holding } from "./types";

const KEY = "nightfield_mock_state";
const START_CASH = 1_000_000;

interface State {
  cash: number;
  positions: { symbol: string; name: string; quantity: number; avgPrice: number }[];
  trades: Portfolio["trades"];
  watch: string[];
  nextId: number;
}

const fresh = (): State => ({ cash: START_CASH, positions: [], trades: [], watch: STOCKS_DATA.slice(0, 6).map((s) => s.symbol), nextId: 1 });

function load(): State {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore */
  }
  return fresh();
}
const save = (s: State) => {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    /* ignore */
  }
};
const find = (sym: string): StockQuote | undefined =>
  STOCKS_DATA.find((s) => s.symbol.toUpperCase() === sym.toUpperCase() || s.symbol.replace(".NS", "") === sym.toUpperCase());

function holdings(s: State): Holding[] {
  return s.positions.map((p) => {
    const cur = find(p.symbol)?.price ?? p.avgPrice;
    const value = cur * p.quantity;
    const cost = p.avgPrice * p.quantity;
    return { symbol: p.symbol, name: p.name, quantity: p.quantity, avgPrice: p.avgPrice, currentPrice: cur, value, pnl: value - cost, pnlPercent: cost ? (value / cost - 1) * 100 : 0, stale: false };
  });
}

export const mockStore = {
  watchlist: (): StockQuote[] => load().watch.map(find).filter((x): x is StockQuote => !!x),
  addWatch(symbol: string): StockQuote[] {
    const s = load();
    const q = find(symbol);
    if (q && !s.watch.includes(q.symbol)) s.watch.push(q.symbol);
    save(s);
    return mockStore.watchlist();
  },
  removeWatch(symbol: string): StockQuote[] {
    const s = load();
    s.watch = s.watch.filter((w) => w !== symbol && w.replace(".NS", "") !== symbol);
    save(s);
    return mockStore.watchlist();
  },
  portfolio(): Portfolio {
    const s = load();
    return { cash: s.cash, holdings: holdings(s), trades: [...s.trades].reverse().slice(0, 50) };
  },
  trade(symbol: string, side: "buy" | "sell", quantity: number): TradeResult {
    const s = load();
    const q = find(symbol);
    if (!q) throw new Error("Unknown symbol in demo mode.");
    const cost = q.price * quantity;
    let pos = s.positions.find((p) => p.symbol === q.symbol);
    if (side === "buy") {
      if (cost > s.cash) throw new Error("Insufficient virtual cash.");
      s.cash -= cost;
      if (pos) {
        pos.avgPrice = (pos.avgPrice * pos.quantity + cost) / (pos.quantity + quantity);
        pos.quantity += quantity;
      } else s.positions.push((pos = { symbol: q.symbol, name: q.name, quantity, avgPrice: q.price }));
    } else {
      if (!pos || pos.quantity < quantity) throw new Error(`Cannot sell ${quantity}: you hold ${pos?.quantity ?? 0}.`);
      s.cash += cost;
      pos.quantity -= quantity;
      if (pos.quantity === 0) s.positions = s.positions.filter((p) => p !== pos);
    }
    const trade = { id: s.nextId++, symbol: q.symbol, side, quantity, price: q.price, createdAt: new Date().toISOString() };
    s.trades.push(trade);
    save(s);
    return { trade, cash: s.cash, holding: holdings(s).find((h) => h.symbol === q.symbol) ?? null };
  },
  reset(): Portfolio {
    const s = load();
    s.cash = START_CASH;
    s.positions = [];
    s.trades = [];
    save(s);
    return mockStore.portfolio();
  },
  summary(): PortfolioSummary {
    const s = load();
    const h = holdings(s);
    const invested = h.reduce((a, x) => a + x.avgPrice * x.quantity, 0);
    const current = h.reduce((a, x) => a + x.value, 0);
    const total = s.cash + current;
    return {
      cash: s.cash, invested, currentValue: current, totalValue: total, pnl: current - invested,
      pnlPercent: invested ? (current / invested - 1) * 100 : 0, holdings: h,
      allocation: [...h.map((x) => ({ symbol: x.symbol, name: x.name, value: x.value, percentage: total ? (x.value / total) * 100 : 0 })),
        { symbol: "CASH", name: "Virtual cash", value: s.cash, percentage: total ? (s.cash / total) * 100 : 0 }],
      maxDrawdown: 0, note: "Demo mode: sample prices, stored in this browser only.",
    };
  },
};
