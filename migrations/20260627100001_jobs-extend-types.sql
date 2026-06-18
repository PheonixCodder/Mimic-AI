ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_type_check;

ALTER TABLE public.jobs ADD CONSTRAINT jobs_type_check CHECK (type IN (
  'video_render', 'voice_clone', 'avatar_generate', 'video_export', 'caption_generate', 'video_preview', 'clip_generate'
));

ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_resource_type_check;

ALTER TABLE public.jobs ADD CONSTRAINT jobs_resource_type_check CHECK (
  resource_type IS NULL OR resource_type IN ('video', 'voice', 'avatar', 'export', 'clip')
);
