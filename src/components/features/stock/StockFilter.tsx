import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, X } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';
import { GoldCard } from '@/components/ui/gold-card';

interface StockFilterProps {
    onFilterChange: (filters: { search: string; brand: string; status: string }) => void;
}

export function StockFilter({ onFilterChange }: StockFilterProps) {
    const [search, setSearch] = useState('');
    const [brand, setBrand] = useState('all');
    const [status, setStatus] = useState('all');
    const [brands, setBrands] = useState<Database['public']['Tables']['brands']['Row'][]>([]);

    useEffect(() => {
        fetchBrands();
    }, []);

    useEffect(() => {
        const timeout = setTimeout(() => {
            onFilterChange({ search, brand, status });
        }, 300);
        return () => clearTimeout(timeout);
    }, [search, brand, status, onFilterChange]);

    const fetchBrands = async () => {
        try {
            const { data } = await supabase.from('brands').select('*').eq('status', 'active');
            if (data) setBrands(data);
        } catch (error) {
            console.error('Error fetching brands:', error);
        }
    };

    const clearFilters = useCallback(() => {
        setSearch('');
        setBrand('all');
        setStatus('all');
    }, []);

    const hasFilters = search !== '' || brand !== 'all' || status !== 'all';

    return (
        <GoldCard className="p-4 md:p-5 border-gold/20 bg-background/50 backdrop-blur-sm">
            <div className="space-y-4 md:space-y-0 md:flex md:items-end md:gap-4">
                {/* Search Input */}
                <div className="flex-1 space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        ค้นหา
                    </label>
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="ค้นหา Shop Code, IMEI..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-9 bg-background/50 border-gold/30 focus:border-gold transition-colors"
                        />
                    </div>
                </div>

                {/* Brand Filter */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        ยี่ห้อ
                    </label>
                    <Select value={brand || 'all'} onValueChange={setBrand}>
                        <SelectTrigger className="w-full md:w-[160px] bg-background/50 border-gold/30 focus:border-gold">
                            <SelectValue placeholder="ทุกยี่ห้อ" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-gold/30">
                            <SelectItem value="all">ทุกยี่ห้อ</SelectItem>
                            {brands.map((b) => (
                                <SelectItem key={b.id} value={b.name}>
                                    {b.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>

                {/* Status Filter */}
                <div className="space-y-2">
                    <label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                        สถานะ
                    </label>
                    <Select value={status || 'all'} onValueChange={setStatus}>
                        <SelectTrigger className="w-full md:w-[160px] bg-background/50 border-gold/30 focus:border-gold">
                            <SelectValue placeholder="ทุกสถานะ" />
                        </SelectTrigger>
                        <SelectContent className="bg-card border-gold/30">
                            <SelectItem value="all">ทุกสถานะ</SelectItem>
                            <SelectItem value="in_stock">พร้อมขาย</SelectItem>
                            <SelectItem value="reserved">จอง</SelectItem>
                            <SelectItem value="sold">ขายแล้ว</SelectItem>
                            <SelectItem value="service">ส่งซ่อม</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Clear Button */}
                {hasFilters && (
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={clearFilters}
                        className="w-full md:w-auto border-destructive/50 text-destructive hover:bg-destructive/10"
                    >
                        <X className="h-4 w-4 mr-1" />
                        ล้างตัวกรอง
                    </Button>
                )}
            </div>
        </GoldCard>
    );
}
