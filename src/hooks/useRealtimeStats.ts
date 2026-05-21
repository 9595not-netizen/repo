import { useEffect, useState, useCallback } from 'react';
import type { RealtimeChannel } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';

export interface TopModelRow {
  brand_name: string;
  model_name: string;
  storage: string;
  total_sold: number;
  total_revenue: number;
}

export interface DashboardStats {
  stock: number;
  salesToday: number;
  profitToday: number;
  topModels: TopModelRow[];
}

const initialStats: DashboardStats = {
  stock: 0,
  salesToday: 0,
  profitToday: 0,
  topModels: [],
};

const CHANNEL_NAME = 'dashboard-realtime-stats-v2';
const POLL_INTERVAL_MS = 60_000;

let sharedChannel: RealtimeChannel | null = null;
let subscriberCount = 0;
let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let activeFetch: (() => void) | null = null;

function scheduleRefetch(fetchStats: () => void) {
  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    fetchStats();
  }, 400);
}

function subscribeDashboardRealtime(fetchStats: () => void) {
  activeFetch = fetchStats;

  if (sharedChannel) return;

  try {
    sharedChannel = supabase
      .channel(CHANNEL_NAME)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        if (activeFetch) scheduleRefetch(activeFetch);
      })
      .subscribe();
  } catch (e) {
    console.warn('Dashboard realtime unavailable:', e);
    sharedChannel = null;
  }
}

function unsubscribeDashboardRealtime() {
  subscriberCount = Math.max(0, subscriberCount - 1);
  if (subscriberCount > 0) return;

  if (debounceTimer) {
    clearTimeout(debounceTimer);
    debounceTimer = null;
  }
  activeFetch = null;

  if (sharedChannel) {
    supabase.removeChannel(sharedChannel);
    sharedChannel = null;
  }
}

/**
 * Phase 4: Realtime dashboard stats (singleton channel — ป้องกัน subscribe ซ้ำ)
 */
export function useRealtimeStats() {
  const [stats, setStats] = useState<DashboardStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchStats = useCallback(async () => {
    try {
      setError(null);

      const [stockRes, todayRes, topRes] = await Promise.all([
        supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'in_stock'),
        supabase.rpc('get_today_sales'),
        supabase.rpc('get_top_selling_models', { limit_count: 5 }),
      ]);

      const stockCount = stockRes.count ?? 0;
      const firstRow = Array.isArray(todayRes.data) ? todayRes.data[0] : todayRes.data;
      const salesToday = firstRow ? Number(firstRow.total_revenue ?? 0) : 0;
      const profitToday = firstRow ? Number(firstRow.total_profit ?? 0) : 0;
      const topModels = (topRes.data ?? []) as TopModelRow[];

      setStats({
        stock: stockCount,
        salesToday,
        profitToday,
        topModels,
      });
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load stats'));
      console.error('Dashboard stats error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    subscriberCount++;
    fetchStats();
    subscribeDashboardRealtime(fetchStats);

    const pollId = setInterval(fetchStats, POLL_INTERVAL_MS);

    return () => {
      clearInterval(pollId);
      unsubscribeDashboardRealtime();
    };
  }, [fetchStats]);

  return { stats, loading, error, refetch: fetchStats };
}
