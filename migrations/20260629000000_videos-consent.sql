ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS consent_confirmed_at TIMESTAMPTZ;
