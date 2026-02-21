import { memo } from 'react';
import { ComparisonDebtChart } from './ComparisonDebtChart';
import { SalesComparisonChart } from './SalesComparisonChart';

/**
 * Phase 4: Dashboard Charts (Memoized)
 * - Chart 1: Comparison ยอดยอด (Bar + Line + Scatter), period สัปดาห์/เดือน/ปี
 * - Chart 2: Comparison ยอดขาย มือ1-มือ2 (100% Stacked + Grouped Bar + Line)
 */
export const DashboardCharts = memo(function DashboardCharts() {
  return (
    <div className="grid grid-cols-1 gap-6">
      <ComparisonDebtChart />
      <SalesComparisonChart />
    </div>
  );
});
