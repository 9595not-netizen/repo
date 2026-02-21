import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Search, RefreshCw } from 'lucide-react';

function toLocalDateString(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
}

function getDateRange(preset: string): { start: Date; end: Date } {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    switch (preset) {
        case 'today':
            return { start: new Date(today), end: new Date(today) };
        case 'week': {
            const start = new Date(today);
            start.setDate(today.getDate() - today.getDay());
            const end = new Date(start);
            end.setDate(end.getDate() + 6);
            return { start, end };
        }
        case 'month': {
            const start = new Date(today.getFullYear(), today.getMonth(), 1);
            const end = new Date(today.getFullYear(), today.getMonth() + 1, 0);
            return { start, end };
        }
        default:
            return { start: today, end: today };
    }
}

interface SalesListFilterProps {
    searchQuery: string;
    onSearchQueryChange: (v: string) => void;
    dateRange: { start: Date; end: Date };
    onDateRangeChange: (range: { start: Date; end: Date }) => void;
    onSearch: () => void;
    onRefresh: () => void;
    loading?: boolean;
}

export function SalesListFilter({
    searchQuery,
    onSearchQueryChange,
    dateRange,
    onDateRangeChange,
    onSearch,
    onRefresh,
    loading = false,
}: SalesListFilterProps) {
    return (
        <div className="flex flex-col sm:flex-row flex-wrap gap-3 items-stretch sm:items-center">
            {/* ช่องค้นหา */}
            <div className="relative flex-1 min-w-0 sm:min-w-[180px]">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                    placeholder="ค้นหา รหัส, สินค้า, IMEI, ผู้ซื้อ, ผู้ขาย..."
                    value={searchQuery}
                    onChange={(e) => onSearchQueryChange(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && onSearch()}
                    className="pl-9"
                />
            </div>

            {/* กรอง วัน/สัปดาห์/เดือน */}
            <div className="flex gap-2 flex-wrap">
                {[
                    { label: 'วันนี้', value: 'today' },
                    { label: 'สัปดาห์นี้', value: 'week' },
                    { label: 'เดือนนี้', value: 'month' },
                ].map((p) => (
                    <Button
                        key={p.value}
                        variant="outline"
                        size="sm"
                        onClick={() => onDateRangeChange(getDateRange(p.value))}
                        className="text-xs border-gold/30"
                    >
                        {p.label}
                    </Button>
                ))}
            </div>

            {/* ปุ่ม ค้นหา, รีเฟรช */}
            <div className="flex gap-2">
                <Button
                    size="sm"
                    onClick={onSearch}
                    disabled={loading}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                    <Search className="h-4 w-4 mr-2" />
                    ค้นหา
                </Button>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={onRefresh}
                    disabled={loading}
                    className="border-gold/30"
                >
                    <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                    รีเฟรช
                </Button>
            </div>

            <div className="text-xs text-muted-foreground self-center">
                วันที่ {dateRange.start.toLocaleDateString('th-TH')} ถึง {dateRange.end.toLocaleDateString('th-TH')}
            </div>
        </div>
    );
}
