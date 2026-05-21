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
import { useAuth } from '@/contexts/AuthContext';
import { SettingsStaffNotice } from './SettingsStaffNotice';

interface Variant {
    id: string;
    model_id: string;
    model_name: string;
    storage: string;
    status: 'active' | 'inactive';
}

interface Model {
    id: string;
    model_name: string;
}

export function VariantsTab() {
    const { toast } = useToast();
    const { isAdmin } = useAuth();
    const [variants, setVariants] = useState<Variant[]>([]);
    const [models, setModels] = useState<Model[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        model_id: '',
        storage: '',
        status: 'active' as const
    });
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchData = useCallback(async (isCancelled?: () => boolean) => {
        setLoading(true);
        try {
            const [{ data: variantsData }, { data: modelsData }] = await Promise.all([
                supabase.from('model_variants').select('*, models(model_name)').order('storage'),
                supabase.from('models').select('id, model_name').eq('status', 'active')
            ]);

            if (isCancelled?.()) return;
            setVariants(
                (variantsData || []).map((v: { models?: { model_name?: string }; [key: string]: unknown }) => ({
                    ...v,
                    model_name: v.models?.model_name || 'Unknown'
                }))
            );
            setModels(modelsData || []);
        } catch (error: unknown) {
            if (!isCancelled?.()) toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
        } finally {
            if (!isCancelled?.()) setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        let cancelled = false;
        fetchData(() => cancelled);
        return () => { cancelled = true; };
    }, [fetchData]);

    const handleSave = async () => {
        const trimmedStorage = formData.storage.trim();

        if (!formData.model_id || !trimmedStorage) {
            toast({ title: 'ข้อผิดพลาด', description: 'กรุณาระบุข้อมูลที่จำเป็น', variant: 'destructive' });
            return;
        }

        if (trimmedStorage.length > 50) {
            toast({ title: 'ข้อผิดพลาด', description: 'ความจุไม่ควรยาวเกิน 50 ตัวอักษร', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('model_variants')
                    .update({ model_id: formData.model_id, storage: trimmedStorage, status: formData.status })
                    .eq('id', editingId);

                if (error) throw error;
                toast({ title: 'สำเร็จ', description: 'อัปเดตความจุเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            } else {
                const { error } = await supabase
                    .from('model_variants')
                    .insert([{ model_id: formData.model_id, storage: trimmedStorage, status: formData.status }]);

                if (error) throw error;
                toast({ title: 'สำเร็จ', description: 'เพิ่มความจุเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            }

            setShowModal(false);
            setEditingId(null);
            setFormData({ model_id: '', storage: '', status: 'active' });
            fetchData();
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
                .from('model_variants')
                .update({ status: 'inactive' })
                .eq('id', deletingId);

            if (error) throw error;
            toast({ title: 'สำเร็จ', description: 'ปิดใช้งานความจุเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            setDeleteConfirmOpen(false);
            setDeletingId(null);
            fetchData();
        } catch (error: unknown) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
        }
    };

    const openEditModal = (variant: Variant) => {
        setEditingId(variant.id);
        setFormData({ model_id: variant.model_id, storage: variant.storage, status: variant.status });
        setShowModal(true);
    };

    return (
        <>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    {isAdmin ? (
                        <Button
                            onClick={() => {
                                setEditingId(null);
                                setFormData({ model_id: '', storage: '', status: 'active' });
                                setShowModal(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                            <Plus className="h-4 w-4 mr-2" /> เพิ่มความจุ
                        </Button>
                    ) : (
                        <SettingsStaffNotice />
                    )}
                </div>

                <GoldCard className="overflow-hidden bg-amber-50/30 dark:bg-slate-900/50 border border-gold">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-green-100 dark:bg-green-900/30 text-muted-foreground font-semibold">
                                <tr>
                                    <th className="p-4 text-left">รุ่น</th>
                                    <th className="p-4 text-left">ความจุ</th>
                                    <th className="p-4 text-left">สถานะ</th>
                                    {isAdmin && <th className="p-4 text-center">จัดการ</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : variants.length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 4 : 3} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูล</td>
                                    </tr>
                                ) : (
                                    variants.map((variant) => (
                                        <tr key={variant.id} className="hover:bg-muted/30 border-b border-gold/20">
                                            <td className="p-4">{variant.model_name}</td>
                                            <td className="p-4 font-semibold">{variant.storage}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    variant.status === 'active'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                }`}>
                                                    {variant.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditModal(variant)}
                                                            className="rounded-lg border-gray-300"
                                                        >
                                                            <Edit2 className="h-4 w-4 text-gray-600" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(variant.id)}
                                                            disabled={variant.status === 'inactive'}
                                                            className="rounded-lg"
                                                        >
                                                            <Trash2 className="h-4 w-4" />
                                                        </Button>
                                                    </div>
                                                </td>
                                            )}
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
                        <DialogTitle>{editingId ? 'แก้ไขความจุ' : 'เพิ่มความจุใหม่'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>รุ่น *</Label>
                            <Select value={formData.model_id || ''} onValueChange={(v) => setFormData({ ...formData, model_id: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกรุ่น" />
                                </SelectTrigger>
                                <SelectContent>
                                    {models.map((m) => (
                                        <SelectItem key={m.id} value={m.id}>{m.model_name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>ความจุ *</Label>
                            <Input
                                value={formData.storage}
                                onChange={(e) => setFormData({ ...formData, storage: e.target.value })}
                                placeholder="เช่น 128GB, 256GB"
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
                title="ยืนยันการปิดใช้งานความจุ"
                description={`คุณแน่ใจว่าต้องการปิดใช้งานความจุ "${variants.find(v => v.id === deletingId)?.storage}"? การปิดใช้งานจะทำให้ความจุนี้ไม่แสดงในการเพิ่มสินค้าใหม่`}
                confirmText="ปิดใช้งาน"
                cancelText="ยกเลิก"
                onConfirm={handleDelete}
                variant="destructive"
            />
        </>
    );
}
