import { useState, useMemo, useEffect, memo } from 'react';
import {
  Bar,
  Line,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ComposedChart,
  ZAxis,
} from 'recharts';
import { GoldCard } from '@/components/ui/gold-card';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { supabase } from '@/lib/supabase';
import { Loader2 } from 'lucide-react';

const COLORS = { blue: '#3B82F6', yellow: '#FBBF24', red: '#EF4444', teal: '#14B8A6' };

interface ChartData {
  name: string;
  reserved: number;
  service: number;
  sold: number;
  salesTrend: number;
  cost: number;
  profit: number;
}

const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ name: string; value: number; color: string }>; label?: string }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-card/95 border border-gold/30 rounded-lg p-3 shadow-lg backdrop-blur">
      <p className="text-xs font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color }} className="text-xs">
          {entry.name}: {typeof entry.value === 'number' ? entry.value.toLocaleString() : entry.value}
        </p>
      ))}
    </div>
  );
};

type Period = 'week' | 'month' | 'year';

export const ComparisonDebtChart = memo(function ComparisonDebtChart() {
  const [period, setPeriod] = useState<Period>('month');
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    const fetchData = async () => {
      setLoading(true);
      try {
        const now = new Date();
        let startDate: Date;
        let dateFormat: (date: Date) => string;

        if (period === 'week') {
          // Last 4 weeks
          startDate = new Date(now);
          startDate.setDate(now.getDate() - 28);
          dateFormat = (d: Date) => {
            const weekNum = Math.floor((now.getTime() - d.getTime()) / (7 * 24 * 60 * 60 * 1000)) + 1;
            return `ส.${weekNum}`;
          };
        } else if (period === 'year') {
          // Last 4 quarters
          startDate = new Date(now);
          startDate.setFullYear(now.getFullYear() - 1);
          dateFormat = (d: Date) => {
            const quarter = Math.floor(d.getMonth() / 3) + 1;
            return `Q${quarter}`;
          };
        } else {
          // Last 4 months
          startDate = new Date(now);
          startDate.setMonth(now.getMonth() - 4);
          dateFormat = (d: Date) => {
            const months = ['ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.', 'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.'];
            return months[d.getMonth()];
          };
        }

        // Fetch products data
        // @ts-expect-error - Type inference issue with Supabase types
        const { data: products, error } = await supabase
          .from('products')
          .select('status, type, cost_price, selling_price, profit, sold_at, created_at, payment_method')
          .or(`status.eq.reserved,status.eq.service,status.eq.sold`)
          .gte('created_at', startDate.toISOString())
          .lte('created_at', now.toISOString());

        if (error) throw error;

        // Group data by period
        const periodMap = new Map<string, ChartData>();

        if (products) {
          products.forEach((product: { sold_at?: string; created_at: string }) => {
            const productDate = product.sold_at ? new Date(product.sold_at) : new Date(product.created_at);
            let periodKey: string;

            if (period === 'week') {
              const weekStart = new Date(productDate);
              weekStart.setDate(productDate.getDate() - productDate.getDay());
              periodKey = weekStart.toISOString().split('T')[0];
            } else if (period === 'year') {
              const quarter = Math.floor(productDate.getMonth() / 3);
              periodKey = `${productDate.getFullYear()}-Q${quarter + 1}`;
            } else {
              periodKey = `${productDate.getFullYear()}-${productDate.getMonth()}`;
            }

            if (!periodMap.has(periodKey)) {
              periodMap.set(periodKey, {
                name: dateFormat(productDate),
                reserved: 0,
                service: 0,
                sold: 0,
                salesTrend: 0,
                cost: 0,
                profit: 0,
              });
            }

            const periodData = periodMap.get(periodKey)!;
            if (product.status === 'reserved') periodData.reserved += 1;
            if (product.status === 'service') periodData.service += 1;
            if (product.status === 'sold') {
              periodData.sold += 1;
              // นับรายได้/กำไรเฉพาะขายสด (ไม่รวมผ่อนชำระ)
              if ((product as { payment_method?: string | null }).payment_method !== 'ผ่อนชำระ') {
                periodData.salesTrend += product.selling_price || 0;
                periodData.cost += product.cost_price || 0;
                periodData.profit += product.profit || 0;
              }
            }
          });
        }

        // Convert to array and sort
        const chartData = Array.from(periodMap.values())
          .sort((a, b) => {
            // Sort by name (period order)
            return a.name.localeCompare(b.name, 'th');
          })
          .slice(-4); // Get last 4 periods

        if (!cancelled) setData(chartData);
      } catch (error) {
        if (!cancelled) {
          console.error('Error fetching comparison chart data:', error);
          setData([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchData();
    return () => { cancelled = true; };
  }, [period]);

  const dataWithScatter = useMemo(
    () => data.map((d) => ({ ...d, scatterY: d.profit, scatterX: d.cost, z: 5 })),
    [data]
  );

  if (loading) {
    return (
      <GoldCard className="p-4 lg:p-6 border-gold/20">
        <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
          <h3 className="text-lg font-semibold text-foreground">เปรียบเทียบสถานะสินค้า</h3>
          <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
            <TabsList className="grid w-full grid-cols-3 max-w-[200px]">
              <TabsTrigger value="week">สัปดาห์</TabsTrigger>
              <TabsTrigger value="month">เดือน</TabsTrigger>
              <TabsTrigger value="year">ปี</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
        <div className="h-0.5 bg-gradient-to-r from-gold via-gold to-transparent opacity-60 mb-4" />
        <div className="h-80 w-full flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      </GoldCard>
    );
  }

  return (
    <GoldCard className="p-4 lg:p-6 border-gold/20 hover:border-gold/40 transition-colors">
      <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <h3 className="text-lg font-semibold text-foreground">เปรียบเทียบสถานะสินค้า</h3>
        <Tabs value={period} onValueChange={(v) => setPeriod(v as Period)}>
          <TabsList className="grid w-full grid-cols-3 max-w-[200px]">
            <TabsTrigger value="week">สัปดาห์</TabsTrigger>
            <TabsTrigger value="month">เดือน</TabsTrigger>
            <TabsTrigger value="year">ปี</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>
      <div className="h-0.5 bg-gradient-to-r from-gold via-gold to-transparent opacity-60 mb-4" />
      {data.length === 0 ? (
        <div className="h-80 w-full flex items-center justify-center text-muted-foreground">
          ไม่มีข้อมูลในช่วงเวลานี้
        </div>
      ) : (
        <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={dataWithScatter} margin={{ top: 10, right: 30, left: 0, bottom: 10 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
            <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={12} />
            <ZAxis type="number" dataKey="z" range={[5, 5]} />
            <Tooltip content={<CustomTooltip />} />
            <Legend wrapperStyle={{ paddingTop: '12px' }} iconType="circle" />
            <Bar yAxisId="left" dataKey="reserved" name="จอง" fill={COLORS.red} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="service" name="ส่งซ่อม" fill={COLORS.yellow} radius={[4, 4, 0, 0]} />
            <Bar yAxisId="left" dataKey="sold" name="ขายแล้ว" fill={COLORS.teal} radius={[4, 4, 0, 0]} />
            <Line yAxisId="right" type="monotone" dataKey="salesTrend" name="แนวโน้มยอดขาย" stroke={COLORS.blue} strokeWidth={2} dot={{ r: 4 }} />
            <Scatter yAxisId="right" dataKey="scatterY" name="กำไร" fill={COLORS.red} shape="circle" fillOpacity={0.8} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
      )}
    </GoldCard>
  );
});
