import { describe, it, expect } from 'vitest';
import { saleFormSchema } from './saleFormSchema';

describe('saleFormSchema', () => {
  it('accepts valid data', () => {
    const result = saleFormSchema.safeParse({
      payment_method: 'เงินสด',
      selling_price: 15000,
      sold_to: 'นาย ก',
      contract_number: '',
      sold_at: '2025-12-31',
      sold_by: 'user-id-1',
    });
    expect(result.success).toBe(true);
  });

  it('rejects empty customer name', () => {
    const result = saleFormSchema.safeParse({
      payment_method: 'เงินสด',
      selling_price: 15000,
      sold_to: '   ',
      contract_number: '',
      sold_at: '2025-12-31',
      sold_by: 'user-id-1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects invalid date format', () => {
    const result = saleFormSchema.safeParse({
      payment_method: 'เงินสด',
      selling_price: 15000,
      sold_to: 'นาย ก',
      contract_number: '',
      sold_at: '31/12/2025',
      sold_by: 'user-id-1',
    });
    expect(result.success).toBe(false);
  });

  it('rejects price <= 0 for cash', () => {
    const result = saleFormSchema.safeParse({
      payment_method: 'เงินสด',
      selling_price: 0,
      sold_to: 'นาย ข',
      contract_number: '',
      sold_at: '2025-12-31',
      sold_by: 'user-id-1',
    });
    expect(result.success).toBe(false);
  });

  it('accepts selling_price 0 for ผ่อนชำระ', () => {
    const result = saleFormSchema.safeParse({
      payment_method: 'ผ่อนชำระ',
      selling_price: 0,
      sold_to: 'นาย ข',
      contract_number: 'SKY-001',
      sold_at: '2025-12-31',
      sold_by: 'user-id-1',
    });
    expect(result.success).toBe(true);
  });
});

