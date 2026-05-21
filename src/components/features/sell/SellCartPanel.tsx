import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { GoldCard } from '@/components/ui/gold-card';
import { Trash2 } from 'lucide-react';
import type { SellCartLine } from './sellCartTypes';

interface SellCartPanelProps {
  items: SellCartLine[];
  paymentMethod: 'เงินสด' | 'ผ่อนชำระ';
  onRemove: (productId: string) => void;
  onClear: () => void;
  onUpdatePrice: (productId: string, price: number) => void;
}

export function SellCartPanel({
  items,
  paymentMethod,
  onRemove,
  onClear,
  onUpdatePrice,
}: SellCartPanelProps) {
  const total = items.reduce((acc, line) => acc + line.selling_price, 0);
  const isCash = paymentMethod === 'เงินสด';

  if (items.length === 0) {
    return (
      <GoldCard className="p-6 border-dashed">
        <p className="text-center text-muted-foreground text-sm">
          ยังไม่มีรายการ — ค้นหาสินค้าแล้วกด &quot;เพิ่มลงรายการขาย&quot;
        </p>
      </GoldCard>
    );
  }

  return (
    <GoldCard className="p-4">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
          รายการขาย ({items.length})
        </h3>
        <Button
          variant="ghost"
          size="sm"
          onClick={onClear}
          className="text-destructive hover:text-destructive h-8"
        >
          ล้างทั้งหมด
        </Button>
      </div>
      <ScrollArea className="max-h-64 pr-2">
        <div className="space-y-2">
          {items.map((line, index) => (
            <div
              key={line.product.id}
              className="flex gap-2 p-3 rounded-lg border border-gold/20 bg-secondary/5"
            >
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-sm truncate">
                  {index + 1}. {line.product.brand_name} {line.product.model_name}
                </p>
                <p className="text-xs text-muted-foreground">
                  {line.product.shop_code} • {line.product.storage}
                </p>
                <p className="text-xs font-mono text-muted-foreground mt-0.5">
                  {line.product.imei}
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 shrink-0">
                {isCash ? (
                  <Input
                    type="number"
                    className="w-24 h-8 text-right text-sm"
                    value={line.selling_price || ''}
                    onChange={(e) =>
                      onUpdatePrice(line.product.id, Number(e.target.value) || 0)
                    }
                    min={0}
                  />
                ) : (
                  <span className="text-xs text-muted-foreground">ตัดสต๊อก</span>
                )}
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-7 w-7 text-muted-foreground hover:text-destructive"
                  onClick={() => onRemove(line.product.id)}
                  type="button"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>
      {isCash && (
        <div className="flex justify-between items-center mt-4 pt-3 border-t border-gold/30">
          <span className="font-medium">ยอดรวม</span>
          <span className="text-2xl font-bold text-primary">
            ฿{total.toLocaleString('th-TH')}
          </span>
        </div>
      )}
    </GoldCard>
  );
}
