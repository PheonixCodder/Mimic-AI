export const MEDIA_KINDS = ["voice", "avatar", "video", "preview", "asset"] as const;

export type MediaKind = (typeof MEDIA_KINDS)[number];

export type MediaAssetStatus = "pending" | "ready" | "failed";

export type MediaAssetRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  kind: MediaKind;
  r2_object_key: string;
  content_type: string;
  filename: string | null;
  byte_size: number | null;
  status: MediaAssetStatus;
  created_at: string;
  updated_at: string;
};
