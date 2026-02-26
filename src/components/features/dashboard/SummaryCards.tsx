import { useNavigate } from 'react-router-dom';
import { Package, ShoppingCart, TrendingUp, Star } from 'lucide-react';
import { useRealtimeStats } from '@/hooks/useRealtimeStats';
import { CompactSummaryCard } from './CompactSummaryCard';

/**
 * Dashboard Summary Cards - Compact Version
 * Responsive: 2x2 บนมือถือ, 4 columns บน desktop
 */
export function SummaryCards() {
  const navigate = useNavigate();
  const { stats, loading } = useRealtimeStats();

  const cards = [
    {
      title: 'สต๊อกทั้งหมด',
      value: stats.stock,
      unit: 'เครื่อง',
      icon: Package,
      iconColor: 'text-blue-600 dark:text-blue-400',
      bgColor: 'bg-blue-50 dark:bg-blue-950/20',
      onClick: () => navigate('/stock'),
    },
    {
      title: 'ยอดขายวันนี้',
      value: `฿${stats.salesToday.toLocaleString('th-TH')}`,
      unit: '',
      icon: ShoppingCart,
      iconColor: 'text-pink-600 dark:text-pink-400',
      bgColor: 'bg-pink-50 dark:bg-pink-950/20',
      onClick: () => navigate('/sell'),
    },
    {
      title: 'กำไรวันนี้',
      value: `฿${stats.profitToday.toLocaleString('th-TH')}`,
      unit: '',
      icon: TrendingUp,
      iconColor: 'text-green-600 dark:text-green-400',
      bgColor: 'bg-green-50 dark:bg-green-950/20',
      onClick: () => navigate('/reports'),
    },
    {
      title: 'รุ่นขายดี',
      value: stats.topModels.length > 0 ? stats.topModels[0].model_name : '—',
      unit: stats.topModels.length > 0 ? `${stats.topModels[0].storage}` : '',
      icon: Star,
      iconColor: 'text-yellow-600 dark:text-yellow-400',
      bgColor: 'bg-yellow-50 dark:bg-yellow-950/20',
      onClick: () => navigate('/reports?tab=best-sellers'),
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
      {cards.map((card, index) => (
        <CompactSummaryCard
          key={index}
          title={card.title}
          value={card.value}
          unit={card.unit}
          icon={card.icon}
          iconColor={card.iconColor}
          bgColor={card.bgColor}
          loading={loading}
          onClick={card.onClick}
        />
      ))}
    </div>
  );
}
