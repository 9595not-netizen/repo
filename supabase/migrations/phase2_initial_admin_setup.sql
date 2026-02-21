-- =============================================================================
-- Phase 2: Initial Admin Setup (สร้าง admin user แรก)
-- รันหลังสร้าง user ใน Supabase Authentication แล้ว (ดูขั้นตอนใน docs/PHASE2_INITIAL_ADMIN_SETUP.md)
-- =============================================================================

-- วิธีที่ 1: ถ้าสร้าง user ใน Dashboard แล้ว ให้แทนที่ 'your-admin@example.com' และ 'admin_username', 'ชื่อแอดมิน'
-- แล้วรัน SQL นี้ (จะดึง id จาก auth.users มาใส่ public.users)
INSERT INTO public.users (id, email, username, password_hash, full_name, role, status)
SELECT
  id,
  email,
  'admin_username',   -- เปลี่ยนเป็นชื่อผู้ใช้ที่ใช้ล็อกอิน (เช่น น๊อต)
  '',                 -- รหัสอยู่ที่ Supabase Auth ไม่เก็บใน public.users
  'ชื่อแอดมิน',       -- เปลี่ยนเป็นชื่อที่แสดง
  'admin',
  'active'
FROM auth.users
WHERE email = 'your-admin@example.com'
LIMIT 1
ON CONFLICT (id) DO NOTHING;

-- วิธีที่ 2: ถ้ามี user id (UUID) จาก Dashboard อยู่แล้ว ใช้แบบนี้แทน
-- INSERT INTO public.users (id, email, username, password_hash, full_name, role, status)
-- VALUES (
--   'xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx',  -- ใส่ UUID จาก Authentication > Users
--   'your-admin@example.com',
--   'admin_username',
--   '',
--   'ชื่อแอดมิน',
--   'admin',
--   'active'
-- )
-- ON CONFLICT (id) DO NOTHING;
