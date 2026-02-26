import { describe, it, expect } from 'vitest';
import { hasDuplicateShopCode, hasDuplicateImei } from './productDuplicateUtils';

describe('productDuplicateUtils', () => {
    describe('hasDuplicateShopCode', () => {
        const products = [
            { id: '1', shop_code: 'ABC001', imei: '123456789012345', status: 'in_stock' },
            { id: '2', shop_code: 'ABC002', imei: '123456789012346', status: 'reserved' },
            { id: '3', shop_code: 'ABC001', imei: '123456789012347', status: 'sold' },
        ];

        it('returns true when shop_code exists and not excluding', () => {
            expect(hasDuplicateShopCode(products, 'ABC001')).toBe(true);
        });

        it('returns false when shop_code does not exist', () => {
            expect(hasDuplicateShopCode(products, 'XYZ999')).toBe(false);
        });

        it('excludes self when editing (excludeId)', () => {
            expect(hasDuplicateShopCode(products, 'ABC001', '1')).toBe(true); // ABC001 also in id 3
            expect(hasDuplicateShopCode(products, 'ABC001', '3')).toBe(true); // ABC001 also in id 1
            expect(hasDuplicateShopCode(products, 'ABC002', '2')).toBe(false); // only id 2 has ABC002
        });

        it('returns false for empty shop_code', () => {
            expect(hasDuplicateShopCode(products, '')).toBe(false);
            expect(hasDuplicateShopCode(products, '   ')).toBe(false);
        });
    });

    describe('hasDuplicateImei', () => {
        const products = [
            { id: '1', shop_code: 'A', imei: '111111111111111', status: 'in_stock' },
            { id: '2', shop_code: 'B', imei: '222222222222222', status: 'reserved' },
            { id: '3', shop_code: 'C', imei: '111111111111111', status: 'service' },
            { id: '4', shop_code: 'D', imei: '333333333333333', status: 'sold' },
        ];

        it('returns true when IMEI exists in in_stock/reserved/service', () => {
            expect(hasDuplicateImei(products, '111111111111111')).toBe(true);
            expect(hasDuplicateImei(products, '222222222222222')).toBe(true);
        });

        it('returns false when IMEI only in sold', () => {
            expect(hasDuplicateImei(products, '333333333333333')).toBe(false);
        });

        it('excludes self when editing (excludeId)', () => {
            expect(hasDuplicateImei(products, '111111111111111', '1')).toBe(true); // also in id 3 (service)
            expect(hasDuplicateImei(products, '111111111111111', '3')).toBe(true); // also in id 1
            expect(hasDuplicateImei(products, '222222222222222', '2')).toBe(false);
        });

        it('returns false for empty IMEI', () => {
            expect(hasDuplicateImei(products, '')).toBe(false);
        });
    });
});
