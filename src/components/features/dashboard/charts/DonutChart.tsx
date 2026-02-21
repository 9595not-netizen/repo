import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { cn } from '@/lib/utils';

export interface DonutChartItem {
  name: string;
  value: number;
  color: string;
}

export interface DonutChartProps {
  data: DonutChartItem[];
  height?: number;
  innerRadius?: number;
  outerRadius?: number;
  className?: string;
}

/**
 * Phase 4: Reusable Donut chart (Recharts Pie with innerRadius).
 */
export function DonutChart({
  data,
  height = 280,
  innerRadius = 60,
  outerRadius = 100,
  className,
}: DonutChartProps) {
  return (
    <div className={cn('w-full', className)} style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={innerRadius}
            outerRadius={outerRadius}
            paddingAngle={2}
            dataKey="value"
            nameKey="name"
          >
            {data.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip formatter={(value: number) => value.toLocaleString()} />
          <Legend />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
