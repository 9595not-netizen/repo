-- Enable RLS on all tables
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_product_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- Users: Read (staff + admin)
CREATE POLICY "Users can view all users"
  ON users FOR SELECT
  USING (auth.role() = 'authenticated');

-- Users: Insert (admin only)
CREATE POLICY "Only admins can create users"
  ON users FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users: Update (admin or self)
CREATE POLICY "Users can update themselves, admins can update all"
  ON users FOR UPDATE
  USING (
    id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Users: Delete (admin only)
CREATE POLICY "Only admins can delete users"
  ON users FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Master Data: Read (all authenticated)
CREATE POLICY "All authenticated users can read brands"
  ON brands FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can read models"
  ON models FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can read model_variants"
  ON model_variants FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can read colors"
  ON colors FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "All authenticated users can read device_types"
  ON device_types FOR SELECT
  USING (auth.role() = 'authenticated');

-- Master Data: Insert/Update/Delete (admin only)
CREATE POLICY "Only admins can modify brands"
  ON brands FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can modify models"
  ON models FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can modify model_variants"
  ON model_variants FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can modify colors"
  ON colors FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

CREATE POLICY "Only admins can modify device_types"
  ON device_types FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Products: Read (all authenticated)
CREATE POLICY "All authenticated users can view products"
  ON products FOR SELECT
  USING (auth.role() = 'authenticated');

-- Products: Insert (all authenticated)
CREATE POLICY "Authenticated users can add products"
  ON products FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    created_by = auth.uid()
  );

-- Products: Update (all authenticated)
CREATE POLICY "Authenticated users can update products"
  ON products FOR UPDATE
  USING (auth.role() = 'authenticated');

-- Products: Delete (admin only)
CREATE POLICY "Only admins can delete products"
  ON products FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM users 
      WHERE id = auth.uid() AND role = 'admin'
    )
  );

-- Used Product Details: Read (all authenticated)
CREATE POLICY "All authenticated users can view used product details"
  ON used_product_details FOR SELECT
  USING (auth.role() = 'authenticated');

-- Used Product Details: Insert/Update (all authenticated)
CREATE POLICY "Authenticated users can modify used product details"
  ON used_product_details FOR ALL
  USING (auth.role() = 'authenticated');

-- Inventory Logs: Read (all authenticated)
CREATE POLICY "All authenticated users can view logs"
  ON inventory_logs FOR SELECT
  USING (auth.role() = 'authenticated');

-- Inventory Logs: Insert (all authenticated)
CREATE POLICY "Authenticated users can create logs"
  ON inventory_logs FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated' AND
    action_by = auth.uid()
  );

-- ⚠️ NO UPDATE/DELETE POLICIES (Append-Only) for inventory_logs
