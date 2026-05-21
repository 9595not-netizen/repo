import { Button } from '@/components/ui/button';
import { GoldCard } from '@/components/ui/gold-card';
import { CheckCircle2, FileText, Printer, ShoppingCart } from 'lucide-react';
import {
  openCombinedReceiptPrintWindow,
  openReceiptPrintWindow,
  triggerReceiptPrint,
} from '@/lib/receipt-print';
import type { MultiSaleSuccessData } from './sellCartTypes';

interface MultiSaleSuccessScreenProps {
  data: MultiSaleSuccessData;
  onContinue: () => void;
}

function printOneReceipt(
  data: MultiSaleSuccessData,
  item: MultiSaleSuccessData['items'][0]
) {
  triggerReceiptPrint(
    openReceiptPrintWindow({
      product: item.product,
      saleData: {
        ...data.saleData,
        selling_price: item.selling_price,
        profit: item.profit,
      },
    })
  );
}

export function MultiSaleSuccessScreen({ data, onContinue }: MultiSaleSuccessScreenProps) {
  const { items, saleData } = data;
  const totalSelling = items.reduce((s, i) => s + i.selling_price, 0);
  const totalProfit = items.reduce((s, i) => s + i.profit, 0);
  const isInstallment = saleData.payment_method === 'ผ่อนชำระ';

  const handlePrintCombinedBill = () => {
    triggerReceiptPrint(
      openCombinedReceiptPrintWindow({
        items: items.map((item) => ({
          product: item.product,
          selling_price: item.selling_price,
        })),
        saleData: {
          sold_to: saleData.sold_to,
          payment_method: saleData.payment_method,
          contract_number: saleData.contract_number,
          sold_at: saleData.sold_at,
        },
      })
    );
  };

  const handlePrintSeparate = () => {
    items.forEach((item, index) => {
      setTimeout(() => printOneReceipt(data, item), index * 800);
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="text-center space-y-4 py-6">
        <CheckCircle2 className="h-20 w-20 text-green-600 mx-auto animate-bounce" />
        <h2 className="text-3xl font-bold logo-gradient">ขายสำเร็จ {items.length} รายการ!</h2>
        <p className="text-muted-foreground">
          พิมพ์ใบเสร็จรวมบิลเดียว หรือแยกทีละเครื่องตามต้องการ
        </p>
      </div>

      <GoldCard className="p-4 space-y-2 text-sm">
        <p>
          <span className="text-muted-foreground">ผู้ซื้อ: </span>
          <span className="font-semibold">{saleData.sold_to}</span>
        </p>
        <p>
          <span className="text-muted-foreground">ยอดรวม: </span>
          <span className="font-bold text-primary">
            {isInstallment ? '— (ผ่อนชำระ)' : `฿${totalSelling.toLocaleString('th-TH')}`}
          </span>
          {!isInstallment && (
            <span className="text-green-600 ml-2">
              (กำไร ฿{totalProfit.toLocaleString('th-TH')})
            </span>
          )}
        </p>
      </GoldCard>

      <GoldCard className="p-4 bg-primary/5 border-primary/30">
        <Button
          onClick={handlePrintCombinedBill}
          className="w-full h-12 bg-green-600 hover:bg-green-700 text-white font-semibold"
        >
          <FileText className="mr-2 h-5 w-5" />
          พิมพ์ใบเสร็จรวมบิลเดียว ({items.length} เครื่อง)
        </Button>
        <p className="text-xs text-muted-foreground text-center mt-2">
          รายละเอียดทุกเครื่องและ IMEI อยู่ในใบเดียว พร้อมยอดรวม
        </p>
      </GoldCard>

      <div className="space-y-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-1">
          พิมพ์แยกทีละเครื่อง (ถ้าต้องการ)
        </p>
        {items.map((item, index) => (
          <GoldCard key={item.product.id} className="p-4 flex flex-col sm:flex-row sm:items-center gap-3">
            <div className="flex-1 min-w-0">
              <p className="font-bold">
                {index + 1}. {item.product.brand_name} {item.product.model_name}
              </p>
              <p className="text-sm text-muted-foreground">
                {item.product.shop_code} • IMEI: {item.product.imei}
              </p>
              {!isInstallment && (
                <p className="text-sm font-semibold text-primary mt-1">
                  ฿{item.selling_price.toLocaleString('th-TH')}
                </p>
              )}
            </div>
            <Button
              variant="outline"
              className="shrink-0"
              onClick={() => printOneReceipt(data, item)}
            >
              <Printer className="mr-2 h-4 w-4" />
              พิมพ์ใบนี้
            </Button>
          </GoldCard>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button variant="outline" className="h-12" onClick={handlePrintSeparate}>
          <Printer className="mr-2 h-5 w-5" />
          พิมพ์แยก {items.length} ใบ
        </Button>
        <Button
          onClick={onContinue}
          className="bg-green-600 hover:bg-green-700 h-12 text-white font-semibold"
        >
          <ShoppingCart className="mr-2 h-5 w-5" />
          ขายต่อ
        </Button>
      </div>
    </div>
  );
}
