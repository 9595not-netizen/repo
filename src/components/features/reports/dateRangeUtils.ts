/** ส่งค่า YYYY-MM-DD ตาม local (ไม่ให้ toISOString เลื่อนวันจาก timezone) */
export function toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

export function getDateRange(option: string): { start: Date; end: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    switch (option) {
        case 'today':
            return { start: today, end: today };
        case 'this_week': {
            const start = new Date(today);
            start.setDate(today.getDate() - today.getDay());
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return { start, end };
        }
        case 'this_month': {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return { start, end };
        }
        case 'this_quarter': {
            const quarter = Math.floor(today.getMonth() / 3);
            const start = new Date(today.getFullYear(), quarter * 3, 1);
            const end = new Date(today.getFullYear(), quarter * 3 + 3, 0);
            return { start, end };
        }
        case 'this_year': {
            const start = new Date(today.getFullYear(), 0, 1);
            const end = new Date(today.getFullYear(), 11, 31);
            return { start, end };
        }
        default:
            return { start: today, end: today };
    }
}
