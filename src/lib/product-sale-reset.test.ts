import { describe, it, expect } from 'vitest';
import {
  buildSaleResetUpdate,
  buildFreshProductSaleFields,
  buildSaleFieldsClearOnly,
  hasActiveSaleRecord,
} from './product-sale-reset';

describe('product-sale-reset', () => {
  it('buildSaleResetUpdate clears sale fields and resets selling price to cost', () => {
    expect(buildSaleResetUpdate(15000)).toEqual({
      status: 'in_stock',
      sold_to: null,
      sold_at: null,
      sold_by: null,
      payment_method: null,
      contract_number: null,
      selling_price: 15000,
    });
  });

  it('buildFreshProductSaleFields has no sale data', () => {
    expect(buildFreshProductSaleFields()).toEqual({
      sold_to: null,
      sold_at: null,
      sold_by: null,
      payment_method: null,
      contract_number: null,
    });
  });

  it('hasActiveSaleRecord is true only for sold status', () => {
    expect(hasActiveSaleRecord('sold')).toBe(true);
    expect(hasActiveSaleRecord('in_stock')).toBe(false);
    expect(hasActiveSaleRecord('reserved')).toBe(false);
  });

  it('buildSaleFieldsClearOnly clears sale fields without changing price', () => {
    const cleared = buildSaleFieldsClearOnly();
    expect(cleared.sold_to).toBeNull();
    expect(cleared.selling_price).toBeUndefined();
  });
});
