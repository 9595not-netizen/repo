import { describe, it, expect } from 'vitest';
import { isRpcMissingError, soldAtToIso } from './completeSale';

describe('soldAtToIso', () => {
  it('uses local noon for a date-only string', () => {
    const d = new Date(soldAtToIso('2026-05-21'));
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(21);
    expect(d.getHours()).toBe(12);
  });

  it('returns current time when date is empty', () => {
    const before = Date.now();
    const iso = soldAtToIso('');
    const after = Date.now();
    const ts = new Date(iso).getTime();
    expect(ts).toBeGreaterThanOrEqual(before);
    expect(ts).toBeLessThanOrEqual(after);
  });
});

describe('isRpcMissingError', () => {
  it('returns true for PostgREST missing function code', () => {
    expect(isRpcMissingError({ code: 'PGRST202', message: 'not found' })).toBe(true);
  });

  it('returns true when message mentions function not found', () => {
    expect(isRpcMissingError({ message: 'function complete_cart_sale does not exist' })).toBe(
      true
    );
  });

  it('returns false for other errors', () => {
    expect(isRpcMissingError({ code: '23505', message: 'duplicate' })).toBe(false);
    expect(isRpcMissingError(null)).toBe(false);
  });
});
