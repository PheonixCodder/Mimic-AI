ALTER TABLE public.avatars
  ADD COLUMN IF NOT EXISTS model_variant_id UUID REFERENCES public.model_variants(id) ON DELETE SET NULL;
