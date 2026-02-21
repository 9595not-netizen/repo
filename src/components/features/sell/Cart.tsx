import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Trash2 } from 'lucide-react';
import { Database } from '@/types/database.types';

type ProductDetail = Database['public']['Views']['product_details']['Row'];

interface CartProps {
    items: ProductDetail[];
    onRemove: (index: number) => void;
    onClear: () => void;
}

export function Cart({ items, onRemove, onClear }: CartProps) {
    const total = items.reduce((acc, item) => acc + item.selling_price, 0);

    if (items.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground p-8 border-2 border-dashed border-gray-200 rounded-xl">
                <p>ยังไม่มีสินค้าในตะกร้า</p>
                <p className="text-sm">สแกนสินค้าเพื่อเริ่มขาย</p>
            </div>
        );
    }

    return (
        <div className="flex flex-col h-full">
            <div className="flex justify-between items-center mb-2 px-1">
                <h3 className="font-semibold">{items.length} รายการ</h3>
                <Button variant="ghost" size="sm" onClick={onClear} className="text-destructive hover:text-destructive">
                    ล้างตะกร้า
                </Button>
            </div>
            <ScrollArea className="flex-1 pr-4 -mr-4">
                <div className="space-y-3">
                    {items.map((item, index) => (
                        <div key={`${item.id}-${index}`} className="flex justify-between items-start p-3 bg-secondary/10 rounded-lg border border-secondary/20">
                            <div className="flex-1">
                                <h4 className="font-semibold">{item.brand_name} {item.model_name}</h4>
                                <p className="text-sm text-muted-foreground">{item.storage} • {item.color_name}</p>
                                <p className="text-xs text-muted-foreground font-mono mt-1">{item.imei}</p>
                            </div>
                            <div className="flex flex-col items-end gap-2">
                                <span className="font-bold text-lg">฿{item.selling_price.toLocaleString()}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => onRemove(index)}
                                >
                                    <Trash2 className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            </ScrollArea>

            <div className="mt-4 pt-4 border-t border-gold/30">
                <div className="flex justify-between items-center mb-4">
                    <span className="text-lg font-medium">ยอดรวมสุทธิ</span>
                    <span className="text-3xl font-bold text-primary">฿{total.toLocaleString()}</span>
                </div>
            </div>
        </div>
    );
}
