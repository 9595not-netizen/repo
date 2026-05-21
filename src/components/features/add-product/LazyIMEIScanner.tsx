import { lazy, Suspense, useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent } from '@/components/ui/dialog';

const IMEIScannerLazy = lazy(() =>
  import('./IMEIScanner').then((m) => ({ default: m.IMEIScanner }))
);

export interface LazyIMEIScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (imei: string) => void;
}

function ScannerLoadingFallback({ onClose }: { onClose: () => void }) {
  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="flex min-h-[200px] items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" aria-hidden />
        <span className="sr-only">กำลังโหลดสแกนเนอร์</span>
      </DialogContent>
    </Dialog>
  );
}

/**
 * โหลด html5-qrcode เฉพาะเมื่อผู้ใช้เปิดสแกน (ลดขนาด bundle หน้าขาย/สต็อก)
 */
export function LazyIMEIScanner({ open, onClose, onScan }: LazyIMEIScannerProps) {
  const [chunkRequested, setChunkRequested] = useState(false);

  useEffect(() => {
    if (open) setChunkRequested(true);
  }, [open]);

  if (!chunkRequested || !open) return null;

  return (
    <Suspense fallback={<ScannerLoadingFallback onClose={onClose} />}>
      <IMEIScannerLazy open={open} onClose={onClose} onScan={onScan} />
    </Suspense>
  );
}
