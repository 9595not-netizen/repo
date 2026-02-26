import { useState, useEffect, memo } from 'react';
import { GoldCard } from '@/components/ui/gold-card';
import { supabase } from '@/lib/supabase';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, ComposedChart, Bar } from 'recharts';
import { Loader2 } from 'lucide-react';
import { ChartTooltip } from '@/components/charts/ChartTooltip';

interface DailySalesChartProps {
    dateRange: { start: Date; end: Date };
}

interface DailySalesData {
    date: string;
    revenue: number;
    profit: number;
    itemsSold: number;
}

export const DailySalesChart = memo(function DailySalesChart({ dateRange }: DailySalesChartProps) {
    const [data, setData] = useState<DailySalesData[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchDailySales = async () => {
            setLoading(true);
            try {
                const { data: sales, error } = await supabase
                    .from('product_details')
                    .select('id, cost_price, selling_price, sold_at, payment_method')
                    .eq('status', 'sold')
                    .gte('sold_at', dateRange.start.toISOString())
                    .lte('sold_at', dateRange.end.toISOString())
                    .order('sold_at', { ascending: true });

                if (error) throw error;

                if (sales) {
                    // Group sales by day
                    const dailyMap = new Map<string, DailySalesData>();

                    sales.forEach((sale: { sold_at: string; selling_price?: number; cost_price?: number; payment_method?: string | null }) => {
                        if (sale.payment_method === 'ผ่อนชำระ') return;
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

                    setData(allDates);
                } else {
                    setData([]);
                }
            } catch (error) {
                console.error('Error fetching daily sales:', error);
                setData([]);
            } finally {
                setLoading(false);
            }
        };

        fetchDailySales();
    }, [dateRange]);

    return (
        <GoldCard className="p-6">
            <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-6">
                ยอดขายรายวัน
            </h3>

            {loading ? (
                <div className="flex items-center justify-center py-20">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                </div>
            ) : data.length === 0 ? (
                <div className="flex items-center justify-center py-20 text-muted-foreground">
                    ไม่มีข้อมูลการขายในช่วงเวลานี้
                </div>
            ) : (
                <ResponsiveContainer width="100%" height={400}>
                    <ComposedChart data={data} margin={{ top: 5, right: 30, left: 0, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(212, 175, 55, 0.1)" />
                        <XAxis
                            dataKey="date"
                            stroke="hsl(var(--muted-foreground))"
                            style={{ fontSize: '0.875rem' }}
                        />
                        <YAxis
                            yAxisId="left"
                            stroke="#3B82F6"
                            style={{ fontSize: '0.875rem' }}
                            label={{ value: 'ยอดขาย (฿)', angle: -90, position: 'insideLeft' }}
                        />
                        <YAxis
                            yAxisId="right"
                            orientation="right"
                            stroke="#10B981"
                            style={{ fontSize: '0.875rem' }}
                            label={{ value: 'กำไร (฿)', angle: 90, position: 'insideRight' }}
                        />
                        <Tooltip content={<ChartTooltip />} />
                        <Legend />
                        <Bar
                            yAxisId="left"
                            dataKey="revenue"
                            fill="#3B82F6"
                            name="ยอดขาย"
                            radius={[8, 8, 0, 0]}
                            fillOpacity={0.8}
                        />
                        <Line
                            yAxisId="right"
                            type="monotone"
                            dataKey="profit"
                            stroke="#10B981"
                            name="กำไร"
                            strokeWidth={2}
                            dot={{ fill: '#10B981', r: 4 }}
                            activeDot={{ r: 6 }}
                        />
                    </ComposedChart>
                </ResponsiveContainer>
            )}
        </GoldCard>
    );
});
