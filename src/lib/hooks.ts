import { useCallback, useEffect, useRef, useState } from "react";
import { api, PriceTick } from "./api";

/** Fetch on mount / dep change, then re-poll every `intervalMs` (paused while the tab is hidden). */
export function usePolling<T>(fn: () => Promise<T>, intervalMs: number, deps: unknown[] = []) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const alive = useRef(true);

  const run = useCallback(async () => {
    try {
      const d = await fnRef.current();
      if (!alive.current) return;
      setData(d);
      setError(null);
    } catch (e) {
      if (alive.current) setError(e as Error);
    } finally {
      if (alive.current) setLoading(false);
    }
  }, []);

  useEffect(() => {
    alive.current = true;
    setLoading(true);
    run();
    const id = setInterval(() => {
      if (!document.hidden) run();
    }, intervalMs);
    return () => {
      alive.current = false;
      clearInterval(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [intervalMs, run, ...deps]);

  return { data, setData, error, loading, refresh: run };
}

/** Live price ticks over the backend WebSocket (/ws/prices). Keys are upper-cased symbols. */
export function useLivePrices(symbols: string[]) {
  const [ticks, setTicks] = useState<Record<string, PriceTick>>({});
  const [connected, setConnected] = useState(false);
  const key = symbols.map((s) => s.toUpperCase()).sort().join(",");

  useEffect(() => {
    setTicks({});
    if (!key) return;
    const unsub = api.subscribePrices(
      key.split(","),
      (t) => {
        if (t.error || typeof t.price !== "number") return;
        setTicks((prev) => ({ ...prev, [t.symbol.toUpperCase()]: t }));
      },
      setConnected
    );
    return () => {
      unsub();
      setConnected(false);
    };
  }, [key]);

  return { ticks, connected };
}
