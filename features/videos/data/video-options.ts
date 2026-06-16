export const VIDEO_ASPECT_RATIOS = ["16:9", "9:16", "1:1"] as const;
export const VIDEO_RESOLUTIONS = ["720p", "1080p", "4k"] as const;

export type VideoAspectRatio = (typeof VIDEO_ASPECT_RATIOS)[number];
export type VideoResolution = (typeof VIDEO_RESOLUTIONS)[number];

export const VIDEO_ASPECT_RATIO_LABELS: Record<VideoAspectRatio, string> = {
  "16:9": "Landscape (16:9)",
  "9:16": "Portrait (9:16)",
  "1:1": "Square (1:1)",
};

export const VIDEO_RESOLUTION_LABELS: Record<VideoResolution, string> = {
  "720p": "720p HD",
  "1080p": "1080p Full HD",
  "4k": "4K Ultra HD",
};

export const VIDEO_STATUSES = [
  "draft",
  "pending",
  "processing",
  "completed",
  "failed",
] as const;

export type VideoStatus = (typeof VIDEO_STATUSES)[number];
