-- ทางเลือกแทนฟังก์ชัน get_user_email_by_username: อนุญาตให้ anon อ่านตาราง users (แอปจะใช้ query ตารางโดยตรงตอนล็อกอิน)
-- รันใน Supabase SQL Editor: copy บรรทัดด้านล่างแล้วกด Run

CREATE POLICY "anon_login_lookup" ON users FOR SELECT TO anon USING (true);
