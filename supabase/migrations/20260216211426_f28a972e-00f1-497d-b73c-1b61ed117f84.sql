
-- Fix function search_path issues
CREATE OR REPLACE FUNCTION public.get_stock_summary()
RETURNS TABLE (total_in_stock bigint, total_sold bigint, total_reserved bigint, total_value numeric, new_devices bigint, used_devices bigint)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
$$;

CREATE OR REPLACE FUNCTION public.get_today_sales()
RETURNS TABLE (total_sales bigint, total_revenue numeric, total_profit numeric)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT 
    COUNT(*) as total_sales,
    COALESCE(SUM(selling_price), 0) as total_revenue,
    COALESCE(SUM(profit), 0) as total_profit
  FROM products
  WHERE DATE(sold_at) = CURRENT_DATE;
END;
$$;

CREATE OR REPLACE FUNCTION public.get_top_selling_models(limit_count integer DEFAULT 5)
RETURNS TABLE (brand_name text, model_name text, storage text, total_sold bigint, total_revenue numeric)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
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
$$;

-- Fix product_details view - recreate with security_invoker
DROP VIEW IF EXISTS public.product_details;
CREATE VIEW public.product_details WITH (security_invoker=on) AS
SELECT 
  p.id, p.shop_code, p.imei,
  b.name as brand_name, m.model_name, m.main_image, mv.storage,
  c.name as color_name, c.hex_code as color_hex,
  dt.name as device_type_name, dt.code as device_type_code,
  p.type, p.cost_price, p.selling_price, p.profit, p.status,
  p.payment_method, p.contract_number, p.received_date,
  p.sold_to, p.sold_at,
  creator.full_name as created_by_name,
  seller.full_name as sold_by_name,
  p.created_at, p.updated_at,
  upd.condition_grade, upd.condition_note, upd.battery_health,
  upd.has_box, upd.has_charger, upd.has_cable, upd.has_headphone,
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
