
-- Enable RLS on tables missing it
ALTER TABLE public.colors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.device_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.model_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.models ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.used_product_details ENABLE ROW LEVEL SECURITY;

-- Create security definer function for role checking (avoids infinite recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE id = _user_id AND role = _role
  )
$$;

-- Colors RLS
CREATE POLICY "All authenticated users can read colors"
  ON public.colors FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify colors"
  ON public.colors FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Device Types RLS
CREATE POLICY "All authenticated users can read device_types"
  ON public.device_types FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify device_types"
  ON public.device_types FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Models RLS
CREATE POLICY "All authenticated users can read models"
  ON public.models FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify models"
  ON public.models FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Model Variants RLS
CREATE POLICY "All authenticated users can read model_variants"
  ON public.model_variants FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Only admins can modify model_variants"
  ON public.model_variants FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Used Product Details RLS
CREATE POLICY "All authenticated users can read used_product_details"
  ON public.used_product_details FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Authenticated users can insert used_product_details"
  ON public.used_product_details FOR INSERT TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update used_product_details"
  ON public.used_product_details FOR UPDATE TO authenticated
  USING (true);

CREATE POLICY "Only admins can delete used_product_details"
  ON public.used_product_details FOR DELETE TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Create storage bucket for product images
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Anyone can view product images"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can upload product images"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'product-images');

CREATE POLICY "Authenticated users can update product images"
  ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'product-images');

CREATE POLICY "Admins can delete product images"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'product-images' AND public.has_role(auth.uid(), 'admin'));
