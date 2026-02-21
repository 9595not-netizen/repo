import { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { useStaffList } from '@/hooks/useStaffList';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ProductLookup } from '@/components/features/sell/ProductLookup';
import { useSellProduct } from '@/hooks/useSellProduct';
import { SaleConfirmModal } from '@/components/features/sell/SaleConfirmModal';
import { SaleSuccessScreen } from '@/components/features/sell/SaleSuccessScreen';
import { Database } from '@/types/database.types';
import { SaleResultSuccess } from '@/types/common.types';
import { getErrorMessage } from '@/lib/error-handler';
import { PageHeader } from '@/components/layout/PageHeader';
import { getProductDisplayImage } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

type ProductDetail = Database['public']['Views']['product_details']['Row'];

const SellProduct = () => {
  const { user, userProfile } = useAuth();
  // แสดง username เป็นหลัก สำหรับตัวเลือก "ผู้ใช้ปัจจุบัน" และรายชื่อ staff
  const currentUserDisplay =
    userProfile?.username ||
    userProfile?.full_name ||
    (user?.user_metadata?.username as string) ||
    user?.email?.split('@')[0] ||
    'ไม่ระบุ';
  const { toast } = useToast();
  const { sellProduct, loading: saving } = useSellProduct();
  const [searchParams] = useSearchParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [soldTo, setSoldTo] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'เงินสด' | 'ผ่อนชำระ'>('เงินสด');
  const [contractNumber, setContractNumber] = useState('');
  const [soldAt, setSoldAt] = useState(new Date().toISOString().split('T')[0]);
  const [soldByUserId, setSoldByUserId] = useState<string>(''); // ถ้าว่างจะใช้ user.id อัตโนมัติ
  const { staff, loadingStaff } = useStaffList();
  const [showConfirm, setShowConfirm] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [saleResult, setSaleResult] = useState<SaleResultSuccess | null>(null);

  useEffect(() => {
    const id = searchParams.get('id');
    if (id) lookupById(id);
  }, [searchParams, lookupById]);

  const lookupById = useCallback(async (id: string) => {
    try {
      const { data, error } = await supabase.from('product_details').select('*').eq('id', id).eq('status', 'in_stock').single();
      if (error) {
        toast({ title: 'เกิดข้อผิดพลาด', description: error.message || 'ไม่สามารถโหลดข้อมูลสินค้าได้', variant: 'destructive' });
        setProduct(null);
        return;
      }
      if (data) {
        const productData = data as ProductDetail;
        setProduct(productData);
        setSellingPrice(String(productData.selling_price || 0));
      } else {
        toast({ title: 'ไม่พบสินค้า', description: 'สินค้านี้อาจขายไปแล้วหรือไม่มีในคลัง', variant: 'destructive' });
        setProduct(null);
      }
    } catch (err: unknown) {
      toast({ title: 'เกิดข้อผิดพลาด', description: getErrorMessage(err), variant: 'destructive' });
      setProduct(null);
    }
  }, [toast]);

  const handleProductFound = useCallback((foundProduct: ProductDetail) => {
    setProduct(foundProduct);
    setSellingPrice(String(foundProduct.selling_price || 0));
  }, []);

  const profit = (Number(sellingPrice) || 0) - (product?.cost_price || 0);

  const handleConfirmSale = async () => {
    if (!user || !product) {
      toast({ title: 'กรุณาล็อกอินก่อนบันทึก', variant: 'destructive' });
      return;
    }
    try {
      // ใช้ user.id ที่เลือก หรือ user.id อัตโนมัติถ้าไม่เลือก
      const selectedSoldBy = soldByUserId || user.id;
      const selectedStaff = staff.find(s => s.id === selectedSoldBy);
      const soldByName = selectedStaff?.username || selectedStaff?.full_name || userProfile?.username || userProfile?.full_name || 'ไม่ระบุ';
      
      await sellProduct({
        productId: product.id,
        soldTo,
        sellingPrice: Number(sellingPrice),
        paymentMethod,
        contractNumber: paymentMethod === 'ผ่อนชำระ' ? contractNumber : undefined,
        soldAt: new Date(soldAt).toISOString(),
        soldBy: selectedSoldBy, // ใช้ user.id ที่เลือก หรือ user.id อัตโนมัติ
      });
      setSaleResult({
        product,
        saleData: {
          sold_to: soldTo,
          payment_method: paymentMethod,
          contract_number: paymentMethod === 'ผ่อนชำระ' ? contractNumber : undefined,
          selling_price: Number(sellingPrice),
          sold_at: soldAt,
          sold_by: selectedSoldBy,
          sold_by_name: soldByName,
          profit,
        },
      });
      setShowConfirm(false);
      setShowSuccess(true);
    } catch (err: unknown) {
      toast({ title: getErrorMessage(err), variant: 'destructive' });
    }
  };

  const resetForm = () => {
    setProduct(null);
    setSoldTo('');
    setSellingPrice('');
    setPaymentMethod('เงินสด');
    setContractNumber('');
    setSoldAt(new Date().toISOString().split('T')[0]);
    setSoldByUserId(''); // รีเซ็ตเป็นผู้ใช้ปัจจุบัน
    setShowSuccess(false);
    setSaleResult(null);
  };

  return (
    <div>
      <PageHeader
        title="ขายสินค้า"
        subtitle="ค้นหาและขายสินค้าจากคลัง"
      />

      <div className="page-content">
        {/* ค้นหาสินค้า */}
        <div className="gold-card">
          <div className="gold-card-title">ค้นหาสินค้า</div>
          <ProductLookup onProductFound={handleProductFound} />
        </div>

        {/* ข้อมูลสินค้า — แสดงเมื่อพบ */}
        {product && !showSuccess && (
          <>
            <div className="gold-card">
              <div className="gold-card-title">ข้อมูลสินค้า</div>

              <div style={{ display: 'flex', gap: '16px', alignItems: 'center', marginBottom: '20px' }}>
                <img
                  src={getProductDisplayImage(product) || '/placeholder.png'}
                  alt={product.model_name}
                  loading="lazy"
                  decoding="async"
                  style={{
                    width: '80px',
                    height: '80px',
                    objectFit: 'contain',
                    borderRadius: '8px',
                    background: '#F8F9FA',
                    flexShrink: 0,
                    padding: '4px'
                  }}
                />
                <div>
                  <div style={{ fontWeight: 700, fontSize: '1.125rem', color: 'var(--color-primary)' }}>
                    {product.brand_name} {product.model_name}
                  </div>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', marginTop: '2px' }}>
                    {product.storage} · {product.color_name}
                  </div>
                  <span style={{
                    display: 'inline-block',
                    marginTop: '6px',
                    padding: '2px 10px',
                    borderRadius: '20px',
                    background: '#DBEAFE',
                    color: 'var(--color-primary)',
                    fontSize: '0.75rem',
                    fontWeight: 600
                  }}>
                    #{product.shop_code}
                  </span>
                </div>
              </div>

              {/* ราคา */}
              <div className="summary-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)' }}>
                <div className="summary-card">
                  <div className="summary-card-info">
                    <div className="summary-card-label">ราคาทุน</div>
                    <div className="summary-card-value" style={{ fontSize: '1.25rem' }}>
                      ฿{product.cost_price.toLocaleString()}
                    </div>
                  </div>
                </div>
                <div className="summary-card">
                  <div className="summary-card-info">
                    <div className="summary-card-label">ราคาขายแนะนำ</div>
                    <div className="summary-card-value" style={{ fontSize: '1.25rem', color: 'var(--color-gold)' }}>
                      ฿{product.selling_price.toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* ข้อมูลการขาย */}
            <div className="gold-card">
              <div className="gold-card-title">ข้อมูลการขาย</div>

              <div className="form-grid-2">
                <div className="form-group">
                  <label className="form-label">ราคาขายจริง (บาท) <span className="required">*</span></label>
                  <input
                    className="form-input"
                    type="number"
                    value={sellingPrice}
                    onChange={(e) => setSellingPrice(e.target.value)}
                  />
                  {Number(sellingPrice) > 0 && (
                    <span style={{
                      fontSize: '0.8125rem',
                      fontWeight: 600,
                      color: profit >= 0 ? 'var(--color-success)' : 'var(--color-error)'
                    }}>
                      กำไร: ฿{profit.toLocaleString()}
                    </span>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">ชื่อผู้ซื้อ <span className="required">*</span></label>
                  <input
                    className="form-input"
                    placeholder="ชื่อลูกค้า"
                    value={soldTo}
                    onChange={(e) => setSoldTo(e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">วิธีชำระเงิน <span className="required">*</span></label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={`btn ${paymentMethod === 'เงินสด' ? 'btn-gold' : 'btn-outline'}`}
                      onClick={() => setPaymentMethod('เงินสด')}
                    >
                      💵 เงินสด
                    </button>
                    <button
                      type="button"
                      className={`btn ${paymentMethod === 'ผ่อนชำระ' ? 'btn-gold' : 'btn-outline'}`}
                      onClick={() => setPaymentMethod('ผ่อนชำระ')}
                    >
                      📋 ผ่อนชำระ
                    </button>
                  </div>
                </div>

                {paymentMethod === 'ผ่อนชำระ' && (
                  <div className="form-group">
                    <label className="form-label">เลขที่สัญญา</label>
                    <input
                      className="form-input"
                      placeholder="รหัสสัญญาผ่อนชำระ"
                      value={contractNumber}
                      onChange={(e) => setContractNumber(e.target.value)}
                    />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">พนักงานขาย <span className="required">*</span></label>
                  {loadingStaff ? (
                    <div className="form-input flex items-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="text-sm text-muted-foreground">กำลังโหลดรายชื่อพนักงาน...</span>
                    </div>
                  ) : (
                    <>
                      <Select
                        value={soldByUserId || '__current__'}
                        onValueChange={(v) => setSoldByUserId(v === '__current__' ? '' : v)}
                      >
                        <SelectTrigger className="form-select">
                          <SelectValue placeholder="เลือกพนักงานขาย" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__current__">
                            👤 ผู้ใช้ปัจจุบัน ({currentUserDisplay})
                          </SelectItem>
                          {staff.length === 0 ? (
                            <SelectItem value="__no_staff__" disabled>
                              ไม่พบรายชื่อพนักงาน
                            </SelectItem>
                          ) : (
                            staff.map((s) => {
                              const displayName = s.username || s.full_name || 'ไม่ระบุ';
                              return (
                                <SelectItem key={s.id} value={s.id}>
                                  {displayName}
                                </SelectItem>
                              );
                            })
                          )}
                        </SelectContent>
                      </Select>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', marginTop: '4px' }}>
                        {staff.length > 0 ? (
                          <p>💡 พบ {staff.length} รายชื่อ - เลือกผู้บันทึก (ถ้าไม่เลือกจะใช้ผู้ใช้ปัจจุบัน) - ระบบจะบันทึกพร้อม timestamp เพื่อเป็นหลักฐาน</p>
                        ) : (
                          <p style={{ color: 'var(--destructive)' }}>⚠️ ไม่พบรายชื่อพนักงาน - ตรวจสอบ console logs หรือฐานข้อมูล</p>
                        )}
                      </div>
                    </>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">วันที่ขาย <span className="required">*</span></label>
                  <input
                    className="form-input"
                    type="date"
                    value={soldAt}
                    onChange={(e) => setSoldAt(e.target.value)}
                  />
                </div>
              </div>

              <div style={{ marginTop: '24px' }}>
                <button
                  className="btn btn-success btn-full"
                  style={{ fontSize: '1rem', padding: '14px', borderRadius: '10px' }}
                  onClick={() => {
                    if (!soldTo.trim()) {
                      toast({ title: 'กรุณากรอกชื่อผู้ซื้อ', variant: 'destructive' });
                      return;
                    }
                    setShowConfirm(true);
                  }}
                >
                  ✅ ยืนยันการขาย
                </button>
              </div>
            </div>
          </>
        )}

        {/* Confirm Dialog */}
        {showConfirm && product && (
          <SaleConfirmModal
            product={product}
            saleData={{
              sold_to: soldTo,
              payment_method: paymentMethod,
              contract_number: contractNumber,
              selling_price: Number(sellingPrice),
              sold_at: new Date(soldAt).toLocaleDateString('th-TH'),
              sold_by: soldByUserId || user!.id,
              sold_by_name: staff.find(s => s.id === (soldByUserId || user!.id))?.username || 
                           staff.find(s => s.id === (soldByUserId || user!.id))?.full_name || 
                           userProfile?.username || userProfile?.full_name || 'ไม่ระบุ',
              profit,
            }}
            onConfirm={handleConfirmSale}
            onCancel={() => setShowConfirm(false)}
            loading={saving}
          />
        )}

        {/* Success */}
        {showSuccess && saleResult && (
          <SaleSuccessScreen
            data={saleResult}
            onContinue={resetForm}
          />
        )}
      </div>
    </div>
  );
};

export default SellProduct;
