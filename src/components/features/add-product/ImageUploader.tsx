import { useState, useRef } from 'react';
import { X, Upload } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ImageUploaderProps {
  maxImages?: number;
  onImagesChange: (images: File[]) => void;
  className?: string;
}

/**
 * Phase 6: Image Uploader
 * - Grid 2x2
 * - Max 4 images
 * - Preview + ลบได้
 */
export function ImageUploader({ maxImages = 4, onImagesChange, className }: ImageUploaderProps) {
  const [images, setImages] = useState<File[]>([]);
  const [previews, setPreviews] = useState<string[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resizeImage = (file: File, maxWidth: number = 1200, maxHeight: number = 1200): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          const canvas = document.createElement('canvas');
          let width = img.width;
          let height = img.height;

          if (width > height) {
            if (width > maxWidth) {
              height = (height * maxWidth) / width;
              width = maxWidth;
            }
          } else {
            if (height > maxHeight) {
              width = (width * maxHeight) / height;
              height = maxHeight;
            }
          }

          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          ctx?.drawImage(img, 0, 0, width, height);

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const resizedFile = new File([blob], file.name, { type: file.type });
                resolve(resizedFile);
              } else {
                resolve(file);
              }
            },
            file.type,
            0.9
          );
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    const remaining = maxImages - images.length;
    const toAdd = files.slice(0, remaining);
    
    if (toAdd.length === 0) return;
    
    // Resize images ก่อนแสดง preview (ขนาดพอดีสำหรับ upload)
    const resizedFiles = await Promise.all(toAdd.map((f) => resizeImage(f, 1200, 1200)));
    const newImages = [...images, ...resizedFiles];
    const newPreviews = resizedFiles.map((f) => URL.createObjectURL(f));
    
    setImages(newImages);
    setPreviews([...previews, ...newPreviews]);
    onImagesChange(newImages);
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (index: number) => {
    const newImages = images.filter((_, i) => i !== index);
    const newPreviews = previews.filter((_, i) => i !== index);
    URL.revokeObjectURL(previews[index]);
    setImages(newImages);
    setPreviews(newPreviews);
    onImagesChange(newImages);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <div className="image-upload-grid">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className="image-upload-slot"
            onClick={() => {
              if (i < images.length) {
                // Click on existing image to remove
                removeImage(i);
              } else if (i === images.length) {
                // Click on empty slot to add
                fileInputRef.current?.click();
              }
            }}
          >
            {previews[i] ? (
              <div className="relative w-full h-full group">
                <img src={previews[i]} alt={`Upload ${i + 1}`} className="w-full h-full object-cover rounded-lg" loading="lazy" decoding="async" />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    removeImage(i);
                  }}
                  className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            ) : (
              <>
                <span className="upload-icon">📷</span>
                <span className="upload-label">เพิ่มรูป</span>
              </>
            )}
          </div>
        ))}
      </div>
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={handleFileSelect}
      />
    </div>
  );
}
