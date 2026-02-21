import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

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

interface SaleViewModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: SaleRecord | null;
}

export function SaleViewModal({ open, onOpenChange, record }: SaleViewModalProps) {
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
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>รายละเอียดการขาย</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 text-sm">
                    <div className="grid grid-cols-2 gap-2">
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
                        <span className="font-semibold text-primary">฿{record.selling_price.toLocaleString('th-TH')}</span>
                        <span className="text-muted-foreground">กำไร</span>
                        <span className={record.profit >= 0 ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>
                            ฿{record.profit.toLocaleString('th-TH')}
                        </span>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
