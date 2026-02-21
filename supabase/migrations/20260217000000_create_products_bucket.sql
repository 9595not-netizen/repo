-- Create storage bucket 'products' for backward compatibility
-- Note: 'product-images' is the preferred bucket name, but 'products' may have been used previously
INSERT INTO storage.buckets (id, name, public) VALUES ('products', 'products', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies for 'products' bucket
CREATE POLICY IF NOT EXISTS "Anyone can view products bucket images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'products');

CREATE POLICY IF NOT EXISTS "Authenticated users can upload to products bucket"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'products');

CREATE POLICY IF NOT EXISTS "Authenticated users can update products bucket images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'products');

CREATE POLICY IF NOT EXISTS "Admins can delete products bucket images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'products' AND public.has_role(auth.uid(), 'admin'));
