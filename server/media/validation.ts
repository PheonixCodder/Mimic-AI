import { MEDIA_KINDS, type MediaKind } from "./types";

const AUDIO_TYPES = new Set([
  "audio/mpeg",
  "audio/wav",
  "audio/x-wav",
  "audio/webm",
  "audio/ogg",
  "audio/mp4",
]);

const IMAGE_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

const VIDEO_TYPES = new Set(["video/mp4", "video/webm", "video/quicktime"]);

const KIND_CONTENT_TYPES: Record<MediaKind, ReadonlySet<string>> = {
  voice: AUDIO_TYPES,
  avatar: IMAGE_TYPES,
  video: VIDEO_TYPES,
  preview: new Set([...IMAGE_TYPES, ...VIDEO_TYPES, ...AUDIO_TYPES]),
  asset: new Set([...AUDIO_TYPES, ...IMAGE_TYPES, ...VIDEO_TYPES]),
};

const MAX_BYTES: Record<MediaKind, number> = {
  voice: 25 * 1024 * 1024,
  avatar: 10 * 1024 * 1024,
  video: 500 * 1024 * 1024,
  preview: 50 * 1024 * 1024,
  asset: 100 * 1024 * 1024,
};

export function parseMediaKind(value: unknown): MediaKind | null {
  return typeof value === "string" && MEDIA_KINDS.includes(value as MediaKind)
    ? (value as MediaKind)
    : null;
}

export function validateUploadRequest({
  kind,
  contentType,
  byteSize,
}: {
  kind: MediaKind;
  contentType: string;
  byteSize?: number | null;
}) {
  const allowedTypes = KIND_CONTENT_TYPES[kind];

  if (!allowedTypes.has(contentType)) {
    return {
      ok: false as const,
      message: `Content type "${contentType}" is not allowed for ${kind} uploads`,
    };
  }

  if (byteSize != null) {
    if (!Number.isFinite(byteSize) || byteSize <= 0) {
      return { ok: false as const, message: "byteSize must be a positive number" };
    }

    if (byteSize > MAX_BYTES[kind]) {
      return {
        ok: false as const,
        message: `File exceeds the ${Math.floor(MAX_BYTES[kind] / (1024 * 1024))}MB limit for ${kind} uploads`,
      };
    }
  }

  return { ok: true as const };
}
