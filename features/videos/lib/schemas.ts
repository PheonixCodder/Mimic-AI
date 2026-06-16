import { z } from "zod";

import {
  VIDEO_ASPECT_RATIOS,
  VIDEO_RESOLUTIONS,
} from "@/features/videos/data/video-options";

export const videoCreateSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  scriptId: z.string().uuid("Script is required"),
  voiceId: z.string().uuid("Voice is required"),
  avatarId: z.string().uuid("Avatar is required"),
  projectId: z.string().uuid().optional().nullable(),
  aspectRatio: z.enum(VIDEO_ASPECT_RATIOS),
  resolution: z.enum(VIDEO_RESOLUTIONS),
});

export interface BRollClip {
  id: string;
  provider: "pexels" | "pixabay" | "mock";
  title: string;
  thumbnailUrl: string;
  previewUrl: string;
  duration: number;
  width: number;
  height: number;
  tags: string[];
}

export type VideoRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  project_id: string | null;
  script_id: string | null;
  voice_id: string | null;
  avatar_id: string | null;
  title: string;
  script: string;
  aspect_ratio: string;
  resolution: string;
  status: string;
  r2_object_key: string | null;
  audio_object_key: string | null;
  preview_object_key: string | null;
  preview_status: string;
  preview_error: string | null;
  subtitles_status: string;
  subtitles_error: string | null;
  subtitles: { start: number; end: number; text: string }[] | null;
  broll_clips?: BRollClip[] | null;
  created_at: string;
  updated_at: string;
};

export const videoExportCreateSchema = z.object({
  videoId: z.string().uuid("Video ID is required"),
  resolution: z.enum(VIDEO_RESOLUTIONS),
  format: z.enum(["mp4", "webm"]),
  watermarkEnabled: z.boolean(),
});

export type VideoExportCreateInput = z.infer<typeof videoExportCreateSchema>;

export type VideoExportRow = {
  id: string;
  video_id: string;
  workspace_id: string;
  created_by: string;
  resolution: "720p" | "1080p" | "4k";
  format: "mp4" | "webm";
  watermark_enabled: boolean;
  status: "pending" | "processing" | "completed" | "failed";
  r2_object_key: string | null;
  r2_object_url: string | null;
  created_at: string;
  updated_at: string;
};
