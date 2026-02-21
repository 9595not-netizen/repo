-- Function: Get Low Stock Alerts (สินค้าเหลือต่ำกว่า 2 ตัว)
-- นับจำนวนสินค้าตามรุ่น (model_variant_id) ที่ status = 'in_stock' และจำนวน < 2
CREATE OR REPLACE FUNCTION get_low_stock_alerts(threshold_count INTEGER DEFAULT 2)
RETURNS TABLE (
  model_variant_id UUID,
  brand_name TEXT,
  model_name TEXT,
  storage TEXT,
  color_name TEXT,
  device_type_name TEXT,
  type TEXT,
  stock_count BIGINT,
  threshold INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    mv.id as model_variant_id,
    b.name as brand_name,
    m.model_name,
    mv.storage,
    c.name as color_name,
    dt.name as device_type_name,
    p.type,
    COUNT(p.id) FILTER (WHERE p.status = 'in_stock') as stock_count,
    threshold_count as threshold
  FROM model_variants mv
  JOIN models m ON mv.model_id = m.id
  JOIN brands b ON m.brand_id = b.id
  JOIN products p ON p.model_variant_id = mv.id
  JOIN colors c ON p.color_id = c.id
  JOIN device_types dt ON p.device_type_id = dt.id
  WHERE p.status = 'in_stock'
    AND mv.status = 'active'
    AND m.status = 'active'
    AND b.status = 'active'
  GROUP BY mv.id, b.name, m.model_name, mv.storage, c.name, dt.name, p.type
  HAVING COUNT(p.id) FILTER (WHERE p.status = 'in_stock') < threshold_count
  ORDER BY stock_count ASC, brand_name, model_name;
END;
$$ LANGUAGE plpgsql SECURITY INVOKER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_low_stock_alerts(INTEGER) TO authenticated;
