/**
 * กรองรายการขายที่เป็นเงินสด (ไม่รวมผ่อนชำระ)
 * ใช้สำหรับคำนวณ revenue/profit ใน Reports
 */
export function filterCashSales<T extends { payment_method?: string | null }>(sales: T[]): T[] {
    return sales.filter((s) => s.payment_method !== 'ผ่อนชำระ');
}

/**
 * คำนวณ summary จากรายการขาย (เฉพาะเงินสด)
 */
export function computeCashSalesSummary(sales: Array<{ cost_price?: number; selling_price?: number; payment_method?: string | null }>) {
    const cashSales = filterCashSales(sales);
    const itemsSold = sales.length; // เครื่องที่ขายรวม (ทั้งสด+ผ่อน)
    const totalRevenue = cashSales.reduce((sum, s) => sum + (s.selling_price || 0), 0);
    const totalCost = cashSales.reduce((sum, s) => sum + (s.cost_price || 0), 0);
    const totalProfit = totalRevenue - totalCost;
    const profitRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    return { itemsSold, totalRevenue, totalProfit, profitRate };
}
