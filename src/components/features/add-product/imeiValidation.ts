/** รองรับ IMEI มือถือ (ตัวเลข) และ Serial Number เช่น iPad (ตัวอักษร + ตัวเลข) */
export const IMEI_SERIAL_MAX_LENGTH = 64;

/** ตัวอักษรภาษาอังกฤษและตัวเลขเท่านั้น (ไม่บังคับ 15 หลัก) */
export const IMEI_SERIAL_PATTERN = /^[A-Za-z0-9]+$/;

export function normalizeImeiSerial(value: string): string {
  return value.trim();
}

export function isValidImeiSerial(value: string): boolean {
  const normalized = normalizeImeiSerial(value);
  if (!normalized || normalized.length > IMEI_SERIAL_MAX_LENGTH) return false;
  return IMEI_SERIAL_PATTERN.test(normalized);
}

/** แปลงข้อความจากสแกน QR/บาร์โค้ดเป็นหมายเลขเครื่องที่ใช้ได้ */
export function parseScannedImeiSerial(decodedText: string): string | null {
  const trimmed = decodedText.trim();
  const withoutSpaces = trimmed.replace(/\s/g, '');
  if (isValidImeiSerial(withoutSpaces)) return withoutSpaces;

  // มือถือ: บาร์โค้ดอาจมีตัวอักษรปน — ดึงเฉพาะตัวเลข 15 หลัก
  const digitsOnly = trimmed.replace(/\D/g, '');
  if (/^\d{15}$/.test(digitsOnly)) return digitsOnly;

  return null;
}
