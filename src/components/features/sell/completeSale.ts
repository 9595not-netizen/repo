import { supabase } from '@/lib/supabase';
import { supabaseHelpers } from '@/lib/supabase-helpers';

export interface CompleteSaleInput {
  productId: string;
  soldTo: string;
  paymentMethod: 'เงินสด' | 'ผ่อนชำระ';
  contractNumber?: string | null;
  sellingPrice: number;
  soldAtIso: string;
  soldByUserId: string;
  actionByUserId: string;
}

export interface CartSaleLineInput {
  productId: string;
  sellingPrice: number;
}

export interface CompleteManySaleInput {
  lines: CartSaleLineInput[];
  soldTo: string;
  paymentMethod: 'เงินสด' | 'ผ่อนชำระ';
  contractNumber?: string | null;
  soldAtIso: string;
  soldByUserId: string;
  actionByUserId: string;
}

export function isRpcMissingError(error: unknown): boolean {
  if (!error || typeof error !== 'object') return false;
  const code = (error as { code?: string }).code;
  const msg = (error as { message?: string }).message ?? '';
  return code === 'PGRST202' || /404|not found|function/i.test(msg);
}

function priceForPayment(
  paymentMethod: CompleteSaleInput['paymentMethod'],
  sellingPrice: number
): number {
  return paymentMethod === 'ผ่อนชำระ' ? 0 : sellingPrice;
}

/** บันทึกการขาย 1 รายการ (RPC หรือ fallback เดิม) */
export async function completeOneSale(input: CompleteSaleInput): Promise<void> {
  const priceToSave = priceForPayment(input.paymentMethod, input.sellingPrice);

  let usedRpc = false;
  try {
    const { error: rpcError } = await supabase.rpc('complete_single_sale', {
      p_product_id: input.productId,
      p_sold_to: input.soldTo,
      p_payment_method: input.paymentMethod,
      p_contract_number: input.contractNumber ?? null,
      p_selling_price: priceToSave,
      p_sold_at: input.soldAtIso,
      p_sold_by: input.soldByUserId,
      p_action_by: input.actionByUserId,
    });

    if (rpcError) {
      if (!isRpcMissingError(rpcError)) {
        throw rpcError;
      }
    } else {
      usedRpc = true;
    }
  } catch (e) {
    if (!isRpcMissingError(e)) {
      throw e;
    }
  }

  if (!usedRpc) {
    await completeOneSaleFallback(input, priceToSave);
  }
}

/** บันทึกการขายหลายรายการในบิลเดียว (RPC หรือ fallback ทีละรายการ) */
export async function completeManySales(input: CompleteManySaleInput): Promise<void> {
  if (input.lines.length === 0) {
    throw new Error('ไม่มีรายการขาย');
  }

  const pItems = input.lines.map((line) => ({
    product_id: line.productId,
    selling_price: priceForPayment(input.paymentMethod, line.sellingPrice),
  }));

  let usedRpc = false;
  try {
    const { error: rpcError } = await supabase.rpc('complete_cart_sale', {
      p_items: pItems,
      p_sold_to: input.soldTo,
      p_payment_method: input.paymentMethod,
      p_contract_number: input.contractNumber ?? null,
      p_sold_at: input.soldAtIso,
      p_sold_by: input.soldByUserId,
      p_action_by: input.actionByUserId,
    });

    if (rpcError) {
      if (!isRpcMissingError(rpcError)) {
        throw rpcError;
      }
    } else {
      usedRpc = true;
    }
  } catch (e) {
    if (!isRpcMissingError(e)) {
      throw e;
    }
  }

  if (!usedRpc) {
    for (const line of input.lines) {
      await completeOneSale({
        productId: line.productId,
        soldTo: input.soldTo,
        paymentMethod: input.paymentMethod,
        contractNumber: input.contractNumber,
        sellingPrice: line.sellingPrice,
        soldAtIso: input.soldAtIso,
        soldByUserId: input.soldByUserId,
        actionByUserId: input.actionByUserId,
      });
    }
  }
}

async function completeOneSaleFallback(
  input: CompleteSaleInput,
  priceToSave: number
): Promise<void> {
  const { data: updatedProduct, error: updateError } = await supabase
    .from('products')
    .update({
      status: 'sold',
      selling_price: priceToSave,
      sold_by: input.soldByUserId,
      sold_to: input.soldTo,
      payment_method: input.paymentMethod,
      contract_number: input.paymentMethod === 'ผ่อนชำระ' ? input.contractNumber : null,
      sold_at: input.soldAtIso,
    } as never)
    .eq('id', input.productId)
    .eq('status', 'in_stock')
    .select()
    .single();

  if (updateError) throw updateError;

  if (!updatedProduct) {
    throw new Error('ไม่พบสินค้าสำหรับขาย หรือสินค้านี้ถูกขายไปแล้ว');
  }

  const { error: logError } = await supabaseHelpers.insertInventoryLog(supabase, {
    product_id: input.productId,
    action_type: 'sell',
    action_by: input.actionByUserId,
    action_note: `ขายให้: ${input.soldTo} (${input.paymentMethod})`,
  });
  if (logError) {
    console.error('Inventory log error (completeOneSale):', logError);
  }
}

export function soldAtToIso(soldAtDate: string): string {
  return soldAtDate
    ? new Date(soldAtDate + 'T12:00:00.000').toISOString()
    : new Date().toISOString();
}
