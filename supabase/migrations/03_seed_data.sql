-- Create first admin user
-- NOTE: In a real Supabase environment, you might need to create the auth user via the API or Dashboard.
-- This script assumes you can insert into auth.users (which works in local development or if you have permissions).

-- 1. Create Identity in auth.users
INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, recovery_token)
VALUES (
  '9595.not@gmail.com', 
  crypt('Not99599', gen_salt('bf')), 
  NOW(), 
  '{"provider": "email", "providers": ["email"]}', 
  '{}', 
  NOW(), 
  NOW(), 
  '', 
  ''
)
ON CONFLICT (email) DO NOTHING;

-- 2. Create Profile in public.users
INSERT INTO public.users (id, email, username, password_hash, full_name, role, status)
SELECT 
  id, 
  email, 
  'น๊อต', 
  crypt('Not99599', gen_salt('bf')), 
  'ผู้ดูแลระบบ', 
  'admin', 
  'active'
FROM auth.users
WHERE email = '9595.not@gmail.com'
ON CONFLICT (email) DO NOTHING;
