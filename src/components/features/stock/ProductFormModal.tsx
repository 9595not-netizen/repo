import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ProductForm } from '@/components/features/add-product/ProductForm';

interface ProductFormModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    productId: string | null;
    onSuccess: () => void;
}

/**
 * Modal สำหรับเพิ่ม/แก้ไขสินค้า (CRUD ใน Modal)
 * productId = null → โหมดเพิ่ม | productId = id → โหมดแก้ไข
 */
export function ProductFormModal({ open, onOpenChange, productId, onSuccess }: ProductFormModalProps) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent
                className="w-[95vw] max-w-4xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
                onPointerDownOutside={(e) => {
                    const target = e.target as HTMLElement;
                    if (target.closest('[role="listbox"]') || target.closest('[data-radix-select-viewport]')) {
                        e.preventDefault();
                    }
                }}
            >
                <DialogHeader>
                    <DialogTitle>{productId ? 'แก้ไขสินค้า' : 'เพิ่มสินค้าใหม่'}</DialogTitle>
                </DialogHeader>
                <div className="py-2">
                    <ProductForm
                        productIdFromModal={productId}
                        onSuccess={onSuccess}
                        onCancel={() => onOpenChange(false)}
                        embedded={true}
                    />
                </div>
            </DialogContent>
        </Dialog>
    );
}
