import { useState, useEffect } from 'react';
import { GoldCard } from '@/components/ui/gold-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/lib/supabase';
import { Edit2, Trash2, Plus, Loader2 } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-handler';

interface DeviceType {
    id: string;
    name: string;
    code: string;
    status: 'active' | 'inactive';
}

export function DeviceTypesTab() {
    const { toast } = useToast();
    const [deviceTypes, setDeviceTypes] = useState<DeviceType[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState<{
        name: string;
        code: string;
        status: 'active' | 'inactive';
    }>({
        name: '',
        code: '',
        status: 'active'
    });
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);

    const fetchDeviceTypes = async (isCancelled?: () => boolean) => {
        setLoading(true);
        try {
            const { data, error } = await supabase
                .from('device_types')
                .select('*')
                .order('name');

            if (isCancelled?.()) return;
            if (error) throw error;
            setDeviceTypes(data || []);
        } catch (error: unknown) {
            if (!isCancelled?.()) {
                console.error('Fetch device types error:', error);
                toast({ 
                    title: 'ข้อผิดพลาด', 
                    description: 'ไม่สามารถโหลดข้อมูลประเภทเครื่องได้ กรุณาลองใหม่อีกครั้ง', 
                    variant: 'destructive' 
                });
            }
        } finally {
            if (!isCancelled?.()) setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        fetchDeviceTypes(() => cancelled);
        return () => { cancelled = true; };
    }, [toast]);

    const handleSave = async () => {
        if (!formData.name.trim() || !formData.code.trim()) {
            toast({ title: 'ข้อผิดพลาด', description: 'กรุณาระบุชื่อและรหัส', variant: 'destructive' });
            return;
        }

        // Check for duplicate code before submitting
        const normalizedCode = formData.code.trim().toUpperCase();
        const existingWithCode = deviceTypes.find(
            dt => dt.code.toUpperCase() === normalizedCode && dt.id !== editingId
        );

        if (existingWithCode) {
            toast({ 
                title: 'ข้อผิดพลาด', 
                description: `รหัส "${normalizedCode}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น`, 
                variant: 'destructive' 
            });
            return;
        }

        setSubmitting(true);
        try {
            if (editingId) {
                // @ts-ignore - Type inference issue with Supabase types
                const { error } = await supabase
                    .from('device_types')
                    .update({ 
                        name: formData.name.trim(), 
                        code: normalizedCode, 
                        status: formData.status
                    })
                    .eq('id', editingId);

                if (error) throw error;
                toast({ title: 'สำเร็จ', description: 'อัปเดตประเภทเครื่องเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            } else {
                // @ts-ignore - Type inference issue with Supabase types
                const { error } = await supabase
                    .from('device_types')
                    .insert([{ 
                        name: formData.name.trim(), 
                        code: normalizedCode, 
                        status: formData.status
                    }]);

                if (error) throw error;
                toast({ title: 'สำเร็จ', description: 'เพิ่มประเภทเครื่องเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            }

            setShowModal(false);
            setEditingId(null);
            setFormData({ name: '', code: '', status: 'active' });
            fetchDeviceTypes();
        } catch (error: unknown) {
            console.error('Save device type error:', error);
            
            // Parse error message and provide user-friendly Thai message
            let errorMessage = 'ไม่สามารถบันทึกข้อมูลได้';
            
            if (getErrorMessage(error)) {
                if (getErrorMessage(error).includes('duplicate key value violates unique constraint')) {
                    if (getErrorMessage(error).includes('device_types_code_key')) {
                        errorMessage = `รหัส "${normalizedCode}" มีอยู่ในระบบแล้ว กรุณาใช้รหัสอื่น`;
                    } else if (getErrorMessage(error).includes('device_types_name_key')) {
                        errorMessage = `ชื่อ "${formData.name.trim()}" มีอยู่ในระบบแล้ว กรุณาใช้ชื่ออื่น`;
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
            // @ts-ignore - Type inference issue with Supabase types
            const { error } = await supabase
                .from('device_types')
                .update({ status: 'inactive' })
                .eq('id', deletingId);

            if (error) throw error;
            toast({ title: 'สำเร็จ', description: 'ปิดใช้งานประเภทเครื่องเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            setDeleteConfirmOpen(false);
            setDeletingId(null);
            fetchDeviceTypes();
        } catch (error: unknown) {
            console.error('Delete device type error:', error);
            toast({ 
                title: 'ข้อผิดพลาด', 
                description: 'ไม่สามารถปิดใช้งานประเภทเครื่องได้ กรุณาลองใหม่อีกครั้ง', 
                variant: 'destructive' 
            });
        }
    };

    const openEditModal = (deviceType: DeviceType) => {
        setEditingId(deviceType.id);
        setFormData({ name: deviceType.name, code: deviceType.code, status: deviceType.status });
        setShowModal(true);
    };

    return (
        <>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3">
                    <Button 
                        onClick={() => { 
                            setEditingId(null); 
                            setFormData({ name: '', code: '', status: 'active' }); 
                            setShowModal(true); 
                        }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                        <Plus className="h-4 w-4 mr-2" /> เพิ่มประเภทเครื่อง
                    </Button>
                </div>

                <GoldCard className="overflow-hidden bg-amber-50/30 dark:bg-slate-900/50 border border-gold">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-green-100 dark:bg-green-900/30 text-muted-foreground font-semibold">
                                <tr>
                                    <th className="p-4 text-left">ชื่อ</th>
                                    <th className="p-4 text-left">รหัส</th>
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
                                ) : deviceTypes.length === 0 ? (
                                    <tr>
                                        <td colSpan={4} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูล</td>
                                    </tr>
                                ) : (
                                    deviceTypes.map((deviceType) => (
                                        <tr key={deviceType.id} className="hover:bg-muted/30 border-b border-gold/20">
                                            <td className="p-4 font-semibold">{deviceType.name}</td>
                                            <td className="p-4 font-mono text-xs uppercase text-blue-600 dark:text-blue-400">{deviceType.code}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    deviceType.status === 'active'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                }`}>
                                                    {deviceType.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-2">
                                                    <Button 
                                                        variant="outline" 
                                                        size="sm" 
                                                        onClick={() => openEditModal(deviceType)}
                                                        className="rounded-lg border-gray-300"
                                                    >
                                                        <Edit2 className="h-4 w-4 text-gray-600" />
                                                    </Button>
                                                    <Button 
                                                        variant="destructive" 
                                                        size="sm" 
                                                        onClick={() => handleDeleteClick(deviceType.id)}
                                                        disabled={deviceType.status === 'inactive'}
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
                        <DialogTitle>{editingId ? 'แก้ไขประเภทเครื่อง' : 'เพิ่มประเภทเครื่องใหม่'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>ชื่อ *</Label>
                            <Input
                                value={formData.name}
                                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                                placeholder="เช่น เครื่องศูนย์"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>รหัส *</Label>
                            <Input
                                value={formData.code}
                                onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                                placeholder="เช่น ZP"
                                maxLength={10}
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
                title="ยืนยันการปิดใช้งานประเภทเครื่อง"
                description={`คุณแน่ใจว่าต้องการปิดใช้งานประเภทเครื่อง "${deviceTypes.find(dt => dt.id === deletingId)?.name}"? การปิดใช้งานจะทำให้ประเภทเครื่องนี้ไม่แสดงในการเพิ่มสินค้าใหม่`}
                confirmText="ปิดใช้งาน"
                cancelText="ยกเลิก"
                onConfirm={handleDelete}
                variant="destructive"
            />
        </>
    );
}
