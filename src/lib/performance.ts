/**
 * Web Vitals performance monitoring
 * เรียกใช้ใน main.tsx - ตรวจจับ LCP, FCP, CLS, FID, TTFB
 */

type MetricCallback = (metric: { name: string; value: number; rating?: string }) => void;

export function initPerformanceMonitoring(onReport?: MetricCallback) {
  if (typeof window === 'undefined') return;

  const report = onReport ?? ((metric) => {
    if (import.meta.DEV) {
      console.log(`[Web Vitals] ${metric.name}:`, metric.value, metric.rating ?? '');
    }
    // TODO: Send to analytics (gtag, etc.)
    // if (import.meta.PROD) {
    //   gtag('event', 'web_vitals', { name: metric.name, value: metric.value });
    // }
  });

  import('web-vitals').then(({ onCLS, onFID, onLCP, onFCP, onTTFB }) => {
    onCLS(report);
    onFID(report);
    onLCP(report);
    onFCP(report);
    onTTFB(report);
  }).catch(() => {
    // web-vitals not installed - skip silently
  });
}
