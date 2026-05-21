import { Loader2 } from 'lucide-react';

/** แสดงระหว่างโหลดหน้าที่ lazy import */
export function RouteFallback() {
  return (
    <div
      className="flex min-h-[40vh] items-center justify-center text-muted-foreground"
      role="status"
      aria-label="กำลังโหลด"
    >
      <Loader2 className="h-8 w-8 animate-spin" />
    </div>
  );
}
