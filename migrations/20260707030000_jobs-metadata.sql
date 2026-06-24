-- Add metadata field to jobs table for storing job-type specific parameters
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}';

-- Add index for metadata queries
CREATE INDEX IF NOT EXISTS idx_jobs_metadata ON public.jobs USING GIN (metadata);

-- Add trigger_run_id field for tracking Trigger.dev execution
ALTER TABLE public.jobs ADD COLUMN IF NOT EXISTS trigger_run_id TEXT;
CREATE INDEX IF NOT EXISTS idx_jobs_trigger_run_id ON public.jobs(trigger_run_id);