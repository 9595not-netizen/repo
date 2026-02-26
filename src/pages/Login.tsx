import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/layout/ThemeProvider';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Card, CardContent, CardDescription, CardFooter, CardHeader } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, LogIn, Eye, EyeOff, Moon, Sun } from 'lucide-react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [rememberMe, setRememberMe] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<{ username?: string; password?: string }>({});
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { session } = useAuth();
  const { theme, setTheme } = useTheme();

  // Redirect if already logged in
  useEffect(() => {
    if (session) {
      navigate('/');
    }
  }, [session, navigate]);

  const validateForm = () => {
    const errors: { username?: string; password?: string } = {};
    let isValid = true;

    const trimmedUsername = username.trim();

    if (!trimmedUsername) {
      errors.username = 'กรุณากรอกชื่อผู้ใช้';
      isValid = false;
    } else if (trimmedUsername.length < 3) {
      errors.username = 'ชื่อผู้ใช้ต้องมีอย่างน้อย 3 ตัวอักษร';
      isValid = false;
    }

    if (!password) {
      errors.password = 'กรุณากรอกรหัสผ่าน';
      isValid = false;
    } else if (password.length < 6) {
      errors.password = 'รหัสผ่านต้องมีอย่างน้อย 6 ตัวอักษร';
      isValid = false;
    }

    setFieldErrors(errors);
    return isValid;
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!validateForm()) {
      return;
    }

    setLoading(true);

    try {
      let user: { email: string; status: string } | null = null;

      // 1. ลอง RPC ก่อน (ต้องรัน SQL ใน Supabase ถึงจะใช้ได้)
      const { data: userRow, error: userError } = await supabase.rpc('get_user_email_by_username', {
        lookup_username: username.trim()
      }) as { data: { email: string; status: string }[] | { email: string; status: string } | null; error: { message?: string; code?: string } | null };

      const isRpc404 = userError && (
        (userError as { code?: string }).code === 'PGRST202' ||
        (userError as { status?: number }).status === 404 ||
        /404|not found|function/i.test((userError as { message?: string }).message ?? '')
      );

      if (!isRpc404 && !userError && userRow != null) {
        user = Array.isArray(userRow) && userRow.length > 0
          ? userRow[0]
          : typeof userRow === 'object' && userRow !== null && 'email' in userRow
            ? (userRow as { email: string; status: string })
            : null;
      }

      // 2. ถ้า RPC 404 (ฟังก์ชันยังไม่มี) ลอง query ตาราง users โดยตรง (จะผ่านได้ถ้า RLS อนุญาตให้ anon อ่าน)
      if (!user && isRpc404) {
        const { data: row, error: tableError } = await supabase
          .from('users')
          .select('email, status')
          .eq('username', username.trim())
          .maybeSingle();
        if (!tableError && row?.email) {
          user = { email: row.email, status: row.status ?? 'active' };
        }
      }

      if (!user?.email) {
        if (isRpc404) {
          setError('ล็อกอินใช้ไม่ได้: กรุณารัน SQL ใน Supabase ตามไฟล์ "ตั้งค่าล็อกอิน-Supabase.md"');
        } else {
          setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        }
        setLoading(false);
        return;
      }

      if (user.status !== 'active') {
        setError('บัญชีผู้ใช้นี้ไม่ได้เปิดใช้งาน กรุณาติดต่อผู้ดูแลระบบ');
        setLoading(false);
        return;
      }

      // 2. Sign in with email/password
      const { error: authError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: password,
      });

      if (authError) {
        setError('ชื่อผู้ใช้หรือรหัสผ่านไม่ถูกต้อง');
        setLoading(false);
        return;
      }

      // Store remember me preference
      if (rememberMe) {
        localStorage.setItem('rememberMe', 'true');
      } else {
        localStorage.removeItem('rememberMe');
      }

      navigate('/');
    } catch (err) {
      setError('เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleLogin(e as React.FormEvent);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background via-background to-muted p-4 relative overflow-hidden">
      {/* Background Decoration */}
      <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-full blur-3xl" />
      <div className="absolute bottom-0 left-0 w-96 h-96 bg-gradient-to-tr from-green-500/20 to-blue-500/20 rounded-full blur-3xl" />

      {/* Theme Toggle */}
      <button
        onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
        className="absolute top-4 right-4 p-2 rounded-lg hover:bg-primary/10 transition-colors"
      >
        {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
      </button>

      {/* Login Card */}
      <Card className="w-full max-w-md glass border-gold/50 shadow-2xl backdrop-blur-xl relative z-10">
        <CardHeader className="space-y-2 text-center pb-4">
          <div className="flex justify-center mb-3">
            <img
              src="/logo.png"
              alt="NOTMOBILE"
              loading="lazy"
              decoding="async"
              className="h-24 w-24 rounded-full object-cover object-center shadow-lg"
            />
          </div>
          <CardDescription className="text-muted-foreground text-sm">
            ระบบจัดการสต๊อกและยอดขายโทรศัพท์มือถือ
          </CardDescription>
        </CardHeader>

        <CardContent className="pt-2">
          <form onSubmit={handleLogin} className="space-y-4">
            {/* General Error Alert */}
            {error && (
              <Alert variant="destructive" className="bg-destructive/10 border-destructive/50 rounded-lg">
                <AlertDescription className="text-destructive text-sm">{error}</AlertDescription>
              </Alert>
            )}

            {/* Username Field */}
            <div className="space-y-2">
              <Label htmlFor="username" className="text-sm font-medium">
                ชื่อผู้ใช้
              </Label>
              <Input
                id="username"
                type="text"
                placeholder="กรอกชื่อผู้ใช้"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                onKeyPress={handleKeyPress}
                disabled={loading}
                className={`bg-background/50 border-gold/30 focus:border-gold focus:ring-gold/20 text-sm ${
                  fieldErrors.username ? 'border-destructive/50' : ''
                }`}
              />
              {fieldErrors.username && (
                <p className="text-xs text-destructive">{fieldErrors.username}</p>
              )}
            </div>

            {/* Password Field */}
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium">
                รหัสผ่าน
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="กรอกรหัสผ่าน"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={loading}
                  className={`bg-background/50 border-gold/30 focus:border-gold focus:ring-gold/20 text-sm pr-10 ${
                    fieldErrors.password ? 'border-destructive/50' : ''
                  }`}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  disabled={loading}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
              {fieldErrors.password && (
                <p className="text-xs text-destructive">{fieldErrors.password}</p>
              )}
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center space-x-2">
              <Checkbox
                id="remember"
                checked={rememberMe}
                onCheckedChange={(checked) => setRememberMe(checked as boolean)}
                disabled={loading}
                className="border-gold/50 data-[state=checked]:bg-gold data-[state=checked]:border-gold"
              />
              <Label
                htmlFor="remember"
                className="text-xs font-normal text-muted-foreground cursor-pointer hover:text-foreground transition-colors"
              >
                จดจำฉันไว้ในระบบ
              </Label>
            </div>

            {/* Login Button */}
            <Button
              type="submit"
              disabled={loading || !!fieldErrors.username || !!fieldErrors.password}
              className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-bold py-2 shadow-lg hover:shadow-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  กำลังเข้าสู่ระบบ...
                </>
              ) : (
                <>
                  <LogIn className="mr-2 h-4 w-4" />
                  เข้าสู่ระบบ
                </>
              )}
            </Button>
          </form>
        </CardContent>

        <CardFooter className="flex flex-col items-center justify-center border-t border-gold/20 pt-4 gap-1">
          <p className="text-sm font-medium text-foreground">NOTMOBILE SYSTEM</p>
          <p className="text-xs text-muted-foreground">
            © 2026 พัฒนาโดย น๊อต"ตัวผู้"
          </p>
        </CardFooter>
      </Card>
    </div>
  );
}
