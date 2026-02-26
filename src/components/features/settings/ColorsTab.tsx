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

interface Color {
    id: string;
    name: string;
    hex_code: string;
    status: 'active' | 'inactive';
}

export function ColorsTab() {
    const { toast } = useToast();
    const [colors, setColors] = useState<Color[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({
        name: '',
        hex_code: '#f6c7ff',
        status: 'active' as const
    });
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchColors = useCallback(async (isCancelled?: () => boolean) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('colors')
                .select('*')
                .order('name');

            if (isCancelled?.()) return;
            if (error) throw error;
            setColors(data || []);
        } catch (error: unknown) {
            if (!isCancelled?.()) {
                console.error('Fetch colors error:', error);
                toast({ 
                    title: 'ข้อผิดพลาด', 
                    description: 'ไม่สามารถโหลดข้อมูลสีได้ กรุณาลองใหม่อีกครั้ง', 
                    variant: 'destructive' 
                });
            }
        } finally {
            if (!isCancelled?.()) setLoading(false);
        }
    }, [toast]);

    useEffect(() => {
        let cancelled = false;
        fetchColors(() => cancelled);
        return () => { cancelled = true; };
    }, [fetchColors]);

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.hex_code) {
            toast({ title: 'ข้อผิดพลาด', description: 'กรุณาระบุชื่อและรหัสสี', variant: 'destructive' });
            return;
        }

        // Validate hex code format
        const hexPattern = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
        if (!hexPattern.test(formData.hex_code)) {
            toast({ 
                title: 'ข้อผิดพลาด', 
                description: 'รูปแบบรหัสสีไม่ถูกต้อง กรุณาใช้รูปแบบ #FFFFFF หรือ #FFF', 
                variant: 'destructive' 
            });
            return;
        }

        // Check for duplicate name before submitting
        const normalizedName = formData.name.trim();
        const existingWithName = colors.find(
            c => c.name.toLowerCase() === normalizedName.toLowerCase() && c.id !== editingId
        );

        if (existingWithName) {
            toast({ 
                title: 'ข้อผิดพลาด', 
                description: `ชื่อสี "${normalizedName}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น`, 
                variant: 'destructive' 
            });
            return;
        }

        setSubmitting(true);
        try {
            if (editingId) {
                const { error } = await supabase
                    .from('colors')
                    .update({ name: normalizedName, hex_code: formData.hex_code.toUpperCase(), status: formData.status })
                    .eq('id', editingId);

                if (error) throw error;
                toast({ title: 'สำเร็จ', description: 'อัปเดตสีเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            } else {
                const { error } = await supabase
                    .from('colors')
                    .insert([{ name: normalizedName, hex_code: formData.hex_code.toUpperCase(), status: formData.status }]);

                if (error) throw error;
                toast({ title: 'สำเร็จ', description: 'เพิ่มสีเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            }

            setShowModal(false);
            setEditingId(null);
            setFormData({ name: '', hex_code: '#f6c7ff', status: 'active' });
            fetchColors();
        } catch (error: unknown) {
            console.error('Save color error:', error);
            
            // Parse error message and provide user-friendly Thai message
            let errorMessage = 'ไม่สามารถบันทึกข้อมูลได้';
            
            if (getErrorMessage(error)) {
                if (getErrorMessage(error).includes('duplicate key value violates unique constraint')) {
                    if (getErrorMessage(error).includes('colors_name_key')) {
                        errorMessage = `ชื่อสี "${normalizedName}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น`;
                    } else if (getErrorMessage(error).includes('colors_hex_code_key')) {
                        errorMessage = `รหัสสี "${formData.hex_code.toUpperCase()}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสสีอื่น`;
                    } else {
                        errorMessage = 'ข้อมูลที่กรอกซ้ำกับข้อมูลที่มีอยู่แล้ว กรุณาตรวจสอบและลองใหม่อีกครั้ง';
                    }
                } else if (getErrorMessage(error).includes('violates foreign key constraint')) {
                    errorMessage = 'ไม่สามารถลบข้อมูลนี้ได้ เนื่องจากมีการใช้งานอยู่ในระบบ';
                } else if (getErrorMessage(error).includes('null value')) {
                    errorMessage = 'กรุณากรอกข้อมูลให้ครบถ้วน';
                } else {
                    errorMessage = getErrorMessage(error);
                }
            }
            
            toast({ 
                title: 'ข้อผิดพลาด', 
                description: errorMessage, 
                variant: 'destructive' 
            });
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
                .from('colors')
                .update({ status: 'inactive' })
                .eq('id', deletingId);

            if (error) throw error;
            toast({ title: 'สำเร็จ', description: 'ปิดใช้งานสีเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            setDeleteConfirmOpen(false);
            setDeletingId(null);
            fetchColors();
        } catch (error: unknown) {
            console.error('Delete color error:', error);
            toast({ 
                title: 'ข้อผิดพลาด', 
                description: 'ไม่สามารถปิดใช้งานสีได้ กรุณาลองใหม่อีกครั้ง', 
                variant: 'destructive' 
            });
        }
    };

    const openEditModal = (color: Color) => {
        setEditingId(color.id);
        setFormData({ name: color.name, hex_code: color.hex_code, status: color.status });
        setShowModal(true);
    };

    return (
        <>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Button 
                        onClick={() => { 
                            setEditingId(null); 
                            setFormData({ name: '', hex_code: '#f6c7ff', status: 'active' }); 
                            setShowModal(true); 
                        }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                        <Plus className="h-4 w-4 mr-2" /> เพิ่มสี
                    </Button>
                </div>

                <GoldCard className="overflow-hidden bg-amber-50/30 dark:bg-slate-900/50 border border-gold">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-green-100 dark:bg-green-900/30 text-muted-foreground font-semibold">
                                <tr>
                                    <th className="p-4 text-left">ชื่อสี</th>
                                    <th className="p-4 text-left">รหัสสี</th>
                                    <th className="p-4 text-left">สถานะ</th>
                                    <th className="p-4 text-center">จัดการ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                        </td>
                                    </tr>
                                ) : colors.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูล</td>
                                    </tr>
                                ) : (
                                    colors.map((color) => (
                                        <tr key={color.id} className="hover:bg-muted/30 border-b border-gold/20">
                                            <td className="p-4 font-semibold">{color.name}</td>
                                            <td className="p-4">
                                                <div className="flex items-center gap-2">
                                                    <div
                                                        className="w-8 h-8 rounded border border-gold/30"
                                                        style={{ backgroundColor: color.hex_code }}
                                                    />
                                                    <span className="font-mono text-xs">{color.hex_code}</span>
                                                </div>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    color.status === 'active'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                }`}>
                                                    {color.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => openEditModal(color)}
                                                        className="rounded-lg border-gray-300"
                                                    >
                                                        <Edit2 className="h-4 w-4 text-gray-600" />
                                                    </Button>
                                                    <Button 
                                                        variant="destructive" 
                                                        size="sm" 
                                                        onClick={() => handleDeleteClick(color.id)}
                                                        disabled={color.status === 'inactive'}
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
                        <DialogTitle>{editingId ? 'แก้ไขสี' : 'เพิ่มสีใหม่'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>ชื่อสี *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="เช่น ดำ, ขาว, แดง"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>รหัสสี (Hex) *</Label>
                            <div className="flex gap-2">
                                <Input
                                    type="color"
                                    value={formData.hex_code}
                                    onChange={(e) => setFormData({ ...formData, hex_code: e.target.value })}
                                    className="h-10 w-20 cursor-pointer"
                                />
                                <Input
                                    value={formData.hex_code}
                                    onChange={(e) => setFormData({ ...formData, hex_code: e.target.value })}
                                    placeholder="#ffffff"
                                    className="flex-1"
                                />
                            </div>
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
                title="ยืนยันการปิดใช้งานสี"
                description={`คุณแน่ใจว่าต้องการปิดใช้งานสี "${colors.find(c => c.id === deletingId)?.name}"? การปิดใช้งานจะทำให้สีนี้ไม่แสดงในการเพิ่มสินค้าใหม่`}
                confirmText="ปิดใช้งาน"
                cancelText="ยกเลิก"
                onConfirm={handleDelete}
                variant="destructive"
            />
        </>
    );
}
