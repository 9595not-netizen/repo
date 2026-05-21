import { lazy, Suspense } from 'react';
import { SummaryCards } from '@/components/features/dashboard/SummaryCards';
import { QuickActions } from '@/components/features/dashboard/QuickActions';
import { Skeleton } from '@/components/ui/skeleton';

const DashboardCharts = lazy(() =>
  import('@/components/features/dashboard/DashboardCharts').then((m) => ({
    default: m.DashboardCharts,
  }))
);

function ChartsSkeleton() {
  return <Skeleton className="min-h-[320px] w-full rounded-2xl" />;
}
import { useRealtimeStats } from '@/hooks/useRealtimeStats';
import { PageHeader } from '@/components/layout/PageHeader';

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <Skeleton key={i} className="min-h-[140px] rounded-2xl" />
      ))}
    </div>
  );
}

export default function Dashboard() {
  const { loading: statsLoading } = useRealtimeStats();

  return (
    <div>
      <PageHeader
        title="แดชบอร์ด"
        subtitle="ภาพรวมจำนวนสินค้า ยอดขาย และกำไรจากการประกอบการ"
      />

      <div className="page-content">
        {/* Summary Cards */}
        <section>
          {statsLoading ? <SummaryCardsSkeleton /> : <SummaryCards />}
        </section>

        {/* Quick Actions */}
        <section>
          <QuickActions />
        </section>

        {/* Charts — lazy load recharts */}
        <section>
          <Suspense fallback={<ChartsSkeleton />}>
            <DashboardCharts />
          </Suspense>
        </section>
      </div>
    </div>
  );
}
