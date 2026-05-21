import type { Database } from '@/types/database.types';

type ProductUpdate = Database['public']['Tables']['products']['Update'];
type ProductInsert = Database['public']['Tables']['products']['Insert'];

/**
 * ล้างข้อมูลการขายครั้งก่อน — ใช้เมื่อยกเลิกการขาย / นำกลับมาขายใหม่
 * กำไร (profit) คำนวณจาก selling_price - cost_price จึงตั้ง selling_price = cost ชั่วคราว
 */
export function buildSaleResetUpdate(costPrice: number): ProductUpdate {
  return {
    status: 'in_stock',
    sold_to: null,
    sold_at: null,
    sold_by: null,
    payment_method: null,
    contract_number: null,
    selling_price: costPrice,
  };
}

/** ค่าเริ่มต้นตอนเพิ่มสินค้าใหม่ (ไม่ดึงข้อมูลขายเก่าของ IMEI เดิม) */
export function buildFreshProductSaleFields(): Pick<
  ProductInsert,
  'sold_to' | 'sold_at' | 'sold_by' | 'payment_method' | 'contract_number'
> {
  return {
    sold_to: null,
    sold_at: null,
    sold_by: null,
    payment_method: null,
    contract_number: null,
  };
}

/** ล้างเฉพาะฟิลด์การขาย (ใช้ตอนแก้ไขสินค้าที่อยู่ในสต๊อก) */
export function buildSaleFieldsClearOnly(): ProductUpdate {
  return {
    sold_to: null,
    sold_at: null,
    sold_by: null,
    payment_method: null,
    contract_number: null,
  };
}

/** แสดงข้อมูลการขายใน UI เฉพาะเมื่อสถานะขายแล้วจริง */
export function hasActiveSaleRecord(status: string | null | undefined): boolean {
  return status === 'sold';
}
