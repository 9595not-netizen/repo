import { useMemo, useEffect, useState, memo } from 'react';
import {
  Bar,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
} from 'recharts';
import { GoldCard } from '@/components/ui/gold-card';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const STACK_COLORS = ['#3B82F6', '#F97316', '#10B981', '#A855F7', '#EC4899'];
const GROUP_COLORS = { '2024': '#3B82F6', '2025': '#F97316', '2026': '#10B981' };

interface ChartDataRow {
  name: string;
  in_stock: number;
  reserved: number;
  sold: number;
  service: number;
  revenue: number;
  target: number;
  hand1: number;
  hand2: number;
  inStockP: number;
  reservedP: number;
  soldP: number;
  serviceP: number;
}

function toPercentStack(row: ChartDataRow): ChartDataRow {
  const total = row.in_stock + row.reserved + row.sold + row.service;
  return {
    ...row,
    inStockP: total ? (row.in_stock / total) * 100 : 0,
    reservedP: total ? (row.reserved / total) * 100 : 0,
    soldP: total ? (row.sold / total) * 100 : 0,
    serviceP: total ? (row.service / total) * 100 : 0,
  };
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 border border-gold/30 rounded-lg p-3 shadow-lg backdrop-blur">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="text-xs text-white">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

export const SalesComparisonChart = memo(function SalesComparisonChart() {
  const isMobile = useIsMobile();
  const [rawData, setRawData] = useState<ChartDataRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        const currentYear = now.getFullYear();
        const quarters = ['Q1', 'Q2', 'Q3', 'Q4'];
        const quarterData: ChartDataRow[] = [];

        for (let q = 0; q < 4; q++) {
          const quarterStart = new Date(currentYear, q * 3, 1);
          const quarterEnd = new Date(currentYear, (q + 1) * 3, 0, 23, 59, 59);

          // Fetch products for this quarter
          // @ts-ignore - Type inference issue with Supabase types
          const { data: products, error } = await supabase
            .from('products')
            .select('status, type, selling_price, sold_at, created_at')
            .gte('created_at', quarterStart.toISOString())
            .lte('created_at', quarterEnd.toISOString());

          if (error) throw error;

          const row: ChartDataRow = {
            name: quarters[q],
            in_stock: 0,
            reserved: 0,
            sold: 0,
            service: 0,
            revenue: 0,
            target: 0,
            hand1: 0,
            hand2: 0,
            inStockP: 0,
            reservedP: 0,
            soldP: 0,
            serviceP: 0,
          };

          if (products) {
            products.forEach((product: { status: string; type: string; selling_price?: number }) => {
              if (product.status === 'in_stock') row.in_stock += 1;
              if (product.status === 'reserved') row.reserved += 1;
              if (product.status === 'sold') {
                row.sold += 1;
                row.revenue += product.selling_price || 0;
              }
              if (product.status === 'service') row.service += 1;
              if (product.type === 'มือ 1') row.hand1 += 1;
              if (product.type === 'มือ 2') row.hand2 += 1;
            });
          }

          // Set target as 110% of revenue (or use a fixed target)
          row.target = row.revenue * 1.1;
          quarterData.push(row);
        }

        if (!cancelled) setRawData(quarterData);
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching sales comparison data:', error);
          setRawData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, []);

  const data = useMemo(() => rawData.map(toPercentStack), [rawData]);

  if (loading) {
    return (
      <GoldCard className="p-4 lg:p-6 border-gold/20">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-foreground">เปรียบเทียบยอดขาย มือ1 - มือ2</h3>
          <div className="h-0.5 bg-gradient-to-r from-gold via-gold to-transparent mt-3 opacity-60" />
        </div>
        <div className="h-80 w-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </GoldCard>
    );
  }

  return (
    <GoldCard className="p-4 lg:p-6 border-gold/20 hover:border-gold/40 transition-colors">
      <div className="mb-4">
        <h3 className="text-lg font-semibold text-foreground">เปรียบเทียบยอดขาย มือ1 - มือ2</h3>
        <div className="h-0.5 bg-gradient-to-r from-gold via-gold to-transparent mt-3 opacity-60" />
      </div>
      {data.length === 0 ? (
        <div className="h-80 w-full flex items-center justify-center text-muted-foreground">
          ไม่มีข้อมูลในช่วงเวลานี้
        </div>
      ) : (
        <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart
            data={data}
            layout={isMobile ? 'vertical' : 'horizontal'}
            margin={{ top: 10, right: 60, left: isMobile ? 50 : 0, bottom: 10 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={!isMobile} stroke="hsl(var(--muted-foreground)/0.1)" />
            <XAxis
              type={isMobile ? 'number' : 'category'}
              dataKey={isMobile ? undefined : 'name'}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              tick={{ fill: 'white' }}
            />
            <YAxis
              yAxisId="left"
              type={isMobile ? 'category' : 'number'}
              dataKey={isMobile ? 'name' : undefined}
              stroke="hsl(var(--muted-foreground))"
              fontSize={12}
              width={isMobile ? 50 : undefined}
              tick={{ fill: 'white' }}
            />
            <YAxis yAxisId="right" orientation="right" type="number" stroke="hsl(var(--muted-foreground))" fontSize={12} tick={{ fill: 'white' }} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '12px' }} iconType="circle" />
            <Bar yAxisId="left" dataKey="inStockP" name="พร้อมขาย (%)" stackId="status" fill={STACK_COLORS[0]} radius={[0, 0, 0, 0]} />
            <Bar yAxisId="left" dataKey="reservedP" name="จอง (%)" stackId="status" fill={STACK_COLORS[1]} radius={[0, 0, 0, 0]} />
            <Bar yAxisId="left" dataKey="soldP" name="ขายแล้ว (%)" stackId="status" fill={STACK_COLORS[2]} radius={[0, 0, 0, 0]} />
            <Bar yAxisId="left" dataKey="serviceP" name="ส่งซ่อม (%)" stackId="status" fill={STACK_COLORS[3]} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="hand1" name="มือ 1" fill={GROUP_COLORS['2024']} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="hand2" name="มือ 2" fill={GROUP_COLORS['2025']} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="revenue" name="ยอดขาย" stroke="#A855F7" strokeWidth={3} strokeDasharray="5 5" dot={{ r: 4 }} />
            <Line yAxisId="right" type="monotone" dataKey="target" name="เป้าหมาย" stroke="#EC4899" strokeWidth={3} dot={{ r: 4 }} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      )}
    </GoldCard>
  );
});
