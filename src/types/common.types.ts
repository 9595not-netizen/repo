import { Database } from './database.types';

// ─── Row Types ─────────────────────────────────────────────────────────
export type Brand = Database['public']['Tables']['brands']['Row'];
export type Model = Database['public']['Tables']['models']['Row'];
export type ModelVariant = Database['public']['Tables']['model_variants']['Row'];
export type Color = Database['public']['Tables']['colors']['Row'];
export type DeviceType = Database['public']['Tables']['device_types']['Row'];
export type Product = Database['public']['Tables']['products']['Row'];
export type UsedProductDetail = Database['public']['Tables']['used_product_details']['Row'];
export type User = Database['public']['Tables']['users']['Row'];

// ─── Insert/Update Types (สำหรับ supabase.insert/update) ─────────────────
export type BrandInsert = Database['public']['Tables']['brands']['Insert'];
export type BrandUpdate = Database['public']['Tables']['brands']['Update'];
export type ModelInsert = Database['public']['Tables']['models']['Insert'];
export type ModelUpdate = Database['public']['Tables']['models']['Update'];
export type ModelVariantInsert = Database['public']['Tables']['model_variants']['Insert'];
export type ModelVariantUpdate = Database['public']['Tables']['model_variants']['Update'];
export type ColorInsert = Database['public']['Tables']['colors']['Insert'];
export type ColorUpdate = Database['public']['Tables']['colors']['Update'];
export type ProductInsert = Database['public']['Tables']['products']['Insert'];
export type ProductUpdate = Database['public']['Tables']['products']['Update'];
export type UsedProductDetailInsert = Database['public']['Tables']['used_product_details']['Insert'];

/** Product with optional source (อาจมีใน DB แต่ไม่อยู่ใน schema) */
export type ProductWithSource = Product & { source?: string | null };
export type ProductDetail = Database['public']['Views']['product_details']['Row'];

// Types from products table
export type ProductStatus = Database['public']['Tables']['products']['Row']['status'];
export type ProductType = Database['public']['Tables']['products']['Row']['type'];
export type PaymentMethod = NonNullable<
  Database['public']['Tables']['products']['Row']['payment_method']
>;

// Form types
export interface ProductFormData {
  brand_id: string;
  model_id: string;
  model_variant_id: string;
  color_id: string;
  device_type_id: string;
  type: ProductType;
  imei: string;
  shop_code: string;
  cost_price: number;
  selling_price: number;
  source?: string;
}

export interface SaleFormData {
  product_id: string;
  sold_to: string;
  payment_method: PaymentMethod;
  selling_price: number;
  contract_number?: string;
}

/** ผลลัพธ์การขายสำเร็จ (SaleSuccessScreen / MultiSaleSuccessScreen) */
export interface SaleResultSuccess {
  product: ProductDetail;
  saleData: {
    sold_to: string;
    payment_method: string;
    contract_number?: string;
    selling_price: number;
    sold_at: string;
    sold_by: string;
    sold_by_name?: string;
    profit: number;
  };
}

/** Recharts Tooltip payload entry */
export interface ChartTooltipPayloadEntry {
  name: string;
  value?: number | string;
  color?: string;
  payload?: Record<string, unknown>;
}

// ─── Chart/Report Data Types ────────────────────────────────────────────
export interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

export interface DailySalesChartData {
  date: string;
  sales: number;
  profit: number;
  itemsSold?: number;
}

export interface TopModelData {
  model_name: string;
  brand_name: string;
  storage?: string;
  total_sales: number;
  total_profit?: number;
}

// ─── Custom Error Classes ───────────────────────────────────────────────
export class ProductNotFoundError extends Error {
  constructor(imei?: string) {
    super(imei ? `ไม่พบสินค้า IMEI: ${imei}` : 'ไม่พบสินค้า');
    this.name = 'ProductNotFoundError';
  }
}

export class DuplicateIMEIError extends Error {
  constructor(imei: string) {
    super(`IMEI ${imei} มีในระบบแล้ว`);
    this.name = 'DuplicateIMEIError';
  }
}

export class DuplicateShopCodeError extends Error {
  constructor(shopCode: string) {
    super(`รหัสร้าน ${shopCode} มีในระบบแล้ว`);
    this.name = 'DuplicateShopCodeError';
  }
}

export class InsufficientStockError extends Error {
  constructor() {
    super('สินค้าไม่เพียงพอ');
    this.name = 'InsufficientStockError';
  }
}
