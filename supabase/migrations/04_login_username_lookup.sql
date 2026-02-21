-- แก้ 404/406 ตอน Login: สร้างฟังก์ชันดึง email จาก username (ใช้ได้ก่อนมี auth)
--
-- วิธีรัน: เปิด Supabase Dashboard > SQL Editor > New query
--         copy โค้ดด้านล่างทั้งหมด (จาก CREATE ถึง authenticated;) ไปวาง > กด Run
--

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

GRANT EXECUTE ON FUNCTION get_user_email_by_username(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_user_email_by_username(TEXT) TO authenticated;
