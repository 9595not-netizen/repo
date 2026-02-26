import { useState, useEffect } from 'react';
import { useInView } from '@/hooks/useInView';
import { useSearchParams } from 'react-router-dom';
import { useProducts } from '@/hooks/useProducts';
import { FilterPanel } from '@/components/features/stock/FilterPanel';
import { ProductCard } from '@/components/features/stock/ProductCard';
import { ProductCardSkeletonGrid } from '@/components/features/stock/ProductCardSkeleton';
import { ProductTable } from '@/components/features/stock/ProductTable';
import { ProductDetailSlide } from '@/components/features/stock/ProductDetailSlide';
import { ProductFormModal } from '@/components/features/stock/ProductFormModal';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LayoutGrid, Table, Plus } from 'lucide-react';
import { PageHeader } from '@/components/layout/PageHeader';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/lib/utils';
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
import type { ProductDetailRow } from '@/hooks/useProducts';

type ViewMode = 'card' | 'table';

export default function StockPage() {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { isAdmin } = useAuth();
  const {
    products,
    total,
    loading,
    error,
    filters,
    setFilters,
    sortField,
    setSortField,
    sortOrder,
    setSortOrder,
    hasMore,
    loadMore,
    refetch,
  } = useProducts();

  const { ref: loadMoreRef, inView } = useInView({ rootMargin: '200px' });

  const [selectedProduct, setSelectedProduct] = useState<ProductDetailRow | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('card');
  const [deleteProduct, setDeleteProduct] = useState<ProductDetailRow | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [hasCheckedAction, setHasCheckedAction] = useState(false);

  // เปิด modal อัตโนมัติ: ?edit=productId หรือ ?action=add (เช็คแค่ครั้งแรก - แก้ bug modal เปิดเอง)
  useEffect(() => {
    const editId = searchParams.get('edit');
    const action = searchParams.get('action');
    const shouldCheck = !hasCheckedAction || editId || action === 'add';
    if (!shouldCheck) return;

    if (editId) {
      setEditingProductId(editId);
      setFormModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('edit');
      setSearchParams(next, { replace: true });
    } else if (action === 'add') {
      setEditingProductId(null);
      setFormModalOpen(true);
      const next = new URLSearchParams(searchParams);
      next.delete('action');
      setSearchParams(next, { replace: true });
    }
    setHasCheckedAction(true);
  }, [hasCheckedAction, searchParams, setSearchParams]);

  useEffect(() => {
    if (inView && hasMore && !loading && products.length > 0) {
      loadMore();
    }
  }, [inView, hasMore, loading, products.length, loadMore]);

  const handleProductClick = (product: ProductDetailRow) => {
    requestAnimationFrame(() => {
      setSelectedProduct(product);
      setIsDetailOpen(true);
    });
  };

  const handleCloseDetail = () => {
    setIsDetailOpen(false);
    setTimeout(() => {
      setSelectedProduct(null);
    }, 300);
  };

  const handleSortChange = (field: 'selling_price' | 'created_at', order: 'asc' | 'desc') => {
    setSortField(field);
    setSortOrder(order);
  };

  const handleDeleteClick = (product: ProductDetailRow) => {
    setDeleteProduct(product);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteProduct) return;
    setDeleting(true);
    try {
      const productId = deleteProduct.id;

      // ลบข้อมูลที่อ้างอิง product ก่อน (Foreign Key constraint)
      await supabase.from('inventory_logs').delete().eq('product_id', productId);
      const { error: usedErr } = await supabase.from('used_product_details').delete().eq('product_id', productId);
      if (usedErr) {
        // มือ 1 อาจไม่มี used_product_details ไม่เป็นไร
        console.warn('used_product_details delete:', usedErr.message);
      }

      const { error } = await supabase.from('products').delete().eq('id', productId);
      if (error) throw error;
      setIsDetailOpen(false);
      setSelectedProduct(null);
      setDeleteProduct(null);
      refetch();
      toast({ title: 'ลบสินค้าสำเร็จ', description: 'ลบสินค้าออกจากระบบแล้ว' });
    } catch (e) {
      console.error(e);
      const msg = (e && typeof e === 'object' && 'message' in e)
        ? String((e as { message?: string }).message)
        : e instanceof Error ? e.message : String(e);
      const isFk = /foreign key|violates foreign key|REFERENCES/i.test(msg);
      toast({
        title: 'เกิดข้อผิดพลาด',
        description: isFk
          ? 'ไม่สามารถลบสินค้าได้ เนื่องจากมีประวัติการขายหรือข้อมูลที่เกี่ยวข้องอยู่ในระบบ'
          : msg ? `เกิดข้อผิดพลาดในการลบสินค้า: ${msg}` : 'เกิดข้อผิดพลาดในการลบสินค้า',
        variant: 'destructive',
      });
    } finally {
      setDeleting(false);
    }
  };

  const handleEdit = (product: ProductDetailRow) => {
    setEditingProductId(product.id);
    setFormModalOpen(true);
  };

  const handleAddProduct = () => {
    setEditingProductId(null);
    setFormModalOpen(true);
  };

  const handleFormSuccess = () => {
    setFormModalOpen(false);
    setEditingProductId(null);
    refetch();
  };

  const handleSell = (product: ProductDetailRow) => {
    navigate(`/sell?product_id=${product.id}`);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        title="คลังสินค้า"
        subtitle="จัดการสต๊อก แยกรุ่น / ความจุ / สี / มือ 1 - มือ 2"
      />

      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Tabs
          value={filters.status}
          onValueChange={(v) => setFilters({ ...filters, status: v })}
        >
          <TabsList className="bg-muted/50 border border-gold/20">
            <TabsTrigger value="all">ทั้งหมด</TabsTrigger>
            <TabsTrigger value="in_stock">พร้อมขาย</TabsTrigger>
            <TabsTrigger value="reserved">จอง</TabsTrigger>
            <TabsTrigger value="sold">ขายแล้ว</TabsTrigger>
            <TabsTrigger value="service">ส่งซ่อม</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* ปุ่ม CARD/TABLE + เพิ่มสินค้า - อยู่ขวาบน */}
        <div className="flex items-center gap-3">
          <div className="flex rounded-lg border border-gold/30 overflow-hidden shadow-md">
            <button
              onClick={() => setViewMode('card')}
              className={cn(
                'px-4 py-2 flex items-center gap-2 transition-all duration-200 font-medium',
                viewMode === 'card'
                  ? 'bg-green-500 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden sm:inline">CARD</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'px-4 py-2 flex items-center gap-2 transition-all duration-200 font-medium border-l border-gold/30',
                viewMode === 'table'
                  ? 'bg-orange-500 text-white shadow-lg'
                  : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700'
              )}
            >
              <Table className="h-4 w-4" />
              <span className="hidden sm:inline">TABLE</span>
            </button>
          </div>
          <Button size="lg" onClick={handleAddProduct} className="gap-2 font-semibold btn btn-blue">
            <Plus className="h-5 w-5" />
            เพิ่มสินค้า
          </Button>
        </div>
      </div>

      <div className="mb-4">
        <FilterPanel
          filters={filters}
          onFiltersChange={setFilters}
          sortField={sortField}
          sortOrder={sortOrder}
          onSortChange={handleSortChange}
        />
      </div>

      <p className="text-sm font-medium text-muted-foreground mb-2">
        พบ <span className="text-primary font-bold">{total}</span> รายการ
      </p>

      {error && (
        <div className="rounded-lg border border-destructive/50 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error.message}
        </div>
      )}

      {loading && products.length === 0 ? (
        <ProductCardSkeletonGrid count={8} />
      ) : products.length > 0 ? (
        <>
          {viewMode === 'card' ? (
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3">
              {products.map((product) => (
                <ProductCard
                  key={product.id}
                  product={product}
                  onView={() => handleProductClick(product)}
                  onEdit={handleEdit}
                  onDelete={handleDeleteClick}
                  onSell={handleSell}
                  isAdmin={isAdmin}
                  compact
                />
              ))}
            </div>
          ) : (
            <ProductTable
              products={products}
              onView={(p) => handleProductClick(p)}
              onEdit={handleEdit}
              onDelete={handleDeleteClick}
              onSell={handleSell}
              isAdmin={isAdmin}
            />
          )}

          {hasMore ? (
            <div ref={loadMoreRef} className="flex justify-center pt-4 min-h-[60px]">
              <button
                type="button"
                onClick={loadMore}
                disabled={loading}
                className="px-6 py-2 rounded-lg border border-gold/50 bg-background/80 hover:bg-muted/50 text-sm font-medium disabled:opacity-50"
              >
                {loading ? <Loader2 className="h-5 w-5 animate-spin mx-auto" /> : 'โหลดเพิ่ม'}
              </button>
            </div>
          ) : (
            products.length > 0 && (
              <p className="text-center text-sm text-muted-foreground py-4">ไม่มีข้อมูลเพิ่มเติม</p>
            )
          )}
        </>
      ) : (
        <div className="text-center py-20 text-muted-foreground bg-card/30 rounded-xl border border-dashed border-border">
          <p>
            {filters.status === 'all' && !filters.search && filters.brand === 'all' && filters.model === 'all'
              ? 'ยังไม่มีสินค้าในคลัง คลิก "เพิ่มสินค้า" เพื่อเริ่มต้น'
              : 'ไม่พบสินค้าตามเงื่อนไขที่ค้นหา'}
          </p>
        </div>
      )}

      <ProductFormModal
        open={formModalOpen}
        onOpenChange={setFormModalOpen}
        productId={editingProductId}
        onSuccess={handleFormSuccess}
      />

      <AlertDialog open={!!deleteProduct} onOpenChange={(o) => !o && setDeleteProduct(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>ยืนยันการลบ</AlertDialogTitle>
            <AlertDialogDescription>
              คุณแน่ใจหรือว่าต้องการลบสินค้านี้? การดำเนินการนี้ไม่สามารถย้อนกลับได้
              {deleteProduct && (
                <span className="block mt-2 font-medium text-foreground">
                  {deleteProduct.brand_name} {deleteProduct.model_name} • {deleteProduct.shop_code}
                </span>
              )}
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

      <ProductDetailSlide
        productId={selectedProduct?.id ?? null}
        isOpen={isDetailOpen}
        onClose={handleCloseDetail}
        onEdit={(id) => {
          handleCloseDetail();
          setEditingProductId(id);
          setFormModalOpen(true);
        }}
        onDelete={(id) => {
          const p = products.find((x) => x.id === id) ?? selectedProduct;
          if (p) setDeleteProduct(p);
          handleCloseDetail();
        }}
      />
    </div>
  );
}
