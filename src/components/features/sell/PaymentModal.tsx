import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { CartItemForPayment } from '@/types/common.types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2, CheckCircle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { getErrorMessage } from '@/lib/error-handler';

/**
 * Modal สำหรับชำระเงินแบบรถเข็น (หลายรายการ)
 * ปัจจุบันยังไม่ใช้ใน main Sell flow (ขายทีละรายการ via SaleConfirmModal)
 * เก็บไว้สำหรับฟีเจอร์ Cart ในอนาคต
 */
interface PaymentModalProps {
    open: boolean;
    onClose: () => void;
    items: CartItemForPayment[];
    total: number;
    onSuccess: () => void;
}

export function PaymentModal({ open, onClose, items, total, onSuccess }: PaymentModalProps) {
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('เงินสด');
    const [customerName, setCustomerName] = useState('');
    const [customerPhone, setCustomerPhone] = useState('');
    const { toast } = useToast();

    const handlePayment = async () => {
        const trimmedName = customerName.trim();
        const trimmedPhone = customerPhone.trim();

        if (!trimmedName) {
            toast({ title: "กรุณาระบุชื่อลูกค้า", variant: "destructive" });
            return;
        }

        if (!items.length || total <= 0) {
            toast({ title: "ไม่พบรายการสินค้า", description: "ไม่มีสินค้าในตะกร้าสำหรับชำระเงิน", variant: "destructive" });
            return;
        }

        if (trimmedPhone) {
            const phone = trimmedPhone.replace(/[-\s]/g, '');
            const phoneRegex = /^0\d{8,9}$/;
            if (!phoneRegex.test(phone)) {
                toast({ title: "รูปแบบเบอร์โทรไม่ถูกต้อง", description: "กรุณากรอกเบอร์โทรศัพท์ 9–10 หลักขึ้นต้นด้วย 0", variant: "destructive" });
                return;
            }
        }

        if (paymentMethod === 'ผ่อนชำระ' && !trimmedPhone) {
            toast({ title: "กรุณาระบุเบอร์โทรสำหรับผ่อนชำระ", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('ไม่สามารถระบุตัวตนผู้ใช้');
            
            const now = new Date().toISOString();

            // พยายามใช้ RPC หากมี (ช่วยให้ธรกรรมเป็น atomic มากขึ้น)
            let usedRpc = false;
            try {
                const { error: rpcError } = await supabase.rpc('complete_cart_sale', {
                    p_product_ids: items.map((i) => i.id),
                    p_customer_name: trimmedName,
                    p_customer_phone: trimmedPhone,
                    p_payment_method: paymentMethod,
                    p_sold_by: user.id,
                });

                if (rpcError) {
                    const code = (rpcError as { code?: string }).code;
                    const msg = (rpcError as { message?: string }).message ?? '';
                    const isRpcMissing =
                        code === 'PGRST202' ||
                        /404|not found|function/i.test(msg);

                    if (!isRpcMissing) {
                        // RPC มีแต่ล้มเหลวด้วยเหตุอื่น → ให้หลุดไปเข้า catch ด้านนอก
                        throw rpcError;
                    }
                } else {
                    usedRpc = true;
                }
            } catch (e) {
                // ปล่อยให้ fallback ด้านล่างทำงาน ถ้าเป็นกรณีฟังก์ชันไม่มี
                if (e && typeof e === 'object' && 'code' in e) {
                    const code = (e as { code?: string }).code;
                    const msg = (e as { message?: string }).message ?? '';
                    const isRpcMissing =
                        code === 'PGRST202' ||
                        /404|not found|function/i.test(msg);
                    if (!isRpcMissing) {
                        throw e;
                    }
                } else {
                    throw e;
                }
            }

            if (!usedRpc) {
                // Fallback เดิม: loop update ทีละรายการ (รักษา behavior เดิม)
                for (const item of items) {
                    const updatePayload: Record<string, unknown> = {
                        status: 'sold',
                        sold_by: user.id,
                        sold_to: trimmedName,
                        payment_method: paymentMethod as 'เงินสด' | 'ผ่อนชำระ' | 'โอนเงิน' | 'บัตรเครดิต' | null,
                        sold_at: now,
                    };
                    if (paymentMethod === 'ผ่อนชำระ') {
                        updatePayload.selling_price = 0;
                    } else {
                        updatePayload.selling_price = item.selling_price ?? 0;
                    }
                    const { data: updatedProduct, error: updateError } = await supabase
                        .from('products')
                        .update(updatePayload as never)
                        .eq('id', item.id)
                        .eq('status', 'in_stock')
                        .select()
                        .single();

                    if (updateError) throw updateError;

                    if (!updatedProduct) {
                        throw new Error(`ไม่พบสินค้าสำหรับขาย หรือสินค้านี้ถูกขายไปแล้ว (Shop Code: ${item.shop_code ?? ''})`);
                    }

                    const { error: logError } = await supabase.from('inventory_logs').insert({
                        product_id: item.id,
                        action_type: 'sell',
                        action_by: user.id,
                        action_note: `ขายสินค้าให้กับ ${customerName} เบอร์โทร ${customerPhone}`
                    });

                    if (logError) {
                        console.error('Inventory log error (PaymentModal):', logError);
                    }
                }
            }

            toast({
                title: "ชำระเงินสำเร็จ",
                description: "บันทึกการขายเรียบร้อยแล้ว",
                className: "bg-green-500 text-white"
            });

            onSuccess();
            onClose();

        } catch (error: unknown) {
            console.error(error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: getErrorMessage(error),
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="w-[95vw] max-w-md bg-card/95 backdrop-blur-xl border-gold/50">
                <DialogHeader>
                    <DialogTitle className="text-center text-2xl font-bold">สรุปยอดชำระเงิน</DialogTitle>
                </DialogHeader>

                <div className="flex flex-col items-center justify-center py-6 border-b border-border/50">
                    <span className="text-muted-foreground mb-1">ยอดรวมทั้งหมด</span>
                    <span className="text-4xl font-bold text-primary">฿{total.toLocaleString()}</span>
                    <span className="text-sm text-muted-foreground mt-2">{items.length} รายการ</span>
                </div>

                <div className="space-y-4 py-4">
                    <div className="space-y-2">
                        <Label>วิธีการชำระเงิน</Label>
                        <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="เงินสด">เงินสด</SelectItem>
                                <SelectItem value="โอนเงิน">โอนเงิน</SelectItem>
                                <SelectItem value="ผ่อนชำระ">ผ่อนชำระ (วางดาวน์)</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label>ชื่อลูกค้า</Label>
                            <Input
                                placeholder="ระบุชื่อผู้ซื้อ"
                                value={customerName}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerName(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>เบอร์โทรศัพท์</Label>
                            <Input
                                placeholder="08x-xxx-xxxx"
                                value={customerPhone}
                                onChange={(e: React.ChangeEvent<HTMLInputElement>) => setCustomerPhone(e.target.value)}
                            />
                        </div>
                    </div>
                </div>

                <DialogFooter className="flex-col sm:flex-row sm:justify-between gap-2 [&>button]:min-h-[44px] [&>button]:w-full sm:[&>button]:w-auto">
                    <Button variant="outline" onClick={onClose} disabled={loading} className="w-full sm:w-auto">
                        ยกเลิก
                    </Button>
                    <Button onClick={handlePayment} disabled={loading} className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white font-bold">
                        {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                        ยืนยันการขาย
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
