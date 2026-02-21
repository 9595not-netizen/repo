import {
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart as RechartsBarChart,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface BarChartSeries {
  dataKey: string;
  name: string;
  fill: string;
  stackId?: string;
  radius?: [number, number, number, number];
}

export interface BarChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: BarChartSeries[];
  height?: number;
  margin?: { top?: number; right?: number; left?: number; bottom?: number };
  layout?: 'horizontal' | 'vertical';
  stacked?: boolean;
  yAxisId?: string;
  className?: string;
}

/**
 * Phase 4: Reusable Bar chart (Recharts).
 * layout="vertical" for horizontal bars (mobile).
 */
export function BarChart({
  data,
  xKey,
  series,
  height = 300,
  margin = { top: 10, right: 20, left: 0, bottom: 10 },
  layout = 'horizontal',
  stacked = false,
  yAxisId,
  className,
}: BarChartProps) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={data}
          layout={layout}
          margin={margin}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={layout === 'horizontal'} stroke="hsl(var(--muted-foreground)/0.1)" />
          <XAxis dataKey={xKey} stroke="hsl(var(--muted-foreground))" fontSize={12} type={layout === 'vertical' ? 'number' : 'category'} />
          <YAxis stroke="hsl(var(--muted-foreground))" fontSize={12} type={layout === 'vertical' ? 'category' : 'number'} yAxisId={yAxisId} width={layout === 'vertical' ? 60 : undefined} />
          <Tooltip />
          <Legend />
          {series.map((s) => (
            <Bar
              key={s.dataKey}
              dataKey={s.dataKey}
              name={s.name}
              fill={s.fill}
              stackId={stacked ? s.stackId ?? 'stack' : undefined}
              radius={s.radius ?? [4, 4, 0, 0]}
              yAxisId={yAxisId}
            />
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
