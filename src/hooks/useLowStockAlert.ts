import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';

export interface LowStockItem {
  model_variant_id: string;
  brand_name: string;
  model_name: string;
  storage: string;
  color_name: string;
  device_type_name: string;
  type: string;
  stock_count: number;
  threshold: number;
}

const LOW_STOCK_THRESHOLD = 2;
const ALERT_ENABLED_KEY = 'low_stock_alert_enabled';
const ALERT_ITEMS_KEY = 'low_stock_alert_items'; // เก็บรายการที่เปิดแจ้งเตือน

// สร้าง key สำหรับแต่ละรุ่น
function getItemKey(item: LowStockItem): string {
  return `${item.model_variant_id}-${item.color_name}-${item.type}`;
}

export function useLowStockAlert() {
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [alertEnabled, setAlertEnabled] = useState(() => {
    const saved = localStorage.getItem(ALERT_ENABLED_KEY);
    return saved !== null ? saved === 'true' : true;
  });
  const [enabledItems, setEnabledItems] = useState<Set<string>>(() => {
    const saved = localStorage.getItem(ALERT_ITEMS_KEY);
    return saved ? new Set(JSON.parse(saved)) : new Set();
  });

  const fetchLowStock = useCallback(async () => {
    try {
      setError(null);
      const { data, error: err } = await supabase.rpc('get_low_stock_alerts', {
        threshold_count: LOW_STOCK_THRESHOLD
      });

      if (err) throw err;
      const items = (data as LowStockItem[]) || [];
      setLowStockItems(items);
    } catch (e) {
      setError(e instanceof Error ? e : new Error('Failed to load low stock alerts'));
      console.error('Low stock alert error:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchLowStock();

    const channel = supabase
      .channel('low-stock-alerts')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        fetchLowStock();
      })
      .subscribe();

    return () => {
      channel.unsubscribe();
    };
  }, [fetchLowStock]);

  const toggleAlert = useCallback((enabled: boolean) => {
    setAlertEnabled(enabled);
    localStorage.setItem(ALERT_ENABLED_KEY, enabled.toString());
  }, []);

  const toggleItemAlert = useCallback((item: LowStockItem, enabled: boolean) => {
    const key = getItemKey(item);
    const newEnabledItems = new Set(enabledItems);
    
    if (enabled) {
      newEnabledItems.add(key);
    } else {
      newEnabledItems.delete(key);
    }
    
    setEnabledItems(newEnabledItems);
    localStorage.setItem(ALERT_ITEMS_KEY, JSON.stringify(Array.from(newEnabledItems)));
  }, [enabledItems]);

  const isItemEnabled = useCallback((item: LowStockItem): boolean => {
    if (!alertEnabled) return false;
    const key = getItemKey(item);
    return enabledItems.has(key);
  }, [alertEnabled, enabledItems]);

  // คำนวณจำนวนที่แจ้งเตือนจริง (เฉพาะที่เปิด)
  const activeAlerts = lowStockItems.filter(item => isItemEnabled(item));

  return {
    lowStockItems,
    loading,
    error,
    alertEnabled,
    toggleAlert,
    toggleItemAlert,
    isItemEnabled,
    count: activeAlerts.length,
    refetch: fetchLowStock,
  };
}
