-- บันทึกการขาย 1 รายการแบบ atomic (ป้องกันขายสินค้าเดียวกันซ้ำเมื่อกดพร้อมกัน)

CREATE OR REPLACE FUNCTION complete_single_sale(
  p_product_id UUID,
  p_sold_to TEXT,
  p_payment_method TEXT,
  p_contract_number TEXT,
  p_selling_price DECIMAL,
  p_sold_at TIMESTAMPTZ,
  p_sold_by UUID,
  p_action_by UUID DEFAULT NULL
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_action_by UUID := COALESCE(p_action_by, p_sold_by);
BEGIN
  UPDATE products
  SET
    status = 'sold',
    selling_price = p_selling_price,
    sold_by = p_sold_by,
    sold_to = p_sold_to,
    payment_method = p_payment_method,
    contract_number = CASE
      WHEN p_payment_method = 'ผ่อนชำระ' THEN p_contract_number
      ELSE NULL
    END,
    sold_at = p_sold_at,
    updated_at = NOW()
  WHERE id = p_product_id AND status = 'in_stock';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบสินค้าสำหรับขาย หรือสินค้านี้ถูกขายไปแล้ว';
  END IF;

  INSERT INTO inventory_logs (product_id, action_type, action_by, action_note)
  VALUES (
    p_product_id,
    'sell',
    v_action_by,
    'ขายให้: ' || p_sold_to || ' (' || p_payment_method || ')'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION complete_single_sale(
  UUID, TEXT, TEXT, TEXT, DECIMAL, TIMESTAMPTZ, UUID, UUID
) TO authenticated;
