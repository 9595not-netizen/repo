import { GoldCard } from '@/components/ui/gold-card';
import { Skeleton } from '@/components/ui/skeleton';

/** Skeleton loader สำหรับ ProductCard - ใช้แทน Spinner ตอนโหลด list สินค้า */
export function ProductCardSkeleton() {
  return (
    <GoldCard className="p-0 overflow-hidden border-gold/20">
      <div className="aspect-square bg-muted relative overflow-hidden">
        <Skeleton className="absolute inset-0 rounded-none" />
        <div className="absolute top-3 right-3">
          <Skeleton className="h-5 w-16 rounded-full" />
        </div>
        <div className="absolute bottom-0 left-0 right-0 p-2 space-y-1">
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-2 w-28" />
        </div>
      </div>
      <div className="p-3 space-y-2">
        <Skeleton className="h-4 w-3/4" />
        <div className="flex gap-2">
          <Skeleton className="h-3 w-12" />
          <Skeleton className="h-3 w-16" />
        </div>
        <div className="flex justify-between pt-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-14" />
        </div>
      </div>
    </GoldCard>
  );
}

export function ProductCardSkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}
