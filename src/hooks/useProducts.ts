import { useState, useCallback, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import type { Database } from '@/types/database.types';

export type ProductDetailRow = Database['public']['Views']['product_details']['Row'];

const PAGE_SIZE = 12;

export interface StockFilters {
  search: string;
  brand: string;
  model: string;
  color: string;
  status: string;
  type: string; // มือ 1 | มือ 2 | all
  deviceType: string; // เครื่องศูนย์/เครื่องนอก or all
}

export type SortField = 'selling_price' | 'created_at';
export type SortOrder = 'asc' | 'desc';

const defaultFilters: StockFilters = {
  search: '',
  brand: 'all',
  model: 'all',
  color: 'all',
  status: 'all',
  type: 'all',
  deviceType: 'all',
};

export function useProducts(initialFilters?: Partial<StockFilters>) {
  const [filters, setFilters] = useState<StockFilters>({ ...defaultFilters, ...initialFilters });
  const [sortField, setSortField] = useState<SortField>('created_at');
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc');
  const [products, setProducts] = useState<ProductDetailRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasMore = products.length < total; // legacy, for loadMore if needed

  const fetchPage = useCallback(
    async (pageNum: number, append: boolean) => {
      setError(null);
      try {
        let query = supabase
          .from('product_details')
          .select('*', { count: 'exact' })
          .order(sortField, { ascending: sortOrder === 'asc' });

        if (filters.search.trim()) {
          query = query.or(
            `shop_code.ilike.%${filters.search.trim()}%,imei.ilike.%${filters.search.trim()}%`
          );
        }
        if (filters.brand !== 'all') query = query.eq('brand_name', filters.brand);
        if (filters.model !== 'all') query = query.eq('model_name', filters.model);
        if (filters.color !== 'all') query = query.eq('color_name', filters.color);
        if (filters.status !== 'all') query = query.eq('status', filters.status);
        if (filters.type !== 'all') query = query.eq('type', filters.type);
        if (filters.deviceType !== 'all') query = query.eq('device_type_name', filters.deviceType);

        const from = (pageNum - 1) * PAGE_SIZE;
        const to = from + PAGE_SIZE - 1;
        const { data, error: err, count } = await query.range(from, to);

        if (err) throw err;
        setTotal(count ?? 0);
        if (append) setProducts((prev) => (pageNum === 1 ? (data ?? []) : [...prev, ...(data ?? [])]));
        else setProducts(data ?? []);
      } catch (e) {
        setError(e instanceof Error ? e : new Error('Failed to load products'));
        if (!append) setProducts((prev) => prev.length ? prev : []);
      } finally {
        setLoading(false);
      }
    },
    [filters, sortField, sortOrder]
  );

  useEffect(() => {
    setLoading(true);
    setPage(1);
    fetchPage(1, false);
  }, [fetchPage]);

  const goToPage = useCallback((pageNum: number) => {
    if (pageNum < 1 || pageNum > totalPages || loading) return;
    setPage(pageNum);
    setLoading(true);
    fetchPage(pageNum, false).finally(() => setLoading(false));
  }, [totalPages, loading, fetchPage]);

  const loadMore = useCallback(() => {
    if (loading || !hasMore) return;
    const nextPage = page + 1;
    setPage(nextPage);
    setLoading(true);
    fetchPage(nextPage, true).finally(() => setLoading(false));
  }, [page, hasMore, loading, fetchPage]);

  const refetch = useCallback(() => {
    setLoading(true);
    setPage(1);
    fetchPage(1, false);
  }, [fetchPage]);

  return {
    products,
    total,
    loading,
    error,
    filters,
    setFilters,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    page,
    pageSize: PAGE_SIZE,
    totalPages,
    goToPage,
    hasMore,
    loadMore,
    refetch,
  };
}
