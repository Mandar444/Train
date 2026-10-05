import { useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Easing } from 'react-native';
import { onChange } from './db';

/** Run an async query and re-run it whenever the database changes. */
export function useQuery<T>(fn: () => Promise<T>, deps: unknown[] = []): { data: T | undefined; reload: () => void } {
  const [data, setData] = useState<T>();
  const fnRef = useRef(fn);
  fnRef.current = fn;
  const alive = useRef(true);
  const run = useCallback(() => {
    fnRef.current().then((d) => { if (alive.current) setData(d); }).catch((e) => console.warn('query failed', e));
  }, []);
  useEffect(() => {
    alive.current = true;
    run();
    const off = onChange(run);
    return () => { alive.current = false; off(); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
  return { data, reload: run };
}

/** Eased 0→1 progress over `ms`, restarting whenever `key` changes. */
export function useProgress(ms = 1100, key: unknown = 0): number {
  const [p, setP] = useState(0);
  useEffect(() => {
    let raf = 0;
    let start: number | null = null;
    const tick = (t: number) => {
      if (start === null) start = t;
      const x = Math.min(1, (t - start) / ms);
      setP(1 - Math.pow(1 - x, 3));
      if (x < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [ms, key]);
  return p;
}

/** Fade + rise entrance. */
export function useEntrance(delay = 0) {
  const v = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.timing(v, { toValue: 1, duration: 520, delay, easing: Easing.bezier(0.2, 0.8, 0.2, 1), useNativeDriver: true }).start();
  }, [v, delay]);
  return { opacity: v, transform: [{ translateY: v.interpolate({ inputRange: [0, 1], outputRange: [16, 0] }) }] };
}

/** Elapsed-time loop (seconds), for animations driven from JS. */
export function useClock(running = true): number {
  const [t, setT] = useState(0);
  useEffect(() => {
    if (!running) return;
    let raf = 0;
    const t0 = Date.now();
    const tick = () => { setT((Date.now() - t0) / 1000); raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [running]);
  return t;
}

export function useInterval(cb: () => void, ms: number | null) {
  const r = useRef(cb);
  r.current = cb;
  useEffect(() => {
    if (ms === null) return;
    const id = setInterval(() => r.current(), ms);
    return () => clearInterval(id);
  }, [ms]);
}
