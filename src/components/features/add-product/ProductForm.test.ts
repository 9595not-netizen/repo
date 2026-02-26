import { describe, it, expect } from 'vitest';
import { productSchema } from './productFormSchema';

describe('productSchema', () => {
  const baseValid = {
    shop_code: 'C001',
    imei: '123456789012345',
    brand_id: 'brand-1',
    model_id: 'model-1',
    model_variant_id: 'variant-1',
    color_id: 'color-1',
    device_type_id: 'device-1',
    type: 'มือ 1' as const,
    cost_price: 10000,
    received_date: '2025-01-01',
    source: 'ซื้อจากลูกค้า',
    created_by_user_id: 'user-1',
    has_box: false,
    has_charger: false,
    has_cable: false,
    has_headphone: false,
  };

  it('accepts a minimal valid new product', () => {
    const result = productSchema.safeParse(baseValid);
    expect(result.success).toBe(true);
  });

  it('rejects invalid IMEI', () => {
    const result = productSchema.safeParse({
      ...baseValid,
      imei: '12345',
    });
    expect(result.success).toBe(false);
  });

  it('rejects negative cost_price', () => {
    const result = productSchema.safeParse({
      ...baseValid,
      cost_price: 0,
    });
    expect(result.success).toBe(false);
  });

  it('rejects battery_health outside 0-100', () => {
    const result = productSchema.safeParse({
      ...baseValid,
      type: 'มือ 2' as const,
      battery_health: 150,
      condition_grade: 'A',
    });
    expect(result.success).toBe(false);
  });

  it('accepts used product with valid battery_health and condition_grade', () => {
    const result = productSchema.safeParse({
      ...baseValid,
      type: 'มือ 2' as const,
      battery_health: 85,
      condition_grade: 'B',
    });
    expect(result.success).toBe(true);
  });
});

