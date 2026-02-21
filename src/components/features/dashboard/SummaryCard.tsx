import { GoldCard } from '@/components/ui/gold-card';
import { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface SummaryCardProps {
  title: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  iconColor?: string;
  iconBg?: string;
  borderColor?: string;
  loading?: boolean;
  onClick?: () => void;
  className?: string;
}

/**
 * Phase 4: Single summary card for Dashboard.
 * แสดงตัวเลขหรือข้อความ พร้อมไอคอน และสถานะโหลด
 */
export function SummaryCard({
  title,
  value,
  unit = '',
  icon: Icon,
  iconColor = 'text-primary',
  iconBg = 'bg-primary/10',
  borderColor = 'border-gold/30',
  loading = false,
  onClick,
  className,
}: SummaryCardProps) {
  const displayValue = loading ? '—' : value;

  return (
    <GoldCard
      className={cn(
        'relative overflow-hidden border transition-all duration-300 hover:shadow-lg hover:border-gold/50',
        borderColor,
        onClick && 'cursor-pointer hover:scale-[1.02]',
        className
      )}
      onClick={onClick}
    >
      <div className="relative pt-10 pb-4 px-4 md:pt-12 md:pb-5 md:px-5 grid gap-1 place-items-center min-h-[100px] w-full">
        <div
          className={cn(
            'absolute top-3 right-3 p-2.5 rounded-xl flex-shrink-0 transition-all duration-300',
            iconBg,
            iconColor
          )}
        >
          <Icon className="w-5 h-5 sm:w-6 sm:h-6 md:w-7 md:h-7" />
        </div>
        <p className="text-sm sm:text-base font-semibold text-muted-foreground">
          {title}
        </p>
        <h3 className="text-xl sm:text-2xl md:text-3xl font-bold tracking-tight leading-tight break-words text-center">
          {displayValue}
        </h3>
        {unit && !loading && (
          <span className="text-sm text-muted-foreground break-words">{unit}</span>
        )}
      </div>
      {loading && (
        <div className="absolute inset-0 bg-background/50 animate-pulse rounded-2xl pointer-events-none" />
      )}
    </GoldCard>
  );
}
