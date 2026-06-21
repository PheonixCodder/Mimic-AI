-- Add voice_validate and avatar_validate to allowed jobs types
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_type_check CHECK (type IN (
  'video_render', 'voice_clone', 'voice_validate', 'avatar_generate', 'avatar_validate',
  'video_export', 'caption_generate', 'video_preview', 'clip_generate', 'model_finetune'
));
