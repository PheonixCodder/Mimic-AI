-- Add voice_validate and avatar_validate job types
ALTER TABLE public.jobs DROP CONSTRAINT IF EXISTS jobs_type_check;
ALTER TABLE public.jobs ADD CONSTRAINT jobs_type_check CHECK (type IN (
  'video_render', 'voice_clone', 'avatar_generate', 'video_export',
  'caption_generate', 'video_preview', 'clip_generate', 'model_finetune',
  'voice_validate', 'avatar_validate'
));