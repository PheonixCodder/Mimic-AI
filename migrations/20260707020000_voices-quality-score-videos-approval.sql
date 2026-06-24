ALTER TABLE public.voices ADD COLUMN IF NOT EXISTS quality_score DOUBLE PRECISION;

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS approval_status TEXT NOT NULL DEFAULT 'pending'
    CHECK (approval_status IN ('pending', 'approved')),
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
