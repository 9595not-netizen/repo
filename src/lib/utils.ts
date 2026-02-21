import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/**
 * ดึง URL รูปแสดงผลของสินค้า
 * - product_images = รูปที่อัปโหลดตอนเพิ่มสินค้า (ใช้ก่อน)
 * - main_image = รูปจาก models (รุ่นสินค้า) ใช้เป็น fallback
 */
export function getProductDisplayImage(product: {
  product_images?: string[] | null;
  main_image?: string | null;
}): string | null {
  const imgs = product.product_images;
  if (imgs && Array.isArray(imgs) && imgs.length > 0 && typeof imgs[0] === 'string') {
    return imgs[0];
  }
  return product.main_image ?? null;
}
