-- =============================================================================
-- Phase 1: Database Foundation (8 ตาราง)
-- รันใน Supabase SQL Editor หรือใช้ supabase db push
-- ข้อกำหนด: RLS ทุกตาราง, FK ON DELETE RESTRICT, shop_code UNIQUE,
--           inventory_logs append-only, Indexes: imei, shop_code, status, created_at
-- =============================================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- -----------------------------------------------------------------------------
-- 1. users
-- -----------------------------------------------------------------------------
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email TEXT UNIQUE NOT NULL,
  username TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('admin', 'staff')),
  phone TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);
CREATE INDEX idx_users_created_at ON users(created_at);

-- -----------------------------------------------------------------------------
-- 2. brands
-- -----------------------------------------------------------------------------
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_brands_status ON brands(status);
CREATE INDEX idx_brands_created_at ON brands(created_at);

-- -----------------------------------------------------------------------------
-- 3. models
-- -----------------------------------------------------------------------------
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  model_name TEXT NOT NULL,
  main_image TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, model_name)
);
CREATE INDEX idx_models_brand_id ON models(brand_id);
CREATE INDEX idx_models_status ON models(status);
CREATE INDEX idx_models_created_at ON models(created_at);

-- -----------------------------------------------------------------------------
-- 4. model_variants
-- -----------------------------------------------------------------------------
CREATE TABLE model_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE RESTRICT,
  storage TEXT NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_id, storage)
);
CREATE INDEX idx_model_variants_model_id ON model_variants(model_id);
CREATE INDEX idx_model_variants_created_at ON model_variants(created_at);

-- -----------------------------------------------------------------------------
-- 5. colors
-- -----------------------------------------------------------------------------
CREATE TABLE colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  hex_code TEXT,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_colors_status ON colors(status);
CREATE INDEX idx_colors_created_at ON colors(created_at);

-- -----------------------------------------------------------------------------
-- 6. products (shop_code UNIQUE, Indexes: imei, shop_code, status, created_at)
-- -----------------------------------------------------------------------------
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_code TEXT UNIQUE NOT NULL,
  imei TEXT UNIQUE NOT NULL,
  model_variant_id UUID NOT NULL REFERENCES model_variants(id) ON DELETE RESTRICT,
  color_id UUID NOT NULL REFERENCES colors(id) ON DELETE RESTRICT,
  type TEXT NOT NULL CHECK (type IN ('มือ 1', 'มือ 2')),
  cost_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  profit DECIMAL(10,2) GENERATED ALWAYS AS (selling_price - cost_price) STORED,
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'reserved', 'sold', 'service')),
  created_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  sold_by UUID REFERENCES users(id) ON DELETE RESTRICT,
  sold_to TEXT,
  payment_method TEXT CHECK (payment_method IN ('เงินสด', 'ผ่อนชำระ')),
  contract_number TEXT,
  received_date DATE,
  sold_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_products_shop_code ON products(shop_code);
CREATE INDEX idx_products_imei ON products(imei);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_sold_at ON products(sold_at);
CREATE INDEX idx_products_model_variant_id ON products(model_variant_id);

-- -----------------------------------------------------------------------------
-- 7. used_product_details
-- -----------------------------------------------------------------------------
CREATE TABLE used_product_details (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE RESTRICT,
  condition_grade TEXT NOT NULL CHECK (condition_grade IN ('A', 'B', 'C', 'F')),
  condition_note TEXT,
  battery_health INTEGER CHECK (battery_health >= 0 AND battery_health <= 100),
  has_box BOOLEAN DEFAULT false,
  has_charger BOOLEAN DEFAULT false,
  has_cable BOOLEAN DEFAULT false,
  has_headphone BOOLEAN DEFAULT false,
  images JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_used_product_details_condition_grade ON used_product_details(condition_grade);

-- -----------------------------------------------------------------------------
-- 8. inventory_logs (append-only: ห้ามลบ)
-- -----------------------------------------------------------------------------
CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL CHECK (action_type IN ('add', 'sell', 'reserve', 'cancel_reserve', 'service', 'return')),
  action_by UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
  action_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_action_type ON inventory_logs(action_type);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at);
CREATE INDEX idx_inventory_logs_action_by ON inventory_logs(action_by);

-- =============================================================================
-- RLS (Row Level Security) – เปิดทุกตาราง
-- =============================================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE brands ENABLE ROW LEVEL SECURITY;
ALTER TABLE models ENABLE ROW LEVEL SECURITY;
ALTER TABLE model_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE products ENABLE ROW LEVEL SECURITY;
ALTER TABLE used_product_details ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_logs ENABLE ROW LEVEL SECURITY;

-- -----------------------------------------------------------------------------
-- RLS: users
-- -----------------------------------------------------------------------------
CREATE POLICY "users_select_authenticated" ON users FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "users_insert_admin" ON users FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "users_update_self_or_admin" ON users FOR UPDATE USING (
  id = auth.uid() OR EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);
CREATE POLICY "users_delete_admin" ON users FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- -----------------------------------------------------------------------------
-- RLS: brands, models, model_variants, colors (master data)
-- -----------------------------------------------------------------------------
CREATE POLICY "brands_select_authenticated" ON brands FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "brands_all_admin" ON brands FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "models_select_authenticated" ON models FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "models_all_admin" ON models FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "model_variants_select_authenticated" ON model_variants FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "model_variants_all_admin" ON model_variants FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

CREATE POLICY "colors_select_authenticated" ON colors FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "colors_all_admin" ON colors FOR ALL USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- -----------------------------------------------------------------------------
-- RLS: products
-- -----------------------------------------------------------------------------
CREATE POLICY "products_select_authenticated" ON products FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "products_insert_authenticated" ON products FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND created_by = auth.uid()
);
CREATE POLICY "products_update_authenticated" ON products FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "products_delete_admin" ON products FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- -----------------------------------------------------------------------------
-- RLS: used_product_details
-- -----------------------------------------------------------------------------
CREATE POLICY "used_product_details_select_authenticated" ON used_product_details FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "used_product_details_insert_authenticated" ON used_product_details FOR INSERT WITH CHECK (auth.role() = 'authenticated');
CREATE POLICY "used_product_details_update_authenticated" ON used_product_details FOR UPDATE USING (auth.role() = 'authenticated');
CREATE POLICY "used_product_details_delete_admin" ON used_product_details FOR DELETE USING (
  EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin')
);

-- -----------------------------------------------------------------------------
-- RLS: inventory_logs (append-only – ไม่มี UPDATE/DELETE policy)
-- -----------------------------------------------------------------------------
CREATE POLICY "inventory_logs_select_authenticated" ON inventory_logs FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY "inventory_logs_insert_authenticated" ON inventory_logs FOR INSERT WITH CHECK (
  auth.role() = 'authenticated' AND action_by = auth.uid()
);
-- ไม่สร้าง policy สำหรับ UPDATE/DELETE เพื่อให้ append-only

-- =============================================================================
-- Optional: ถ้าแอปใช้ device_types (ประเภทเครื่อง) ให้รันส่วนนี้เพิ่ม
-- =============================================================================
-- CREATE TABLE device_types (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   name TEXT UNIQUE NOT NULL,
--   code TEXT UNIQUE NOT NULL,
--   status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
--   created_at TIMESTAMPTZ DEFAULT NOW(),
--   updated_at TIMESTAMPTZ DEFAULT NOW()
-- );
-- ALTER TABLE products ADD COLUMN device_type_id UUID REFERENCES device_types(id) ON DELETE RESTRICT;
-- ALTER TABLE products ALTER COLUMN device_type_id SET NOT NULL; -- หลังมีข้อมูลใน device_types
-- ALTER TABLE device_types ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "device_types_select_authenticated" ON device_types FOR SELECT USING (auth.role() = 'authenticated');
-- CREATE POLICY "device_types_all_admin" ON device_types FOR ALL USING (EXISTS (SELECT 1 FROM users WHERE id = auth.uid() AND role = 'admin'));
