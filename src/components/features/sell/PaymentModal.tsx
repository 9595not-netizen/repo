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
        if (!customerName) {
            toast({ title: "กรุณาระบุชื่อลูกค้า", variant: "destructive" });
            return;
        }

        setLoading(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('ไม่สามารถระบุตัวตนผู้ใช้');
            
            const now = new Date().toISOString();

            // Process each item
            for (const item of items) {
                // 1. Update Product Status
                const { error: updateError } = await supabase
                    .from('products')
                    .update({
                        status: 'sold',
                        sold_by: user.id,
                        sold_to: customerName,
                        payment_method: paymentMethod as 'เงินสด' | 'ผ่อนชำระ' | 'โอนเงิน' | 'บัตรเครดิต' | null,
                        sold_at: now
                    })
                    .eq('id', item.id);

                if (updateError) throw updateError;

                // 2. Log Inventory
                await supabase.from('inventory_logs').insert({
                    product_id: item.id,
                    action_type: 'sell',
                    action_by: user.id,
                    action_note: `ขายสินค้าให้กับ ${customerName} เบอร์โทร ${customerPhone}`
                });
            }

            toast({
                title: "ชำระเงินสำเร็จ",
                description: "บันทึกการขายเรียบร้อยแล้ว",
                className: "bg-green-500 text-white"
            });

            onSuccess();
            onClose();

        } catch (error) {
            console.error(error);
            toast({
                title: "เกิดข้อผิดพลาด",
                description: "ไม่สามารถบันทึกการขายได้",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="sm:max-w-md bg-card/95 backdrop-blur-xl border-gold/50">
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

                    <div className="grid grid-cols-2 gap-4">
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

                <DialogFooter className="sm:justify-between gap-2">
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
