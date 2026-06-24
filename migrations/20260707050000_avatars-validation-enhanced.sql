-- Add enhanced validation fields to avatars table
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS validation_results JSONB;
ALTER TABLE public.avatars ADD COLUMN IF NOT EXISTS auto_validated_at TIMESTAMPTZ;

-- Add index for validation queries
CREATE INDEX IF NOT EXISTS idx_avatars_auto_validated_at ON public.avatars(auto_validated_at);
CREATE INDEX IF NOT EXISTS idx_avatars_validation_results ON public.avatars USING GIN (validation_results);