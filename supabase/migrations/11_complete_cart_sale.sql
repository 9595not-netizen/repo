-- บันทึกการขายหลายรายการในบิลเดียวแบบ atomic (ทั้งหมดสำเร็จหรือยกเลิกทั้งชุด)

CREATE OR REPLACE FUNCTION complete_cart_sale(
  p_items JSONB,
  p_sold_to TEXT,
  p_payment_method TEXT,
  p_contract_number TEXT,
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
  v_item JSONB;
  v_product_id UUID;
  v_selling_price DECIMAL;
  v_action_by UUID := COALESCE(p_action_by, p_sold_by);
  v_note TEXT := 'ขายให้: ' || p_sold_to || ' (' || p_payment_method || ')';
BEGIN
  IF p_items IS NULL OR jsonb_typeof(p_items) <> 'array' OR jsonb_array_length(p_items) = 0 THEN
    RAISE EXCEPTION 'ไม่มีรายการขาย';
  END IF;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;
    v_selling_price := COALESCE((v_item->>'selling_price')::DECIMAL, 0);

    UPDATE products
    SET
      status = 'sold',
      selling_price = v_selling_price,
      sold_by = p_sold_by,
      sold_to = p_sold_to,
      payment_method = p_payment_method,
      contract_number = CASE
        WHEN p_payment_method = 'ผ่อนชำระ' THEN p_contract_number
        ELSE NULL
      END,
      sold_at = p_sold_at,
      updated_at = NOW()
    WHERE id = v_product_id AND status = 'in_stock';

    IF NOT FOUND THEN
      RAISE EXCEPTION 'ไม่พบสินค้าสำหรับขาย หรือสินค้านี้ถูกขายไปแล้ว';
    END IF;
  END LOOP;

  FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
  LOOP
    v_product_id := (v_item->>'product_id')::UUID;

    INSERT INTO inventory_logs (product_id, action_type, action_by, action_note)
    VALUES (v_product_id, 'sell', v_action_by, v_note);
  END LOOP;
END;
$$;

GRANT EXECUTE ON FUNCTION complete_cart_sale(
  JSONB, TEXT, TEXT, TEXT, TIMESTAMPTZ, UUID, UUID
) TO authenticated;
