import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getDateRange, toLocalDateString } from './dateRangeUtils';

describe('dateRangeUtils', () => {
    describe('toLocalDateString', () => {
        it('returns YYYY-MM-DD format', () => {
            const d = new Date(2025, 0, 15);
            expect(toLocalDateString(d)).toBe('2025-01-15');
        });

        it('pads month and day with zeros', () => {
            expect(toLocalDateString(new Date(2025, 0, 1))).toBe('2025-01-01');
            expect(toLocalDateString(new Date(2025, 8, 9))).toBe('2025-09-09');
        });
    });

    describe('getDateRange', () => {
        beforeEach(() => {
            vi.useFakeTimers();
            vi.setSystemTime(new Date(2025, 1, 24));
        });

        afterEach(() => {
            vi.useRealTimers();
        });

        it('today returns same start and end', () => {
            const range = getDateRange('today');
            expect(range.start.getFullYear()).toBe(2025);
            expect(range.start.getMonth()).toBe(1);
            expect(range.start.getDate()).toBe(24);
            expect(range.end.getTime()).toBe(range.start.getTime());
        });

        it('this_week returns Sunday to Saturday (7 days)', () => {
            const range = getDateRange('this_week');
            expect(range.start.getDay()).toBe(0);
            expect(range.start.getDate()).toBe(23);
            const daysDiff = Math.round((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24));
            expect(daysDiff).toBe(6);
        });

        it('this_month returns first to last day', () => {
            const range = getDateRange('this_month');
            expect(range.start.getDate()).toBe(1);
            expect(range.start.getMonth()).toBe(1);
            expect(range.end.getMonth()).toBe(1);
            expect(range.end.getDate()).toBe(28);
        });

        it('this_year returns Jan 1 to Dec 31', () => {
            const range = getDateRange('this_year');
            expect(range.start.getMonth()).toBe(0);
            expect(range.start.getDate()).toBe(1);
            expect(range.end.getMonth()).toBe(11);
            expect(range.end.getDate()).toBe(31);
        });

        it('unknown preset falls back to today', () => {
            const range = getDateRange('unknown');
            expect(range.start.getDate()).toBe(24);
            expect(range.end.getTime()).toBe(range.start.getTime());
        });
    });
});
