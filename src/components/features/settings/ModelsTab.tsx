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

interface Model {
    id: string;
    brand_id: string;
    brand_name: string;
    model_name: string;
    main_image: string;
    status: 'active' | 'inactive';
}

interface Brand {
    id: string;
    name: string;
}

export function ModelsTab() {
    const { toast } = useToast();
    const { isAdmin } = useAuth();
    const [models, setModels] = useState<Model[]>([]);
    const [brands, setBrands] = useState<Brand[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        brand_id: '',
        model_name: '',
        main_image: '',
        status: 'active' as const
    });
    const [submitting, setSubmitting] = useState(false);
    const [imagePreview, setImagePreview] = useState<string>('');
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchData = useCallback(async (isCancelled?: () => boolean) => {
        setLoading(true);
        try {
            const [{ data: modelsData }, { data: brandsData }] = await Promise.all([
                supabase.from('models').select('*, brands(name)').order('model_name'),
                supabase.from('brands').select('*').eq('status', 'active')
            ]);

            if (isCancelled?.()) return;
            setModels(
                (modelsData || []).map((m: { brands?: { name?: string }; [key: string]: unknown }) => ({
                    ...m,
                    brand_name: m.brands?.name || 'Unknown'
                }))
            );
            setBrands(brandsData || []);
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

    const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImagePreview(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleSave = async () => {
        const trimmedName = formData.model_name.trim();

        if (!formData.brand_id || !trimmedName) {
            toast({ title: 'ข้อผิดพลาด', description: 'กรุณาระบุข้อมูลที่จำเป็น', variant: 'destructive' });
            return;
        }

        if (trimmedName.length > 100) {
            toast({ title: 'ข้อผิดพลาด', description: 'ชื่อรุ่นไม่ควรยาวเกิน 100 ตัวอักษร', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            let imageUrl = formData.main_image;

            if (imagePreview && !imagePreview.startsWith('http')) {
                const fileName = `models/${Date.now()}.jpg`;
                const { error: uploadError } = await supabase.storage
                    .from('product-images')
                    .upload(fileName, await (await fetch(imagePreview)).blob());

                if (uploadError) throw uploadError;

                const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
                imageUrl = publicUrl;
            }

            if (editingId) {
                const { error } = await supabase
                    .from('models')
                    .update({ brand_id: formData.brand_id, model_name: trimmedName, main_image: imageUrl, status: formData.status })
                    .eq('id', editingId);

                if (error) throw error;
                toast({ title: 'สำเร็จ', description: 'อัปเดตรุ่นเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            } else {
                const { error } = await supabase
                    .from('models')
                    .insert([{ brand_id: formData.brand_id, model_name: trimmedName, main_image: imageUrl, status: formData.status }]);

                if (error) throw error;
                toast({ title: 'สำเร็จ', description: 'เพิ่มรุ่นเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            }

            setShowModal(false);
            setEditingId(null);
            setFormData({ brand_id: '', model_name: '', main_image: '', status: 'active' });
            setImagePreview('');
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
                .from('models')
                .update({ status: 'inactive' })
                .eq('id', deletingId);

            if (error) throw error;
            toast({ title: 'สำเร็จ', description: 'ปิดใช้งานรุ่นเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            setDeleteConfirmOpen(false);
            setDeletingId(null);
            fetchData();
        } catch (error: unknown) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
        }
    };

    const openEditModal = (model: Model) => {
        setEditingId(model.id);
        setFormData({ brand_id: model.brand_id, model_name: model.model_name, main_image: model.main_image, status: model.status });
        setImagePreview(model.main_image);
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
                                setFormData({ brand_id: '', model_name: '', main_image: '', status: 'active' });
                                setImagePreview('');
                                setShowModal(true);
                            }}
                            className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                        >
                            <Plus className="h-4 w-4 mr-2" /> เพิ่มรุ่น
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
                                    <th className="p-4 text-left">รูปภาพ</th>
                                    <th className="p-4 text-left">ยี่ห้อ</th>
                                    <th className="p-4 text-left">ชื่อรุ่น</th>
                                    <th className="p-4 text-left">สถานะ</th>
                                    {isAdmin && <th className="p-4 text-center">จัดการ</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : models.length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 5 : 4} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูล</td>
                                    </tr>
                                ) : (
                                    models.map((model) => (
                                        <tr key={model.id} className="hover:bg-muted/30 border-b border-gold/20">
                                            <td className="p-4">
                                                {model.main_image ? (
                                                    <img src={model.main_image} alt={model.model_name} loading="lazy" decoding="async" className="h-12 w-12 rounded object-cover" />
                                                ) : (
                                                    <div className="h-12 w-12 bg-muted rounded">ไม่มี</div>
                                                )}
                                            </td>
                                            <td className="p-4">{model.brand_name}</td>
                                            <td className="p-4 font-semibold">{model.model_name}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    model.status === 'active'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                }`}>
                                                    {model.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => openEditModal(model)}
                                                            className="rounded-lg border-gray-300"
                                                        >
                                                            <Edit2 className="h-4 w-4 text-gray-600" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(model.id)}
                                                            disabled={model.status === 'inactive'}
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
                        <DialogTitle>{editingId ? 'แก้ไขรุ่น' : 'เพิ่มรุ่นใหม่'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>ยี่ห้อ *</Label>
                            <Select value={formData.brand_id || ''} onValueChange={(v) => setFormData({ ...formData, brand_id: v })}>
                                <SelectTrigger>
                                    <SelectValue placeholder="เลือกยี่ห้อ" />
                                </SelectTrigger>
                                <SelectContent>
                                    {brands.map((b) => (
                                        <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        <div className="space-y-2">
                            <Label>ชื่อรุ่น *</Label>
                            <Input
                                value={formData.model_name}
                                onChange={(e) => setFormData({ ...formData, model_name: e.target.value })}
                                placeholder="เช่น iPhone 15 Pro"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>รูปภาพหลัก</Label>
                            <Input type="file" accept="image/*" onChange={handleImageChange} />
                            {imagePreview && (
                                <img src={imagePreview} alt="Preview" loading="lazy" decoding="async" className="h-20 w-20 rounded object-cover" />
                            )}
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
                title="ยืนยันการปิดใช้งานรุ่น"
                description={`คุณแน่ใจว่าต้องการปิดใช้งานรุ่น "${models.find(m => m.id === deletingId)?.model_name}"? การปิดใช้งานจะทำให้รุ่นนี้ไม่แสดงในการเพิ่มสินค้าใหม่`}
                confirmText="ปิดใช้งาน"
                cancelText="ยกเลิก"
                onConfirm={handleDelete}
                variant="destructive"
            />
        </>
    );
}
