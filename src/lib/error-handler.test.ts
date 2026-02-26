import { describe, it, expect } from 'vitest';
import { getErrorMessage } from './error-handler';

describe('getErrorMessage', () => {
  it('returns generic message when error is falsy', () => {
    expect(getErrorMessage(null)).toBe('เกิดข้อผิดพลาด');
    expect(getErrorMessage(undefined)).toBe('เกิดข้อผิดพลาด');
  });

  it('maps PostgrestError duplicate IMEI to friendly message', () => {
    const err = { code: '23505', message: 'duplicate key value violates unique constraint "products_imei_key"' };
    expect(getErrorMessage(err)).toBe('IMEI นี้มีในระบบแล้ว');
  });

  it('maps PostgrestError duplicate shop_code to friendly message', () => {
    const err = { code: '23505', message: 'duplicate key value violates unique constraint "products_shop_code_key"' };
    expect(getErrorMessage(err)).toBe('รหัสสินค้านี้มีในระบบแล้ว');
  });

  it('maps PostgrestError 23503 FK to friendly message for brand/model/etc', () => {
    const err = { code: '23503', message: 'violates foreign key constraint "products_model_id_fkey"' };
    expect(getErrorMessage(err)).toBe('ไม่สามารถดำเนินการได้ เนื่องจากมีสินค้าใช้งานอยู่ กรุณาลบหรือแก้ไขสินค้าก่อน');
  });

  it('maps PostgrestError 23503 FK to generic message for other tables', () => {
    const err = { code: '23503', message: 'violates foreign key constraint "other_table_fkey"' };
    expect(getErrorMessage(err)).toBe('ข้อมูลอ้างอิงไม่ถูกต้อง หรือมีการใช้งานอยู่ในระบบ');
  });

  it('falls back to PostgrestError.message when code is unhandled', () => {
    const err = { code: '99999', message: 'some database error' };
    expect(getErrorMessage(err)).toBe('some database error');
  });

  it('returns error.message for standard Error', () => {
    const err = new Error('standard error');
    expect(getErrorMessage(err)).toBe('standard error');
  });

  it('returns unknown-error message for non-object', () => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect(getErrorMessage('oops' as any)).toBe('เกิดข้อผิดพลาดที่ไม่ทราบสาเหตุ');
  });
});

