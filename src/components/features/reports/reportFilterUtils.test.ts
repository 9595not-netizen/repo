import { describe, it, expect } from 'vitest';
import { filterCashSales, computeCashSalesSummary } from './reportFilterUtils';

describe('reportFilterUtils', () => {
    describe('filterCashSales', () => {
        it('excludes ผ่อนชำระ', () => {
            const sales = [
                { payment_method: 'เงินสด', id: 1 },
                { payment_method: 'ผ่อนชำระ', id: 2 },
                { payment_method: 'บัตรเครดิต', id: 3 },
            ];
            const result = filterCashSales(sales);
            expect(result).toHaveLength(2);
            expect(result.map((r) => (r as { id: number }).id)).toEqual([1, 3]);
        });

        it('includes null/undefined payment_method', () => {
            const sales = [
                { payment_method: null, id: 1 },
                { payment_method: undefined, id: 2 },
                { payment_method: 'ผ่อนชำระ', id: 3 },
            ];
            const result = filterCashSales(sales);
            expect(result).toHaveLength(2);
        });

        it('returns empty array when all ผ่อนชำระ', () => {
            const sales = [{ payment_method: 'ผ่อนชำระ', id: 1 }];
            expect(filterCashSales(sales)).toHaveLength(0);
        });
    });

    describe('computeCashSalesSummary', () => {
        it('calculates revenue and profit excluding ผ่อนชำระ', () => {
            const sales = [
                { cost_price: 5000, selling_price: 8000, payment_method: 'เงินสด' },
                { cost_price: 3000, selling_price: 0, payment_method: 'ผ่อนชำระ' },
            ];
            const summary = computeCashSalesSummary(sales);
            expect(summary.itemsSold).toBe(2);
            expect(summary.totalRevenue).toBe(8000);
            expect(summary.totalProfit).toBe(3000);
            expect(summary.profitRate).toBe(37.5); // 3000/8000 * 100
        });

        it('returns zero when no cash sales', () => {
            const sales = [{ cost_price: 5000, selling_price: 0, payment_method: 'ผ่อนชำระ' }];
            const summary = computeCashSalesSummary(sales);
            expect(summary.itemsSold).toBe(1);
            expect(summary.totalRevenue).toBe(0);
            expect(summary.totalProfit).toBe(0);
            expect(summary.profitRate).toBe(0);
        });

        it('handles empty sales', () => {
            const summary = computeCashSalesSummary([]);
            expect(summary.itemsSold).toBe(0);
            expect(summary.totalRevenue).toBe(0);
            expect(summary.totalProfit).toBe(0);
            expect(summary.profitRate).toBe(0);
        });
    });
});
