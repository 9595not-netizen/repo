import { useState, useEffect, useRef } from 'react';
import { GoldCard } from '@/components/ui/gold-card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { supabase } from '@/lib/supabase';
import { supabaseHelpers } from '@/lib/supabase-helpers';
import { Edit2, Trash2, Plus, Loader2, Eye, EyeOff, KeyRound, RefreshCw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { useAuth } from '@/contexts/AuthContext';

interface Staff {
    id: string;
    email: string;
    username: string;
    full_name: string;
    phone: string;
    role: 'staff' | 'admin';
    status: 'active' | 'inactive';
}

export function StaffTab() {
    const { toast } = useToast();
    const { user: currentUser, isAdmin } = useAuth();
    const [staff, setStaff] = useState<Staff[]>([]);
    const [loading, setLoading] = useState(true);
    const [showModal, setShowModal] = useState(false);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [showPassword, setShowPassword] = useState(false);
    const [formData, setFormData] = useState({
        email: '',
        username: '',
        password: '',
        full_name: '',
        phone: '',
        role: 'staff' as const,
        status: 'active' as const
    });
    const [submitting, setSubmitting] = useState(false);
    const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);
    const [resetPasswordOpen, setResetPasswordOpen] = useState(false);
    const [deletingId, setDeletingId] = useState<string | null>(null);
    const [resettingId, setResettingId] = useState<string | null>(null);
    const [newPassword, setNewPassword] = useState('');
    const [showNewPassword, setShowNewPassword] = useState(false);
    const [resettingPassword, setResettingPassword] = useState(false);
    const [fetchError, setFetchError] = useState<string | null>(null);

    const mountedRef = useRef(true);

    const fetchStaff = async () => {
        setLoading(true);
        setFetchError(null);
        try {
            const { data, error } = await supabase
                .from('users')
                .select('id, email, username, full_name, phone, role, status')
                .order('full_name');

            if (error) throw error;
            if (mountedRef.current) setStaff(data ?? []);
        } catch (err: unknown) {
            const msg = getErrorMessage(err);
            if (mountedRef.current) {
                setFetchError(msg);
                setStaff([]);
                toast({
                    title: 'โหลดข้อมูลไม่สำเร็จ',
                    description: msg + ' กดปุ่มโหลดใหม่เพื่อลองอีกครั้ง',
                    variant: 'destructive',
                    duration: 8000,
                });
            }
        } finally {
            if (mountedRef.current) setLoading(false);
        }
    };

    useEffect(() => {
        mountedRef.current = true;
        fetchStaff();
        return () => { mountedRef.current = false; };
    }, []);

    const handleSave = async () => {
        // Validation
        if (!formData.email.trim() || !formData.username.trim() || !formData.full_name.trim()) {
            toast({ title: 'ข้อผิดพลาด', description: 'กรุณาระบุอีเมล ชื่อผู้ใช้ และชื่อจริง', variant: 'destructive' });
            return;
        }

        // Email format validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email.trim())) {
            toast({ title: 'ข้อผิดพลาด', description: 'รูปแบบอีเมลไม่ถูกต้อง', variant: 'destructive' });
            return;
        }

        if (!editingId && !formData.password.trim()) {
            toast({ title: 'ข้อผิดพลาด', description: 'กรุณาตั้งรหัสผ่านสำหรับพนักงานใหม่', variant: 'destructive' });
            return;
        }

        if (!editingId && formData.password.length < 6) {
            toast({ title: 'ข้อผิดพลาด', description: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', variant: 'destructive' });
            return;
        }

        setSubmitting(true);
        try {
            if (editingId) {
                // Update existing staff
                const { error } = await supabase
                    .from('users')
                    .update({
                        email: formData.email.trim(),
                        username: formData.username.trim(),
                        full_name: formData.full_name.trim(),
                        phone: formData.phone?.trim() || null,
                        role: formData.role,
                        status: formData.status
                    })
                    .eq('id', editingId);

                if (error) {
                    console.error('Update user error:', error);
                    throw error;
                }
                toast({ title: 'สำเร็จ', description: 'อัปเดตข้อมูลพนักงานเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            } else {
                // Check if email already exists in users table
                const { data: existingUser, error: checkEmailError } = await supabase
                    .from('users')
                    .select('id, email')
                    .eq('email', formData.email.trim())
                    .maybeSingle();

                if (checkEmailError && checkEmailError.code !== 'PGRST116') {
                    console.error('Check email error:', checkEmailError);
                }

                if (existingUser) {
                    toast({ title: 'ข้อผิดพลาด', description: 'อีเมลนี้มีอยู่ในระบบแล้ว', variant: 'destructive' });
                    setSubmitting(false);
                    return;
                }

                // Check if username already exists
                const { data: existingUsername, error: checkUsernameError } = await supabase
                    .from('users')
                    .select('id, username')
                    .eq('username', formData.username.trim())
                    .maybeSingle();

                if (checkUsernameError && checkUsernameError.code !== 'PGRST116') {
                    console.error('Check username error:', checkUsernameError);
                }

                if (existingUsername) {
                    toast({ title: 'ข้อผิดพลาด', description: 'ชื่อผู้ใช้นี้มีอยู่ในระบบแล้ว', variant: 'destructive' });
                    setSubmitting(false);
                    return;
                }

                // Create new staff using Auth signUp
                // IMPORTANT: For users to login immediately, email confirmation must be disabled in Supabase Dashboard
                // Go to: Supabase Dashboard → Authentication → Settings → Disable "Enable email confirmations"
                // 
                // Note: admin.createUser() requires service role key and cannot be used from client-side
                // We use signUp() instead, which works but requires email confirmation to be disabled
                const { data: authData, error: authError } = await supabase.auth.signUp({
                    email: formData.email.trim(),
                    password: formData.password,
                    options: {
                        data: {
                            username: formData.username.trim(),
                            full_name: formData.full_name.trim(),
                            phone: formData.phone?.trim() || null,
                            role: formData.role
                        }
                    }
                });
                
                // If signUp succeeds but email confirmation is required, show warning
                if (!authError && authData.user && !authData.user.email_confirmed_at) {
                    toast({
                        title: 'คำเตือน',
                        description: 'ผู้ใช้ถูกสร้างแล้ว แต่ต้อง confirm email ก่อน login กรุณาปิด email confirmation ใน Supabase Dashboard → Authentication → Settings',
                        variant: 'default'
                    });
                }

                if (authError) {
                    console.error('Auth signup error:', authError);
                    // Provide more specific error messages
                    let errorMessage = 'ไม่สามารถสร้างผู้ใช้ได้';
                    let detailedInstructions = '';
                    
                    if (authError.message.includes('already registered') || authError.message.includes('already exists')) {
                        errorMessage = 'อีเมลนี้มีอยู่ในระบบแล้ว';
                    } else if (authError.message.includes('password') || authError.message.includes('Password')) {
                        errorMessage = 'รหัสผ่านไม่ตรงตามข้อกำหนด (ต้องมีอย่างน้อย 6 ตัวอักษร)';
                    } else if (authError.message.includes('email')) {
                        errorMessage = 'รูปแบบอีเมลไม่ถูกต้อง';
                    } else if (authError.message.includes('User not allowed') || authError.message.includes('403') || authError.message.includes('Forbidden')) {
                        errorMessage = 'ไม่สามารถสร้างผู้ใช้ได้ - ตรวจสอบการตั้งค่า Supabase';
                        detailedInstructions = 'กรุณาทำตามขั้นตอนนี้:\n\n1. เปิด Supabase Dashboard → Authentication → Settings\n2. ปิด "Enable email confirmations" (เพื่อให้ผู้ใช้ login ได้ทันที)\n3. ตรวจสอบว่า "Enable sign ups" เปิดอยู่\n4. บันทึกการตั้งค่า\n5. ลองสร้างผู้ใช้อีกครั้ง';
                    } else if (authError.message) {
                        errorMessage = authError.message;
                    }
                    
                    toast({ 
                        title: 'ข้อผิดพลาด', 
                        description: errorMessage + (detailedInstructions ? '\n\n' + detailedInstructions : ''), 
                        variant: 'destructive',
                        duration: 15000
                    });
                    setSubmitting(false);
                    return;
                }

                // Insert into users table (Master: id = auth.users.id เพื่อให้ AuthContext ดึงโปรไฟล์ได้)
                if (authData.user) {
                    const { error: insertError } = await supabase
                        .from('users')
                        .insert([{
                            id: authData.user.id,
                            email: formData.email.trim(),
                            username: formData.username.trim(),
                            password_hash: '', // รหัสจริงอยู่ที่ Supabase Auth
                            full_name: formData.full_name.trim(),
                            phone: formData.phone?.trim() || null,
                            role: formData.role,
                            status: formData.status
                        }]);

                    if (insertError) {
                        console.error('Insert user error:', insertError);
                        // Note: Cannot delete auth user from client-side (requires admin API)
                        // User will need to manually delete from Supabase Dashboard if needed
                        throw insertError;
                    }
                } else {
                    toast({ title: 'ข้อผิดพลาด', description: 'ไม่สามารถสร้างผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง', variant: 'destructive' });
                    setSubmitting(false);
                    return;
                }

                toast({ title: 'สำเร็จ', description: 'เพิ่มพนักงานเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            }

            setShowModal(false);
            setEditingId(null);
            setFormData({ email: '', username: '', password: '', full_name: '', phone: '', role: 'staff', status: 'active' });
            setShowPassword(false);
            fetchStaff();
        } catch (error: unknown) {
            console.error('Save user error:', error);
            toast({ 
                title: 'ข้อผิดพลาด', 
                description: getErrorMessage(error), 
                variant: 'destructive' 
            });
        } finally {
            setSubmitting(false);
        }
    };

    const handleDeleteClick = (id: string, fullName: string) => {
        // Prevent self-deletion
        if (currentUser?.id === id) {
            toast({ title: 'ข้อผิดพลาด', description: 'ไม่สามารถลบบัญชีของตัวเองได้', variant: 'destructive' });
            return;
        }
        setDeletingId(id);
        setDeleteConfirmOpen(true);
    };

    const handleDelete = async () => {
        if (!deletingId) return;

        try {
            const { error } = await supabase.from('users').delete().eq('id', deletingId);

            if (error) throw error;
            toast({ title: 'สำเร็จ', description: 'ลบพนักงานเรียบร้อยแล้ว', className: 'bg-green-500 text-white' });
            setDeleteConfirmOpen(false);
            setDeletingId(null);
            fetchStaff();
        } catch (error: unknown) {
            toast({ title: 'Error', description: getErrorMessage(error), variant: 'destructive' });
        }
    };

    const handleResetPasswordClick = (id: string) => {
        setResettingId(id);
        setNewPassword('');
        setShowNewPassword(false);
        setResetPasswordOpen(true);
    };

    const handleResetPassword = async () => {
        if (!resettingId || !newPassword.trim()) {
            toast({ title: 'ข้อผิดพลาด', description: 'กรุณาระบุรหัสผ่านใหม่', variant: 'destructive' });
            return;
        }

        if (newPassword.length < 6) {
            toast({ title: 'ข้อผิดพลาด', description: 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร', variant: 'destructive' });
            return;
        }

        setResettingPassword(true);
        try {
            // Note: supabase.auth.admin.updateUserById() requires service role key and cannot be used from client-side
            // Password reset must be done via Supabase Dashboard or a server-side RPC function
            toast({ 
                title: 'คำแนะนำ', 
                description: 'การรีเซ็ตรหัสผ่านต้องทำผ่าน Supabase Dashboard:\n1. เปิด Supabase Dashboard → Authentication → Users\n2. คลิกที่ผู้ใช้ที่ต้องการรีเซ็ตรหัสผ่าน\n3. กด "Reset Password" หรือ "Send Password Reset Email"\n\nหรือติดต่อผู้ดูแลระบบเพื่อรีเซ็ตรหัสผ่าน', 
                variant: 'default',
                duration: 10000
            });
            setResetPasswordOpen(false);
            setResettingId(null);
            setNewPassword('');
        } catch (error: unknown) {
            toast({ 
                title: 'Error', 
                description: 'ไม่สามารถรีเซ็ตรหัสผ่านได้ กรุณาใช้ Supabase Dashboard หรือติดต่อผู้ดูแลระบบ', 
                variant: 'destructive' 
            });
            console.error('Reset password error:', error);
        } finally {
            setResettingPassword(false);
        }
    };

    const openEditModal = (staffMember: Staff) => {
        setEditingId(staffMember.id);
        setFormData({
            email: staffMember.email || '',
            username: staffMember.username || '',
            password: '', // Password field empty on edit
            full_name: staffMember.full_name || '',
            phone: staffMember.phone || '',
            role: staffMember.role,
            status: staffMember.status
        });
        setShowPassword(false);
        setShowModal(true);
    };

    return (
        <>
            <div className="space-y-4">
                <div className="flex flex-wrap items-center justify-between gap-3">
                    <Button 
                        onClick={() => {
                            setEditingId(null);
                            setFormData({ email: '', username: '', password: '', full_name: '', phone: '', role: 'staff', status: 'active' });
                            setShowPassword(false);
                            setShowModal(true);
                        }} 
                        className="bg-blue-600 hover:bg-blue-700 text-white rounded-lg"
                    >
                        <Plus className="h-4 w-4 mr-2" /> เพิ่มพนักงาน
                    </Button>
                    {!isAdmin && (
                        <p className="text-sm text-muted-foreground">เฉพาะ Admin เท่านั้นที่เพิ่ม/แก้ไข/ลบได้</p>
                    )}
                    {fetchError && (
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchStaff()}
                            disabled={loading}
                            className="border-amber-500/50 text-amber-700 hover:bg-amber-50 dark:border-amber-500/50 dark:text-amber-400 dark:hover:bg-amber-900/20"
                        >
                            {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                            โหลดใหม่
                        </Button>
                    )}
                </div>

                <GoldCard className="overflow-hidden bg-amber-50/30 dark:bg-slate-900/50 border border-gold">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead className="bg-green-100 dark:bg-green-900/30 text-muted-foreground font-semibold">
                                <tr>
                                    <th className="p-4 text-left">ชื่อจริง</th>
                                    <th className="p-4 text-left">ชื่อผู้ใช้</th>
                                    <th className="p-4 text-left">อีเมล</th>
                                    <th className="p-4 text-left">โทรศัพท์</th>
                                    <th className="p-4 text-left">บทบาท</th>
                                    <th className="p-4 text-left">สถานะ</th>
                                    {isAdmin && <th className="p-4 text-center">จัดการ</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-muted-foreground">
                                            <Loader2 className="h-5 w-5 animate-spin mx-auto" />
                                            <p className="mt-2 text-sm">กำลังโหลดข้อมูลพนักงาน...</p>
                                        </td>
                                    </tr>
                                ) : fetchError ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center">
                                            <p className="text-muted-foreground mb-2">โหลดข้อมูลไม่สำเร็จ</p>
                                            <p className="text-xs text-muted-foreground mb-3">{fetchError}</p>
                                            <Button
                                                variant="outline"
                                                size="sm"
                                                onClick={() => fetchStaff()}
                                                disabled={loading}
                                            >
                                                <RefreshCw className="h-4 w-4 mr-2" />
                                                โหลดใหม่
                                            </Button>
                                        </td>
                                    </tr>
                                ) : staff.length === 0 ? (
                                    <tr>
                                        <td colSpan={isAdmin ? 7 : 6} className="p-8 text-center text-muted-foreground">ไม่มีข้อมูลพนักงาน</td>
                                    </tr>
                                ) : (
                                    staff.map((staffMember) => (
                                        <tr key={staffMember.id} className="hover:bg-muted/30 border-b border-gold/20">
                                            <td className="p-4 font-semibold">{staffMember.full_name}</td>
                                            <td className="p-4 font-mono text-xs">{staffMember.username}</td>
                                            <td className="p-4 text-xs break-all">{staffMember.email}</td>
                                            <td className="p-4 text-xs">{staffMember.phone || '-'}</td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    staffMember.role === 'admin'
                                                        ? 'bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300'
                                                        : 'bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300'
                                                }`}>
                                                    {staffMember.role === 'admin' ? 'แอดมิน' : 'พนักงาน'}
                                                </span>
                                            </td>
                                            <td className="p-4">
                                                <span className={`px-3 py-1 rounded-full text-xs font-semibold ${
                                                    staffMember.status === 'active'
                                                        ? 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-300'
                                                        : 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300'
                                                }`}>
                                                    {staffMember.status === 'active' ? 'ใช้งาน' : 'ปิดใช้งาน'}
                                                </span>
                                            </td>
                                            {isAdmin && (
                                                <td className="p-4">
                                                    <div className="flex items-center justify-center gap-2">
                                                        <Button 
                                                            variant="outline" 
                                                            size="sm" 
                                                            onClick={() => openEditModal(staffMember)}
                                                            className="rounded-lg border-gray-300"
                                                            title="แก้ไข"
                                                        >
                                                            <Edit2 className="h-4 w-4 text-gray-600" />
                                                        </Button>
                                                        <Button
                                                            variant="outline"
                                                            size="sm"
                                                            onClick={() => handleResetPasswordClick(staffMember.id)}
                                                            className="rounded-lg border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                                                            title="รีเซ็ตรหัสผ่าน"
                                                        >
                                                            <KeyRound className="h-4 w-4" />
                                                        </Button>
                                                        <Button
                                                            variant="destructive"
                                                            size="sm"
                                                            onClick={() => handleDeleteClick(staffMember.id, staffMember.full_name)}
                                                            disabled={currentUser?.id === staffMember.id}
                                                            className="rounded-lg"
                                                            title={currentUser?.id === staffMember.id ? 'ไม่สามารถลบตัวเองได้' : 'ลบ'}
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
                <DialogContent className="max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>{editingId ? 'แก้ไขข้อมูลพนักงาน' : 'เพิ่มพนักงานใหม่'}</DialogTitle>
                    </DialogHeader>

                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>ชื่อจริง *</Label>
                            <Input
                                value={formData.full_name || ''}
                                onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                                placeholder="เช่น สมชาย ใจดี"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>ชื่อผู้ใช้ *</Label>
                            <Input
                                value={formData.username || ''}
                                onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                                placeholder="เช่น somchai"
                                disabled={!!editingId}
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>อีเมล *</Label>
                            <Input
                                type="email"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                                placeholder="somchai@example.com"
                                disabled={!!editingId}
                            />
                        </div>

                        {!editingId && (
                            <div className="space-y-2">
                                <Label>รหัสผ่าน *</Label>
                                <div className="relative">
                                    <Input
                                        type={showPassword ? 'text' : 'password'}
                                        value={formData.password}
                                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                                        placeholder="กรุณากำหนดรหัสผ่าน"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowPassword(!showPassword)}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                </div>
                            </div>
                        )}

                        <div className="space-y-2">
                            <Label>โทรศัพท์</Label>
                            <Input
                                value={formData.phone || ''}
                                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                                placeholder="เช่น 0812345678"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>บทบาท</Label>
                            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as 'admin' | 'staff' })}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="staff">พนักงาน</SelectItem>
                                    <SelectItem value="admin">แอดมิน</SelectItem>
                                </SelectContent>
                            </Select>
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

            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={deleteConfirmOpen}
                onOpenChange={setDeleteConfirmOpen}
                title="ยืนยันการลบพนักงาน"
                description={`คุณแน่ใจว่าต้องการลบ "${staff.find(s => s.id === deletingId)?.full_name}"? การกระทำนี้ไม่สามารถยกเลิกได้`}
                confirmText="ลบ"
                cancelText="ยกเลิก"
                onConfirm={handleDelete}
                variant="destructive"
            />

            {/* Reset Password Dialog */}
            <Dialog open={resetPasswordOpen} onOpenChange={setResetPasswordOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>รีเซ็ตรหัสผ่าน</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                        <div className="space-y-2">
                            <Label>รหัสผ่านใหม่ *</Label>
                            <div className="relative">
                                <Input
                                    type={showNewPassword ? 'text' : 'password'}
                                    value={newPassword}
                                    onChange={(e) => setNewPassword(e.target.value)}
                                    placeholder="กรุณาระบุรหัสผ่านใหม่ (อย่างน้อย 6 ตัวอักษร)"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowNewPassword(!showNewPassword)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                >
                                    {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                </button>
                            </div>
                            <p className="text-xs text-muted-foreground">
                                รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร
                            </p>
                        </div>
                        <div className="flex gap-2 pt-4">
                            <Button variant="outline" onClick={() => setResetPasswordOpen(false)} className="flex-1">
                                ยกเลิก
                            </Button>
                            <Button 
                                onClick={handleResetPassword} 
                                disabled={resettingPassword || !newPassword.trim() || newPassword.length < 6} 
                                className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                            >
                                {resettingPassword ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                                รีเซ็ตรหัสผ่าน
                            </Button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </>
    );
}
