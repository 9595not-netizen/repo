import { describe, it, expect } from 'vitest';
import { openCombinedReceiptPrintWindow } from './receipt-print';

describe('openCombinedReceiptPrintWindow', () => {
  it('returns null when window.open is unavailable', () => {
    const original = window.open;
    window.open = () => null;

    const result = openCombinedReceiptPrintWindow({
      items: [
        {
          product: {
            id: '1',
            shop_code: 'C001',
            imei: '123456789012345',
            brand_name: 'Apple',
            model_name: 'iPhone 15',
            storage: '128GB',
            color_name: 'ดำ',
          } as never,
          selling_price: 25000,
        },
      ],
      saleData: {
        sold_to: 'ลูกค้าทดสอบ',
        payment_method: 'เงินสด',
        sold_at: '2026-05-21',
      },
    });

    expect(result).toBeNull();
    window.open = original;
  });
});
