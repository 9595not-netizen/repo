import { type ChartTooltipPayloadEntry } from '@/types/common.types';

interface ChartTooltipProps {
  active?: boolean;
  payload?: ChartTooltipPayloadEntry[];
  label?: string;
  formatter?: (value: number | string, name: string) => string;
}

/** Shared tooltip สำหรับ Recharts - ลด duplicate code ใน ReportCharts, DailySalesChart */
export function ChartTooltip({ active, payload, label, formatter }: ChartTooltipProps) {
  if (!active || !payload?.length) return null;

  const formatValue = (value: number | string | undefined, name: string) => {
    if (value === undefined || value === null) return '-';
    if (formatter) return formatter(value as number | string, name);
    if (typeof value === 'number') return `฿${value.toLocaleString('th-TH')}`;
    return String(value);
  };

  return (
    <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-gold/30 shadow-lg">
      {label && <p className="font-semibold text-sm mb-1">{label}</p>}
      {payload.map((entry, idx) => (
        <p key={idx} style={{ color: entry.color }} className="text-xs mt-1">
          {entry.name}: {formatValue(entry.value, entry.name)}
        </p>
      ))}
    </div>
  );
}
