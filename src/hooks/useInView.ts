import { useEffect, useRef, useState } from 'react';

interface UseInViewOptions {
  threshold?: number;
  rootMargin?: string;
  triggerOnce?: boolean;
}

/** Hook สำหรับตรวจจับเมื่อ element เข้า viewport (สำหรับ infinite scroll) */
export function useInView(options: UseInViewOptions = {}) {
  const { threshold = 0, rootMargin = '100px', triggerOnce = false } = options;
  const ref = useRef<HTMLDivElement>(null);
  const [inView, setInView] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        const isIntersecting = entry.isIntersecting;
        setInView((prev) => {
          if (triggerOnce && prev) return prev;
          return isIntersecting;
        });
      },
      { threshold, rootMargin }
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [threshold, rootMargin, triggerOnce]);

  return { ref, inView };
}
