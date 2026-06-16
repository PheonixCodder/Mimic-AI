import type { ClipStyle, ClipDuration, ClipAspectRatio, ClipResolution } from "../lib/schemas";

export const CLIP_STYLE_LABELS: Record<ClipStyle, string> = {
  cinematic: 'Cinematic',
  animated: 'Animated',
  abstract: 'Abstract',
  nature: 'Nature',
  minimal: 'Minimal',
};

export const CLIP_DURATION_LABELS: Record<ClipDuration, string> = {
  3: '3 seconds',
  5: '5 seconds',
  10: '10 seconds',
  15: '15 seconds',
};

export const CLIP_ASPECT_RATIO_LABELS: Record<ClipAspectRatio, string> = {
  '16:9': 'Landscape (16:9)',
  '9:16': 'Portrait (9:16)',
  '1:1': 'Square (1:1)',
};

export const CLIP_RESOLUTION_LABELS: Record<ClipResolution, string> = {
  '720p': '720p HD',
  '1080p': '1080p Full HD',
};

export const CLIP_STATUSES = [
  'draft',
  'pending',
  'processing',
  'completed',
  'failed',
] as const;

export type ClipStatus = (typeof CLIP_STATUSES)[number];
