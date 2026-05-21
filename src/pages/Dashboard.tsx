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
import { PageHeader } from '@/components/layout/PageHeader';

export default function Dashboard() {
  return (
    <div>
      <PageHeader
        title="แดชบอร์ด"
        subtitle="ภาพรวมจำนวนสินค้า ยอดขาย และกำไรจากการประกอบการ"
      />

      <div className="page-content">
        {/* Summary Cards */}
        <section>
          <SummaryCards />
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
