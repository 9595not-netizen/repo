import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { GoldCard } from '@/components/ui/gold-card';
import { Calendar, Download, Loader2, FileText } from 'lucide-react';
import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Database } from '@/types/database.types';
import { getDateRange, toLocalDateString } from './dateRangeUtils';

type ProductDetail = Database['public']['Views']['product_details']['Row'];

interface DateRangeSelectorProps {
    dateRange: { start: Date; end: Date };
    onDateRangeChange: (range: { start: Date; end: Date }) => void;
}

export function DateRangeSelector({ dateRange, onDateRangeChange }: DateRangeSelectorProps) {
    const [exporting, setExporting] = useState(false);
    const { toast } = useToast();

    const MAX_REPORT_DAYS = 365;

    const handlePresetChange = (preset: string) => {
        const range = getDateRange(preset);
        onDateRangeChange(range);
        const days = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
        if (days > MAX_REPORT_DAYS) {
            toast({ title: 'ช่วงวันที่ยาวมาก', description: `ช่วง ${days} วัน อาจทำให้ query ช้า แนะนำไม่เกิน ${MAX_REPORT_DAYS} วัน`, variant: 'destructive', duration: 5000 });
        }
    };

    const handleStartDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newStart = new Date(e.target.value);
        if (newStart <= dateRange.end) {
            const range = { ...dateRange, start: newStart };
            onDateRangeChange(range);
            const days = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
            if (days > MAX_REPORT_DAYS) {
                toast({ title: 'ช่วงวันที่ยาวมาก', description: `ช่วง ${days} วัน อาจทำให้ query ช้า แนะนำไม่เกิน ${MAX_REPORT_DAYS} วัน`, variant: 'destructive', duration: 5000 });
            }
        }
    };

    const handleEndDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const newEnd = new Date(e.target.value);
        if (newEnd >= dateRange.start) {
            const range = { ...dateRange, end: newEnd };
            onDateRangeChange(range);
            const days = Math.ceil((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
            if (days > MAX_REPORT_DAYS) {
                toast({ title: 'ช่วงวันที่ยาวมาก', description: `ช่วง ${days} วัน อาจทำให้ query ช้า แนะนำไม่เกิน ${MAX_REPORT_DAYS} วัน`, variant: 'destructive', duration: 5000 });
            }
        }
    };

    const exportToCSV = async () => {
        setExporting(true);
        try {
            const startIso = new Date(dateRange.start);
            startIso.setHours(0, 0, 0, 0);
            const endIso = new Date(dateRange.end);
            endIso.setHours(23, 59, 59, 999);
            const { data: sales, error } = await supabase
                .from('product_details')
                .select('id,sold_at,shop_code,brand_name,model_name,imei,sold_to,cost_price,selling_price,payment_method')
                .eq('status', 'sold')
                .gte('sold_at', startIso.toISOString())
                .lte('sold_at', endIso.toISOString())
                .order('sold_at', { ascending: true });
            if (error) throw error;
            const headers = 'วันที่,รหัสร้าน,สินค้า,IMEI,ผู้ซื้อ,วิธีชำระเงิน,ราคาทุน,ราคาขาย,กำไร';
            const escapeCsv = (v: string | number): string => {
                const s = String(v);
                if (s.includes(',') || s.includes('"') || s.includes('\n')) return `"${s.replace(/"/g, '""')}"`;
                return s;
            };
            const rows = ((sales || []) as ProductDetail[]).map((s) => {
                const soldAt = s.sold_at ? new Date(s.sold_at).toLocaleString('th-TH') : '';
                const cost = s.cost_price ?? 0;
                const sell = s.selling_price ?? 0;
                const profit = sell - cost;
                return [
                    soldAt,
                    s.shop_code ?? '',
                    `${(s.brand_name ?? '')} ${(s.model_name ?? '')}`.trim(),
                    s.imei ?? '',
                    s.sold_to ?? '',
                    s.payment_method ?? '',
                    cost,
                    sell,
                    profit,
                ].map(escapeCsv).join(',');
            });
            const csv = '\uFEFF' + headers + '\n' + rows.join('\n');
            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const link = document.createElement('a');
            link.href = URL.createObjectURL(blob);
            link.download = `report_${toLocalDateString(dateRange.start)}_${toLocalDateString(dateRange.end)}.csv`;
            link.click();
            URL.revokeObjectURL(link.href);
            toast({ title: 'ส่งออก CSV สำเร็จ', description: `บันทึกไฟล์ report_${toLocalDateString(dateRange.start)}_${toLocalDateString(dateRange.end)}.csv`, className: 'bg-green-500 text-white' });
        } catch (error) {
            console.error('Export error:', error);
            toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถส่งออก CSV ได้', variant: 'destructive' });
        } finally {
            setExporting(false);
        }
    };

    return (
        <GoldCard className="p-6">
            <div className="space-y-4">
                <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-4">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground order-first md:order-none">
                        เลือกช่วงเวลา
                    </h3>
                    <div className="flex flex-wrap gap-2 order-last md:order-none">
                        <Button
                            onClick={exportToCSV}
                            variant="outline"
                            className="border-gold/30"
                            size="sm"
                            disabled={exporting}
                        >
                            {exporting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <Download className="h-4 w-4 mr-2" />
                            )}
                            ส่งออก CSV
                        </Button>
                        <Button
                            onClick={async () => {
                                setExporting(true);
                                try {
                                    const startIso = new Date(dateRange.start);
                                    startIso.setHours(0, 0, 0, 0);
                                    const endIso = new Date(dateRange.end);
                                    endIso.setHours(23, 59, 59, 999);

                                    const { data: sales, error } = await supabase
                                        .from('product_details')
                                        .select('id,sold_at,shop_code,brand_name,model_name,imei,sold_to,cost_price,selling_price,payment_method')
                                        .eq('status', 'sold')
                                        .gte('sold_at', startIso.toISOString())
                                        .lte('sold_at', endIso.toISOString())
                                        .order('sold_at', { ascending: true });

                                    if (error) throw error;

                                    const totalSales = sales?.length || 0;
                                    const totalRevenue = sales?.reduce((sum, s) => sum + (s.selling_price || 0), 0) || 0;
                                    const totalCost = sales?.reduce((sum, s) => sum + (s.cost_price || 0), 0) || 0;
                                    const totalProfit = totalRevenue - totalCost;

                                    const htmlContent = `
                                        <!DOCTYPE html>
                                        <html>
                                        <head>
                                            <meta charset="UTF-8">
                                            <title>รายงานการขาย</title>
                                            <style>
                                                body { font-family: 'Prompt', sans-serif; padding: 20px; color: #333; }
                                                h1 { text-align: center; color: #D4AF37; margin-bottom: 10px; }
                                                .date-range { text-align: center; margin-bottom: 20px; color: #666; }
                                                .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin-bottom: 30px; }
                                                .summary-card { border: 1.5px solid #D4AF37; border-radius: 8px; padding: 15px; text-align: center; background: rgba(212, 175, 55, 0.05); }
                                                .summary-label { font-size: 12px; color: #666; margin-bottom: 5px; }
                                                .summary-value { font-size: 18px; font-weight: bold; color: #D4AF37; }
                                                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                                                th, td { border: 1px solid #D4AF37; padding: 8px; text-align: left; font-size: 12px; }
                                                th { background-color: rgba(212, 175, 55, 0.1); font-weight: bold; }
                                                tr:nth-child(even) { background-color: rgba(212, 175, 55, 0.05); }
                                                @media print { body { margin: 0; } .no-print { display: none; } }
                                            </style>
                                        </head>
                                        <body>
                                            <h1>รายงานการขาย</h1>
                                            <div class="date-range">วันที่ ${dateRange.start.toLocaleDateString('th-TH')} ถึง ${dateRange.end.toLocaleDateString('th-TH')}</div>
                                            <div class="summary">
                                                <div class="summary-card"><div class="summary-label">จำนวนที่ขาย</div><div class="summary-value">${totalSales}</div></div>
                                                <div class="summary-card"><div class="summary-label">ยอดขายรวม</div><div class="summary-value">฿${totalRevenue.toLocaleString('th-TH')}</div></div>
                                                <div class="summary-card"><div class="summary-label">กำไรรวม</div><div class="summary-value">฿${totalProfit.toLocaleString('th-TH')}</div></div>
                                                <div class="summary-card"><div class="summary-label">อัตรากำไร</div><div class="summary-value">${totalRevenue > 0 ? ((totalProfit / totalRevenue) * 100).toFixed(1) : 0}%</div></div>
                                            </div>
                                            <table>
                                                <thead>
                                                    <tr><th>วันที่</th><th>รหัสร้าน</th><th>สินค้า</th><th>IMEI</th><th>ผู้ซื้อ</th><th>วิธีชำระเงิน</th><th>ราคาทุน</th><th>ราคาขาย</th><th>กำไร</th></tr>
                                                </thead>
                                                <tbody>
                                                    ${((sales || []) as ProductDetail[]).map((s) => `
                                                        <tr>
                                                            <td>${s.sold_at ? new Date(s.sold_at).toLocaleString('th-TH') : ''}</td>
                                                            <td>${s.shop_code ?? ''}</td>
                                                            <td>${(s.brand_name ?? '')} ${(s.model_name ?? '')}</td>
                                                            <td>${s.imei ?? ''}</td>
                                                            <td>${s.sold_to ?? ''}</td>
                                                            <td>${s.payment_method ?? ''}</td>
                                                            <td>฿${(s.cost_price ?? 0).toLocaleString('th-TH')}</td>
                                                            <td>฿${(s.selling_price ?? 0).toLocaleString('th-TH')}</td>
                                                            <td>฿${((s.selling_price ?? 0) - (s.cost_price ?? 0)).toLocaleString('th-TH')}</td>
                                                        </tr>
                                                    `).join('')}
                                                </tbody>
                                            </table>
                                        </body>
                                        </html>
                                    `;

                                    // Try window.open first; fallback to hidden iframe when popup is blocked
                                    const printWindow = window.open('', '_blank');
                                    if (printWindow) {
                                        printWindow.document.write(htmlContent);
                                        printWindow.document.close();
                                        setTimeout(() => {
                                            printWindow.print();
                                            printWindow.close();
                                            toast({ title: 'ส่งออก PDF สำเร็จ', description: 'เปิดหน้าต่างพิมพ์สำหรับบันทึก PDF', className: 'bg-green-500 text-white' });
                                        }, 250);
                                    } else {
                                        // Popup blocked: use hidden iframe fallback
                                        const iframe = document.createElement('iframe');
                                        iframe.style.cssText = 'position:absolute;width:0;height:0;border:none;visibility:hidden';
                                        document.body.appendChild(iframe);
                                        const doc = iframe.contentWindow?.document;
                                        if (!doc) {
                                            document.body.removeChild(iframe);
                                            toast({ title: 'ไม่สามารถพิมพ์ได้', description: 'เบราว์เซอร์อาจบล็อก Pop-up กรุณาอนุญาต Pop-up สำหรับไซต์นี้ หรือใช้ปุ่มส่งออก CSV แทน', variant: 'destructive', duration: 6000 });
                                            return;
                                        }
                                        doc.open();
                                        doc.write(htmlContent);
                                        doc.close();
                                        setTimeout(() => {
                                            iframe.contentWindow?.print();
                                            document.body.removeChild(iframe);
                                            toast({ title: 'ส่งออก PDF สำเร็จ', description: 'เปิดหน้าต่างพิมพ์สำหรับบันทึก PDF', className: 'bg-green-500 text-white' });
                                        }, 250);
                                    }
                                } catch (error) {
                                    console.error('Export PDF error:', error);
                                    toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถส่งออก PDF ได้', variant: 'destructive' });
                                } finally {
                                    setExporting(false);
                                }
                            }}
                            variant="outline"
                            className="border-gold/30"
                            size="sm"
                            disabled={exporting}
                        >
                            {exporting ? (
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                            ) : (
                                <FileText className="h-4 w-4 mr-2" />
                            )}
                            ส่งออก PDF
                        </Button>
                    </div>
                </div>

                {/* Preset Options */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-2">
                    {[
                        { label: 'วันนี้', value: 'today' },
                        { label: 'สัปดาห์นี้', value: 'this_week' },
                        { label: 'เดือนนี้', value: 'this_month' },
                        { label: 'ไตรมาสนี้', value: 'this_quarter' },
                        { label: 'ปีนี้', value: 'this_year' },
                    ].map((preset) => (
                        <Button
                            key={preset.value}
                            variant="outline"
                            size="sm"
                            onClick={() => handlePresetChange(preset.value)}
                            className="text-xs border-gold/30 hover:bg-primary/10"
                        >
                            {preset.label}
                        </Button>
                    ))}
                </div>

                {/* Custom Date Range */}
                <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-end pt-4 border-t border-gold/20 justify-center">
                    <div className="space-y-2 w-full sm:w-[200px] min-w-0">
                        <label className="text-xs font-semibold text-muted-foreground">วันที่เริ่ม</label>
                        <div className="relative">
                            <Input
                                type="date"
                                value={toLocalDateString(dateRange.start)}
                                onChange={handleStartDateChange}
                                className="pl-9"
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                    <div className="space-y-2 w-full sm:w-[200px] min-w-0">
                        <label className="text-xs font-semibold text-muted-foreground">วันที่สิ้นสุด</label>
                        <div className="relative">
                            <Input
                                type="date"
                                value={toLocalDateString(dateRange.end)}
                                onChange={handleEndDateChange}
                                className="pl-9"
                            />
                            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                        </div>
                    </div>
                </div>

                {/* Date Range Display */}
                <div className="text-xs text-muted-foreground text-center pt-2">
                    วันที่ {dateRange.start.toLocaleDateString('th-TH')} ถึง {dateRange.end.toLocaleDateString('th-TH')} ({Math.ceil((dateRange.end.getTime() - dateRange.start.getTime()) / (1000 * 60 * 60 * 24))} วัน)
                </div>
            </div>
        </GoldCard>
    );
}
