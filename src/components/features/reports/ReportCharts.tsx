import { useState, useEffect } from 'react';
import { GoldCard } from '@/components/ui/gold-card';
import { supabase } from '@/lib/supabase';
import {
    LineChart,
    Line,
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ComposedChart,
} from 'recharts';
import { Loader2, TrendingUp, Package } from 'lucide-react';
import { ChartTooltip } from '@/components/charts/ChartTooltip';
import { Database } from '@/types/database.types';
import { filterCashSales } from './reportFilterUtils';

type ProductDetail = Database['public']['Views']['product_details']['Row'];

interface ReportChartsProps {
    dateRange: { start: Date; end: Date };
}

interface DailySalesData {
    date: string;
    revenue: number;
    profit: number;
    itemsSold: number;
}

interface TopSellingModel {
    brand_name: string;
    model_name: string;
    storage: string;
    total_sold: number;
    total_revenue: number;
}

interface StockItem {
    id: string;
    shop_code: string;
    brand_name: string;
    model_name: string;
    storage: string;
    color_name: string;
    cost_price: number;
    selling_price: number;
    days_in_stock: number;
}

export function ReportCharts({ dateRange }: ReportChartsProps) {
    const [dailySales, setDailySales] = useState<DailySalesData[]>([]);
    const [dailyProfit, setDailyProfit] = useState<DailySalesData[]>([]);
    const [topSellingModels, setTopSellingModels] = useState<TopSellingModel[]>([]);
    const [stockItems, setStockItems] = useState<StockItem[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;
        const fetchReportData = async () => {
            setLoading(true);
            try {
                const startIso = new Date(dateRange.start);
                startIso.setHours(0, 0, 0, 0);
                const endIso = new Date(dateRange.end);
                endIso.setHours(23, 59, 59, 999);

                // Fetch daily sales and profit
                const { data: sales, error: salesError } = await supabase
                    .from('product_details')
                    .select('id, cost_price, selling_price, sold_at, payment_method')
                    .eq('status', 'sold')
                    .gte('sold_at', startIso.toISOString())
                    .lte('sold_at', endIso.toISOString())
                    .order('sold_at', { ascending: true });

                if (salesError) throw salesError;

                // Group sales by day (เฉพาะเงินสด ไม่รวมผ่อนชำระ)
                const dailyMap = new Map<string, DailySalesData>();
                const cashSales = sales ? filterCashSales(sales) : [];
                if (cashSales.length > 0) {
                    cashSales.forEach((sale: { sold_at: string; selling_price?: number; cost_price?: number }) => {
                        const saleDate = new Date(sale.sold_at);
                        const dateKey = saleDate.toISOString().split('T')[0];

                        if (!dailyMap.has(dateKey)) {
                            dailyMap.set(dateKey, {
                                date: new Date(dateKey).toLocaleDateString('th-TH', {
                                    month: 'short',
                                    day: 'numeric',
                                }),
                                revenue: 0,
                                profit: 0,
                                itemsSold: 0,
                            });
                        }

                        const dayData = dailyMap.get(dateKey)!;
                        dayData.revenue += sale.selling_price || 0;
                        dayData.profit += (sale.selling_price || 0) - (sale.cost_price || 0);
                        dayData.itemsSold += 1;
                    });
                }

                // Fill in missing dates with zeros
                const allDates: DailySalesData[] = [];
                for (let d = new Date(dateRange.start); d <= dateRange.end; d.setDate(d.getDate() + 1)) {
                    const dateKey = d.toISOString().split('T')[0];
                    const dateStr = new Date(dateKey).toLocaleDateString('th-TH', {
                        month: 'short',
                        day: 'numeric',
                    });

                    allDates.push(
                        dailyMap.get(dateKey) || {
                            date: dateStr,
                            revenue: 0,
                            profit: 0,
                            itemsSold: 0,
                        }
                    );
                }

                if (!cancelled) {
                    setDailySales(allDates);
                    setDailyProfit(allDates);
                }

                // Fetch top selling models
                const { data: topModels, error: topModelsError } = await supabase
                    .rpc('get_top_selling_models', { limit_count: 5 });

                if (cancelled) return;
                if (topModelsError) {
                    // Fallback: manual query if RPC doesn't work
                    const { data: products } = await supabase
                        .from('product_details')
                        .select('brand_name, model_name, storage, selling_price, payment_method')
                        .eq('status', 'sold')
                        .gte('sold_at', startIso.toISOString())
                        .lte('sold_at', endIso.toISOString());

                    if (cancelled) return;
                    if (products) {
                        const cashProducts = filterCashSales(products);
                        const modelMap = new Map<string, TopSellingModel>();
                        cashProducts.forEach((p: { brand_name?: string; model_name?: string; storage?: string; selling_price?: number }) => {
                            const key = `${p.brand_name}_${p.model_name}_${p.storage}`;
                            if (!modelMap.has(key)) {
                                modelMap.set(key, {
                                    brand_name: p.brand_name || '',
                                    model_name: p.model_name || '',
                                    storage: p.storage || '',
                                    total_sold: 0,
                                    total_revenue: 0,
                                });
                            }
                            const model = modelMap.get(key)!;
                            model.total_sold += 1;
                            model.total_revenue += p.selling_price || 0;
                        });
                        setTopSellingModels(
                            Array.from(modelMap.values())
                                .sort((a, b) => b.total_sold - a.total_sold)
                                .slice(0, 5)
                        );
                    }
                } else if (!cancelled && topModels) {
                    setTopSellingModels(topModels as TopSellingModel[]);
                }

                // Fetch stock items (in_stock products)
                const { data: stock, error: stockError } = await supabase
                    .from('product_details')
                    .select('id, shop_code, brand_name, model_name, storage, color_name, cost_price, selling_price, created_at')
                    .eq('status', 'in_stock')
                    .order('created_at', { ascending: true })
                    .limit(50);

                if (stockError) throw stockError;
                if (cancelled) return;

                if (stock) {
                    const now = new Date();
                    const stockItemsData: StockItem[] = stock.map((item) => {
                        const createdDate = item.created_at ? new Date(item.created_at) : now;
                        const daysInStock = Math.floor((now.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
                        return {
                            id: item.id,
                            shop_code: item.shop_code || '',
                            brand_name: item.brand_name || '',
                            model_name: item.model_name || '',
                            storage: item.storage || '',
                            color_name: item.color_name || '',
                            cost_price: item.cost_price || 0,
                            selling_price: item.selling_price || 0,
                            days_in_stock: daysInStock,
                        };
                    });
                    // Sort by days in stock (oldest first)
                    stockItemsData.sort((a, b) => b.days_in_stock - a.days_in_stock);
                    if (!cancelled) setStockItems(stockItemsData.slice(0, 20)); // Top 20 oldest items
                }
            } catch (error) {
                if (!cancelled) console.error('Error fetching report data:', error);
            } finally {
                if (!cancelled) setLoading(false);
            }
        };

        fetchReportData();
        return () => { cancelled = true; };
    }, [dateRange]);


    if (loading) {
        return (
            <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {/* Daily Sales Chart */}
            <GoldCard className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        ยอดขายรายวัน
                    </h3>
                </div>

                {dailySales.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                        ไม่มีข้อมูลการขายในช่วงเวลานี้
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={dailySales} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.1)" />
                            <XAxis
                                dataKey="date"
                                stroke="hsl(var(--muted-foreground))"
                                style={{ fontSize: '0.875rem' }}
                            />
                            <YAxis
                                stroke="#3B82F6"
                                style={{ fontSize: '0.875rem' }}
                                label={{ value: 'ยอดขาย (฿)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="revenue"
                                stroke="#3B82F6"
                                name="ยอดขาย"
                                strokeWidth={2}
                                dot={{ fill: '#3B82F6', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </GoldCard>

            {/* Daily Profit Chart */}
            <GoldCard className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <TrendingUp className="h-5 w-5 text-green-600" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        กำไรรายวัน
                    </h3>
                </div>

                {dailyProfit.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                        ไม่มีข้อมูลกำไรในช่วงเวลานี้
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <LineChart data={dailyProfit} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.1)" />
                            <XAxis
                                dataKey="date"
                                stroke="hsl(var(--muted-foreground))"
                                style={{ fontSize: '0.875rem' }}
                            />
                            <YAxis
                                stroke="#10B981"
                                style={{ fontSize: '0.875rem' }}
                                label={{ value: 'กำไร (฿)', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip content={<ChartTooltip />} />
                            <Legend />
                            <Line
                                type="monotone"
                                dataKey="profit"
                                stroke="#10B981"
                                name="กำไร"
                                strokeWidth={2}
                                dot={{ fill: '#10B981', r: 4 }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                )}
            </GoldCard>

            {/* Top Selling Models */}
            <GoldCard className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Package className="h-5 w-5 text-orange-600" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        สินค้าขายดี
                    </h3>
                </div>

                {topSellingModels.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                        ไม่มีข้อมูลสินค้าขายดีในช่วงเวลานี้
                    </div>
                ) : (
                    <ResponsiveContainer width="100%" height={400}>
                        <BarChart data={topSellingModels} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.1)" />
                            <XAxis
                                dataKey={(item) => `${item.brand_name} ${item.model_name} ${item.storage}`}
                                stroke="hsl(var(--muted-foreground))"
                                style={{ fontSize: '0.875rem' }}
                                angle={-45}
                                textAnchor="end"
                                height={100}
                            />
                            <YAxis
                                stroke="#F97316"
                                style={{ fontSize: '0.875rem' }}
                                label={{ value: 'จำนวนที่ขาย', angle: -90, position: 'insideLeft' }}
                            />
                            <Tooltip
                                content={({ active, payload }) => {
                                    if (active && payload && payload.length) {
                                        const data = payload[0]?.payload as TopSellingModel;
                                        return (
                                            <div className="bg-white dark:bg-slate-950 p-3 rounded-lg border border-gold/30 shadow-lg">
                                                <p className="font-semibold text-sm">
                                                    {data.brand_name} {data.model_name} {data.storage}
                                                </p>
                                                <p className="text-xs mt-1 text-orange-600">
                                                    จำนวนที่ขาย: {data.total_sold} เครื่อง
                                                </p>
                                                <p className="text-xs mt-1 text-primary">
                                                    ยอดขายรวม: ฿{data.total_revenue.toLocaleString('th-TH')}
                                                </p>
                                            </div>
                                        );
                                    }
                                    return null;
                                }}
                            />
                            <Legend />
                            <Bar dataKey="total_sold" fill="#F97316" name="จำนวนที่ขาย" radius={[8, 8, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}
            </GoldCard>

            {/* Stock Items List */}
            <GoldCard className="p-6">
                <div className="flex items-center gap-2 mb-6">
                    <Package className="h-5 w-5 text-yellow-600" />
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        สินค้าค้างสต๊อก
                    </h3>
                </div>

                {stockItems.length === 0 ? (
                    <div className="flex items-center justify-center py-20 text-muted-foreground">
                        ไม่มีสินค้าค้างสต๊อก
                    </div>
                ) : (
                    <div className="space-y-2">
                        {/* Tablet/Desktop: grid table */}
                        <div className="hidden md:block">
                            <div className="grid grid-cols-12 gap-4 p-3 bg-muted/50 rounded-lg font-semibold text-xs text-muted-foreground">
                                <div className="col-span-2">รหัสร้าน</div>
                                <div className="col-span-4">สินค้า</div>
                                <div className="col-span-2">ราคาทุน</div>
                                <div className="col-span-2">ราคาขาย</div>
                                <div className="col-span-2">ค้างสต๊อก (วัน)</div>
                            </div>
                            {stockItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="grid grid-cols-12 gap-4 p-3 border border-gold/20 rounded-lg hover:bg-muted/30 transition-colors"
                                >
                                    <div className="col-span-2 font-medium text-sm">{item.shop_code}</div>
                                    <div className="col-span-4 text-sm">
                                        {item.brand_name} {item.model_name} {item.storage} ({item.color_name})
                                    </div>
                                    <div className="col-span-2 text-sm">฿{item.cost_price.toLocaleString('th-TH')}</div>
                                    <div className="col-span-2 text-sm text-primary">
                                        ฿{item.selling_price.toLocaleString('th-TH')}
                                    </div>
                                    <div className={`col-span-2 text-sm font-semibold ${item.days_in_stock > 30 ? 'text-red-600' : item.days_in_stock > 14 ? 'text-orange-600' : 'text-green-600'}`}>
                                        {item.days_in_stock} วัน
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Mobile: card-based layout */}
                        <div className="md:hidden space-y-3">
                            {stockItems.map((item) => (
                                <div
                                    key={item.id}
                                    className="rounded-xl border border-gold/30 bg-card/90 p-3 flex flex-col gap-2"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="font-mono font-semibold text-primary text-sm">
                                            {item.shop_code}
                                        </div>
                                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${item.days_in_stock > 30 ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400' : item.days_in_stock > 14 ? 'bg-orange-100 text-orange-700 dark:bg-orange-900/30 dark:text-orange-400' : 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'}`}>
                                            {item.days_in_stock} วัน
                                        </span>
                                    </div>
                                    <div className="text-sm font-medium">
                                        {item.brand_name} {item.model_name} {item.storage}
                                        <span className="text-muted-foreground text-xs ml-1">({item.color_name})</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs">
                                        <div>
                                            <span className="text-muted-foreground">ราคาทุน </span>
                                            <span>฿{item.cost_price.toLocaleString('th-TH')}</span>
                                        </div>
                                        <div className="text-right">
                                            <span className="text-muted-foreground">ราคาขาย </span>
                                            <span className="font-semibold text-primary">฿{item.selling_price.toLocaleString('th-TH')}</span>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}
            </GoldCard>
        </div>
    );
}
