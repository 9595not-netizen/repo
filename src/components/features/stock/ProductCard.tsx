import { memo } from 'react';
import { GoldCard } from '@/components/ui/gold-card';
import { ProductDetail } from '@/types/common.types';
import { OptimizedImage } from '@/components/ui/OptimizedImage';
import { cn } from '@/lib/utils';

interface ProductCardProps {
    product: ProductDetail;
    onView: () => void;
    onEdit?: (product: ProductDetail) => void;
    onDelete?: (product: ProductDetail) => void;
    onSell?: (product: ProductDetail) => void;
    isAdmin?: boolean;
    compact?: boolean;
}

const statusConfig: Record<string, { label: string; className: string }> = {
    in_stock: { label: 'พร้อมขาย', className: 'bg-green-500' },
    reserved: { label: 'จอง', className: 'bg-yellow-500' },
    sold: { label: 'ขายแล้ว', className: 'bg-gray-500' },
    service: { label: 'ส่งซ่อม', className: 'bg-red-500' },
};

export const ProductCard = memo(function ProductCard({ product, onView, onEdit, onDelete, onSell, compact }: ProductCardProps) {
    const status = statusConfig[product.status] || { label: product.status, className: 'bg-gray-500' };
    const cardImage = product.main_image ?? null;
    const profit = Number(product.selling_price || 0) - Number(product.cost_price || 0);

    return (
        <GoldCard
            className={cn(
                "relative p-0 overflow-hidden cursor-pointer transition-all duration-200 hover:shadow-xl group border-gold/20",
                "hover:scale-[1.02] active:scale-[0.98]"
            )}
            onClick={onView}
        >
            {/* Badges - บนซ้าย */}
            <div className={cn("absolute z-10 flex flex-col gap-1", compact ? "top-1 left-1" : "top-2 left-2")}>
                <span className={cn("px-2 py-1 text-white rounded-full font-medium text-xs", status.className)}>
                    {status.label}
                </span>
                <span className={cn(
                    "px-2 py-1 rounded-full font-medium text-xs",
                    product.type === 'มือ 1' ? "bg-blue-500 text-white" : "bg-orange-500 text-white"
                )}>
                    {product.type}
                </span>
            </div>

            {/* Image + Shop Code */}
            <div className={cn("relative overflow-hidden aspect-[4/3] bg-muted", compact ? "mb-2" : "mb-3")}>
                {cardImage ? (
                    <OptimizedImage
                        src={cardImage}
                        alt={product.model_name}
                        containerClassName="w-full h-full"
                        className="transition-transform duration-300 group-hover:scale-110"
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center text-muted-foreground bg-secondary/10">
                        <span className={compact ? "text-2xl" : "text-4xl"}>📱</span>
                    </div>
                )}

                {/* Shop Code - ล่างซ้ายบนรูป */}
                <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-sm px-2 py-1 rounded-md">
                    <span className="text-sm font-mono text-white font-medium">#{product.shop_code}</span>
                </div>
            </div>

            {/* Content - 2 Columns (ซ้าย | ขวา) */}
            <div className={cn("space-y-1", compact ? "p-2" : "p-3")}>
                {/* แถว 1: Brand | Model */}
                <div className="flex justify-between gap-2">
                    <div className="text-xs text-muted-foreground truncate min-w-0">
                        {product.brand_name}
                    </div>
                    <div className="font-bold text-sm text-foreground truncate text-right shrink-0">
                        {product.model_name}
                    </div>
                </div>
                {/* แถว 2: Storage | Color */}
                <div className="flex justify-between gap-2">
                    <div className="text-xs text-muted-foreground truncate min-w-0">
                        {product.storage}
                    </div>
                    <div className="text-xs text-muted-foreground truncate text-right shrink-0">
                        {product.color_name}
                    </div>
                </div>
                {/* แถว 3: ราคาขาย | กำไร */}
                <div className="flex justify-between items-baseline gap-2 pt-0.5">
                    <div className="text-base font-bold text-blue-600 dark:text-blue-400 truncate min-w-0">
                        ฿{Number(product.selling_price).toLocaleString()}
                    </div>
                    {profit > 0 && (
                        <div className="text-sm text-green-600 dark:text-green-400 shrink-0">
                            +฿{profit.toLocaleString()}
                        </div>
                    )}
                </div>
            </div>

        </GoldCard>
    );
});
