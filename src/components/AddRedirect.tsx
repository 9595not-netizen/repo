import { Navigate, useSearchParams } from 'react-router-dom';

/**
 * Redirect /add และ /add?product_id=xxx ไปที่ /stock
 * - ไม่มี query → /stock
 * - มี product_id → /stock?edit=productId (เปิด modal แก้ไขอัตโนมัติ)
 */
export function AddRedirect() {
  const [searchParams] = useSearchParams();
  const productId = searchParams.get('product_id');
  const to = productId ? `/stock?edit=${productId}` : '/stock';
  return <Navigate to={to} replace />;
}
