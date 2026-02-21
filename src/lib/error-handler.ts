import { PostgrestError } from '@supabase/supabase-js';

/**
 * แปลง error เป็นข้อความภาษาไทยสำหรับแสดงให้ผู้ใช้
 * @alias handleSupabaseError - ชื่อทางเลือกตาม convention
 */
export function getErrorMessage(error: unknown): string {
  if (!error) return 'เกิดข้อผิดพลาด';

  // PostgrestError
  if (typeof error === 'object' && error !== null && 'code' in error) {
    const pgError = error as PostgrestError;

    if (pgError.code === '23505') {
      if (pgError.message.includes('imei')) {
        return 'IMEI นี้มีในระบบแล้ว';
      }
      if (pgError.message.includes('shop_code')) {
        return 'รหัสสินค้านี้มีในระบบแล้ว';
      }
      return 'ข้อมูลซ้ำ';
    }

    if (pgError.code === '23503') {
      return 'ข้อมูลอ้างอิงไม่ถูกต้อง';
    }

    if (pgError.code === '42501') {
      return 'คุณไม่มีสิทธิ์ในการทำรายการนี้';
    }

    if (pgError.code === 'PGRST116') {
      return 'ไม่พบข้อมูล';
    }

    return pgError.message || 'เกิดข้อผิดพลาดจากฐานข้อมูล';
  }

  // Standard Error
  if (error instanceof Error) {
    return error.message;
  }

  return 'เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ';
}

export function logError(error: unknown, context?: string) {
  if (import.meta.env.DEV) {
    console.error(`[Error${context ? ` - ${context}` : ''}]:`, error);
  }
  // TODO: Send to error tracking in production (Sentry, etc.)
}

/** Alias สำหรับ getErrorMessage - ใช้กับ Supabase errors */
export const handleSupabaseError = getErrorMessage;
