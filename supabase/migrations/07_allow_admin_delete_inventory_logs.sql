-- อนุญาตให้ admin ลบ inventory_logs ได้ (เพื่อให้สามารถลบ product ได้)
-- เมื่อลบสินค้า ต้องลบ inventory_logs และ used_product_details ก่อน เนื่องจาก FK constraint

CREATE POLICY "Only admins can delete inventory logs"
  ON inventory_logs FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid() AND role = 'admin'
    )
  );
