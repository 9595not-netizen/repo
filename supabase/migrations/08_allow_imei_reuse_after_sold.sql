-- กฎธุรกิจ: สินค้ามือสอง - เมื่อขายออกแล้ว สามารถเพิ่มเข้าใหม่ได้
-- (ลูกค้าอาจมาขายคืน หรือซื้อเข้ารับเครื่องเดิม IMEI เดียวกัน)
--
-- เปลี่ยนจาก IMEI UNIQUE ทั้งตาราง เป็น UNIQUE เฉพาะสินค้าที่ยังอยู่ในสต๊อก
-- (in_stock, reserved, service) เท่านั้น

-- ลบ constraint UNIQUE เดิม
ALTER TABLE products DROP CONSTRAINT IF EXISTS products_imei_key;

-- สร้าง partial unique index: IMEI ซ้ำได้เฉพาะเมื่อสินค้าเดิมขายแล้ว (status='sold')
CREATE UNIQUE INDEX idx_products_imei_active
  ON products(imei)
  WHERE status IN ('in_stock', 'reserved', 'service');

COMMENT ON INDEX idx_products_imei_active IS 'อนุญาต IMEI ซ้ำเมื่อสินค้าเดิมขายแล้ว - สินค้ามือสองรับคืน/ซื้อเข้ารับใหม่ได้';
