import { vi } from 'vitest';

// jsdom ไม่มี scrollIntoView; Radix Select ใช้ฟังก์ชันนี้
if (typeof Element !== 'undefined' && !Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = vi.fn();
}
