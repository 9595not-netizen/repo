import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { GoldCard } from '@/components/ui/gold-card';
import { getProductDisplayImage } from '@/lib/utils';
import { Loader2, CheckCircle2 } from 'lucide-react';
import { Database } from '@/types/database.types';

type ProductDetail = Database['public']['Views']['product_details']['Row'];

interface SaleConfirmModalProps {
    product: ProductDetail;
    saleData: {
        sold_to: string;
        payment_method: string;
        contract_number?: string;
        selling_price: number;
        sold_at: string;
        sold_by: string;
        sold_by_name?: string;
        profit: number;
    };
    onConfirm: () => void;
    onCancel: () => void;
    loading: boolean;
}

export function SaleConfirmModal({ product, saleData, onConfirm, onCancel, loading }: SaleConfirmModalProps) {
    const displayImage = getProductDisplayImage(product);
    return (
        <Dialog open={true} onOpenChange={(open) => !open && onCancel()}>
            <DialogContent className="max-w-md sm:max-w-lg max-h-[90vh] overflow-y-auto p-4 sm:p-5">
                <DialogHeader className="pb-2">
                    <DialogTitle className="text-xl font-bold logo-gradient">ยืนยันการขาย</DialogTitle>
                </DialogHeader>

                <div className="space-y-3">
                    {/* Product Summary */}
                    <GoldCard className="p-3">
                        <div className="flex gap-3">
                            <div className="w-16 h-20 sm:w-20 sm:h-24 bg-muted rounded-lg border border-gold/30 flex-shrink-0 overflow-hidden">
                                {displayImage ? (
                                    <img src={displayImage} alt={product.model_name} loading="lazy" decoding="async" className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">ไม่มีรูปภาพ</div>
                                )}
                            </div>

                            <div className="flex-1 space-y-1 min-w-0">
                                <h3 className="text-base font-bold text-primary">{product.brand_name} {product.model_name}</h3>
                                <p className="text-xs text-muted-foreground">{product.storage} • {product.color_name}</p>
                                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-gold/20">
                                    <div>
                                        <p className="text-xs text-muted-foreground">รหัสร้าน</p>
                                        <p className="font-semibold">{product.shop_code}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">IMEI</p>
                                        <p className="font-semibold text-sm">{product.imei}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="flex items-center flex-shrink-0">
                                <CheckCircle2 className="h-6 w-6 text-green-600" />
                            </div>
                        </div>
                    </GoldCard>

                    {/* Sale Details */}
                    <GoldCard className="p-3 space-y-2">
                        <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">รายละเอียดการขาย</h4>

                        <div className="space-y-1.5 border-b border-gold/20 pb-2 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">ชื่อผู้ซื้อ</span>
                                <span className="font-semibold text-primary">{saleData.sold_to}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">วิธีชำระเงิน</span>
                                <span className="font-semibold text-primary">{saleData.payment_method}</span>
                            </div>
                            {saleData.payment_method === 'ผ่อนชำระ' && (
                                <div className="flex justify-between items-center">
                                    <span className="text-muted-foreground">เลขที่สัญญา</span>
                                    <span className="font-semibold text-primary">{saleData.contract_number}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">วันที่ขาย</span>
                                <span className="font-semibold text-primary">{saleData.sold_at}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">พนักงานขาย</span>
                                <span className="font-semibold text-primary">{saleData.sold_by_name || 'ไม่ระบุ'}</span>
                            </div>
                        </div>

                        {/* Pricing Summary */}
                        <div className="space-y-1.5 text-sm">
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">ราคาทุน</span>
                                <span className="font-semibold">฿{product.cost_price?.toLocaleString('th-TH')}</span>
                            </div>
                            <div className="flex justify-between items-center">
                                <span className="text-muted-foreground">ราคาขาย</span>
                                <span className="font-semibold text-primary">฿{saleData.selling_price.toLocaleString('th-TH')}</span>
                            </div>
                            <div className="flex justify-between items-center pt-1.5 border-t border-gold/20">
                                <span className="text-muted-foreground font-semibold">กำไร</span>
                                <span className={`font-bold ${
                                    saleData.profit > 0 ? 'text-green-600' : saleData.profit < 0 ? 'text-red-600' : 'text-yellow-600'
                                }`}>
                                    ฿{saleData.profit.toLocaleString('th-TH')}
                                </span>
                            </div>
                        </div>
                    </GoldCard>

                    {/* Confirmation Warning */}
                    <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-2 flex gap-2">
                        <div className="text-amber-600 font-medium text-xs">
                            ⚠️ กรุณาตรวจสอบข้อมูลการขายให้ถูกต้องก่อนยืนยัน
                        </div>
                    </div>

                    {/* Actions */}
                    <div className="flex gap-2 pt-2">
                        <Button
                            variant="outline"
                            className="flex-1 h-10 text-sm"
                            onClick={onCancel}
                            disabled={loading}
                        >
                            ยกเลิก
                        </Button>
                        <Button
                            className="flex-1 bg-green-600 hover:bg-green-700 h-10 font-semibold text-sm"
                            onClick={onConfirm}
                            disabled={loading}
                        >
                            {loading ? (
                                <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    กำลังบันทึก...
                                </>
                            ) : (
                                'ยืนยันการขาย'
                            )}
                        </Button>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    );
}
