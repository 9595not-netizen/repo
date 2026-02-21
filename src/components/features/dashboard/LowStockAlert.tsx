import { useState } from 'react';
import { Bell, BellOff, X } from 'lucide-react';
import { useLowStockAlert } from '@/hooks/useLowStockAlert';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export function LowStockAlert() {
  const { lowStockItems, loading, alertEnabled, toggleAlert, count } = useLowStockAlert();
  const [open, setOpen] = useState(false);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn(
            "relative h-9 w-9 text-muted-foreground hover:text-foreground",
            count > 0 && alertEnabled && "text-orange-600 hover:text-orange-700"
          )}
          aria-label="การแจ้งเตือนสต๊อกต่ำ"
        >
          {alertEnabled ? (
            <Bell className="h-5 w-5" />
          ) : (
            <BellOff className="h-5 w-5" />
          )}
          {count > 0 && alertEnabled && (
            <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-orange-500 animate-pulse" aria-hidden />
          )}
          {count > 0 && alertEnabled && (
            <span className="absolute -top-1 -right-1 h-5 w-5 rounded-full bg-orange-500/20 flex items-center justify-center">
              <span className="text-[10px] font-bold text-orange-700 dark:text-orange-300">{count}</span>
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 md:w-96 p-0" align="end">
        <div className="p-4 border-b">
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-semibold text-base flex items-center gap-2">
              {alertEnabled ? (
                <>
                  <Bell className="h-5 w-5 text-orange-600" />
                  <span>แจ้งเตือนสต๊อกต่ำ</span>
                </>
              ) : (
                <>
                  <BellOff className="h-5 w-5 text-muted-foreground" />
                  <span>แจ้งเตือนปิดอยู่</span>
                </>
              )}
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className="h-6 w-6"
              onClick={() => setOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="flex items-center justify-between">
            <Label htmlFor="alert-toggle" className="text-sm cursor-pointer">
              เปิด/ปิดแจ้งเตือน
            </Label>
            <Switch
              id="alert-toggle"
              checked={alertEnabled}
              onCheckedChange={toggleAlert}
            />
          </div>
        </div>

        <div className="max-h-[400px] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : !alertEnabled ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <BellOff className="h-12 w-12 mx-auto mb-3 opacity-50" />
              <p>แจ้งเตือนสต๊อกต่ำปิดอยู่</p>
              <p className="text-xs mt-1">เปิดสวิตช์ด้านบนเพื่อรับการแจ้งเตือน</p>
            </div>
          ) : count === 0 ? (
            <div className="p-8 text-center text-sm text-muted-foreground">
              <Bell className="h-12 w-12 mx-auto mb-3 text-green-500 opacity-50" />
              <p className="font-semibold text-green-600 dark:text-green-400">ไม่มีสินค้าเหลือต่ำ</p>
              <p className="text-xs mt-1">ทุกรุ่นมีสต๊อกเพียงพอ</p>
            </div>
          ) : (
            <div className="p-2">
              <div className="mb-2 px-2 py-1 bg-orange-50 dark:bg-orange-950/30 rounded text-xs text-orange-700 dark:text-orange-300">
                พบ <strong>{count}</strong> รุ่นที่เหลือต่ำกว่า 2 ตัว
              </div>
              <div className="space-y-2">
                {lowStockItems.map((item, index) => (
                  <div
                    key={`${item.model_variant_id}-${item.color_name}-${item.type}-${index}`}
                    className="p-3 rounded-lg border border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-950/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-foreground truncate">
                          {item.brand_name} {item.model_name}
                        </div>
                        <div className="text-xs text-muted-foreground mt-1">
                          {item.storage} • {item.color_name} • {item.type}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {item.device_type_name}
                        </div>
                      </div>
                      <div className="flex-shrink-0 text-right">
                        <div className={cn(
                          "text-lg font-bold",
                          item.stock_count === 0 ? "text-red-600 dark:text-red-400" : "text-orange-600 dark:text-orange-400"
                        )}>
                          {item.stock_count}
                        </div>
                        <div className="text-[10px] text-muted-foreground">
                          / {item.threshold}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}
