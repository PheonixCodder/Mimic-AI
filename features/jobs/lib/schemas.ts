import { z } from "zod";

export const JOB_TYPES = [
  "video_render",
  "voice_clone",
  "voice_validate", 
  "avatar_generate",
  "avatar_validate",
  "video_export",
  "caption_generate",
  "video_preview",
  "clip_generate",
  "model_finetune",
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

// Voice validation metadata schema
export const voiceValidateMetadataSchema = z.object({
  voice_id: z.string().uuid(),
  voice_name: z.string(),
  r2_object_key: z.string(),
  language: z.string(),
  auto_validation: z.boolean().default(false),
});

export type VoiceValidateMetadata = z.infer<typeof voiceValidateMetadataSchema>;

// Avatar validation metadata schema
export const avatarValidateMetadataSchema = z.object({
  avatar_id: z.string().uuid(),
  avatar_name: z.string(),
  r2_object_key: z.string(),
  auto_validation: z.boolean().default(false),
});

export type AvatarValidateMetadata = z.infer<typeof avatarValidateMetadataSchema>;

// TTS-specific metadata schema
export const voiceCloneMetadataSchema = z.object({
  voice_id: z.string(),
  voice_name: z.string(),
  text: z.string().min(1).max(10000),
  temperature: z.number().min(0).max(2).default(0.8),
  top_p: z.number().min(0).max(1).default(0.95),
  top_k: z.number().min(1).max(10000).default(1000),
  repetition_penalty: z.number().min(1).max(2).default(1.2),
  voice_r2_key: z.string().optional(),
});

export type VoiceCloneMetadata = z.infer<typeof voiceCloneMetadataSchema>;

// Job creation schema for voice cloning
export const voiceCloneJobSchema = z.object({
  type: z.literal("voice_clone"),
  title: z.string().trim().min(1).max(200),
  metadata: voiceCloneMetadataSchema,
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
  trigger_run_id: string | null;
  metadata: Record<string, any> | null;
  estimated_cost: Record<string, any> | null;
  created_at: string;
  updated_at: string;
};
