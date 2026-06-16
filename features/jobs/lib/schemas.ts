import { z } from "zod";

export const JOB_TYPES = [
  "video_render",
  "voice_clone",
  "avatar_generate",
  "video_export",
  "caption_generate",
  "video_preview",
  "clip_generate",
] as const;

export const JOB_STATUSES = [
  "queued",
  "running",
  "completed",
  "failed",
  "cancelled",
] as const;

export type JobType = (typeof JOB_TYPES)[number];
export type JobStatus = (typeof JOB_STATUSES)[number];

export const jobCreateMockSchema = z.object({
  type: z.enum(JOB_TYPES),
  title: z.string().trim().min(1, "Title is required").max(200),
});

export type JobRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  type: JobType;
  title: string;
  resource_id: string | null;
  resource_type: string | null;
  status: JobStatus;
  progress: number;
  started_at: string | null;
  completed_at: string | null;
  error_message: string | null;
  duration_ms: number | null;
  created_at: string;
  updated_at: string;
};
