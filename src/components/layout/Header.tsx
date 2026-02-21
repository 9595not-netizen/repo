import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTheme } from '@/components/layout/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Bell, LogOut, User, Moon, Sun } from 'lucide-react';
import { useLowStockAlert } from '@/hooks/useLowStockAlert';
import { cn } from '@/lib/utils';

const DAY_NAMES = ['อา.', 'จ.', 'อ.', 'พ.', 'พฤ.', 'ศ.', 'ส.'];

export function Header() {
  const { userProfile, signOut } = useAuth();
  const { theme, setTheme } = useTheme();
  const [currentTime, setCurrentTime] = useState(new Date());
  const { count } = useLowStockAlert();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const formatDate = (d: Date) => {
    const day = DAY_NAMES[d.getDay()];
    const date = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear() + 543;
    return `${day}${date}/${month}/${year}`;
  };
  const formatTime = (d: Date) =>
    d.toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const formatTimeShort = (d: Date) =>
    d.toLocaleTimeString('th-TH', { hour12: false, hour: '2-digit', minute: '2-digit' });

  const isDark = theme === 'dark' || (theme === 'system' && typeof window !== 'undefined' && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const toggleTheme = () => setTheme(isDark ? 'light' : 'dark');

  return (
    <header
      className={cn(
        'fixed top-0 left-0 right-0 h-16 z-50',
        'bg-background/70 dark:bg-background/60 backdrop-blur-md',
        'border-b border-[#D4AF37] border-b-[1.5px]',
        'px-2 md:px-4 flex items-center justify-between gap-2',
        'font-sans'
      )}
      style={{ height: '64px' }}
    >
      {/* ซ้าย: NOTMOBILE (gradient ชมพู→เหลือง→เขียว) */}
      <div className="flex items-center gap-2 min-w-0">
        <span className="font-bold text-xl md:text-2xl logo-gradient whitespace-nowrap shrink-0">
          NOTMOBILE
        </span>
      </div>

      {/* Desktop: กลาง-ขวา | พฤ.18/12/2025 | 14:10:08 | 🟢 Online */}
      <div className="hidden md:flex items-center gap-2 text-sm font-medium text-muted-foreground shrink-0">
        <span>{formatDate(currentTime)}</span>
        <span className="text-muted-foreground/70">|</span>
        <span>{formatTime(currentTime)}</span>
        <span className="text-muted-foreground/70">|</span>
        <span className="flex items-center gap-1">
          <span className="text-green-500" aria-hidden>🟢</span>
          <span>Online</span>
        </span>
      </div>

      {/* Mobile: NOTMOBILE | 🟢 | 19:35 (รวมในแถบเดียว - เวลาอยู่ขวาสุด) */}
      <div className="md:hidden flex items-center gap-1.5 text-xs font-medium text-muted-foreground shrink-0">
        <span className="text-green-500" aria-hidden>🟢</span>
        <span>{formatTimeShort(currentTime)}</span>
      </div>

      {/* ขวา: Light/Dark toggle + Notification bell + User menu */}
      <div className="flex items-center gap-1 md:gap-2 shrink-0">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 text-muted-foreground hover:text-foreground"
          onClick={toggleTheme}
          title={isDark ? 'โหมดสว่าง' : 'โหมดมืด'}
          aria-label={isDark ? 'สลับเป็นโหมดสว่าง' : 'สลับเป็นโหมดมืด'}
        >
          <Moon className="h-5 w-5 dark:hidden" />
          <Sun className="h-5 w-5 hidden dark:block" />
        </Button>

        <Link
          to="/low-stock"
          className={cn(
            "relative flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition-colors",
            count > 0 && "text-orange-600 dark:text-orange-400"
          )}
          aria-label="แจ้งเตือนสต๊อกเหลือน้อย"
          title={count > 0 ? `สต๊อกเหลือน้อย ${count} รุ่น` : 'แจ้งเตือนสต๊อก'}
        >
          <Bell className="h-5 w-5" />
          {count > 0 && (
            <span
              className="absolute top-1 right-1 h-2 w-2 min-w-2 rounded-full bg-destructive ring-2 ring-background"
              aria-label={`${count} รายการแจ้งเตือน`}
            />
          )}
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-9 w-9 rounded-full border border-[#D4AF37]/50 p-0 overflow-hidden">
              <Avatar className="h-8 w-8">
                <AvatarImage src="" alt={userProfile?.username} />
                <AvatarFallback className="bg-primary/10 text-primary font-bold text-sm">
                  {userProfile?.username?.charAt(0).toUpperCase() || 'U'}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent className="w-56" align="end" forceMount>
            <DropdownMenuLabel className="font-normal">
              <div className="flex flex-col gap-1">
                <p className="text-sm font-medium">{userProfile?.full_name}</p>
                <p className="text-xs text-muted-foreground">
                  {userProfile?.role === 'admin' ? 'ผู้ดูแลระบบ' : 'พนักงาน'}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <Link to="/settings">
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                <span>โปรไฟล์</span>
              </DropdownMenuItem>
            </Link>
            <DropdownMenuItem onClick={() => signOut()} className="text-destructive focus:text-destructive">
              <LogOut className="mr-2 h-4 w-4" />
              <span>ออกจากระบบ</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
