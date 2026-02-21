import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { useMediaQuery } from '@/hooks/use-media-query';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Edit, Trash2, ShoppingCart, CheckCircle, Loader2 } from 'lucide-react';
import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { Database } from '@/types/database.types';
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

type ProductDetail = Database['public']['Views']['product_details']['Row'];
type InventoryLogRow = Database['public']['Tables']['inventory_logs']['Row'];

interface ProductDetailModalProps {
    product: ProductDetail | null;
    open: boolean;
    onClose: () => void;
    /** เมื่อลบสำเร็จ ให้ parent refetch */
    onDeleted?: () => void;
    /** เมื่อกดแก้ไข: ส่ง productId มา ถ้ามีจะเรียกแทน navigate */
    onEdit?: (productId: string) => void;
    /** Phase 5: แสดงประวัติ inventory_logs */
    showInventoryLogs?: boolean;
}

const statusConfig: Record<string, { label: string; color: string }> = {
    in_stock: { label: 'พร้อมขาย', color: 'bg-green-500' },
    reserved: { label: 'จอง', color: 'bg-yellow-500' },
    sold: { label: 'ขายแล้ว', color: 'bg-gray-500' },
    service: { label: 'ส่งซ่อม', color: 'bg-red-500' },
};

const conditionGradeConfig: Record<string, { label: string; color: string }> = {
    A: { label: 'สภาพดีมาก', color: 'text-green-600 bg-green-50' },
    B: { label: 'สภาพดี', color: 'text-blue-600 bg-blue-50' },
    C: { label: 'สภาพพอใช้', color: 'text-yellow-600 bg-yellow-50' },
    F: { label: 'สภาพรอยเยอะ', color: 'text-red-600 bg-red-50' },
};

const actionTypeLabels: Record<string, string> = {
    add: 'เพิ่มเข้า',
    sell: 'ขาย',
    reserve: 'จอง',
    cancel_reserve: 'ยกเลิกจอง',
    service: 'ส่งซ่อม',
    return: 'คืน',
};

export function ProductDetailModal({ product, open, onClose, onDeleted, onEdit, showInventoryLogs }: ProductDetailModalProps) {
    const isDesktop = useMediaQuery("(min-width: 768px)");
    const navigate = useNavigate();
    const { isAdmin } = useAuth();
    const [deleting, setDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
    const [logs, setLogs] = useState<InventoryLogRow[]>([]);

    useEffect(() => {
        if (!showInventoryLogs || !product?.id || !open) return;
        let cancelled = false;
        (async () => {
            try {
                const { data, error } = await supabase
                    .from('inventory_logs')
                    .select('*')
                    .eq('product_id', product.id)
                    .order('created_at', { ascending: false });
                if (!cancelled) {
                    if (error) {
                        console.error('Error loading inventory logs:', error);
                        setLogs([]);
                    } else {
                        setLogs(data ?? []);
                    }
                }
            } catch (err) {
                if (!cancelled) {
                    console.error('Error loading inventory logs:', err);
                    setLogs([]);
                }
            }
        })();
        return () => { cancelled = true; };
    }, [showInventoryLogs, product?.id, open]);

    if (!product) return null;

    const status = statusConfig[product.status] || { label: product.status, color: 'bg-gray-500' };
    const condition = product.condition_grade ? conditionGradeConfig[product.condition_grade] : null;

    const handleDeleteClick = () => {
        setShowDeleteConfirm(true);
    };

    const handleDeleteConfirm = async () => {
        try {
            setDeleting(true);
            const productId = product.id;

            // ลบข้อมูลที่อ้างอิง product ก่อน (Foreign Key constraint)
            await supabase.from('inventory_logs').delete().eq('product_id', productId);
            await supabase.from('used_product_details').delete().eq('product_id', productId);

            const { error } = await supabase.from('products').delete().eq('id', productId);
            if (error) throw error;
            setShowDeleteConfirm(false);
            onDeleted?.();
            onClose();
        } catch (err) {
            console.error('Error deleting product:', err);
            const msg = (err && typeof err === 'object' && 'message' in err)
                ? String((err as { message?: string }).message)
                : err instanceof Error ? err.message : String(err);
            const isFk = /foreign key|violates foreign key|REFERENCES/i.test(msg);
            alert(
                isFk
                    ? 'ไม่สามารถลบสินค้าได้ เนื่องจากมีประวัติการขายหรือข้อมูลที่เกี่ยวข้องอยู่ในระบบ'
                    : msg ? `เกิดข้อผิดพลาดในการลบสินค้า: ${msg}` : 'เกิดข้อผิดพลาดในการลบสินค้า'
            );
        } finally {
            setDeleting(false);
        }
    };

    const handleSell = () => {
        navigate(`/sell?product_id=${product.id}`);
        onClose();
    };

    const handleEdit = () => {
        if (onEdit) {
            onEdit(product.id);
            onClose();
        } else {
            navigate(`/stock?edit=${product.id}`);
            onClose();
        }
    };

    // รูปบิล/เอกสารที่อัปโหลด (product_images) แสดงครบเมื่อกดดูรายละเอียด
    const productImages = (product.product_images && Array.isArray(product.product_images))
        ? product.product_images.filter((u): u is string => typeof u === 'string')
        : [];
    const hasProductImages = productImages.length > 0;
    const fallbackImage = product.main_image ?? null;

    const Content = () => (
        <div className="space-y-6 py-4">
            {/* Image Gallery - แสดงครบทุกรูป (บิล/เอกสาร) หรือ fallback เป็นรูปรุ่น */}
            <div className="px-4 md:px-0">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                    {hasProductImages ? 'รูปบิล/เอกสาร' : 'รูปตัวอย่าง'}
                </h3>
                {hasProductImages ? (
                    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                        {productImages.map((url, i) => (
                            <div key={i} className="aspect-square bg-muted rounded-xl overflow-hidden border border-gold/20">
                                <img
                                    src={url}
                                    alt={`เอกสาร ${i + 1}`}
                                    loading="lazy"
                                    decoding="async"
                                    className="w-full h-full object-contain"
                                />
                            </div>
                        ))}
                    </div>
                ) : fallbackImage ? (
                    <div className="aspect-video w-full bg-muted rounded-xl overflow-hidden relative flex items-center justify-center border border-gold/20">
                        <img
                            src={fallbackImage}
                            alt={product.model_name}
                            loading="lazy"
                            decoding="async"
                            className="w-full h-full object-contain"
                        />
                    </div>
                ) : (
                    <div className="aspect-video w-full bg-muted rounded-xl flex items-center justify-center text-muted-foreground">
                        ไม่มีรูปภาพ
                    </div>
                )}
            </div>

            <div className="px-4 md:px-0 space-y-6">
                {/* Main Info Section */}
                <div className="space-y-3 pb-4 border-b border-gold/10">
                    <div className="flex items-start justify-between gap-4">
                        <div className="flex-1">
                            <h2 className="text-2xl md:text-3xl font-bold">
                                {product.brand_name} {product.model_name}
                            </h2>
                            <p className="text-muted-foreground text-sm mt-1">
                                {product.storage} • {product.color_name}
                            </p>
                        </div>
                        <Badge className={`${status.color} text-white whitespace-nowrap`}>
                            {status.label}
                        </Badge>
                    </div>

                    {/* Key Info Badges */}
                    <div className="flex flex-wrap gap-2">
                        <Badge variant="outline" className="border-gold/30">
                            {product.shop_code}
                        </Badge>
                        <Badge variant="outline" className="border-gold/30">
                            IMEI: {product.imei}
                        </Badge>
                        <Badge variant="outline" className={`${
                            product.type === 'มือ 1'
                                ? 'border-blue-500/30 text-blue-600 bg-blue-50'
                                : 'border-orange-500/30 text-orange-600 bg-orange-50'
                        }`}>
                            {product.type}
                        </Badge>
                    </div>
                </div>

                {/* Pricing Section */}
                <div className="space-y-3 pb-4 border-b border-gold/10">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        ข้อมูลการเงิน
                    </h3>
                    <div className="grid grid-cols-3 gap-4">
                        <div className="bg-secondary/20 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">ทุน</p>
                            <p className="text-lg font-bold text-foreground">
                                ฿{product.cost_price.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-primary/20 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">ราคาขาย</p>
                            <p className="text-lg font-bold text-primary">
                                ฿{product.selling_price.toLocaleString()}
                            </p>
                        </div>
                        <div className="bg-green-500/20 rounded-lg p-3">
                            <p className="text-xs text-muted-foreground mb-1">กำไร</p>
                            <p className="text-lg font-bold text-green-600">
                                ฿{product.profit.toLocaleString()}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Product Details Section */}
                <div className="space-y-3 pb-4 border-b border-gold/10">
                    <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                        รายละเอียดผลิตภัณฑ์
                    </h3>
                    <div className="grid grid-cols-2 gap-3">
                        {product.device_type_name != null && (
                            <div className="bg-card/30 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground">ประเภทเครื่อง</p>
                                <p className="font-medium text-sm mt-1">{product.device_type_name}</p>
                            </div>
                        )}
                        {product.device_type_code != null && (
                            <div className="bg-card/30 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground">รหัสประเภท</p>
                                <p className="font-medium text-sm mt-1">{product.device_type_code}</p>
                            </div>
                        )}
                        {product.received_date && (
                            <div className="bg-card/30 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground">วันที่รับสินค้า</p>
                                <p className="font-medium text-sm mt-1">
                                    {new Date(product.received_date).toLocaleDateString('th-TH')}
                                </p>
                            </div>
                        )}
                        {product.sold_at && (
                            <div className="bg-card/30 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground">วันที่ขาย</p>
                                <p className="font-medium text-sm mt-1">
                                    {new Date(product.sold_at).toLocaleDateString('th-TH')}
                                </p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Used Product Details Section */}
                {product.type === 'มือ 2' && (
                    <div className="space-y-3 pb-4 border-b border-gold/10">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            ข้อมูลสินค้ามือสอง
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            {condition && (
                                <div className={`rounded-lg p-3 ${condition.color} border border-current/20`}>
                                    <p className="text-xs opacity-70 font-medium">เกรดสภาพ</p>
                                    <p className="font-bold text-lg mt-1">{condition.label}</p>
                                </div>
                            )}
                            <div className="bg-card/30 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground">สุขภาพแบตเตอรี่</p>
                                <p className="font-bold text-lg mt-1">
                                    {product.battery_health ? `${product.battery_health}%` : '-'}
                                </p>
                            </div>
                        </div>

                        {/* Accessories */}
                        <div className="bg-blue-50 dark:bg-blue-950/30 rounded-lg p-3 border border-blue-200 dark:border-blue-800">
                            <p className="text-xs text-muted-foreground font-medium mb-2">อุปกรณ์เสริม</p>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="flex items-center gap-2">
                                    {product.has_box ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full border border-gray-300" />
                                    )}
                                    <span className="text-sm">กล่องของ</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {product.has_charger ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full border border-gray-300" />
                                    )}
                                    <span className="text-sm">หัวชาร์จ</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {product.has_cable ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full border border-gray-300" />
                                    )}
                                    <span className="text-sm">สายชาร์จ</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {product.has_headphone ? (
                                        <CheckCircle className="h-4 w-4 text-green-600" />
                                    ) : (
                                        <div className="h-4 w-4 rounded-full border border-gray-300" />
                                    )}
                                    <span className="text-sm">หูฟัง</span>
                                </div>
                            </div>
                        </div>

                        {product.condition_note && (
                            <div className="bg-card/50 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground font-medium mb-1">หมายเหตุ</p>
                                <p className="text-sm">{product.condition_note}</p>
                            </div>
                        )}
                    </div>
                )}

                {/* Transaction Info Section */}
                {product.sold_to && (
                    <div className="space-y-3 pb-4 border-b border-gold/10">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            ข้อมูลการขาย
                        </h3>
                        <div className="grid grid-cols-2 gap-3">
                            <div className="bg-card/30 rounded-lg p-3">
                                <p className="text-xs text-muted-foreground">ลูกค้า</p>
                                <p className="font-medium text-sm mt-1">{product.sold_to}</p>
                            </div>
                            {product.payment_method && (
                                <div className="bg-card/30 rounded-lg p-3">
                                    <p className="text-xs text-muted-foreground">วิธีชำระเงิน</p>
                                    <p className="font-medium text-sm mt-1">{product.payment_method}</p>
                                </div>
                            )}
                        </div>
                    </div>
                )}

                {/* Inventory Logs (Phase 5) */}
                {showInventoryLogs && (
                    <div className="space-y-3 pb-4 border-b border-gold/10">
                        <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                            ประวัติการเคลื่อนไหว
                        </h3>
                        {logs.length === 0 ? (
                            <p className="text-sm text-muted-foreground">ยังไม่มีประวัติ</p>
                        ) : (
                            <ul className="space-y-2 max-h-48 overflow-y-auto">
                                {logs.map((log) => (
                                    <li
                                        key={log.id}
                                        className="flex items-center justify-between gap-2 text-sm py-2 px-3 rounded-lg bg-muted/50"
                                    >
                                        <span className="font-medium">{actionTypeLabels[log.action_type] ?? log.action_type}</span>
                                        {log.action_note && <span className="text-muted-foreground truncate">{log.action_note}</span>}
                                        <span className="text-xs text-muted-foreground shrink-0">
                                            {new Date(log.created_at).toLocaleString('th-TH')}
                                        </span>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                )}

                {/* Action Buttons */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-4">
                    {product.status === 'in_stock' && (
                        <Button
                            onClick={handleSell}
                            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold"
                        >
                            <ShoppingCart className="mr-2 h-4 w-4" />
                            ขายสินค้า
                        </Button>
                    )}
                    
                    <>
                        <Button
                            onClick={handleEdit}
                            variant="outline"
                            className="border-yellow-500/30 text-yellow-600 hover:bg-yellow-50"
                        >
                                <Edit className="h-4 w-4" />
                                <span className="hidden sm:inline ml-2">แก้ไข</span>
                            </Button>
                            <Button
                                onClick={handleDeleteClick}
                                disabled={deleting}
                                variant="outline"
                                className="border-red-500/30 text-red-600 hover:bg-red-50"
                            >
                                <Trash2 className="h-4 w-4" />
                                <span className="hidden sm:inline ml-2">ลบ</span>
                            </Button>
                    </>
                </div>
            </div>
        </div>
    );

    const ModalWrapper = () => (
        <>
            {isDesktop ? (
                <Dialog open={open} onOpenChange={onClose}>
                <DialogContent className="max-w-3xl bg-card/95 backdrop-blur-xl border-gold/30 max-h-[90vh] overflow-y-auto data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0 data-[state=closed]:zoom-out-95 data-[state=open]:zoom-in-95 duration-300">
                    <DialogHeader>
                        <DialogTitle className="text-2xl">รายละเอียดสินค้า</DialogTitle>
                    </DialogHeader>
                    <Content />
                </DialogContent>
            </Dialog>
            ) : (
        <Drawer open={open} onOpenChange={onClose}>
            <DrawerContent className="bg-card/95 backdrop-blur-xl border-t border-gold/30 transition-transform duration-300 ease-out">
                <DrawerHeader>
                    <DrawerTitle className="text-xl">รายละเอียดสินค้า</DrawerTitle>
                </DrawerHeader>
                <ScrollArea className="h-[80vh]">
                    <Content />
                </ScrollArea>
            </DrawerContent>
        </Drawer>
            )}
            <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
                        <AlertDialogDescription>
                            คุณแน่ใจหรือว่าต้องการลบสินค้านี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
                            <span className="block mt-2 font-medium text-foreground">
                                {product.brand_name} {product.model_name} • {product.shop_code}
                            </span>
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={deleting}>ยกเลิก</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={(e) => { e.preventDefault(); handleDeleteConfirm(); }}
                            disabled={deleting}
                            className="bg-red-600 hover:bg-red-700"
                        >
                            {deleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            ลบ
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </>
    );

    return <ModalWrapper />;
}
