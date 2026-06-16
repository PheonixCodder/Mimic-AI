import type { MediaKind } from "./types";

const KIND_PREFIX: Record<MediaKind, string> = {
  voice: "voices",
  avatar: "avatars",
  video: "videos",
  preview: "previews",
  asset: "assets",
};

export function buildMediaR2Key(
  kind: MediaKind,
  workspaceId: string,
  assetId: string,
): string {
  return `${KIND_PREFIX[kind]}/${workspaceId}/${assetId}`;
}

export function isKeyWithinWorkspace(key: string, workspaceId: string): boolean {
  return key.includes(`/${workspaceId}/`);
}
