import { Link, useLocation } from 'react-router-dom';
import { LayoutDashboard, Package, ShoppingCart, BarChart2, Bell, Settings } from 'lucide-react';
import { cn } from '@/lib/utils';

const navItems = [
  { label: 'Dashboard', labelTh: 'หน้าหลัก', icon: LayoutDashboard, href: '/', color: '#A855F7' },
  { label: 'Stock', labelTh: 'สต๊อก', icon: Package, href: '/stock', color: '#3B82F6' },
  { label: 'Sell', labelTh: 'ขาย', icon: ShoppingCart, href: '/sell', color: '#10B981' },
  { label: 'Reports', labelTh: 'รายงาน', icon: BarChart2, href: '/reports', color: '#F97316' },
  { label: 'LowStock', labelTh: 'สต๊อกต่ำ', icon: Bell, href: '/low-stock', color: '#EAB308' },
  { label: 'Settings', labelTh: 'ตั้งค่า', icon: Settings, href: '/settings', color: '#EC4899' },
];

export function BottomNav() {
  const location = useLocation();
  const path = location.pathname;

  return (
    <nav
      className={cn(
        'fixed bottom-0 left-0 right-0 z-50',
        'bg-background/80 dark:bg-background/70 backdrop-blur-lg',
        'border-t border-[#D4AF37] border-t-[1.5px]',
        'font-sans'
      )}
      style={{ height: '64px' }}
    >
      <div className="h-full w-full px-2 flex items-center justify-around">
        {navItems.map((item) => {
          const isActive =
            item.href === '/' ? path === '/' : path.startsWith(item.href);
          const Icon = item.icon;

          return (
            <Link
              key={item.label}
              to={item.href}
              className={cn(
                'flex flex-col items-center justify-center flex-1 h-full gap-1 transition-all',
                'hover:opacity-80'
              )}
              aria-current={isActive ? 'page' : undefined}
            >
              <div
                className={cn(
                  'flex items-center justify-center p-2 rounded-lg transition-all',
                  isActive && 'bg-opacity-10'
                )}
                style={{
                  backgroundColor: isActive ? `${item.color}20` : 'transparent',
                  color: isActive ? item.color : '#9CA3AF',
                }}
              >
                <Icon className="h-5 w-5 md:h-6 md:w-6" />
              </div>
              {/* Desktop: Icon + Label | Mobile: Icon only */}
              <span
                className="text-[10px] md:text-xs font-medium hidden md:block transition-colors"
                style={{
                  color: isActive ? item.color : '#9CA3AF',
                }}
              >
                {item.labelTh}
              </span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
