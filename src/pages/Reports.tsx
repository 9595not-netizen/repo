import { lazy, Suspense, useState } from 'react';
import { DateRangeSelector } from '@/components/features/reports/DateRangeSelector';
import { ReportsSummaryCards } from '@/components/features/reports/ReportsSummaryCards';
import { SalesTransactionTable } from '@/components/features/reports/SalesTransactionTable';
import { PageHeader } from '@/components/layout/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

const ReportCharts = lazy(() =>
  import('@/components/features/reports/ReportCharts').then((m) => ({
    default: m.ReportCharts,
  }))
);

function ReportChartsSkeleton() {
  return <Skeleton className="min-h-[280px] w-full rounded-2xl" />;
}

export default function Reports() {
    const [dateRange, setDateRange] = useState({
        start: new Date(new Date().setDate(new Date().getDate() - 7)),
        end: new Date()
    });

    return (
        <div>
            <PageHeader
                title="รายงาน"
                subtitle="รายงานยอดขายและสถิติการขาย"
            />

            <div className="page-content space-y-6">
                {/* Date Range Selector */}
                <DateRangeSelector dateRange={dateRange} onDateRangeChange={setDateRange} />

                {/* Summary Cards */}
                <ReportsSummaryCards dateRange={dateRange} />

                {/* Report Charts — lazy load recharts */}
                <Suspense fallback={<ReportChartsSkeleton />}>
                    <ReportCharts dateRange={dateRange} />
                </Suspense>

                {/* Sales Transaction Table */}
                <SalesTransactionTable
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                />
            </div>
        </div>
    );
}
