-- =============================================================================
-- RPC Function: Reset User Password (Admin Only)
-- =============================================================================
-- สร้างฟังก์ชันสำหรับรีเซ็ตรหัสผ่านของผู้ใช้ (เฉพาะ admin)
-- ใช้ผ่าน Supabase Auth Admin API

CREATE OR REPLACE FUNCTION reset_user_password(target_user_id UUID, new_password TEXT)
RETURNS BOOLEAN AS $$
DECLARE
  current_user_role TEXT;
BEGIN
  -- ตรวจสอบว่า current user เป็น admin หรือไม่
  SELECT role INTO current_user_role
  FROM users
  WHERE id = auth.uid();

  IF current_user_role != 'admin' THEN
    RAISE EXCEPTION 'Only admins can reset passwords';
  END IF;

  -- ตรวจสอบว่า target user มีอยู่จริง
  IF NOT EXISTS (SELECT 1 FROM users WHERE id = target_user_id) THEN
    RAISE EXCEPTION 'User not found';
  END IF;

  -- Note: การรีเซ็ตรหัสผ่านจริงๆ ต้องทำผ่าน Supabase Auth Admin API
  -- ฟังก์ชันนี้จะ return true เพื่อบอกว่า validation ผ่าน
  -- แต่การอัปเดตรหัสผ่านจริงต้องทำผ่าน client-side ด้วย auth.admin.updateUserById()
  -- หรือใช้ Supabase Dashboard
  
  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission to authenticated users (แต่จะ check role ใน function)
GRANT EXECUTE ON FUNCTION reset_user_password(UUID, TEXT) TO authenticated;
