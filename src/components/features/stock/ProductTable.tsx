import { GoldCard } from '@/components/ui/gold-card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Eye, Pencil, Trash2, ShoppingCart } from 'lucide-react';
import type { ProductDetailRow } from '@/hooks/useProducts';

const statusConfig: Record<string, { label: string; className: string }> = {
    in_stock: { label: 'พร้อมขาย', className: 'bg-green-500' },
    reserved: { label: 'จอง', className: 'bg-yellow-500' },
    sold: { label: 'ขายแล้ว', className: 'bg-gray-500' },
    service: { label: 'ส่งซ่อม', className: 'bg-red-500' },
};

interface ProductTableProps {
    products: ProductDetailRow[];
    onView: (product: ProductDetailRow) => void;
    onEdit?: (product: ProductDetailRow) => void;
    onDelete?: (product: ProductDetailRow) => void;
    onSell?: (product: ProductDetailRow) => void;
    isAdmin?: boolean;
}

export function ProductTable({ products, onView, onEdit, onDelete, onSell, isAdmin }: ProductTableProps) {
    return (
        <GoldCard className="overflow-hidden p-0">
            <div className="overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-secondary/10 text-muted-foreground font-semibold border-b border-gold/20">
                        <tr>
                            <th className="p-4">รหัสร้าน</th>
                            <th className="p-4">สินค้า</th>
                            <th className="p-4">IMEI</th>
                            <th className="p-4">สถานะ</th>
                            <th className="p-4">ประเภท</th>
                            <th className="p-4 text-right">ราคาทุน</th>
                            <th className="p-4 text-right">ราคาขาย</th>
                            <th className="p-4 text-center">ดำเนินการ</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-border/50">
                        {products.map((product) => {
                            const status = statusConfig[product.status] || { label: product.status, className: 'bg-gray-500' };
                            const canSell = product.status === 'in_stock';
                            return (
                                <tr
                                    key={product.id}
                                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => onView(product)}
                                >
                                    <td className="p-4 font-mono font-semibold text-primary">{product.shop_code}</td>
                                    <td className="p-4">
                                        <div className="font-semibold">{product.brand_name} {product.model_name}</div>
                                        <div className="text-xs text-muted-foreground">{product.storage} • {product.color_name}</div>
                                    </td>
                                    <td className="p-4 font-mono text-xs text-muted-foreground">{product.imei}</td>
                                    <td className="p-4">
                                        <Badge className={`${status.className} text-white border-none text-xs`}>
                                            {status.label}
                                        </Badge>
                                    </td>
                                    <td className="p-4">
                                        <span className={`text-xs font-medium px-2 py-1 rounded-md ${
                                            product.type === 'มือ 1'
                                                ? 'bg-blue-500/10 text-blue-600 border border-blue-500/20'
                                                : 'bg-orange-500/10 text-orange-600 border border-orange-500/20'
                                        }`}>
                                            {product.type}
                                        </span>
                                    </td>
                                    <td className="p-4 text-right">฿{Number(product.cost_price).toLocaleString()}</td>
                                    <td className="p-4 text-right font-bold text-primary">฿{Number(product.selling_price).toLocaleString()}</td>
                                    <td className="p-4" onClick={(e) => e.stopPropagation()}>
                                        <div className="flex items-center justify-center gap-1">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                title="ดูรายละเอียด"
                                                onClick={() => onView(product)}
                                            >
                                                <Eye className="h-4 w-4" />
                                            </Button>
                                            {canSell && onSell && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-blue-600 hover:bg-blue-50"
                                                    title="ขาย"
                                                    onClick={() => onSell(product)}
                                                >
                                                    <ShoppingCart className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {onEdit && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-yellow-600 hover:bg-yellow-50"
                                                    title="แก้ไข"
                                                    onClick={() => onEdit(product)}
                                                >
                                                    <Pencil className="h-4 w-4" />
                                                </Button>
                                            )}
                                            {onDelete && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="h-8 w-8 text-red-600 hover:bg-red-50"
                                                    title="ลบ"
                                                    onClick={() => onDelete(product)}
                                                >
                                                    <Trash2 className="h-4 w-4" />
                                                </Button>
                                            )}
                                        </div>
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            </div>
        </GoldCard>
    );
}
