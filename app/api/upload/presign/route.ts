import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { getPresignedUploadUrl } from "@/lib/r2";
import { buildMediaR2Key } from "@/server/media/r2-keys";
import { requireWorkspaceSession, routeErrorResponse } from "@/server/media/session";
import type { MediaAssetRow } from "@/server/media/types";
import { parseMediaKind, validateUploadRequest } from "@/server/media/validation";

const PRESIGN_EXPIRES_IN = 3600;

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    const body = (await request.json()) as {
      kind?: unknown;
      filename?: unknown;
      contentType?: unknown;
      byteSize?: unknown;
    };

    const kind = parseMediaKind(body.kind);
    const contentType =
      typeof body.contentType === "string" ? body.contentType.trim() : "";
    const filename =
      typeof body.filename === "string" && body.filename.trim().length > 0
        ? body.filename.trim()
        : null;
    const byteSize =
      typeof body.byteSize === "number"
        ? body.byteSize
        : typeof body.byteSize === "string"
          ? Number(body.byteSize)
          : null;

    if (!kind || !contentType) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "kind and contentType are required",
      });
    }

    const validation = validateUploadRequest({ kind, contentType, byteSize });
    if (!validation.ok) {
      throw new TRPCError({ code: "BAD_REQUEST", message: validation.message });
    }

    const assetId = randomUUID();
    const r2ObjectKey = buildMediaR2Key(kind, session.workspaceId, assetId);

    const { data: created, error } = await session.insforge.database
      .from("media_assets")
      .insert({
        id: assetId,
        workspace_id: session.workspaceId,
        created_by: session.userId,
        kind,
        r2_object_key: r2ObjectKey,
        content_type: contentType,
        filename,
        byte_size: byteSize,
        status: "pending",
      })
      .select();

    const asset = created?.[0] as MediaAssetRow | undefined;

    if (error || !asset) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error?.message ?? "Failed to create media asset record",
      });
    }

    const uploadUrl = await getPresignedUploadUrl(
      r2ObjectKey,
      contentType,
      PRESIGN_EXPIRES_IN,
    );

    const row = asset;

    return NextResponse.json({
      assetId: row.id,
      uploadUrl,
      r2ObjectKey: row.r2_object_key,
      expiresIn: PRESIGN_EXPIRES_IN,
      headers: {
        "Content-Type": contentType,
      },
    });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
