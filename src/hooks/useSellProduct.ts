import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { supabaseHelpers } from '@/lib/supabase-helpers';
import type { Database } from '@/types/database.types';
import { useAuth } from '@/contexts/AuthContext';

type ProductDetail = Database['public']['Views']['product_details']['Row'];

export interface SellProductData {
  productId: string;
  soldTo: string;
  sellingPrice: number;
  paymentMethod: 'เงินสด' | 'ผ่อนชำระ';
  contractNumber?: string;
  soldAt: string; // วันที่ขาย
  soldBy?: string; // พนักงานขาย (ถ้าไม่ระบุจะใช้ user.id อัตโนมัติ)
}

/**
 * Phase 6: Hook สำหรับขายสินค้า
 * - UPDATE products (status='sold', sold_by, sold_to, sold_at)
 * - INSERT inventory_logs (action_type='sell')
 * - ใช้ user.id อัตโนมัติจากผู้ที่ล็อกอิน
 */
export function useSellProduct() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const { user } = useAuth();

  const sellProduct = async (data: SellProductData) => {
    setLoading(true);
    setError(null);
    try {
      // ใช้ user.id อัตโนมัติจากผู้ที่ล็อกอิน
      if (!user) {
        throw new Error('กรุณาล็อกอินก่อนบันทึกการขาย');
      }
      
      const soldByUserId = data.soldBy || user.id;
      const profit = data.sellingPrice - (await getProductCost(data.productId));
      const timestamp = new Date().toISOString();

      // อัปเดตสินค้า (เฉพาะกรณียังพร้อมขายอยู่เท่านั้น)
      const { data: updatedProduct, error: updateError } = await supabase
        .from('products')
        .update({
          status: 'sold',
          sold_by: soldByUserId,
          sold_to: data.soldTo,
          sold_at: data.soldAt,
          selling_price: data.sellingPrice,
          payment_method: data.paymentMethod,
          contract_number: data.paymentMethod === 'ผ่อนชำระ' ? data.contractNumber : null,
          updated_at: timestamp, // บันทึก timestamp
        } as never)
        .eq('id', data.productId)
        .eq('status', 'in_stock')
        .select()
        .single();

      if (updateError) throw updateError;

      if (!updatedProduct) {
        throw new Error('ไม่พบสินค้าสำหรับขาย หรือสินค้านี้ถูกขายไปแล้ว');
      }

      // บันทึก inventory log พร้อม timestamp (ถ้า log ล้มเหลว จะไม่ยกเลิกการขาย แต่ log error ไว้)
      const { error: logError } = await supabaseHelpers.insertInventoryLog(supabase, {
        product_id: data.productId,
        action_type: 'sell',
        action_by: soldByUserId,
        action_note: `ขายให้: ${data.soldTo} | วิธีชำระ: ${data.paymentMethod}${data.contractNumber ? ` | สัญญา: ${data.contractNumber}` : ''} | ราคาขาย: ฿${data.sellingPrice.toLocaleString()} | กำไร: ฿${profit.toLocaleString()}`,
      });

      if (logError) {
        console.error('Inventory log error (useSellProduct):', logError);
      }

      return { success: true, profit, soldBy: soldByUserId };
    } catch (e) {
      const err = e instanceof Error ? e : new Error('ไม่สามารถขายสินค้าได้');
      setError(err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  const getProductCost = async (productId: string): Promise<number> => {
    try {
      const { data, error } = await supabase.from('products').select('cost_price').eq('id', productId).single();
      if (error) throw error;
      return data?.cost_price ?? 0;
    } catch (e) {
      throw new Error('ไม่สามารถโหลดราคาทุนได้ กรุณาลองใหม่อีกครั้ง');
    }
  };

  return { sellProduct, loading, error };
}
