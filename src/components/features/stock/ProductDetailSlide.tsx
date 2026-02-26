import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Edit, Trash2, ShoppingCart } from 'lucide-react';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import type { Database } from '@/types/database.types';

type ProductDetail = Database['public']['Views']['product_details']['Row'];

interface ProductDetailSlideProps {
  productId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function ProductDetailSlide({
  productId,
  isOpen,
  onClose,
  onEdit,
  onDelete,
}: ProductDetailSlideProps) {
  const navigate = useNavigate();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAnimating, setIsAnimating] = useState(false);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  useEffect(() => {
    if (isOpen && productId) {
      setIsAnimating(true);
      setProduct(null);

      let cancelled = false;
      const load = async () => {
        setLoading(true);
        const { data, error } = await supabase
          .from('product_details')
          .select('*')
          .eq('id', productId)
          .single();

        if (!cancelled) {
          if (error) {
            console.error('Error fetching product:', error);
            setProduct(null);
          } else {
            setProduct(data);
          }
          setLoading(false);
        }
      };
      load();
      return () => {
        cancelled = true;
      };
    } else {
      const timer = setTimeout(() => {
        setIsAnimating(false);
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [isOpen, productId]);

  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  const handleChangeStatus = async (newStatus: 'in_stock' | 'reserved' | 'service') => {
    if (!product || product.status === newStatus || updatingStatus) return;
    setUpdatingStatus(true);
    try {
      const { data, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      const user = data.user;
      if (!user) {
        throw new Error('ไม่พบข้อมูลผู้ใช้ กรุณาล็อกอินใหม่อีกครั้ง');
      }

      const prevStatus = product.status;
      let actionType: 'reserve' | 'cancel_reserve' | 'service' | 'return';
      let actionNote: string;

      if (newStatus === 'reserved') {
        actionType = 'reserve';
        actionNote = 'ลูกค้าจองสินค้า';
      } else if (newStatus === 'service') {
        actionType = 'service';
        actionNote = 'ส่งสินค้าเข้าซ่อม';
      } else {
        if (prevStatus === 'reserved') {
          actionType = 'cancel_reserve';
          actionNote = 'ยกเลิกการจอง สินค้ากลับมาพร้อมขาย';
        } else if (prevStatus === 'service') {
          actionType = 'return';
          actionNote = 'รับสินค้ากลับจากการซ่อม กลับมาพร้อมขาย';
        } else {
          actionType = 'return';
          actionNote = 'ปรับสถานะกลับเป็นพร้อมขาย';
        }
      }

      const { error: updateError } = await supabase
        .from('products')
        .update({ status: newStatus })
        .eq('id', product.id);
      if (updateError) throw updateError;

      const { error: logError } = await supabase.from('inventory_logs').insert({
        product_id: product.id,
        action_type: actionType,
        action_by: user.id,
        action_note: actionNote,
      });

      if (logError) {
        console.error('Inventory log error (toggle status):', logError);
      }

      setProduct((prev) => (prev ? { ...prev, status: newStatus } : prev));
    } catch (e) {
      console.error('Error updating product status:', e);
      alert('ไม่สามารถเปลี่ยนสถานะสินค้าได้ กรุณาลองใหม่อีกครั้ง');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (!isOpen && !isAnimating) return null;

  const handleEdit = () => {
    if (product) {
      onEdit(product.id);
      onClose();
    }
  };

  const handleDelete = () => {
    if (product) {
      onDelete(product.id);
      onClose();
    }
  };

  const handleSell = () => {
    if (product) {
      navigate(`/sell?product_id=${product.id}`);
      onClose();
    }
  };

  return (
    <>
      {/* Backdrop - Smooth fade (pointer-events-none when closed to avoid blocking Add Product modal) */}
      <div
        className={`fixed inset-0 bg-black z-40 transition-opacity duration-300 ${
          isOpen ? 'opacity-50' : 'opacity-0 pointer-events-none'
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Centered Modal - max-w-2xl พอดีกับจอ */}
      <div
        className={`fixed inset-0 z-[100] flex items-center justify-center p-4 transition-all duration-300 pointer-events-none ${
          isOpen ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div
          className={`pointer-events-auto w-full max-w-2xl max-h-[calc(100vh-80px)] flex flex-col rounded-2xl shadow-2xl bg-card/95 backdrop-blur-xl border-2 border-gold/30 transition-all duration-300 ${
            isOpen ? 'scale-100' : 'scale-95'
          }`}
        >
          {/* Header */}
          <div className="bg-card/80 backdrop-blur-sm border-b border-gold/30 p-4 flex items-center justify-between">
            <h2 className="text-xl font-bold logo-gradient flex items-center gap-2">
              📦 รายละเอียดสินค้า
            </h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-red-500 hover:text-white rounded-lg transition-colors"
              aria-label="ปิด"
            >
              <X size={20} />
            </button>
          </div>

          {/* Content - Scrollable */}
          <div className="flex-1 overflow-y-auto p-4">
            {loading ? (
              <ProductDetailSkeleton />
            ) : product ? (
              <ProductDetailContent product={product} />
            ) : (
              <div className="text-center py-8">
                <p className="text-red-500">ไม่พบข้อมูลสินค้า</p>
              </div>
            )}
          </div>

          {/* Footer - Sticky: จัดการสถานะ + ปุ่มหลัก */}
          {product && (
            <div className="bg-card/80 backdrop-blur-sm border-t border-gold/30 p-4 pb-6 flex flex-col md:flex-row gap-3 md:items-center md:justify-between relative z-[101]">
              {/* Status controls */}
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updatingStatus || product.status === 'in_stock'}
                  className="border-green-500/40 text-green-600 hover:bg-green-50"
                  onClick={() => handleChangeStatus('in_stock')}
                >
                  พร้อมขาย
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updatingStatus || product.status === 'reserved'}
                  className="border-yellow-500/40 text-yellow-600 hover:bg-yellow-50"
                  onClick={() => handleChangeStatus('reserved')}
                >
                  จอง
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={updatingStatus || product.status === 'service'}
                  className="border-red-500/40 text-red-600 hover:bg-red-50"
                  onClick={() => handleChangeStatus('service')}
                >
                  ส่งซ่อม
                </Button>
              </div>

              {/* Main actions */}
              <div className="flex flex-1 md:flex-none gap-3 justify-end">
                {product.status === 'in_stock' && (
                  <Button onClick={handleSell} className="btn btn-blue flex-1 md:flex-none">
                    <ShoppingCart size={16} className="mr-2" />
                    ขาย
                  </Button>
                )}
                <Button
                  onClick={handleEdit}
                  variant="outline"
                  className="flex-1 md:flex-none border-gold/30"
                >
                  <Edit size={16} className="mr-2" />
                  แก้ไข
                </Button>
                <Button
                  onClick={handleDelete}
                  className="btn bg-red-500 text-white hover:bg-red-600 flex-none"
                >
                  <Trash2 size={16} />
                </Button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
}

// Skeleton Loading
function ProductDetailSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-48 w-full rounded-lg" />
      <Skeleton className="h-6 w-3/4" />
      <Skeleton className="h-4 w-1/2" />
      <div className="space-y-2">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="h-10 w-full" />
        ))}
      </div>
    </div>
  );
}

// Product Detail Content - Layout 1 column
function ProductDetailContent({ product }: { product: ProductDetail }) {
  const statusLabel =
    product.status === 'in_stock'
      ? '✅ พร้อมขาย'
      : product.status === 'sold'
        ? '🔴 ขายแล้ว'
        : product.status === 'reserved'
          ? '🟡 จอง'
          : product.status;

  const typeLabel = product.type === 'มือ 1' ? '📱 มือ 1' : '🔄 มือสอง';

  const productImages =
    product.product_images && Array.isArray(product.product_images)
      ? product.product_images.filter((u): u is string => typeof u === 'string')
      : [];

  const imageUrl = product.main_image || productImages[0];

  return (
    <div className="space-y-4">
      {imageUrl && (
        <div className="aspect-square max-w-[200px] mx-auto rounded-lg border-2 border-gold/20 overflow-hidden">
          <img
            src={imageUrl}
            alt={product.model_name}
            className="w-full h-full object-cover"
            loading="lazy"
            decoding="async"
          />
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            product.status === 'in_stock'
              ? 'bg-green-500 text-white'
              : product.status === 'sold'
                ? 'bg-red-500 text-white'
                : 'bg-yellow-500 text-white'
          }`}
        >
          {statusLabel}
        </span>
        <span
          className={`px-2 py-1 rounded-full text-xs font-medium ${
            product.type === 'มือ 1' ? 'bg-blue-500 text-white' : 'bg-orange-500 text-white'
          }`}
        >
          {typeLabel}
        </span>
      </div>

      <div>
        <h3 className="text-xl font-bold text-primary">
          {product.brand_name} {product.model_name}
        </h3>
        <p className="text-sm text-muted-foreground">
          {product.storage} • {product.color_name}
        </p>
      </div>

      <div className="space-y-2">
          <InfoRow label="รหัสสินค้า" value={product.shop_code} icon="🏷️" />
          <InfoRow label="IMEI" value={product.imei} icon="📱" />
          <InfoRow
            label="ราคาทุน"
            value={`฿${product.cost_price.toLocaleString()}`}
            icon="💰"
          />
          <InfoRow
            label="ราคาขาย"
            value={`฿${product.selling_price.toLocaleString()}`}
            icon="💵"
            valueClass="text-green-600 dark:text-green-400 font-bold text-lg"
          />
          <InfoRow
            label="กำไร"
            value={`฿${product.profit.toLocaleString()}`}
            icon="📈"
            valueClass="text-blue-600 dark:text-blue-400 font-semibold"
          />
          <InfoRow
            label="วันที่เพิ่ม"
            value={new Date(product.created_at).toLocaleDateString('th-TH', {
              year: 'numeric',
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit',
            })}
            icon="📅"
          />
          <InfoRow
            label="เพิ่มโดย"
            value={product.created_by_name ?? '-'}
            icon="👤"
          />
        </div>

        {/* Sold Info */}
        {product.sold_at && (
          <div className="rounded-lg border border-red-200 dark:border-red-900/50 bg-red-50 dark:bg-red-900/20 p-3">
            <h4 className="text-sm font-semibold mb-2 text-red-600 dark:text-red-400">
              🎯 ข้อมูลการขาย
            </h4>
            <div className="space-y-1 text-sm">
              <InfoRow
                label="ขายเมื่อ"
                value={new Date(product.sold_at).toLocaleDateString('th-TH')}
              />
              <InfoRow label="ขายโดย" value={product.sold_by_name ?? '-'} />
              <InfoRow label="ขายให้" value={product.sold_to ?? '-'} />
            </div>
          </div>
        )}

        {/* Used Product Details */}
        {product.type === 'มือ 2' && (
          <div className="rounded-lg border border-orange-200 dark:border-orange-900/50 bg-orange-50 dark:bg-orange-900/20 p-3">
            <h4 className="text-sm font-semibold mb-2 text-orange-600 dark:text-orange-400">
              📦 สินค้ามือสอง
            </h4>
            <div className="space-y-1 text-sm">
              <InfoRow
                label="สภาพ"
                value={`เกรด ${product.condition_grade ?? 'ไม่ระบุ'}`}
                icon="⭐"
              />
              <div className="flex flex-wrap gap-3 text-xs mt-2">
                <span className={product.has_box ? 'text-green-600' : 'text-muted-foreground'}>
                  {product.has_box ? '✅' : '❌'} กล่อง
                </span>
                <span className={product.has_charger ? 'text-green-600' : 'text-muted-foreground'}>
                  {product.has_charger ? '✅' : '❌'} ชาร์จ
                </span>
                <span className={product.has_cable ? 'text-green-600' : 'text-muted-foreground'}>
                  {product.has_cable ? '✅' : '❌'} สาย
                </span>
                <span className={product.has_headphone ? 'text-green-600' : 'text-muted-foreground'}>
                  {product.has_headphone ? '✅' : '❌'} หูฟัง
                </span>
              </div>
              {product.condition_note && (
                <p className="text-xs text-muted-foreground mt-2">
                  หมายเหตุ: {product.condition_note}
                </p>
              )}
            </div>
            {productImages.length > 0 && (
              <div className="mt-3">
                <p className="text-xs font-medium mb-2">รูปภาพ:</p>
                <div className="grid grid-cols-2 gap-2">
                  {productImages.slice(0, 4).map((img, i) => (
                    <img
                      key={i}
                      src={img}
                      alt={`${i + 1}`}
                      className="w-full aspect-square object-cover rounded-lg border border-gold/20"
                      loading="lazy"
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
}

function InfoRow({
  label,
  value,
  icon,
  valueClass = '',
}: {
  label: string;
  value: string;
  icon?: string;
  valueClass?: string;
}) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-border last:border-0">
      <span className="text-sm text-muted-foreground flex items-center gap-2">
        {icon && <span>{icon}</span>}
        {label}
      </span>
      <span className={`font-medium text-sm ${valueClass}`}>{value}</span>
    </div>
  );
}
