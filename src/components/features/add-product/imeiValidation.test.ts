import { describe, it, expect } from 'vitest';
import { isValidImeiSerial, parseScannedImeiSerial } from './imeiValidation';

describe('imeiValidation', () => {
  it('accepts 15-digit phone IMEI', () => {
    expect(isValidImeiSerial('123456789012345')).toBe(true);
  });

  it('accepts iPad-style alphanumeric serial', () => {
    expect(isValidImeiSerial('F9FCH3ABC12')).toBe(true);
  });

  it('rejects characters other than letters and digits', () => {
    expect(isValidImeiSerial('ABC-123')).toBe(false);
  });

  it('parseScannedImeiSerial keeps alphanumeric serial from QR', () => {
    expect(parseScannedImeiSerial('F9FCH3ABC12')).toBe('F9FCH3ABC12');
  });

  it('parseScannedImeiSerial extracts 15 digits from mixed barcode', () => {
    expect(parseScannedImeiSerial('IMEI: 123456789012345')).toBe('123456789012345');
  });
});
