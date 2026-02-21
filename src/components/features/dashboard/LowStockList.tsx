import { useLowStockAlert } from '@/hooks/useLowStockAlert';
import { GoldCard } from '@/components/ui/gold-card';
import { Bell, BellOff, AlertTriangle } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function LowStockList() {
  const { lowStockItems, loading, alertEnabled, toggleAlert, count } = useLowStockAlert();

  return (
    <GoldCard>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          {alertEnabled ? (
            <Bell className="h-5 w-5 text-orange-600" />
          ) : (
            <BellOff className="h-5 w-5 text-muted-foreground" />
          )}
          <h2 className="gold-card-title mb-0">
            แจ้งเตือนสต๊อกต่ำ
          </h2>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="dashboard-alert-toggle" className="text-sm cursor-pointer">
            {alertEnabled ? 'เปิด' : 'ปิด'}
          </Label>
          <Switch
            id="dashboard-alert-toggle"
            checked={alertEnabled}
            onCheckedChange={toggleAlert}
          />
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : !alertEnabled ? (
        <div className="text-center py-12 text-muted-foreground">
          <BellOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
          <p className="font-semibold mb-1">แจ้งเตือนสต๊อกต่ำปิดอยู่</p>
          <p className="text-sm">เปิดสวิตช์ด้านบนเพื่อรับการแจ้งเตือนเมื่อสินค้าเหลือต่ำกว่า 2 ตัว</p>
        </div>
      ) : count === 0 ? (
        <div className="text-center py-12">
          <Bell className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" />
          <p className="font-semibold text-green-600 dark:text-green-400 mb-1">ไม่มีสินค้าเหลือต่ำ</p>
          <p className="text-sm text-muted-foreground">ทุกรุ่นมีสต๊อกเพียงพอ (≥ 2 ตัว)</p>
        </div>
      ) : (
        <>
          <div className="mb-4 p-3 bg-orange-50 dark:bg-orange-950/30 border border-orange-200 dark:border-orange-800 rounded-lg">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              <div>
                <p className="font-semibold text-orange-700 dark:text-orange-300">
                  พบ {count} รุ่นที่เหลือต่ำกว่า 2 ตัว
                </p>
                <p className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                  กรุณาตรวจสอบและเพิ่มสต๊อก
                </p>
              </div>
            </div>
          </div>

          <div className="space-y-3 max-h-[400px] overflow-y-auto">
            {lowStockItems.map((item, index) => (
              <div
                key={`${item.model_variant_id}-${item.color_name}-${item.type}-${index}`}
                className={cn(
                  "p-4 rounded-lg border transition-colors",
                  item.stock_count === 0
                    ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20"
                    : "border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20 hover:bg-orange-100/50 dark:hover:bg-orange-950/30"
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold text-base text-foreground mb-1">
                      {item.brand_name} {item.model_name}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-0.5">
                      <div>
                        <span className="font-medium">ความจุ:</span> {item.storage} •{' '}
                        <span className="font-medium">สี:</span> {item.color_name} •{' '}
                        <span className="font-medium">ประเภท:</span> {item.type}
                      </div>
                      <div>
                        <span className="font-medium">เครื่อง:</span> {item.device_type_name}
                      </div>
                    </div>
                  </div>
                  <div className="flex-shrink-0 text-right">
                    <div className={cn(
                      "text-2xl font-bold mb-1",
                      item.stock_count === 0
                        ? "text-red-600 dark:text-red-400"
                        : "text-orange-600 dark:text-orange-400"
                    )}>
                      {item.stock_count}
                    </div>
                    <div className="text-xs text-muted-foreground">
                      จาก {item.threshold} ตัว
                    </div>
                    {item.stock_count === 0 && (
                      <div className="mt-2 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                        สต๊อกหมด!
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t">
            <Link to="/stock">
              <Button className="w-full btn-orange-solid">
                ไปที่คลังสินค้า
              </Button>
            </Link>
          </div>
        </>
      )}
    </GoldCard>
  );
}
