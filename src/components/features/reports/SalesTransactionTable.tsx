import { useState, useEffect, useCallback } from 'react';
import { GoldCard } from '@/components/ui/gold-card';
import { supabase } from '@/lib/supabase';
import { Loader2, Eye, Pencil, Trash2 } from 'lucide-react';
import { SalesListFilter } from './SalesListFilter';
import { SaleViewModal } from './SaleViewModal';
import { SaleEditModal } from './SaleEditModal';
import { useToast } from '@/hooks/use-toast';
import { getErrorMessage } from '@/lib/error-handler';
import { Button } from '@/components/ui/button';
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from '@/components/ui/alert-dialog';

interface SalesTransactionTableProps {
    dateRange: { start: Date; end: Date };
    onDateRangeChange?: (range: { start: Date; end: Date }) => void;
}

interface SalesTransaction {
    id: string;
    sold_at: string;
    shop_code: string;
    brand_name: string;
    model_name: string;
    imei: string;
    sold_to: string;
    sold_by_name: string;
    created_by_name: string;
    cost_price: number;
    selling_price: number;
    profit: number;
    payment_method: string;
}

function matchesSearch(t: SalesTransaction, q: string): boolean {
    if (!q.trim()) return true;
    const k = q.trim().toLowerCase();
    const fields = [
        t.shop_code,
        t.brand_name,
        t.model_name,
        t.imei,
        t.sold_to,
        t.sold_by_name,
        t.created_by_name,
        t.payment_method,
    ].filter(Boolean).map((s) => String(s).toLowerCase());
    return fields.some((f) => f.includes(k));
}

const PER_PAGE = 20;

export function SalesTransactionTable({ dateRange, onDateRangeChange }: SalesTransactionTableProps) {
    const [transactions, setTransactions] = useState<SalesTransaction[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [appliedSearch, setAppliedSearch] = useState('');
    const [page, setPage] = useState(1);
    const [viewRecord, setViewRecord] = useState<SalesTransaction | null>(null);
    const [editRecord, setEditRecord] = useState<SalesTransaction | null>(null);
    const [deleteRecord, setDeleteRecord] = useState<SalesTransaction | null>(null);
    const [deleting, setDeleting] = useState(false);
    const { toast } = useToast();

    const fetchTransactions = useCallback(async () => {
        setLoading(true);
        try {
            const startIso = new Date(dateRange.start);
            startIso.setHours(0, 0, 0, 0);
            const endIso = new Date(dateRange.end);
            endIso.setHours(23, 59, 59, 999);

            const { data: sales, error } = await supabase
                .from('product_details')
                .select('id, sold_at, shop_code, brand_name, model_name, imei, sold_to, sold_by_name, created_by_name, cost_price, selling_price, payment_method')
                .eq('status', 'sold')
                .gte('sold_at', startIso.toISOString())
                .lte('sold_at', endIso.toISOString())
                .order('sold_at', { ascending: false });

            if (error) throw error;

            if (sales) {
                const formatted: SalesTransaction[] = sales.map((sale: Record<string, unknown>) => ({
                    id: String(sale.id),
                    sold_at: String(sale.sold_at ?? ''),
                    shop_code: String(sale.shop_code ?? ''),
                    brand_name: String(sale.brand_name ?? ''),
                    model_name: String(sale.model_name ?? ''),
                    imei: String(sale.imei ?? ''),
                    sold_to: String(sale.sold_to ?? '-'),
                    sold_by_name: String(sale.sold_by_name ?? '-'),
                    created_by_name: String(sale.created_by_name ?? '-'),
                    cost_price: Number(sale.cost_price ?? 0),
                    selling_price: Number(sale.selling_price ?? 0),
                    profit: Number(sale.selling_price ?? 0) - Number(sale.cost_price ?? 0),
                    payment_method: String(sale.payment_method ?? 'ไม่ระบุ'),
                }));
                setTransactions(formatted);
            } else {
                setTransactions([]);
            }
        } catch (error) {
            console.error('Error fetching transactions:', error);
            setTransactions([]);
        } finally {
            setLoading(false);
        }
    }, [dateRange.start, dateRange.end]);

    useEffect(() => {
        fetchTransactions();
    }, [fetchTransactions]);

    const filteredTransactions = appliedSearch.trim()
        ? transactions.filter((t) => matchesSearch(t, appliedSearch))
        : transactions;

    const totalPages = Math.max(1, Math.ceil(filteredTransactions.length / PER_PAGE));
    const paginatedTransactions = filteredTransactions.slice((page - 1) * PER_PAGE, page * PER_PAGE);

    useEffect(() => {
        setPage(1);
    }, [appliedSearch, filteredTransactions.length]);

    const handleDateRangeChange = (range: { start: Date; end: Date }) => {
        onDateRangeChange?.(range);
    };

    const handleRevert = async () => {
        if (!deleteRecord) return;
        setDeleting(true);
        try {
            const user = (await supabase.auth.getUser()).data.user;
            if (!user) throw new Error('ไม่สามารถระบุตัวตนผู้ใช้');

            // พยายามใช้ RPC หากมี (ให้ revert เป็นธุรกรรมเดียว)
            let usedRpc = false;
            try {
                const { error: rpcError } = await supabase.rpc('revert_sale', {
                    p_product_id: deleteRecord.id,
                    p_actor: user.id,
                });

                if (rpcError) {
                    const code = (rpcError as { code?: string }).code;
                    const msg = (rpcError as { message?: string }).message ?? '';
                    const isRpcMissing =
                        code === 'PGRST202' ||
                        /404|not found|function/i.test(msg);

                    if (!isRpcMissing) {
                        throw rpcError;
                    }
                } else {
                    usedRpc = true;
                }
            } catch (e) {
                if (e && typeof e === 'object' && 'code' in e) {
                    const code = (e as { code?: string }).code;
                    const msg = (e as { message?: string }).message ?? '';
                    const isRpcMissing =
                        code === 'PGRST202' ||
                        /404|not found|function/i.test(msg);
                    if (!isRpcMissing) {
                        throw e;
                    }
                } else {
                    throw e;
                }
            }

            if (!usedRpc) {
                const { error } = await supabase
                    .from('products')
                    .update({
                        status: 'in_stock',
                        sold_to: null,
                        sold_at: null,
                        sold_by: null,
                        selling_price: deleteRecord.cost_price,
                        payment_method: null,
                        contract_number: null,
                    })
                    .eq('id', deleteRecord.id);

                if (error) throw error;

                const { error: logError } = await supabase.from('inventory_logs').insert({
                    product_id: deleteRecord.id,
                    action_type: 'return',
                    action_by: user.id,
                    action_note: 'ยกเลิกการขาย (Admin revert) - สินค้ากลับคลังเพื่อนำกลับมาขายได้',
                });

                if (logError) {
                    console.error('Inventory log error (revert sale):', logError);
                }
            }

            toast({ title: 'ยกเลิกการขายสำเร็จ สินค้ากลับคลังแล้ว' });
            setDeleteRecord(null);
            fetchTransactions();
        } catch (e: unknown) {
            console.error(e);
            toast({ title: 'เกิดข้อผิดพลาด', description: getErrorMessage(e), variant: 'destructive' });
        } finally {
            setDeleting(false);
        }
    };

    const refreshAfterEdit = () => {
        fetchTransactions();
        setEditRecord(null);
    };

    return (
        <GoldCard className="overflow-hidden">
            <div className="p-6 border-b border-gold/20 space-y-4">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                    รายการขายทั้งหมด ({filteredTransactions.length}
                    {appliedSearch.trim() ? ` / ${transactions.length}` : ''}) • แสดง 20 รายการ/หน้า
                </h3>

                <SalesListFilter
                    searchQuery={searchQuery}
                    onSearchQueryChange={setSearchQuery}
                    dateRange={dateRange}
                    onDateRangeChange={handleDateRangeChange}
                    onSearch={() => setAppliedSearch(searchQuery)}
                    onRefresh={fetchTransactions}
                    loading={loading}
                />
            </div>

            {loading ? (
                <div className="flex flex-col items-center justify-center py-12 gap-2">
                    <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">กำลังโหลดข้อมูล...</span>
                </div>
            ) : filteredTransactions.length === 0 ? (
                <div className="p-8 text-center text-muted-foreground">
                    {transactions.length === 0
                        ? 'ไม่มีข้อมูลการขายในช่วงเวลานี้'
                        : 'ไม่พบผลลัพธ์จากการค้นหา'}
                </div>
            ) : (
                <>
                    {/* Tablet / Desktop: แสดงเป็นตาราง */}
                    <div className="hidden md:block overflow-x-auto">
                        <table className="w-full text-sm text-left">
                            <thead className="bg-secondary/10 text-muted-foreground font-semibold border-b border-gold/20">
                                <tr>
                                    <th className="p-4">วันที่</th>
                                    <th className="p-4">รหัสร้าน</th>
                                    <th className="p-4">สินค้า</th>
                                    <th className="p-4">IMEI</th>
                                    <th className="p-4">ผู้ขาย</th>
                                    <th className="p-4">ผู้ซื้อ</th>
                                    <th className="p-4">ผู้รับเข้า</th>
                                    <th className="p-4">วิธีชำระเงิน</th>
                                    <th className="p-4 text-right">ราคาทุน</th>
                                    <th className="p-4 text-right">ราคาขาย</th>
                                    <th className="p-4 text-right">กำไร</th>
                                    <th className="p-4 text-center">ดำเนินการ</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-border/50">
                                {paginatedTransactions.map((transaction) => {
                                    const profitColor =
                                        transaction.profit > 0
                                            ? 'text-green-600'
                                            : transaction.profit < 0
                                                ? 'text-red-600'
                                                : 'text-muted-foreground';
                                    const dateStr = new Date(transaction.sold_at).toLocaleDateString('th-TH', {
                                        year: 'numeric',
                                        month: '2-digit',
                                        day: '2-digit',
                                    });
                                    const timeStr = new Date(transaction.sold_at).toLocaleTimeString('th-TH', {
                                        hour: '2-digit',
                                        minute: '2-digit',
                                    });

                                    return (
                                        <tr key={transaction.id} className="hover:bg-muted/30 transition-colors">
                                            <td className="p-4 whitespace-nowrap text-xs">
                                                <div className="font-semibold">{dateStr}</div>
                                                <div className="text-muted-foreground">{timeStr}</div>
                                            </td>
                                            <td className="p-4 font-mono font-semibold text-primary">
                                                {transaction.shop_code}
                                            </td>
                                            <td className="p-4">
                                                <div className="font-semibold">
                                                    {transaction.brand_name} {transaction.model_name}
                                                </div>
                                            </td>
                                            <td className="p-4 font-mono text-xs text-muted-foreground break-all">
                                                {transaction.imei}
                                            </td>
                                            <td className="p-4 text-primary">{transaction.sold_by_name}</td>
                                            <td className="p-4">{transaction.sold_to}</td>
                                            <td className="p-4 text-muted-foreground text-xs">
                                                {transaction.created_by_name}
                                            </td>
                                            <td className="p-4 text-xs">
                                                <span className="px-2 py-1 rounded-full bg-blue-100/50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
                                                    {transaction.payment_method}
                                                </span>
                                            </td>
                                            <td className="p-4 text-right font-semibold">
                                                ฿
                                                {transaction.cost_price.toLocaleString('th-TH', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </td>
                                            <td className="p-4 text-right font-semibold text-primary">
                                                {transaction.payment_method === 'ผ่อนชำระ' && (transaction.selling_price === 0 || transaction.selling_price == null)
                                                    ? '—'
                                                    : `฿${transaction.selling_price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                            </td>
                                            <td className={`p-4 text-right font-bold ${profitColor}`}>
                                                {transaction.payment_method === 'ผ่อนชำระ' && (transaction.selling_price === 0 || transaction.selling_price == null)
                                                    ? '—'
                                                    : `฿${transaction.profit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                            </td>
                                            <td className="p-4">
                                                <div className="flex items-center justify-center gap-1 flex-wrap">
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-primary"
                                                        title="ดูรายละเอียด"
                                                        onClick={() => setViewRecord(transaction)}
                                                    >
                                                        <Eye className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                                        title="แก้ไข"
                                                        onClick={() => setEditRecord(transaction)}
                                                    >
                                                        <Pencil className="h-4 w-4" />
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="icon"
                                                        className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                                        title="ยกเลิกการขาย (สินค้ากลับคลัง)"
                                                        onClick={() => setDeleteRecord(transaction)}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                    </Button>
                                                </div>
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>

                    {/* Mobile: แสดงเป็น Card-based UI 1 ลูกค้า = 1 การ์ด */}
                    <div className="md:hidden p-4 space-y-3">
                        {paginatedTransactions.map((transaction) => {
                            const profitColor =
                                transaction.profit > 0
                                    ? 'text-green-600'
                                    : transaction.profit < 0
                                        ? 'text-red-600'
                                        : 'text-muted-foreground';
                            const dateStr = new Date(transaction.sold_at).toLocaleDateString('th-TH', {
                                year: 'numeric',
                                month: '2-digit',
                                day: '2-digit',
                            });
                            const timeStr = new Date(transaction.sold_at).toLocaleTimeString('th-TH', {
                                hour: '2-digit',
                                minute: '2-digit',
                            });

                            return (
                                <div
                                    key={transaction.id}
                                    className="rounded-xl border border-gold/30 bg-card/90 shadow-sm p-3 flex flex-col gap-2"
                                >
                                    <div className="flex items-start justify-between gap-2">
                                        <div className="text-xs">
                                            <div className="text-muted-foreground text-[11px]">วันที่ขาย</div>
                                            <div className="font-semibold">{dateStr}</div>
                                            <div className="text-muted-foreground text-[11px]">{timeStr}</div>
                                        </div>
                                        <div className="flex flex-col items-end gap-1 text-xs">
                                            <div className="text-muted-foreground text-[11px]">รหัสร้าน</div>
                                            <div className="font-mono font-semibold text-primary">
                                                {transaction.shop_code}
                                            </div>
                                            <span className="mt-1 px-2 py-0.5 rounded-full bg-blue-100/60 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 text-[10px]">
                                                {transaction.payment_method}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="text-xs">
                                        <div className="text-muted-foreground text-[11px]">สินค้า</div>
                                        <div className="font-semibold text-sm">
                                            {transaction.brand_name} {transaction.model_name}
                                        </div>
                                        <div className="text-[11px] text-muted-foreground break-all">
                                            IMEI: {transaction.imei}
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-[11px] mt-1">
                                        <div>
                                            <div className="text-muted-foreground">ผู้ขาย</div>
                                            <div>{transaction.sold_by_name}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">ผู้ซื้อ</div>
                                            <div>{transaction.sold_to}</div>
                                        </div>
                                        <div>
                                            <div className="text-muted-foreground">ผู้รับเข้า</div>
                                            <div className="truncate">{transaction.created_by_name}</div>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-2 text-xs mt-1">
                                        <div className="space-y-0.5">
                                            <div className="text-muted-foreground text-[11px]">ราคาทุน</div>
                                            <div>
                                                ฿
                                                {transaction.cost_price.toLocaleString('th-TH', {
                                                    minimumFractionDigits: 2,
                                                    maximumFractionDigits: 2,
                                                })}
                                            </div>
                                        </div>
                                        <div className="space-y-0.5 text-right">
                                            <div className="text-muted-foreground text-[11px]">ราคาขาย</div>
                                            <div className="font-semibold text-primary">
                                                {transaction.payment_method === 'ผ่อนชำระ' && (transaction.selling_price === 0 || transaction.selling_price == null)
                                                    ? '—'
                                                    : `฿${transaction.selling_price.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                            </div>
                                        </div>
                                        <div className="col-span-2 flex items-center justify-between pt-1">
                                            <span className="text-muted-foreground text-[11px]">กำไร</span>
                                            <span
                                                className={`font-bold text-sm ${profitColor}`}
                                            >
                                                {transaction.payment_method === 'ผ่อนชำระ' && (transaction.selling_price === 0 || transaction.selling_price == null)
                                                    ? '—'
                                                    : `฿${transaction.profit.toLocaleString('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-end gap-1 pt-2">
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-primary"
                                            title="ดูรายละเอียด"
                                            onClick={() => setViewRecord(transaction)}
                                        >
                                            <Eye className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-blue-600"
                                            title="แก้ไข"
                                            onClick={() => setEditRecord(transaction)}
                                        >
                                            <Pencil className="h-4 w-4" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-muted-foreground hover:text-red-600"
                                            title="ยกเลิกการขาย (สินค้ากลับคลัง)"
                                            onClick={() => setDeleteRecord(transaction)}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </>
            )}

            {filteredTransactions.length > 0 && totalPages > 1 && (
                <div className="p-4 border-t border-gold/20 flex items-center justify-between">
                    <span className="text-sm text-muted-foreground">
                        หน้า {page} / {totalPages} • แสดง {(page - 1) * PER_PAGE + 1}–{Math.min(page * PER_PAGE, filteredTransactions.length)} จาก {filteredTransactions.length} รายการ
                    </span>
                    <div className="flex gap-2">
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page <= 1}
                            onClick={() => setPage((p) => Math.max(1, p - 1))}
                        >
                            ก่อนหน้า
                        </Button>
                        <Button
                            variant="outline"
                            size="sm"
                            disabled={page >= totalPages}
                            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                        >
                            ถัดไป
                        </Button>
                    </div>
                </div>
            )}

            {filteredTransactions.length > 0 && (
                <div className="p-4 bg-secondary/5 border-t border-gold/20">
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-sm font-semibold">
                        <div>
                            <p className="text-muted-foreground text-xs">รวมทั้งหมด</p>
                            <p className="text-primary text-lg">{filteredTransactions.length} รายการ</p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">ยอดขายรวม</p>
                            <p className="text-primary text-lg">
                                ฿
                                {filteredTransactions
                                    .reduce((sum, t) => sum + t.selling_price, 0)
                                    .toLocaleString('th-TH')}
                            </p>
                        </div>
                        <div>
                            <p className="text-muted-foreground text-xs">กำไรรวม</p>
                            <p
                                className={`text-lg ${
                                    filteredTransactions.reduce((sum, t) => sum + t.profit, 0) > 0
                                        ? 'text-green-600'
                                        : 'text-red-600'
                                }`}
                            >
                                ฿
                                {filteredTransactions
                                    .reduce((sum, t) => sum + t.profit, 0)
                                    .toLocaleString('th-TH')}
                            </p>
                        </div>
                    </div>
                </div>
            )}

            <SaleViewModal
                open={!!viewRecord}
                onOpenChange={(open) => !open && setViewRecord(null)}
                record={viewRecord}
            />
            <SaleEditModal
                open={!!editRecord}
                onOpenChange={(open) => !open && setEditRecord(null)}
                record={editRecord}
                onSuccess={refreshAfterEdit}
            />
            <AlertDialog open={!!deleteRecord} onOpenChange={(open) => !open && setDeleteRecord(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยกเลิกการขาย</AlertDialogTitle>
                        <AlertDialogDescription>
                            การดำเนินการนี้จะนำสินค้ากลับคลัง (status = in_stock) เพื่อให้สามารถนำมาขายใหม่ได้ในอนาคต
                            {deleteRecord && (
                                <span className="block mt-2 font-medium text-foreground">
                                    {deleteRecord.brand_name} {deleteRecord.model_name} • {deleteRecord.shop_code}
                                </span>
                            )}
                            ยืนยันหรือไม่?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleRevert(); }}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            ยืนยันยกเลิกการขาย
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </GoldCard>
    );
}
