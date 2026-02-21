-- Function: Get email + status by username (สำหรับหน้า Login ก่อนมี auth - หลีกเลี่ยง RLS 406)
CREATE OR REPLACE FUNCTION get_user_email_by_username(lookup_username TEXT)
RETURNS TABLE (email TEXT, status TEXT) AS $$
BEGIN
  RETURN QUERY
  SELECT u.email::TEXT, u.status::TEXT
  FROM users u
  WHERE u.username = lookup_username
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ให้ anon เรียกได้ (หน้า Login ยังไม่มี token)
GRANT EXECUTE ON FUNCTION get_user_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_email_by_username(TEXT) TO authenticated;

-- Function: Get Stock Summary
CREATE OR REPLACE FUNCTION get_stock_summary()
RETURNS TABLE (
  total_in_stock BIGINT,
  total_sold BIGINT,
  total_reserved BIGINT,
  total_value DECIMAL,
  new_devices BIGINT,
  used_devices BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) FILTER (WHERE status = 'in_stock') as total_in_stock,
    COUNT(*) FILTER (WHERE status = 'sold') as total_sold,
    COUNT(*) FILTER (WHERE status = 'reserved') as total_reserved,
    COALESCE(SUM(selling_price) FILTER (WHERE status = 'in_stock'), 0) as total_value,
    COUNT(*) FILTER (WHERE type = 'มือ 1') as new_devices,
    COUNT(*) FILTER (WHERE type = 'มือ 2') as used_devices
  FROM products;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Today's Sales
CREATE OR REPLACE FUNCTION get_today_sales()
RETURNS TABLE (
  total_sales BIGINT,
  total_revenue DECIMAL,
  total_profit DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_sales,
    COALESCE(SUM(selling_price), 0) as total_revenue,
    COALESCE(SUM(profit), 0) as total_profit
  FROM products
  WHERE DATE(sold_at) = CURRENT_DATE;
END;
$$ LANGUAGE plpgsql;

-- Function: Get Top Selling Models
CREATE OR REPLACE FUNCTION get_top_selling_models(limit_count INT DEFAULT 5)
RETURNS TABLE (
  brand_name TEXT,
  model_name TEXT,
  storage TEXT,
  total_sold BIGINT,
  total_revenue DECIMAL
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    b.name as brand_name,
    m.model_name,
    mv.storage,
    COUNT(p.id) as total_sold,
    SUM(p.selling_price) as total_revenue
  FROM products p
  JOIN model_variants mv ON p.model_variant_id = mv.id
  JOIN models m ON mv.model_id = m.id
  JOIN brands b ON m.brand_id = b.id
  WHERE p.status = 'sold'
  GROUP BY b.name, m.model_name, mv.storage
  ORDER BY total_sold DESC
  LIMIT limit_count;
END;
$$ LANGUAGE plpgsql;

-- View: Product Details
CREATE OR REPLACE VIEW product_details AS
SELECT 
  p.id,
  p.shop_code,
  p.imei,
  b.name as brand_name,
  m.model_name,
  m.main_image,
  mv.storage,
  c.name as color_name,
  c.hex_code as color_hex,
  dt.name as device_type_name,
  dt.code as device_type_code,
  p.type,
  p.cost_price,
  p.selling_price,
  p.profit,
  p.status,
  p.payment_method,
  p.contract_number,
  p.received_date,
  p.sold_to,
  p.sold_at,
  creator.full_name as created_by_name,
  seller.full_name as sold_by_name,
  p.created_at,
  p.updated_at,
  -- Used product details (if applicable)
  upd.condition_grade,
  upd.condition_note,
  upd.battery_health,
  upd.has_box,
  upd.has_charger,
  upd.has_cable,
  upd.has_headphone,
  upd.images as product_images
FROM products p
JOIN model_variants mv ON p.model_variant_id = mv.id
JOIN models m ON mv.model_id = m.id
JOIN brands b ON m.brand_id = b.id
JOIN colors c ON p.color_id = c.id
JOIN device_types dt ON p.device_type_id = dt.id
LEFT JOIN users creator ON p.created_by = creator.id
LEFT JOIN users seller ON p.sold_by = seller.id
LEFT JOIN used_product_details upd ON p.id = upd.product_id;
