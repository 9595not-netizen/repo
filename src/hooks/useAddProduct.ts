import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseHelpers } from '@/lib/supabase-helpers';
import type { Database } from '@/types/database.types';
import { useAuth } from '@/contexts/AuthContext';

type ProductInsert = Database['public']['Tables']['products']['Insert'];
type UsedDetailsInsert = Database['public']['Tables']['used_product_details']['Insert'];

export interface AddProductData {
  shop_code: string;
  imei: string;
  model_variant_id: string;
  color_id: string;
  device_type_id: string;
  type: 'มือ 1' | 'มือ 2';
  cost_price: number;
  received_date?: string;
  source?: string; // ที่มา
  created_by?: string; // ถ้าไม่ระบุจะใช้ user.id อัตโนมัติ
  // มือสอง
  condition_grade?: 'A' | 'B' | 'C' | 'F';
  battery_health?: number;
  has_box?: boolean;
  has_charger?: boolean;
  has_cable?: boolean;
  has_headphone?: boolean;
  condition_note?: string;
  images?: File[]; // รูปภาพ (max 4)
}

/**
 * Phase 6: Hook สำหรับเพิ่มสินค้า
 * - Validate shop_code/IMEI ซ้ำ
 * - Insert products + used_product_details (ถ้ามือสอง)
 * - Insert inventory_logs
 * - Upload images
 * - ใช้ user.id อัตโนมัติจากผู้ที่ล็อกอิน
 */
export function useAddProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const checkDuplicate = async (shopCode: string, imei: string): Promise<{ shopCodeExists: boolean; imeiExists: boolean }> => {
    try {
      const [shopRes, imeiRes] = await Promise.all([
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('shop_code', shopCode),
        // IMEI ซ้ำได้เฉพาะเมื่อสินค้าเดิมขายแล้ว (มือสองรับคืน/ซื้อเข้ารับใหม่)
        supabase.from('products').select('id', { count: 'exact', head: true }).eq('imei', imei).in('status', ['in_stock', 'reserved', 'service']),
      ]);
      return {
        shopCodeExists: (shopRes.count ?? 0) > 0,
        imeiExists: (imeiRes.count ?? 0) > 0,
      };
    } catch (e) {
      throw new Error('ไม่สามารถตรวจสอบข้อมูลซ้ำได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const uploadImages = async (files: File[]): Promise<string[]> => {
    if (files.length === 0) return [];
    const urls: string[] = [];
    try {
      for (const file of files) {
        const ext = file.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${ext}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(fileName, file);
        if (uploadError) throw new Error(uploadError.message || 'อัปโหลดรูปภาพไม่สำเร็จ');
        const { data: { publicUrl } } = supabase.storage.from('product-images').getPublicUrl(fileName);
        urls.push(publicUrl);
      }
      return urls;
    } catch (e) {
      throw e instanceof Error ? e : new Error('ไม่สามารถอัปโหลดรูปภาพได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  const addProduct = async (data: AddProductData) => {
    setLoading(true);
    setError(null);
    try {
      // ใช้ user.id อัตโนมัติจากผู้ที่ล็อกอิน
      if (!user) {
        throw new Error('กรุณาล็อกอินก่อนบันทึกสินค้า');
      }
      
      const createdByUserId = data.created_by || user.id;
      const timestamp = new Date().toISOString();
      
      const dup = await checkDuplicate(data.shop_code, data.imei);
      if (dup.shopCodeExists) throw new Error('Shop Code นี้มีในระบบแล้ว');
      if (dup.imeiExists) throw new Error('IMEI นี้มีสินค้าอื่นในสต๊อกอยู่แล้ว');

      let imageUrls: string[] = [];
      if (data.images && data.images.length > 0) {
        imageUrls = await uploadImages(data.images);
      }

      const productData: ProductInsert = {
        shop_code: data.shop_code,
        imei: data.imei,
        model_variant_id: data.model_variant_id,
        color_id: data.color_id,
        device_type_id: data.device_type_id,
        type: data.type,
        cost_price: data.cost_price,
        selling_price: data.cost_price, // ตั้งราคาขายเท่ากับราคาทุนก่อน (แก้ไขได้ในหน้า Sell)
        received_date: data.received_date,
        status: 'in_stock',
        created_by: createdByUserId,
        created_at: timestamp, // บันทึก timestamp
        updated_at: timestamp, // บันทึก timestamp
      };

      const { data: product, error: productError } = await supabaseHelpers.insertProduct(supabase, productData);
      if (productError) throw productError;
      if (!product) throw new Error('ไม่สามารถสร้างสินค้าได้');
      
      type ProductRow = Database['public']['Tables']['products']['Row'];
      const productRow = product as ProductRow;
      const productId = productRow.id;
      if (!productId) throw new Error('ไม่สามารถสร้างสินค้าได้');

      // มือ 2: บันทึก used_product_details เสมอ | มือ 1: บันทึกเมื่อมีรูปบิล/ที่มา
      const needUsedDetails = data.type === 'มือ 2' || (data.type === 'มือ 1' && imageUrls.length > 0);
      if (needUsedDetails) {
        const usedData: UsedDetailsInsert = {
          product_id: productId,
          condition_grade: data.type === 'มือ 2' ? (data.condition_grade || 'C') : 'A',
          battery_health: data.type === 'มือ 2' ? data.battery_health ?? null : null,
          has_box: data.has_box ?? false,
          has_charger: data.has_charger ?? false,
          has_cable: data.has_cable ?? false,
          has_headphone: data.has_headphone ?? false,
          condition_note: data.type === 'มือ 2' ? (data.condition_note ?? null) : null,
          images: imageUrls.length > 0 ? imageUrls : [],
        };
        const { error: usedError } = await supabaseHelpers.insertUsedDetails(supabase, usedData);
        if (usedError) throw usedError;
      }

      // บันทึก inventory log พร้อม timestamp
      await supabaseHelpers.insertInventoryLog(supabase, {
        product_id: productId,
        action_type: 'add',
        action_by: createdByUserId,
        action_note: `เพิ่มสินค้าใหม่ [Shop Code: ${data.shop_code}]${data.source ? ` | ที่มา: ${data.source}` : ''} | ราคาทุน: ฿${data.cost_price.toLocaleString()}`,
      });

      return product;
    } catch (e) {
      const err = e instanceof Error ? e : new Error('ไม่สามารถเพิ่มสินค้าได้');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return { addProduct, loading, error, checkDuplicate };
}
