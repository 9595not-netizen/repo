import { useState, useEffect } from 'react';
import { GoldCard } from '@/components/ui/gold-card';
import { supabase } from '@/lib/supabase';
import { ShoppingBag, TrendingUp, DollarSign, Percent, Loader2 } from 'lucide-react';

interface ReportsSummaryCardsProps {
    dateRange: { start: Date; end: Date };
}

interface SalesSummary {
    itemsSold: number;
    totalRevenue: number;
    totalProfit: number;
    profitRate: number;
    loading: boolean;
}

export function ReportsSummaryCards({ dateRange }: ReportsSummaryCardsProps) {
    const [summary, setSummary] = useState<SalesSummary>({
        itemsSold: 0,
        totalRevenue: 0,
        totalProfit: 0,
        profitRate: 0,
        loading: true,
    });

    useEffect(() => {
        const fetchSalesSummary = async () => {
            setSummary((prev) => ({ ...prev, loading: true }));
            try {
                const { data: sales, error } = await supabase
                    .from('product_details')
                    .select('id, cost_price, selling_price, sold_at')
                    .eq('status', 'sold')
                    .gte('sold_at', dateRange.start.toISOString())
                    .lte('sold_at', dateRange.end.toISOString());

                if (error) throw error;

                if (sales && sales.length > 0) {
                    const itemsSold = sales.length;
                    const totalRevenue = sales.reduce((sum, s) => sum + (s.selling_price || 0), 0);
                    const totalCost = sales.reduce((sum, s) => sum + (s.cost_price || 0), 0);
                    const totalProfit = totalRevenue - totalCost;
                    const profitRate = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;

                    setSummary({
                        itemsSold,
                        totalRevenue,
                        totalProfit,
                        profitRate,
                        loading: false,
                    });
                } else {
                    setSummary({
                        itemsSold: 0,
                        totalRevenue: 0,
                        totalProfit: 0,
                        profitRate: 0,
                        loading: false,
                    });
                }
            } catch (error) {
                console.error('Error fetching sales summary:', error);
                setSummary((prev) => ({ ...prev, loading: false }));
            }
        };

        fetchSalesSummary();
    }, [dateRange]);

    const cards = [
        {
            label: 'เครื่องที่ขาย',
            value: summary.itemsSold,
            icon: ShoppingBag,
            bgGradient: 'from-blue-500/10 to-cyan-500/10',
            borderColor: 'border-blue-500/30',
            textColor: 'text-blue-600',
            valueColor: 'text-blue-600',
        },
        {
            label: 'ยอดขายรวม',
            value: `฿${summary.totalRevenue.toLocaleString('th-TH')}`,
            icon: DollarSign,
            bgGradient: 'from-primary/10 to-blue-500/10',
            borderColor: 'border-primary/30',
            textColor: 'text-primary',
            valueColor: 'text-primary',
        },
        {
            label: 'กำไรรวม',
            value: `฿${summary.totalProfit.toLocaleString('th-TH')}`,
            icon: TrendingUp,
            bgGradient: `from-${summary.totalProfit >= 0 ? 'green' : 'red'}-500/10 to-${summary.totalProfit >= 0 ? 'emerald' : 'red'}-500/10`,
            borderColor: `border-${summary.totalProfit >= 0 ? 'green' : 'red'}-500/30`,
            textColor: `${summary.totalProfit >= 0 ? 'text-green' : 'text-red'}-600`,
            valueColor: `${summary.totalProfit >= 0 ? 'text-green' : 'text-red'}-600`,
        },
        {
            label: 'อัตรากำไร',
            value: `${summary.profitRate.toFixed(1)}%`,
            icon: Percent,
            bgGradient: 'from-orange-500/10 to-amber-500/10',
            borderColor: 'border-orange-500/30',
            textColor: 'text-orange-600',
            valueColor: 'text-orange-600',
        },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {cards.map((card, idx) => {
                const Icon = card.icon;
                return (
                    <GoldCard key={idx} className={`p-6 bg-gradient-to-br ${card.bgGradient} border-2 ${card.borderColor}`}>
                        <div className="space-y-3">
                            <div className="flex items-center justify-between">
                                <p className={`text-sm font-semibold uppercase tracking-wide ${card.textColor}`}>
                                    {card.label}
                                </p>
                                <Icon className={`h-5 w-5 ${card.textColor}`} />
                            </div>

                            {summary.loading ? (
                                <div className="flex items-center justify-center py-4">
                                    <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                                </div>
                            ) : (
                                <p className={`text-2xl md:text-3xl font-bold ${card.valueColor}`}>
                                    {card.value}
                                </p>
                            )}
                        </div>
                    </GoldCard>
                );
            })}
        </div>
    );
}
