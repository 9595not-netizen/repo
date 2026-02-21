import { useState } from 'react';
import { GoldCard } from '@/components/ui/gold-card';
import { Bell, BellOff, AlertTriangle, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { useLowStockAlert } from '@/hooks/useLowStockAlert';
import { cn } from '@/lib/utils';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function LowStockAlertsTab() {
  const { lowStockItems, loading, alertEnabled, toggleAlert, toggleItemAlert, isItemEnabled, count } = useLowStockAlert();

  return (
    <div className="space-y-4">
      {/* Global Toggle */}
      <GoldCard>
        <div className="relative mb-4">
          {/* หัวข้ออยู่ตรงกลาง */}
          <div className="flex items-center justify-center gap-3 mb-4">
            {alertEnabled ? (
              <Bell className="h-5 w-5 text-orange-600" />
            ) : (
              <BellOff className="h-5 w-5 text-muted-foreground" />
            )}
            <h2 className="gold-card-title mb-0">
              แจ้งเตือนสต๊อกต่ำ
            </h2>
          </div>
          {/* สวิตช์อยู่ขวา */}
          <div className="flex items-center justify-end gap-2">
            <Label htmlFor="global-alert-toggle" className="text-sm cursor-pointer">
              {alertEnabled ? 'เปิดทั้งหมด' : 'ปิดทั้งหมด'}
            </Label>
            <Switch
              id="global-alert-toggle"
              checked={alertEnabled}
              onCheckedChange={toggleAlert}
            />
          </div>
        </div>

        {!alertEnabled && (
          <div className="text-center py-8 text-muted-foreground">
            <BellOff className="h-16 w-16 mx-auto mb-4 opacity-50" />
            <p className="font-semibold mb-1">แจ้งเตือนสต๊อกต่ำปิดอยู่</p>
            <p className="text-sm">เปิดสวิตช์ด้านบนเพื่อรับการแจ้งเตือนเมื่อสินค้าเหลือต่ำกว่า 2 ตัว</p>
          </div>
        )}

        {alertEnabled && (
          <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-800 rounded-lg">
            <p className="text-sm text-blue-700 dark:text-blue-300">
              💡 <strong>คำแนะนำ:</strong> เลือกเปิดแจ้งเตือนเฉพาะรุ่นที่ขายดีเท่านั้น เพื่อหลีกเลี่ยงการแจ้งเตือนที่รำคาญ
            </p>
          </div>
        )}
      </GoldCard>

      {/* Low Stock Items List */}
      {alertEnabled && (
        <GoldCard>
          <div className="mb-4">
            {/* หัวข้ออยู่ตรงกลาง */}
            <h3 className="text-lg font-semibold mb-2 flex items-center justify-center gap-2">
              <AlertTriangle className="h-5 w-5 text-orange-600" />
              รายการสินค้าเหลือต่ำ
            </h3>
            {count > 0 && (
              <p className="text-sm text-muted-foreground text-center">
                พบ <strong className="text-orange-600">{count}</strong> รุ่นที่เปิดแจ้งเตือนและเหลือต่ำกว่า 2 ตัว
              </p>
            )}
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : lowStockItems.length === 0 ? (
            <div className="text-center py-12">
              <Bell className="h-16 w-16 mx-auto mb-4 text-green-500 opacity-50" />
              <p className="font-semibold text-green-600 dark:text-green-400 mb-1">ไม่มีสินค้าเหลือต่ำ</p>
              <p className="text-sm text-muted-foreground">ทุกรุ่นมีสต๊อกเพียงพอ (≥ 2 ตัว)</p>
            </div>
          ) : (
            <div className="space-y-3">
              {lowStockItems.map((item, index) => {
                const enabled = isItemEnabled(item);
                return (
                  <div
                    key={`${item.model_variant_id}-${item.color_name}-${item.type}-${index}`}
                    className={cn(
                      "p-4 rounded-lg border transition-colors",
                      enabled
                        ? item.stock_count === 0
                          ? "border-red-200 dark:border-red-800 bg-red-50 dark:bg-red-950/20"
                          : "border-orange-200 dark:border-orange-800 bg-orange-50/50 dark:bg-orange-950/20"
                        : "border-gray-200 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-900/20 opacity-60"
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
                      <div className="flex items-center gap-4">
                        <div className="text-right">
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
                          {item.stock_count === 0 && enabled && (
                            <div className="mt-2 text-[10px] font-semibold text-red-600 dark:text-red-400 bg-red-100 dark:bg-red-900/30 px-2 py-1 rounded">
                              สต๊อกหมด!
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <Switch
                            checked={enabled}
                            onCheckedChange={(checked) => toggleItemAlert(item, checked)}
                          />
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {enabled ? 'เปิด' : 'ปิด'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {lowStockItems.length > 0 && (
            <div className="mt-6 pt-4 border-t">
              <Link to="/stock">
                <Button className="w-full btn-orange-solid">
                  ไปที่คลังสินค้า
                </Button>
              </Link>
            </div>
          )}
        </GoldCard>
      )}
    </div>
  );
}
