import { useState } from 'react';
import { Skeleton } from '@/components/ui/skeleton';
import { ImageIcon } from 'lucide-react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  className?: string;
  containerClassName?: string;
}

/** รูปภาพพร้อม skeleton loading และ error fallback */
export function OptimizedImage({ src, alt, className = '', containerClassName = '' }: OptimizedImageProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  return (
    <div className={`relative overflow-hidden bg-muted ${containerClassName}`}>
      {!loaded && !error && <Skeleton className="absolute inset-0 rounded-none" />}
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground bg-secondary/10">
          <ImageIcon className="w-12 h-12" />
        </div>
      ) : (
        <img
          src={src}
          alt={alt}
          loading="lazy"
          decoding="async"
          className={`w-full h-full object-cover transition-opacity duration-200 ${loaded ? 'opacity-100' : 'opacity-0'} ${className}`}
          onLoad={() => setLoaded(true)}
          onError={() => setError(true)}
        />
      )}
    </div>
  );
}
