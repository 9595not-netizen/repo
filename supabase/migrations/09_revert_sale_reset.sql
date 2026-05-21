-- ยกเลิกการขาย: คืนสต๊อกและล้างข้อมูลการขายครั้งก่อนทั้งหมด (เริ่มรอบใหม่เมื่อขายอีกครั้ง)

CREATE OR REPLACE FUNCTION revert_sale(p_product_id UUID, p_actor UUID)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_cost DECIMAL;
  v_shop_code TEXT;
BEGIN
  SELECT cost_price, shop_code
  INTO v_cost, v_shop_code
  FROM products
  WHERE id = p_product_id AND status = 'sold';

  IF NOT FOUND THEN
    RAISE EXCEPTION 'ไม่พบสินค้าที่ขายแล้ว หรือสถานะไม่ใช่ sold';
  END IF;

  UPDATE products
  SET
    status = 'in_stock',
    sold_to = NULL,
    sold_at = NULL,
    sold_by = NULL,
    payment_method = NULL,
    contract_number = NULL,
    selling_price = v_cost,
    updated_at = NOW()
  WHERE id = p_product_id;

  INSERT INTO inventory_logs (product_id, action_type, action_by, action_note)
  VALUES (
    p_product_id,
    'return',
    p_actor,
    'ยกเลิกการขาย — ล้างข้อมูลการขายเดิม (Shop: ' || COALESCE(v_shop_code, '-') || ')'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION revert_sale(UUID, UUID) TO authenticated;
