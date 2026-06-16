-- Link videos to canonical scripts; videos.script remains snapshot at draft save

ALTER TABLE public.videos
  ADD COLUMN script_id UUID REFERENCES public.scripts(id) ON DELETE SET NULL;

CREATE INDEX idx_videos_script_id ON public.videos(script_id);
