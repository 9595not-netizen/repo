import { Button } from '@/components/ui/button';
import { GoldCard } from '@/components/ui/gold-card';
import { CheckCircle2, Printer, ShoppingCart } from 'lucide-react';
import { Database } from '@/types/database.types';
import { openReceiptPrintWindow } from '@/lib/receipt-print';
import { getProductDisplayImage } from '@/lib/utils';

type ProductDetail = Database['public']['Views']['product_details']['Row'];

interface SaleSuccessScreenProps {
    data: {
        product: ProductDetail;
        saleData: {
            sold_to: string;
            payment_method: string;
            contract_number?: string;
            selling_price: number;
            sold_at: string;
            sold_by: string;
            profit: number;
        };
    };
    onContinue: () => void;
}

export function SaleSuccessScreen({ data, onContinue }: SaleSuccessScreenProps) {
    const { product, saleData } = data;
    const displayImage = getProductDisplayImage(product);

    const handlePrint = () => {
        const printWindow = openReceiptPrintWindow(data);
        if (!printWindow) {
            return; // PRINT_FAIL - ไม่สามารถเปิดหน้าต่างได้ (ใช้ปุ่มเดิม RETRY ได้)
        }
        printWindow.focus();
        setTimeout(() => {
            printWindow.print();
            printWindow.onafterprint = () => printWindow.close();
            // fallback: ปิดหลังจากพิมพ์ (บางเบราว์เซอร์ไม่มี onafterprint)
            setTimeout(() => {
                if (!printWindow.closed) printWindow.close();
            }, 500);
        }, 250);
    };

    return (
        <div className="max-w-3xl mx-auto space-y-6">
            {/* Success Header */}
            <div className="text-center space-y-4 py-8">
                <div className="flex justify-center">
                    <CheckCircle2 className="h-20 w-20 text-green-600 animate-bounce" />
                </div>
                <h2 className="text-4xl font-bold logo-gradient">ขายสำเร็จ!</h2>
                <p className="text-lg text-muted-foreground">รายการขายของคุณได้บันทึกลงระบบแล้ว</p>
            </div>

            {/* Product & Sale Summary */}
            <GoldCard className="p-6 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    สรุปรายการขาย
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    {/* Product Image & Details */}
                    <div className="md:col-span-2 space-y-4">
                        <div className="flex gap-4">
                            <div className="w-32 h-40 bg-muted rounded-lg border border-gold/30 flex-shrink-0 overflow-hidden">
                                {displayImage ? (
                                    <img src={displayImage} alt={product.model_name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">
                                        ไม่มีรูปภาพ
                                    </div>
                                )}
                            </div>

                            <div className="flex-1 space-y-2">
                                <h4 className="text-xl font-bold text-primary">{product.brand_name} {product.model_name}</h4>
                                <p className="text-muted-foreground">{product.storage} • {product.color_name}</p>

                                <div className="grid grid-cols-2 gap-2 py-2 border-y border-gold/20">
                                    <div>
                                        <p className="text-xs text-muted-foreground">รหัสร้าน</p>
                                        <p className="font-semibold">{product.shop_code}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">ประเภท</p>
                                        <p className={`font-semibold ${product.type === 'มือ 1' ? 'text-blue-600' : 'text-orange-600'}`}>
                                            {product.type}
                                        </p>
                                    </div>
                                </div>

                                <div className="space-y-1">
                                    <p className="text-xs text-muted-foreground">ผู้ซื้อ</p>
                                    <p className="font-bold text-lg text-primary">{saleData.sold_to}</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Pricing Summary */}
                    <div className="space-y-3">
                        <div className="bg-secondary/50 p-4 rounded-lg">
                            <p className="text-xs text-muted-foreground">ราคาทุน</p>
                            <p className="text-2xl font-bold text-secondary-foreground">
                                ฿{product.cost_price?.toLocaleString('th-TH')}
                            </p>
                        </div>

                        <div className="bg-primary/10 p-4 rounded-lg">
                            <p className="text-xs text-muted-foreground">ราคาขาย</p>
                            <p className="text-2xl font-bold text-primary">
                                ฿{saleData.selling_price.toLocaleString('th-TH')}
                            </p>
                        </div>

                        <div className="bg-green-500/10 border-2 border-green-500/30 p-4 rounded-lg">
                            <p className="text-xs text-muted-foreground">กำไร</p>
                            <p className="text-2xl font-bold text-green-600">
                                ฿{saleData.profit.toLocaleString('th-TH')}
                            </p>
                        </div>
                    </div>
                </div>
            </GoldCard>

            {/* Transaction Details */}
            <GoldCard className="p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground mb-4">
                    รายละเอียดรายการ
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-muted-foreground">วิธีชำระเงิน</p>
                            <p className="font-semibold text-lg">{saleData.payment_method}</p>
                        </div>

                        {saleData.payment_method === 'ผ่อนชำระ' && (
                            <div>
                                <p className="text-xs text-muted-foreground">เลขที่สัญญา</p>
                                <p className="font-semibold text-lg">{saleData.contract_number}</p>
                            </div>
                        )}
                    </div>

                    <div className="space-y-3">
                        <div>
                            <p className="text-xs text-muted-foreground">วันที่ขาย</p>
                            <p className="font-semibold text-lg">{saleData.sold_at}</p>
                        </div>

                        <div>
                            <p className="text-xs text-muted-foreground">IMEI</p>
                            <p className="font-semibold text-lg">{product.imei}</p>
                        </div>
                    </div>
                </div>
            </GoldCard>

            {/* Action Buttons */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4">
                <Button
                    onClick={handlePrint}
                    variant="outline"
                    className="h-12 font-semibold text-base"
                >
                    <Printer className="mr-2 h-5 w-5" />
                    พิมพ์ใบเสร็จ
                </Button>

                <Button
                    onClick={onContinue}
                    className="bg-green-600 hover:bg-green-700 h-12 font-semibold text-base text-white"
                >
                    <ShoppingCart className="mr-2 h-5 w-5" />
                    ขายต่อ
                </Button>
            </div>
        </div>
    );
}
