import {
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart as RechartsLineChart,
} from 'recharts';
import { cn } from '@/lib/utils';

export interface LineChartSeries {
  dataKey: string;
  name: string;
  stroke: string;
  strokeWidth?: number;
  strokeDasharray?: string;
  dot?: boolean;
}

export interface LineChartProps {
  data: Record<string, unknown>[];
  xKey: string;
  series: LineChartSeries[];
  height?: number;
  margin?: { top?: number; right?: number; left?: number; bottom?: number };
  yAxisId?: string;
  className?: string;
}

export function LineChart({
  data,
  xKey,
  series,
  height = 300,
  margin = { top: 10, right: 20, left: 0, bottom: 10 },
  yAxisId,
  className,
}: LineChartProps) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <RechartsLineChart data={data} margin={margin}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--muted-foreground)/0.1)" />
          <XAxis dataKey={xKey} stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <YAxis yAxisId={yAxisId} stroke="hsl(var(--muted-foreground))" fontSize={12} />
          <Tooltip />
          {series.map((s) => (
            <Line
              key={s.dataKey}
              type="monotone"
              dataKey={s.dataKey}
              name={s.name}
              stroke={s.stroke}
              strokeWidth={s.strokeWidth ?? 2}
              strokeDasharray={s.strokeDasharray}
              dot={s.dot ?? false}
              yAxisId={yAxisId}
            />
          ))}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
