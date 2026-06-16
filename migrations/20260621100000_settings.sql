-- Migration: Add notification preferences to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS notification_preferences JSONB DEFAULT '{"video_render": true, "billing_alerts": true}'::jsonb;
