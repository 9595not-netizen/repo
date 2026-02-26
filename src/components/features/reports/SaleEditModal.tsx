import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/lib/supabase';
import { useStaffList } from '@/hooks/useStaffList';

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

interface SaleEditModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    record: SaleRecord | null;
    onSuccess: () => void;
}

const PAYMENT_OPTIONS = ['เงินสด', 'โอนเงิน', 'ผ่อนชำระ', 'บัตรเครดิต'] as const;

export function SaleEditModal({ open, onOpenChange, record, onSuccess }: SaleEditModalProps) {
    const [loading, setLoading] = useState(false);
    const [fetching, setFetching] = useState(false);
    const [soldTo, setSoldTo] = useState('');
    const [sellingPrice, setSellingPrice] = useState('');
    const [paymentMethod, setPaymentMethod] = useState<string>('เงินสด');
    const [soldAt, setSoldAt] = useState('');
    const [soldBy, setSoldBy] = useState<string>('');
    const [contractNumber, setContractNumber] = useState('');
    const { staff, loadingStaff } = useStaffList();
    const { toast } = useToast();

    useEffect(() => {
        if (!open || !record) return;
        setSoldTo(record.sold_to === '-' ? '' : record.sold_to);
        setSellingPrice(String(record.selling_price));
        setPaymentMethod(record.payment_method === 'ไม่ระบุ' ? 'เงินสด' : record.payment_method);
        const d = new Date(record.sold_at);
        const pad = (n: number) => n.toString().padStart(2, '0');
        setSoldAt(`${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`);
        setContractNumber('');

        setFetching(true);
        supabase
            .from('products')
            .select('sold_by, contract_number')
            .eq('id', record.id)
            .single()
            .then(({ data }) => {
                if (data?.sold_by) setSoldBy(data.sold_by);
                else if (staff.length > 0) setSoldBy(staff[0].id);
                if (data?.contract_number) setContractNumber(data.contract_number ?? '');
            })
            .catch(() => {
                if (staff.length > 0) setSoldBy(staff[0].id);
            })
            .finally(() => setFetching(false));
    }, [open, record, staff]);

    const handleSave = async () => {
        if (!record) return;
        const to = soldTo.trim();
        if (!to) {
            toast({ title: 'กรุณาระบุชื่อผู้ซื้อ', variant: 'destructive' });
            return;
        }
        const price = parseFloat(sellingPrice);
        if (isNaN(price) || price < 0) {
            toast({ title: 'กรุณาระบุราคาขายที่ถูกต้อง', variant: 'destructive' });
            return;
        }
        if (!soldBy) {
            toast({ title: 'กรุณาเลือกผู้ขาย', variant: 'destructive' });
            return;
        }
        if (paymentMethod === 'ผ่อนชำระ' && !contractNumber.trim()) {
            toast({ title: 'กรุณาระบุเลขที่สัญญาสำหรับผ่อนชำระ', variant: 'destructive' });
            return;
        }
        if (paymentMethod === 'เงินสด' && price < 1) {
            toast({ title: 'กรุณาระบุราคาขายมากกว่า 0 สำหรับขายสด', variant: 'destructive' });
            return;
        }

        const finalPrice = paymentMethod === 'ผ่อนชำระ' ? 0 : price;
        setLoading(true);
        try {
            type PaymentOpt = (typeof PAYMENT_OPTIONS)[number];
            const pm: PaymentOpt = PAYMENT_OPTIONS.includes(paymentMethod as PaymentOpt) ? (paymentMethod as PaymentOpt) : 'เงินสด';
            const profit = finalPrice - record.cost_price;
            const soldAtIso = soldAt ? new Date(soldAt).toISOString() : new Date().toISOString();
            const { error } = await supabase
                .from('products')
                .update({
                    sold_to: to,
                    selling_price: finalPrice,
                    profit,
                    payment_method: pm,
                    sold_at: soldAtIso,
                    sold_by: soldBy,
                    contract_number: paymentMethod === 'ผ่อนชำระ' ? contractNumber.trim() : null,
                })
                .eq('id', record.id);

            if (error) throw error;
            toast({ title: 'บันทึกการแก้ไขสำเร็จ' });
            onSuccess();
            onOpenChange(false);
        } catch (e) {
            console.error(e);
            toast({ title: 'เกิดข้อผิดพลาด', description: 'ไม่สามารถบันทึกการแก้ไขได้', variant: 'destructive' });
        } finally {
            setLoading(false);
        }
    };

    if (!record) return null;

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>แก้ไขรายการขาย</DialogTitle>
                </DialogHeader>
                <p className="text-sm text-muted-foreground">
                    {record.brand_name} {record.model_name} • {record.shop_code}
                </p>
                <div className="space-y-4 py-2">
                    <div>
                        <Label>ชื่อผู้ซื้อ</Label>
                        <Input value={soldTo} onChange={(e) => setSoldTo(e.target.value)} placeholder="ชื่อลูกค้า" />
                    </div>
                    {paymentMethod === 'เงินสด' ? (
                        <div>
                            <Label>ราคาขาย (฿)</Label>
                            <Input
                                type="number"
                                min={1}
                                step={0.01}
                                value={sellingPrice}
                                onChange={(e) => setSellingPrice(e.target.value)}
                            />
                        </div>
                    ) : (
                        <div>
                            <Label>ราคาขาย</Label>
                            <p className="text-sm text-muted-foreground py-1">ผ่อนชำระ — ไม่บันทึกราคาขาย</p>
                        </div>
                    )}
                    <div>
                        <Label>วิธีชำระเงิน</Label>
                        <Select
                            value={paymentMethod}
                            onValueChange={(v) => {
                                setPaymentMethod(v);
                                if (v === 'ผ่อนชำระ') setSellingPrice('0');
                            }}
                        >
                            <SelectTrigger>
                                <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                                {PAYMENT_OPTIONS.map((opt) => (
                                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                    {paymentMethod === 'ผ่อนชำระ' && (
                        <div>
                            <Label>เลขที่สัญญา</Label>
                            <Input
                                value={contractNumber}
                                onChange={(e) => setContractNumber(e.target.value)}
                                placeholder="เลขที่สัญญาผ่อนชำระ"
                            />
                        </div>
                    )}
                    <div>
                        <Label>วันที่ขาย</Label>
                        <Input
                            type="datetime-local"
                            value={soldAt}
                            onChange={(e) => setSoldAt(e.target.value)}
                        />
                    </div>
                    <div>
                        <Label>ผู้ขาย</Label>
                        <Select value={soldBy} onValueChange={setSoldBy} disabled={loadingStaff || fetching}>
                            <SelectTrigger>
                                <SelectValue placeholder="เลือกผู้ขาย" />
                            </SelectTrigger>
                            <SelectContent>
                                {staff.map((s) => (
                                    <SelectItem key={s.id} value={s.id}>
                                        {s.full_name ?? s.username ?? s.id}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                </div>
                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>ยกเลิก</Button>
                    <Button onClick={handleSave} disabled={loading || fetching}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        บันทึก
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
