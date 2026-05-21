import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GoldCard } from '@/components/ui/gold-card';
import { Loader2 } from 'lucide-react';
import type { SellCartLine } from './sellCartTypes';

interface MultiSaleConfirmModalProps {
  items: SellCartLine[];
  saleData: {
    sold_to: string;
    payment_method: string;
    contract_number?: string;
    sold_at: string;
    sold_by_name?: string;
  };
  totalSelling: number;
  totalProfit: number;
  onConfirm: () => void;
  onCancel: () => void;
  loading: boolean;
}

export function MultiSaleConfirmModal({
  items,
  saleData,
  totalSelling,
  totalProfit,
  onConfirm,
  onCancel,
  loading,
}: MultiSaleConfirmModalProps) {
  const isInstallment = saleData.payment_method === 'ผ่อนชำระ';

  return (
    <Dialog open onOpenChange={(open) => !open && onCancel()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-5">
        <DialogHeader className="pb-2">
          <DialogTitle className="text-xl font-bold logo-gradient">
            ยืนยันขาย {items.length} รายการ
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <GoldCard className="p-3 space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">ผู้ซื้อ</span>
              <span className="font-semibold">{saleData.sold_to}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">วิธีชำระ</span>
              <span className="font-semibold">{saleData.payment_method}</span>
            </div>
            {isInstallment && saleData.contract_number && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">เลขที่สัญญา</span>
                <span className="font-semibold">{saleData.contract_number}</span>
              </div>
            )}
            <div className="flex justify-between">
              <span className="text-muted-foreground">พนักงานขาย</span>
              <span className="font-semibold">{saleData.sold_by_name || 'ไม่ระบุ'}</span>
            </div>
          </GoldCard>

          <div className="max-h-48 overflow-y-auto space-y-2 border border-gold/20 rounded-lg p-2">
            {items.map((line) => (
              <div
                key={line.product.id}
                className="flex justify-between gap-2 text-sm border-b border-border/50 pb-2 last:border-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <p className="font-semibold truncate">
                    {line.product.brand_name} {line.product.model_name}
                  </p>
                  <p className="text-xs text-muted-foreground font-mono">{line.product.imei}</p>
                </div>
                <span className="font-semibold shrink-0">
                  {isInstallment ? '—' : `฿${line.selling_price.toLocaleString('th-TH')}`}
                </span>
              </div>
            ))}
          </div>

          <GoldCard className="p-3 space-y-1 text-sm">
            <div className="flex justify-between font-semibold">
              <span>ยอดขายรวม</span>
              <span className="text-primary">
                {isInstallment ? '— (ตัดสต๊อก)' : `฿${totalSelling.toLocaleString('th-TH')}`}
              </span>
            </div>
            <div className="flex justify-between font-semibold">
              <span>กำไรรวม</span>
              <span className="text-green-600">
                {isInstallment ? '—' : `฿${totalProfit.toLocaleString('th-TH')}`}
              </span>
            </div>
          </GoldCard>

          <div className="flex gap-2 pt-1">
            <Button variant="outline" className="flex-1" onClick={onCancel} disabled={loading}>
              ยกเลิก
            </Button>
            <Button
              className="flex-1 bg-green-600 hover:bg-green-700"
              onClick={onConfirm}
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังบันทึก...
                </>
              ) : (
                `ยืนยันขาย ${items.length} รายการ`
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
