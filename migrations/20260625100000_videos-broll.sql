-- Add B-roll clips storage to videos table
ALTER TABLE public.videos ADD COLUMN IF NOT EXISTS broll_clips JSONB DEFAULT '[]';
