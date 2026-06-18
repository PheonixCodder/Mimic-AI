import { z } from "zod";

import { watermarkFieldsSchema } from "@/lib/watermark";

export const CLIP_STYLES = ['cinematic', 'animated', 'abstract', 'nature', 'minimal'] as const;
export const CLIP_DURATIONS = [3, 5, 10, 15] as const;
export const CLIP_ASPECT_RATIOS = ['16:9', '9:16', '1:1'] as const;
export const CLIP_RESOLUTIONS = ['720p', '1080p'] as const;

export type ClipStyle = (typeof CLIP_STYLES)[number];
export type ClipDuration = (typeof CLIP_DURATIONS)[number];
export type ClipAspectRatio = (typeof CLIP_ASPECT_RATIOS)[number];
export type ClipResolution = (typeof CLIP_RESOLUTIONS)[number];

export const clipCreateSchema = z
  .object({
    title: z.string().trim().min(1, "Title is required").max(200),
    prompt: z.string().trim().min(1, "Prompt is required").max(2000),
    style: z.enum(CLIP_STYLES),
    durationSeconds: z.number().int().min(3).max(30),
    aspectRatio: z.enum(CLIP_ASPECT_RATIOS),
    resolution: z.enum(CLIP_RESOLUTIONS),
    projectId: z.string().uuid().optional(),
  })
  .merge(watermarkFieldsSchema);

export type ClipCreateInput = z.infer<typeof clipCreateSchema>;

export type ClipRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  project_id: string | null;
  title: string;
  prompt: string;
  style: string;
  duration_seconds: number;
  aspect_ratio: string;
  resolution: string;
  status: string;
  watermark_enabled: boolean;
  watermark_text: string | null;
  watermark_type: "text" | "logo" | null;
  watermark_position:
    | "top-left"
    | "top-right"
    | "bottom-left"
    | "bottom-right"
    | null;
  watermark_opacity: number | null;
  watermark_size: "small" | "medium" | "large" | null;
  r2_object_key: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
};
