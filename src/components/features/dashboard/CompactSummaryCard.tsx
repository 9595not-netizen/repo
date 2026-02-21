import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CompactSummaryCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  iconColor?: string;
  bgColor?: string;
  loading?: boolean;
  onClick?: () => void;
}

/**
 * Compact Summary Card - เท่ากับ Quick Action Card
 * Icon ทางซ้าย, ข้อความทางขวา
 * ขนาดสูงเท่ากัน (140px)
 */
export function CompactSummaryCard({
  title,
  value,
  unit = '',
  icon: Icon,
  iconColor = 'text-blue-500',
  bgColor = 'bg-blue-50 dark:bg-blue-950/20',
  loading = false,
  onClick,
}: CompactSummaryCardProps) {
  const displayValue = loading ? '—' : value;

  return (
    <div
      className={cn(
        'card relative p-6 flex items-center gap-4 transition-all duration-200 min-h-[140px] rounded-2xl',
        bgColor,
        onClick && 'cursor-pointer hover:shadow-lg hover:scale-[1.02] active:scale-[0.98]'
      )}
      onClick={onClick}
    >
      {/* Icon */}
      <div className={cn('flex-shrink-0', iconColor)}>
        <Icon className="w-12 h-12" strokeWidth={2} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-muted-foreground mb-2">
          {title}
        </p>
        <div className="flex items-baseline gap-2">
          <h3 className="text-3xl font-bold tracking-tight">
            {displayValue}
          </h3>
          {unit && !loading && (
            <span className="text-sm text-muted-foreground truncate">
              {unit}
            </span>
          )}
        </div>
      </div>

      {/* Loading Overlay */}
      {loading && (
        <div className="absolute inset-0 bg-background/50 animate-pulse rounded-2xl" />
      )}
    </div>
  );
}
