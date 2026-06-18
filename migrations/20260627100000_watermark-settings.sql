-- Alter brand_kits table to support watermark default configurations
ALTER TABLE public.brand_kits
  ADD COLUMN IF NOT EXISTS watermark_text TEXT DEFAULT 'mimic.ai',
  ADD COLUMN IF NOT EXISTS watermark_type TEXT DEFAULT 'text' CHECK (watermark_type IN ('text', 'logo')),
  ADD COLUMN IF NOT EXISTS watermark_position TEXT DEFAULT 'bottom-right' CHECK (watermark_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right')),
  ADD COLUMN IF NOT EXISTS watermark_opacity NUMERIC DEFAULT 0.4 CHECK (watermark_opacity >= 0.1 AND watermark_opacity <= 1.0),
  ADD COLUMN IF NOT EXISTS watermark_size TEXT DEFAULT 'medium' CHECK (watermark_size IN ('small', 'medium', 'large'));

-- Alter video_exports table to support watermark overrides
ALTER TABLE public.video_exports
  ADD COLUMN IF NOT EXISTS watermark_text TEXT,
  ADD COLUMN IF NOT EXISTS watermark_type TEXT CHECK (watermark_type IN ('text', 'logo')),
  ADD COLUMN IF NOT EXISTS watermark_position TEXT CHECK (watermark_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right')),
  ADD COLUMN IF NOT EXISTS watermark_opacity NUMERIC CHECK (watermark_opacity >= 0.1 AND watermark_opacity <= 1.0),
  ADD COLUMN IF NOT EXISTS watermark_size TEXT CHECK (watermark_size IN ('small', 'medium', 'large'));

-- Alter video_clips table to support watermark preferences
ALTER TABLE public.video_clips
  ADD COLUMN IF NOT EXISTS watermark_enabled BOOLEAN DEFAULT true,
  ADD COLUMN IF NOT EXISTS watermark_text TEXT,
  ADD COLUMN IF NOT EXISTS watermark_type TEXT CHECK (watermark_type IN ('text', 'logo')),
  ADD COLUMN IF NOT EXISTS watermark_position TEXT CHECK (watermark_position IN ('top-left', 'top-right', 'bottom-left', 'bottom-right')),
  ADD COLUMN IF NOT EXISTS watermark_opacity NUMERIC CHECK (watermark_opacity >= 0.1 AND watermark_opacity <= 1.0),
  ADD COLUMN IF NOT EXISTS watermark_size TEXT CHECK (watermark_size IN ('small', 'medium', 'large'));
