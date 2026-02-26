import { useState, useEffect, useCallback } from 'react';
import { GoldCard } from '@/components/ui/gold-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/lib/supabase';
import { supabaseHelpers } from '@/lib/supabase-helpers';
import { Edit2, Trash2, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-handler';

interface Brand {
    id: string;
    name: string;
    status: 'active' | 'inactive';
}

export function BrandsTab() {
    const { toast } = useToast();
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ name: '', status: 'active' as const });
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchBrands = useCallback(async (isCancelled?: () => boolean) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('brands')
                .select('*')
                .order('name');

            if (isCancelled?.()) return;
            if (error) throw error;
            setBrands(data || []);
        } catch (error: unknown) {
            if (!isCancelled?.()) toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            if (!isCancelled?.()) setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        let cancelled = false;
        fetchBrands(() => cancelled);
        return () => { cancelled = true; };
    }, [fetchBrands]);

    const handleSave = async () => {
        const trimmedName = formData.name.trim();

        if (!trimmedName) {
            toast({ title: 'ข้อผิดพลาด', description: 'กรุณาระบุชื่อยี่ห้อ', variant: 'destructive' });
            return;
        }

        if (trimmedName.length > 50) {
            toast({ title: 'ข้อผิดพลาด', description: 'ชื่อยี่ห้อไม่ควรยาวเกิน 50 ตัวอักษร', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('brands')
                    .update({ name: trimmedName, status: formData.status })
                    .eq('id', editingId);

                if (error) throw error;
                toast({ title: 'สำเร็จ', description: 'อัปเดตยี่ห้อเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            } else {
                const { error: insertError } = await supabaseHelpers.insertBrand(supabase, { name: trimmedName, status: formData.status as 'active' | 'inactive' });

                if (insertError) throw insertError;
                toast({ title: 'สำเร็จ', description: 'เพิ่มยี่ห้อเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            }

            setShowModal(false);
            setEditingId(null);
            setFormData({ name: '', status: 'active' });
            fetchBrands();
        } catch (error: unknown) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (id: string) => {
        setDeletingId(id);
        setDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingId) return;

        try {
            // Soft delete: Change status to inactive
            const { error } = await supabase
                .from('brands')
                .update({ status: 'inactive' })
                .eq('id', deletingId);

            if (error) throw error;
            toast({ title: 'สำเร็จ', description: 'ปิดใช้งานยี่ห้อเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            setDeleteConfirmOpen(false);
            setDeletingId(null);
            fetchBrands();
        } catch (error: unknown) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
        }
    };

    const openEditModal = (brand: Brand) => {
        setEditingId(brand.id);
        setFormData({ name: brand.name, status: brand.status });
        setShowModal(true);
    };

    const activeBrands = brands.filter(b => b.status === 'active');

    return (
        <>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Button 
                        onClick={() => { 
                            setEditingId(null); 
                            setFormData({ name: '', status: 'active' }); 
                            setShowModal(true); 
                        }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                        <Plus className="h-4 w-4 mr-2" /> เพิ่มยี่ห้อ
                    </Button>
                </div>

                <GoldCard className="overflow-hidden bg-amber-50/30 dark:bg-slate-900/50 border border-gold">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-green-100 dark:bg-green-900/30 text-muted-foreground font-semibold">
                                <tr>
                                    <th className="p-4 text-left">ชื่อยี่ห้อ</th>
                                    <th className="p-4 text-left">สถานะ</th>
                                    <th className="p-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : activeBrands.length === 0 ? (
                                    <tr>
                                        <td colSpan={3} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูล</td>
                                    </tr>
                                ) : (
                                    activeBrands.map((brand) => (
                                        <tr key={brand.id} className="hover:bg-muted/30 border-b border-gold/20">
                                            <td className="p-4 font-semibold">{brand.name}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    brand.status === 'active'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                }`}>
                                                    {brand.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => openEditModal(brand)}
                                                        className="rounded-lg border-gray-300"
                                                    >
                                                        <Edit2 className="h-4 w-4 text-gray-600" />
                                                    </Button>
                                                    <Button 
                                                        variant="destructive" 
                                                        size="sm" 
                                                        onClick={() => handleDeleteClick(brand.id)}
                                                        disabled={brand.status === 'inactive'}
                                                        className="rounded-lg"
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </GoldCard>
            </div>

            <Dialog open={showModal} onOpenChange={setShowModal}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'แก้ไขยี่ห้อ' : 'เพิ่มยี่ห้อใหม่'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>ชื่อยี่ห้อ *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="เช่น Apple, Samsung"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>สถานะ</Label>
                            <Select value={formData.status} onValueChange={(v) => setFormData({ ...formData, status: v as 'active' | 'inactive' })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="active">ใช้งาน</SelectItem>
                                    <SelectItem value="inactive">ปิดใช้งาน</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="flex gap-2 pt-4">
                            <Button variant="outline" onClick={() => setShowModal(false)} className="flex-1">ยกเลิก</Button>
                            <Button onClick={handleSave} disabled={submitting} className="flex-1">
                                {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                บันทึก
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            <ConfirmDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="ยืนยันการปิดใช้งานยี่ห้อ"
                description={`คุณแน่ใจว่าต้องการปิดใช้งานยี่ห้อ "${brands.find(b => b.id === deletingId)?.name}"? การปิดใช้งานจะทำให้ยี่ห้อนี้ไม่แสดงในการเพิ่มสินค้าใหม่`}
                confirmText="ปิดใช้งาน"
                cancelText="ยกเลิก"
                onConfirm={handleDelete}
                variant="destructive"
            />
        </>
    );
}
