-- Videos: add columns for speech audio, preview video, and preview status tracking

ALTER TABLE public.videos
  ADD COLUMN IF NOT EXISTS audio_object_key TEXT,
  ADD COLUMN IF NOT EXISTS preview_object_key TEXT,
  ADD COLUMN IF NOT EXISTS preview_status TEXT DEFAULT 'idle' CHECK (preview_status IN ('idle', 'pending', 'processing', 'completed', 'failed')),
  ADD COLUMN IF NOT EXISTS preview_error TEXT;
