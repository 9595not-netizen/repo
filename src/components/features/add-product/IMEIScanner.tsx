import { useEffect, useRef, useState } from 'react';
import { Html5Qrcode } from 'html5-qrcode';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X } from 'lucide-react';
import { useIsMobile } from '@/hooks/use-mobile';

interface IMEIScannerProps {
  open: boolean;
  onClose: () => void;
  onScan: (imei: string) => void;
}

const IMEI_REGEX = /^\d{15}$/;

/**
 * สแกน QR/บาร์โค้ด IMEI
 * - มือถือ: ใช้กล้องหลัง (facingMode: environment)
 * - แสดงกรอบ guide
 * - พิมพ์ IMEI ด้วยมือได้ที่ฟอร์ม
 */
export function IMEIScanner({ open, onClose, onScan }: IMEIScannerProps) {
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const qrRef = useRef<Html5Qrcode | null>(null);
  const containerId = 'imei-qr-reader';
  const isMobile = useIsMobile();

  useEffect(() => {
    if (!open) {
      const stopCamera = async () => {
        const instance = qrRef.current;
        if (instance?.isScanning) {
          try {
            await instance.stop();
          } catch (_) {
            // ignore stop camera errors
          }
        }
        qrRef.current = null;
        setScanning(false);
        setError(null);
      };
      stopCamera();
      return;
    }
    setError(null);
  }, [open]);

  const startScan = async () => {
    setError(null);
    
    // Camera API ต้องการ Secure Context (HTTPS หรือ localhost/127.0.0.1 เท่านั้น)
    // หมายเหตุ: http://192.168.x.x ไม่ถือว่าเป็น Secure Context
    if (typeof window === 'undefined') {
      setError('เบราว์เซอร์ไม่รองรับการใช้งานกล้อง');
      return;
    }
    
    if (!window.isSecureContext) {
      setError(
        'กล้องสแกน IMEI ต้องการ HTTPS หรือ localhost เท่านั้น\n\n' +
        '📱 การใช้บนมือถือ/แท็บเล็ต:\n' +
        '• เข้าจาก IP (เช่น 192.168.x.x) จะใช้กล้องไม่ได้ - ต้องใช้ HTTPS\n' +
        '• แนะนำ: ใช้ ngrok (ngrok http 8080) แล้วเข้า URL HTTPS ที่ได้\n' +
        '• หรือเปิด dev server ด้วย HTTPS: VITE_HTTPS=true npm run dev\n\n' +
        '💻 การใช้บนเครื่องเดียวกัน:\n' +
        '• ใช้ http://localhost:8080 ได้\n' +
        '• หรือเปิด chrome://flags/#unsafely-treat-insecure-origin-as-secure ใส่ URL แล้ว Relaunch'
      );
      return;
    }
    
    // ตรวจสอบ mediaDevices (รองรับ Chrome, Edge, Firefox, Safari)
    if (!navigator.mediaDevices?.getUserMedia) {
      setError('เบราว์เซอร์ไม่รองรับการใช้งานกล้อง กรุณาใช้ Chrome / Edge / Firefox / Safari');
      return;
    }

    setScanning(true);

    // รอให้ DOM render และกล้องพร้อม (Chrome Mobile ต้องการ delay นานขึ้น)
    const delayMs = isMobile ? 600 : 300;
    await new Promise((resolve) => setTimeout(resolve, delayMs));

    const el = document.getElementById(containerId);
    if (!el) {
      setError('ไม่พบพื้นที่สแกน');
      setScanning(false);
      return;
    }

    el.innerHTML = '';

    try {
      const html5QrCode = new Html5Qrcode(containerId);
      qrRef.current = html5QrCode;

      const qrboxSize = isMobile ? 220 : 240;
      const config = {
        fps: 10,
        qrbox: { width: qrboxSize, height: qrboxSize },
        aspectRatio: 1,
      };

      const onSuccess = (decodedText: string) => {
        const trimmed = decodedText.trim().replace(/\D/g, '');
        if (IMEI_REGEX.test(trimmed)) {
          html5QrCode.stop().then(() => {
            qrRef.current = null;
            setScanning(false);
            onScan(trimmed);
            onClose();
          });
        } else if (trimmed.length >= 15) {
          const imei = trimmed.slice(0, 15);
          if (IMEI_REGEX.test(imei)) {
            html5QrCode.stop().then(() => {
              qrRef.current = null;
              setScanning(false);
              onScan(imei);
              onClose();
            });
          }
        }
      };

      const tryStart = async (cameraIdOrConfig: string | MediaTrackConstraints) => {
        await html5QrCode.start(cameraIdOrConfig, config, onSuccess, () => {});
      };

      // ลำดับการลอง: 1) getCameras แล้วเลือกกล้องหลัง 2) facingMode ไม่ใช้ exact 3) กล้องหน้า
      const strategies: (() => Promise<void>)[] = [
        async () => {
          const cameras = await Html5Qrcode.getCameras();
          if (cameras?.length) {
            const back =
              cameras.find(
                (c) =>
                  /back|rear|environment|หลัง/i.test(c.label)
              ) ?? cameras[cameras.length - 1];
            await tryStart(back.id);
          } else {
            throw new Error('ไม่พบกล้อง');
          }
        },
        async () => {
          await tryStart({ facingMode: 'environment' });
        },
        async () => {
          await tryStart({ facingMode: 'user' });
        },
      ];

      let lastErr: unknown = null;
      for (const strat of strategies) {
        try {
          await strat();
          return;
        } catch (e) {
          lastErr = e;
        }
      }
      throw lastErr;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'ไม่สามารถเปิดกล้องได้';
      const hint = msg.includes('NotAllowedError') || msg.includes('Permission')
        ? ' กรุณาอนุญาตการเข้าถึงกล้องในการตั้งค่าเบราว์เซอร์'
        : msg.includes('NotFoundError')
          ? ' ไม่พบกล้องบนอุปกรณ์'
          : '';
      setError(msg + hint);
      qrRef.current = null;
      setScanning(false);
    }
  };

  const handleClose = async () => {
    const instance = qrRef.current;
    if (instance?.isScanning) {
      try {
        await instance.stop();
      } catch (_) {
        // ignore stop camera errors
      }
    }
    qrRef.current = null;
    setScanning(false);
    setError(null);
    onClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && void handleClose()}>
      <DialogContent className={`${isMobile ? 'max-w-[95vw] max-h-[85vh] m-auto rounded-xl' : 'max-w-lg'} bg-black/95 border-gold/30`}>
        <DialogHeader className={`${isMobile ? 'p-3 z-10 bg-black/80' : 'p-4'}`}>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Camera className="h-5 w-5" />
            สแกน IMEI / QR Code
          </DialogTitle>
        </DialogHeader>
        <div className={`${isMobile ? 'flex flex-col relative' : 'space-y-4 p-4'}`}>
          {!scanning ? (
            <div className={`${isMobile ? 'flex-1 flex flex-col items-center justify-center p-6' : 'space-y-4'}`}>
              <p className={`${isMobile ? 'text-white text-center mb-6' : 'text-sm text-muted-foreground'}`}>
                {isMobile
                  ? 'กดปุ่มด้านล่างเพื่อเปิดกล้องหลังและสแกน IMEI หรือ QR Code'
                  : 'ใช้กล้องสแกนบาร์โค้ดหรือ QR ที่มี IMEI 15 หลัก'}
              </p>
              {error && (
                <div className={`${isMobile ? 'text-red-400' : 'text-sm text-destructive'} rounded-lg bg-destructive/10 p-3 mb-4 space-y-1`}>
                  <p className="font-medium whitespace-pre-line">{error}</p>
                  <p className="text-xs opacity-90">หรือปิดหน้าต่างนี้แล้วพิมพ์ IMEI 15 หลักด้วยมือที่ช่องกรอกด้านล่าง</p>
                </div>
              )}
              <Button onClick={startScan} className={`${isMobile ? 'w-full h-14 text-lg' : 'w-full'}`} type="button">
                <Camera className="mr-2 h-5 w-5" />
                เปิดกล้องสแกน
              </Button>
              <Button variant="ghost" onClick={handleClose} className={`${isMobile ? 'mt-2 text-white hover:text-white/80' : 'w-full mt-2'}`} type="button">
                <X className="mr-2 h-4 w-4" />
                ปิด
              </Button>
            </div>
          ) : (
            <>
              {/* Container element - render เมื่อ scanning เท่านั้น */}
              <div className={`${isMobile ? 'relative w-full max-w-[280px] mx-auto aspect-square' : 'relative rounded-lg overflow-hidden border border-gold/20'} ${!isMobile ? 'h-[280px]' : ''}`}>
                <div id={containerId} className={`${isMobile ? 'w-full h-full min-h-[220px]' : 'w-full h-[280px]'} relative`} />
                <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
                  <div className={`border-4 border-[#D4AF37] border-dashed rounded-lg ${isMobile ? 'w-[200px] h-[200px]' : 'w-[240px] h-[240px]'}`} />
                </div>
              </div>
              <div className={`${isMobile ? 'bg-black/80 p-3' : 'space-y-2 p-2'}`}>
                <p className={`${isMobile ? 'text-white text-center mb-3' : 'text-sm text-muted-foreground text-center'}`}>
                  วาง IMEI หรือ QR Code ในกรอบ
                </p>
                <Button variant="outline" onClick={handleClose} className={`${isMobile ? 'w-full h-12 text-white border-white/30 hover:bg-white/10' : 'w-full'}`} type="button">
                  <X className="mr-2 h-4 w-4" />
                  ปิดกล้อง
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
