import { useState } from 'react';
import { DateRangeSelector } from '@/components/features/reports/DateRangeSelector';
import { ReportsSummaryCards } from '@/components/features/reports/ReportsSummaryCards';
import { ReportCharts } from '@/components/features/reports/ReportCharts';
import { SalesTransactionTable } from '@/components/features/reports/SalesTransactionTable';
import { PageHeader } from '@/components/layout/PageHeader';

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

                {/* Report Charts */}
                <ReportCharts dateRange={dateRange} />

                {/* Sales Transaction Table */}
                <SalesTransactionTable
                    dateRange={dateRange}
                    onDateRangeChange={setDateRange}
                />
            </div>
        </div>
    );
}
