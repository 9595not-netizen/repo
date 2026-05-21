import { useEffect, useState, useCallback, useId } from 'react';
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

/**
 * Phase 4: Realtime dashboard stats.
 * - สต๊อกทั้งหมด (products WHERE status='in_stock')
 * - ยอดขายวันนี้ / กำไรวันนี้ (get_today_sales)
 * - รุ่นขายดี TOP 5 (get_top_selling_models)
 * Subscribes to products table for realtime updates.
 */
export function useRealtimeStats() {
  const channelId = useId();
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
    fetchStats();

    let debounceTimer: ReturnType<typeof setTimeout>;
    const channel = supabase
      .channel(`dashboard-realtime-stats${channelId}`)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        clearTimeout(debounceTimer);
        debounceTimer = setTimeout(fetchStats, 400);
      })
      .subscribe();

    return () => {
      clearTimeout(debounceTimer);
      supabase.removeChannel(channel);
    };
  }, [fetchStats, channelId]);

  return { stats, loading, error, refetch: fetchStats };
}
