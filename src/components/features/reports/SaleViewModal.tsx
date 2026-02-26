import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Loader2, Printer } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { openReceiptPrintWindow } from '@/lib/receipt-print';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-handler';
import type { Database } from '@/types/database.types';

export interface SaleRecord {
    id: string;
    sold_at: string;
    shop_code: string;
    brand_name: string;
    model_name: string;
    imei: string;
    sold_to: string;
    sold_by_name: string;
    created_by_name: string;
    cost_price: number;
    selling_price: number;
    profit: number;
    payment_method: string;
}

type ProductDetail = Database['public']['Views']['product_details']['Row'];

interface SaleViewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: SaleRecord | null;
}

export function SaleViewModal({ open, onOpenChange, record }: SaleViewModalProps) {
    const { toast } = useToast();
    const [printing, setPrinting] = useState(false);

    if (!record) return null;
    const dateStr = new Date(record.sold_at).toLocaleDateString('th-TH', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
    const timeStr = new Date(record.sold_at).toLocaleTimeString('th-TH', {
        hour: '2-digit',
        minute: '2-digit',
    });

    const handlePrint = async () => {
        setPrinting(true);
        try {
            const { data, error } = await supabase
                .from('product_details')
                .select('*')
                .eq('id', record.id)
                .maybeSingle();

            if (error || !data) {
                throw error ?? new Error('ไม่พบข้อมูลสินค้าสำหรับพิมพ์ใบเสร็จ');
            }

            const product = data as ProductDetail;

            const printWindow = openReceiptPrintWindow({
                product,
                saleData: {
                    sold_to: record.sold_to,
                    payment_method: record.payment_method,
                    contract_number: (product as { contract_number?: string | null }).contract_number ?? undefined,
                    selling_price: record.selling_price,
                    sold_at: record.sold_at,
                    sold_by: record.sold_by_name ?? '',
                    profit: record.profit,
                },
            });

            if (!printWindow) {
                toast({
                    title: 'ไม่สามารถเปิดหน้าต่างพิมพ์ได้',
                    description: 'เบราว์เซอร์อาจบล็อกป๊อปอัป กรุณาอนุญาตหรือกดพิมพ์จากหน้าขายทันทีหลังบันทึก',
                    variant: 'destructive',
                });
            }
        } catch (err: unknown) {
            console.error(err);
            toast({
                title: 'เกิดข้อผิดพลาด',
                description: getErrorMessage(err),
                variant: 'destructive',
            });
        } finally {
            setPrinting(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>รายละเอียดการขาย</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        <span className="text-muted-foreground">วันที่ขาย</span>
                        <span className="font-medium">{dateStr} {timeStr}</span>
                        <span className="text-muted-foreground">รหัสร้าน</span>
                        <span className="font-mono font-semibold text-primary">{record.shop_code}</span>
                        <span className="text-muted-foreground">สินค้า</span>
                        <span className="font-medium">{record.brand_name} {record.model_name}</span>
                        <span className="text-muted-foreground">IMEI</span>
                        <span className="font-mono text-xs">{record.imei}</span>
                        <span className="text-muted-foreground">ผู้ขาย</span>
                        <span>{record.sold_by_name}</span>
                        <span className="text-muted-foreground">ผู้ซื้อ</span>
                        <span>{record.sold_to}</span>
                        <span className="text-muted-foreground">ผู้รับเข้า</span>
                        <span>{record.created_by_name}</span>
                        <span className="text-muted-foreground">วิธีชำระเงิน</span>
                        <span>{record.payment_method}</span>
                        <span className="text-muted-foreground">ราคาทุน</span>
                        <span>฿{record.cost_price.toLocaleString('th-TH')}</span>
                        <span className="text-muted-foreground">ราคาขาย</span>
                        <span className="font-semibold text-primary">
                            {record.payment_method === 'ผ่อนชำระ' && (record.selling_price === 0 || record.selling_price == null)
                                ? '— (ตัดสต๊อก)'
                                : `฿${(record.selling_price ?? 0).toLocaleString('th-TH')}`}
                        </span>
                        <span className="text-muted-foreground">กำไร</span>
                        <span className={record.profit >= 0 ? 'text-green-600 font-bold' : record.profit < 0 ? 'text-red-600 font-bold' : 'text-muted-foreground font-bold'}>
                            {record.payment_method === 'ผ่อนชำระ' && (record.selling_price === 0 || record.selling_price == null)
                                ? '— (ผ่อน)'
                                : `฿${(record.profit ?? 0).toLocaleString('th-TH')}`}
                        </span>
                    </div>
                    <div className="pt-2 border-t flex justify-end">
                        <Button
                            type="button"
                            onClick={handlePrint}
                            disabled={printing}
                            className="h-10 gap-2"
                        >
                            {printing ? (
                                <>
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                    กำลังเตรียมใบเสร็จ...
                                </>
                            ) : (
                                <>
                                    <Printer className="h-4 w-4" />
                                    พิมพ์ใบเสร็จ
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
