import { useState, useCallback, useRef } from 'react';

const CACHE_MS = 5 * 60 * 1000; // 5 นาที

/**
 * Phase 4: Cache chart data for 5 minutes.
 * Returns [data, loading, fetch] where fetch() only refetches when cache expired.
 */
export function useChartCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  initialData: T
): [T, boolean, () => Promise<void>] {
  const [data, setData] = useState<T>(initialData);
  const [loading, setLoading] = useState(false);
  const cached = useRef<{ data: T; at: number } | null>(null);

  const fetch = useCallback(async () => {
    const now = Date.now();
    if (cached.current && now - cached.current.at < CACHE_MS) {
      setData(cached.current.data);
      return;
    }
    setLoading(true);
    try {
      const next = await fetcher();
      cached.current = { data: next, at: Date.now() };
      setData(next);
    } catch (e) {
      console.error(`Chart cache [${key}] error:`, e);
    } finally {
      setLoading(false);
    }
  }, [key, fetcher]);

  return [data, loading, fetch];
}
