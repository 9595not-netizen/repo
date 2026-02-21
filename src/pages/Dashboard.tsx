import { SummaryCards } from '@/components/features/dashboard/SummaryCards';
import { DashboardCharts } from '@/components/features/dashboard/DashboardCharts';
import { QuickActions } from '@/components/features/dashboard/QuickActions';
import { Skeleton } from '@/components/ui/skeleton';
import { useRealtimeStats } from '@/hooks/useRealtimeStats';
import { PageHeader } from '@/components/layout/PageHeader';

function SummaryCardsSkeleton() {
  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
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

        {/* Charts */}
        <section>
          <DashboardCharts />
        </section>
      </div>
    </div>
  );
}
