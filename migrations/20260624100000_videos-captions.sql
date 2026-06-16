-- Add subtitles, subtitles_status, and subtitles_error to public.videos table
ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS subtitles_status TEXT DEFAULT 'none' CHECK (subtitles_status IN ('none', 'pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS subtitles_error TEXT,
  ADD COLUMN IF NOT EXISTS subtitles JSONB;
