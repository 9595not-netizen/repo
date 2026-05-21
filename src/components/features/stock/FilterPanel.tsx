import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { GoldCard } from '@/components/ui/gold-card';
import {
  defaultStockFilters,
  type StockFilters,
  type SortField,
  type SortOrder,
} from '@/hooks/useProducts';
import { Database } from '@/types/database.types';

type BrandRow = Database['public']['Tables']['brands']['Row'];
type ModelRow = Database['public']['Tables']['models']['Row'];
type ColorRow = Database['public']['Tables']['colors']['Row'];
type DeviceTypeRow = Database['public']['Tables']['device_types']['Row'];

interface FilterPanelProps {
  filters: StockFilters;
  onFiltersChange: (f: StockFilters) => void;
  sortField: SortField;
  sortOrder: SortOrder;
  onSortChange: (field: SortField, order: SortOrder) => void;
}

export function FilterPanel({
  filters,
  onFiltersChange,
  sortField,
  sortOrder,
  onSortChange,
}: FilterPanelProps) {
  const [searchInput, setSearchInput] = useState(filters.search);
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const [brands, setBrands] = useState<{ id: string; name: string }[]>([]);
  const [models, setModels] = useState<string[]>([]);
  const [colors, setColors] = useState<string[]>([]);
  const [deviceTypes, setDeviceTypes] = useState<string[]>([]);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      supabase.from('brands').select('id,name').eq('status', 'active'),
      supabase.from('colors').select('name').eq('status', 'active'),
      supabase.from('device_types').select('name').eq('status', 'active'),
    ])
      .then(([b, c, d]) => {
        if (cancelled) return;
        if (b.data) setBrands(b.data);
        if (c.data) setColors(((c.data ?? []) as ColorRow[]).map((x) => x.name));
        if (d.data) setDeviceTypes(((d.data ?? []) as DeviceTypeRow[]).map((x) => x.name));
      })
      .catch(() => {
        if (!cancelled) setDeviceTypes([]);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (filters.brand === 'all') {
      setModels([]);
      return;
    }
    let cancelled = false;
    supabase
      .from('brands')
      .select('id')
      .eq('name', filters.brand)
      .single()
      .then(({ data: brandRow }) => {
        if (cancelled || !brandRow) return;
        return supabase
          .from('models')
          .select('model_name')
          .eq('brand_id', (brandRow as BrandRow).id)
          .eq('status', 'active');
      })
      .then((res) => {
        if (cancelled || !res?.data) return;
        setModels(((res.data ?? []) as ModelRow[]).map((x) => x.model_name));
      })
      .catch(() => {
        if (!cancelled) setModels([]);
      });
    return () => {
      cancelled = true;
    };
  }, [filters.brand]);

  useEffect(() => {
    const t = setTimeout(() => {
      onFiltersChange({ ...filtersRef.current, search: searchInput });
    }, 300);
    return () => clearTimeout(t);
  }, [searchInput, onFiltersChange]);

  const updateFilter = (key: keyof StockFilters, value: string) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const clearFilters = () => {
    setSearchInput('');
    onFiltersChange({ ...defaultStockFilters });
  };

  const hasFilters =
    filters.search !== '' ||
    filters.brand !== 'all' ||
    filters.model !== 'all' ||
    filters.color !== 'all' ||
    filters.status !== defaultStockFilters.status ||
    filters.type !== 'all' ||
    filters.deviceType !== 'all';

  return (
    <GoldCard className="p-4 border-gold/20 bg-card text-card-foreground !min-h-0">
      <div className="flex flex-wrap items-end gap-3">
        <div className="flex-1 min-w-[200px] text-left">
          <label className="text-sm font-semibold text-foreground block mb-2.5 translate-x-2">
            ค้นหา (SHOP CODE / IMEI)
          </label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <Input
              placeholder="Shop Code, IMEI..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10 h-11 text-base bg-background text-foreground border-gold/30 placeholder:text-muted-foreground"
            />
          </div>
        </div>

        <div className="w-full sm:w-[140px] text-left">
          <label className="text-sm font-semibold text-foreground block mb-2.5 translate-x-2">ยี่ห้อ</label>
          <Select value={filters.brand} onValueChange={(v) => onFiltersChange({ ...filters, brand: v, model: 'all' })}>
            <SelectTrigger className="h-11 text-base bg-background text-foreground border-gold/30">
              <SelectValue placeholder="ทุกยี่ห้อ" />
            </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกยี่ห้อ</SelectItem>
                {brands.map((b) => (
                  <SelectItem key={b.id} value={b.name}>
                    {b.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[140px] text-left">
            <label className="text-sm font-semibold text-foreground block mb-2.5 translate-x-2">รุ่น</label>
            <Select value={filters.model} onValueChange={(v) => updateFilter('model', v)}>
              <SelectTrigger className="h-11 text-base bg-background text-foreground border-gold/30">
                <SelectValue placeholder="ทุกรุ่น" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกรุ่น</SelectItem>
                {models.map((m) => (
                  <SelectItem key={m} value={m}>
                    {m}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[120px] text-left">
            <label className="text-sm font-semibold text-foreground block mb-2.5 translate-x-2">สี</label>
            <Select value={filters.color} onValueChange={(v) => updateFilter('color', v)}>
              <SelectTrigger className="h-11 text-base bg-background text-foreground border-gold/30">
                <SelectValue placeholder="ทุกสี" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสี</SelectItem>
                {colors.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[130px] text-left">
            <label className="text-sm font-semibold text-foreground block mb-2.5 translate-x-2">สถานะ</label>
            <Select value={filters.status} onValueChange={(v) => updateFilter('status', v)}>
              <SelectTrigger className="h-11 text-base bg-background text-foreground border-gold/30">
                <SelectValue placeholder="ทุกสถานะ" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="in_stock">พร้อมขาย</SelectItem>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                <SelectItem value="reserved">จอง</SelectItem>
                <SelectItem value="sold">ขายแล้ว</SelectItem>
                <SelectItem value="service">ส่งซ่อม</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="w-full sm:w-[110px] text-left">
            <label className="text-sm font-semibold text-foreground block mb-2.5 translate-x-2">ประเภท</label>
            <Select value={filters.type} onValueChange={(v) => updateFilter('type', v)}>
              <SelectTrigger className="h-11 text-base bg-background text-foreground border-gold/30">
                <SelectValue placeholder="ทั้งหมด" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทั้งหมด</SelectItem>
                <SelectItem value="มือ 1">มือ 1</SelectItem>
                <SelectItem value="มือ 2">มือ 2</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {deviceTypes.length > 0 && (
            <div className="w-full sm:w-[130px] text-left">
              <label className="text-sm font-semibold text-foreground block mb-2.5 translate-x-2">เครื่อง</label>
              <Select value={filters.deviceType} onValueChange={(v) => updateFilter('deviceType', v)}>
                <SelectTrigger className="h-11 text-base bg-background text-foreground border-gold/30">
                  <SelectValue placeholder="ทุกประเภท" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">ทุกประเภท</SelectItem>
                  {deviceTypes.map((d) => (
                    <SelectItem key={d} value={d}>
                      {d}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="w-full sm:w-[160px] text-left">
            <label className="text-sm font-semibold text-foreground block mb-2.5 translate-x-2">เรียงตาม</label>
            <Select
              value={`${sortField}-${sortOrder}`}
              onValueChange={(v) => {
                const [f, o] = v.split('-') as [SortField, SortOrder];
                onSortChange(f, o);
              }}
            >
              <SelectTrigger className="h-11 text-base bg-background text-foreground border-gold/30">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="created_at-desc">วันที่เพิ่ม (ล่าสุด)</SelectItem>
                <SelectItem value="created_at-asc">วันที่เพิ่ม (เก่าสุด)</SelectItem>
                <SelectItem value="selling_price-desc">ราคา (สูง-ต่ำ)</SelectItem>
                <SelectItem value="selling_price-asc">ราคา (ต่ำ-สูง)</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {hasFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="h-11 border-destructive/50 text-destructive hover:bg-destructive/10"
            >
              <X className="h-4 w-4 mr-2" />
              ล้างตัวกรอง
            </Button>
          )}
      </div>
    </GoldCard>
  );
}
