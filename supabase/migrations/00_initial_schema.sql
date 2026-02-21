-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. users
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

-- Indexes
CREATE INDEX idx_users_username ON users(username);
CREATE INDEX idx_users_role ON users(role);

-- 2. brands
CREATE TABLE brands (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_brands_status ON brands(status);

-- 3. models
CREATE TABLE models (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  brand_id UUID NOT NULL REFERENCES brands(id) ON DELETE RESTRICT,
  model_name TEXT NOT NULL,
  main_image TEXT, -- URL to Supabase Storage
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(brand_id, model_name)
);

-- Indexes
CREATE INDEX idx_models_brand_id ON models(brand_id);
CREATE INDEX idx_models_status ON models(status);

-- 4. model_variants (ความจุ)
CREATE TABLE model_variants (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE RESTRICT,
  storage TEXT NOT NULL, -- '128GB', '256GB', etc.
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_id, storage)
);

-- Indexes
CREATE INDEX idx_model_variants_model_id ON model_variants(model_id);

-- 5. colors
CREATE TABLE colors (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL,
  hex_code TEXT, -- '#f6c7ff', '#000000', etc.
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_colors_status ON colors(status);

-- 6. device_types (ประเภทเครื่อง)
CREATE TABLE device_types (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT UNIQUE NOT NULL, -- 'เครื่องศูนย์ ZP', 'เครื่องนอก HK', etc.
  code TEXT UNIQUE NOT NULL, -- 'ZP', 'HK', 'TH', 'LL'
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_device_types_status ON device_types(status);

-- 7. products (สินค้าหลัก)
CREATE TABLE products (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  shop_code TEXT UNIQUE NOT NULL, -- รหัสสินค้าร้าน เช่น 'C001'
  imei TEXT UNIQUE NOT NULL, -- IMEI 15 หลัก
  
  -- Foreign Keys
  model_variant_id UUID NOT NULL REFERENCES model_variants(id) ON DELETE RESTRICT,
  color_id UUID NOT NULL REFERENCES colors(id) ON DELETE RESTRICT,
  device_type_id UUID NOT NULL REFERENCES device_types(id) ON DELETE RESTRICT,
  
  -- Product Info
  type TEXT NOT NULL CHECK (type IN ('มือ 1', 'มือ 2')),
  cost_price DECIMAL(10,2) NOT NULL,
  selling_price DECIMAL(10,2) NOT NULL,
  profit DECIMAL(10,2) GENERATED ALWAYS AS (selling_price - cost_price) STORED,
  
  -- Status
  status TEXT NOT NULL DEFAULT 'in_stock' CHECK (status IN ('in_stock', 'reserved', 'sold', 'service')),
  
  -- Transaction Info
  created_by UUID REFERENCES users(id),
  sold_by UUID REFERENCES users(id),
  sold_to TEXT, -- ชื่อผู้ซื้อ
  payment_method TEXT CHECK (payment_method IN ('เงินสด', 'ผ่อนชำระ')),
  contract_number TEXT, -- เลขที่สัญญา (สำหรับผ่อนชำระ)
  received_date DATE, -- วันที่รับเข้า
  sold_at TIMESTAMPTZ,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes (CRITICAL for Performance)
CREATE INDEX idx_products_shop_code ON products(shop_code);
CREATE INDEX idx_products_imei ON products(imei);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_type ON products(type);
CREATE INDEX idx_products_model_variant_id ON products(model_variant_id);
CREATE INDEX idx_products_created_at ON products(created_at);
CREATE INDEX idx_products_sold_at ON products(sold_at);

-- 8. used_product_details (รายละเอียดสินค้ามือสอง)
CREATE TABLE used_product_details (
  product_id UUID PRIMARY KEY REFERENCES products(id) ON DELETE CASCADE,
  
  -- สภาพเครื่อง
  condition_grade TEXT NOT NULL CHECK (condition_grade IN ('A', 'B', 'C', 'F')),
  condition_note TEXT,
  battery_health INTEGER CHECK (battery_health >= 0 AND battery_health <= 100),
  
  -- อุปกรณ์ประกอบ
  has_box BOOLEAN DEFAULT false,
  has_charger BOOLEAN DEFAULT false,
  has_cable BOOLEAN DEFAULT false,
  has_headphone BOOLEAN DEFAULT false,
  
  -- รูปภาพ (max 4 images)
  images JSONB DEFAULT '[]'::jsonb,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_used_products_condition_grade ON used_product_details(condition_grade);

-- 9. inventory_logs (บันทึกการเคลื่อนไหว - Append-Only)
CREATE TABLE inventory_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE RESTRICT,
  action_type TEXT NOT NULL CHECK (action_type IN ('add', 'sell', 'reserve', 'cancel_reserve', 'service', 'return')),
  action_by UUID NOT NULL REFERENCES users(id),
  action_note TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes
CREATE INDEX idx_inventory_logs_product_id ON inventory_logs(product_id);
CREATE INDEX idx_inventory_logs_action_type ON inventory_logs(action_type);
CREATE INDEX idx_inventory_logs_created_at ON inventory_logs(created_at);
CREATE INDEX idx_inventory_logs_action_by ON inventory_logs(action_by);
