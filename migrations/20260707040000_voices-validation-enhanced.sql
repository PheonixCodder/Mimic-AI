-- Add enhanced validation fields to voices table
ALTER TABLE public.voices ADD COLUMN IF NOT EXISTS validation_results JSONB;
ALTER TABLE public.voices ADD COLUMN IF NOT EXISTS auto_validated_at TIMESTAMPTZ;

-- Add index for validation queries
CREATE INDEX IF NOT EXISTS idx_voices_auto_validated_at ON public.voices(auto_validated_at);
CREATE INDEX IF NOT EXISTS idx_voices_validation_results ON public.voices USING GIN (validation_results);