import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { User, ShieldCheck, Clock, Mail, Database } from 'lucide-react';
import { supabase } from '@/lib/supabase';

export function UserInfoBar() {
    const { userProfile, user, loading } = useAuth();
    const [dbConnected, setDbConnected] = useState<boolean | null>(null);
    const [lastLogin, setLastLogin] = useState<string>('');

    useEffect(() => {
        const checkConnection = async () => {
            try {
                const { error } = await supabase.from('users').select('id').limit(1);
                setDbConnected(!error);
            } catch {
                setDbConnected(false);
            }
        };
        checkConnection();
        const interval = setInterval(checkConnection, 120000);
        return () => clearInterval(interval);
    }, []);

    useEffect(() => {
        let cancelled = false;
        const getLastLogin = async () => {
            try {
                const { data: { session } } = await supabase.auth.getSession();
                if (cancelled) return;
                if (session?.user?.last_sign_in_at) {
                    const d = new Date(session.user.last_sign_in_at);
                    setLastLogin(
                        d.toLocaleDateString('th-TH', { day: 'numeric', month: 'numeric', year: 'numeric' }) +
                        ' ' +
                        d.toLocaleTimeString('th-TH', { hour: '2-digit', minute: '2-digit' })
                    );
                } else {
                    setLastLogin('-');
                }
            } catch {
                if (!cancelled) setLastLogin('-');
            }
        };
        getLastLogin();
        return () => { cancelled = true; };
    }, []);

    const displayEmail = userProfile?.email || user?.email || '-';
    // แสดงอีเมลแบบย่อ (เช่น 9595.not@gmail.com -> 9595...)
    const truncatedEmail = displayEmail && displayEmail !== '-' 
        ? displayEmail.length > 10 
            ? displayEmail.substring(0, 4) + '...'
            : displayEmail
        : '-';
    const isAdmin = userProfile?.role === 'admin';
    const roleLoading = user && !userProfile && loading;

    return (
        <div className="flex items-center gap-x-5 px-4 py-3 overflow-x-auto">
            {/* ชื่อผู้ใช้ */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <User className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 whitespace-nowrap">ชื่อผู้ใช้:</span>
                <span className="text-sm font-semibold text-gray-900 dark:text-gray-100 whitespace-nowrap">
                    {userProfile?.username || userProfile?.full_name || user?.email?.split('@')[0] || '-'}
                </span>
            </div>

            <span className="text-gray-200 dark:text-gray-700 select-none flex-shrink-0">|</span>

            {/* สิทธิ์ */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <ShieldCheck className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 whitespace-nowrap">สิทธิ์:</span>
                <span className={`text-xs font-bold px-2 py-0.5 rounded-full whitespace-nowrap ${
                    roleLoading
                        ? 'bg-amber-50 text-amber-700 dark:bg-amber-900/20 dark:text-amber-400'
                        : isAdmin
                          ? 'bg-blue-50 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400'
                          : 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-300'
                }`}>
                    {roleLoading ? 'กำลังโหลด...' : isAdmin ? 'Admin' : 'Staff'}
                </span>
            </div>

            <span className="text-gray-200 dark:text-gray-700 select-none flex-shrink-0">|</span>

            {/* อีเมล */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <Mail className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 whitespace-nowrap">อีเมล:</span>
                <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap" title={displayEmail}>
                    {truncatedEmail}
                </span>
            </div>

            <span className="text-gray-200 dark:text-gray-700 select-none flex-shrink-0">|</span>

            {/* เข้าสู่ระบบล่าสุด */}
            <div className="flex items-center gap-1.5 flex-shrink-0">
                <Clock className="h-3.5 w-3.5 text-gray-400 flex-shrink-0" />
                <span className="text-xs text-gray-500 whitespace-nowrap">เข้าสู่ระบบล่าสุด:</span>
                <span className="text-sm text-gray-700 dark:text-gray-300 whitespace-nowrap">
                    {lastLogin || '...'}
                </span>
            </div>

            {/* DB Status — ชิดขวา */}
            <div className="ml-auto flex items-center gap-1.5 flex-shrink-0">
                <Database className="h-3.5 w-3.5 text-pink-500 flex-shrink-0" />
                <span className="text-xs text-gray-500 whitespace-nowrap">Database:</span>
                {dbConnected === null ? (
                    <span className="text-xs text-gray-400 whitespace-nowrap">...</span>
                ) : dbConnected ? (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-green-600 whitespace-nowrap">
                        <span>🟢</span>
                        Connect
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-red-600 whitespace-nowrap">
                        <span>🔴</span>
                        NotConnect
                    </span>
                )}
            </div>
        </div>
    );
}
