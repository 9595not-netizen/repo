import { useNavigate } from 'react-router-dom';
import { Plus, ShoppingCart, Package, BarChart3 } from 'lucide-react';
import { GoldCard } from '@/components/ui/gold-card';

export function QuickActions() {
    const navigate = useNavigate();

    const actions = [
        {
            title: 'เพิ่มสินค้า',
            description: 'เพิ่มสินค้าใหม่เข้าระบบ',
            icon: Plus,
            color: 'bg-gradient-to-br from-pink-500 to-pink-600 hover:from-pink-600 hover:to-pink-700',
            route: '/stock',
            accentColor: '#EC4899'
        },
        {
            title: 'ขายสินค้า',
            description: 'บันทึกการขายสินค้า',
            icon: ShoppingCart,
            color: 'bg-gradient-to-br from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700',
            route: '/sell',
            accentColor: '#3B82F6'
        },
        {
            title: 'ดูสต๊อก',
            description: 'จัดการสต๊อกสินค้า',
            icon: Package,
            color: 'bg-gradient-to-br from-yellow-500 to-yellow-600 hover:from-yellow-600 hover:to-yellow-700',
            route: '/stock',
            accentColor: '#FBBF24'
        },
        {
            title: 'รายงาน',
            description: 'ดูรายงานและสถิติ',
            icon: BarChart3,
            color: 'bg-gradient-to-br from-green-500 to-green-600 hover:from-green-600 hover:to-green-700',
            route: '/reports',
            accentColor: '#10B981'
        }
    ];

    return (
        <div className="quick-actions-grid">
            {actions.map((action, index) => (
                <button
                    key={index}
                    className={`quick-action-btn ${action.color.includes('pink') ? 'btn-pink' : action.color.includes('blue') ? 'btn-blue' : action.color.includes('yellow') ? 'btn-yellow' : 'btn-green'}`}
                    onClick={() => navigate(action.route)}
                >
                    <span className="btn-icon">
                        <action.icon className="w-8 h-8 md:w-10 md:h-10" />
                    </span>
                    <span className="text-lg md:text-xl font-bold">{action.title}</span>
                    <span className="btn-sub">{action.description}</span>
                </button>
            ))}
        </div>
    );
}
