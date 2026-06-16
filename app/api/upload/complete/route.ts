import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { headObject } from "@/lib/r2";
import { requireWorkspaceSession, routeErrorResponse } from "@/server/media/session";
import type { MediaAssetRow } from "@/server/media/types";

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    const body = (await request.json()) as { assetId?: unknown };

    if (typeof body.assetId !== "string" || body.assetId.length === 0) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "assetId is required",
      });
    }

    const { data: assets, error } = await session.insforge.database
      .from("media_assets")
      .select("*")
      .eq("id", body.assetId)
      .eq("workspace_id", session.workspaceId)
      .limit(1);

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    const asset = assets?.[0] as MediaAssetRow | undefined;

    if (!asset) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Media asset not found" });
    }

    if (asset.status === "ready") {
      return NextResponse.json({
        assetId: asset.id,
        status: asset.status,
        mediaUrl: `/api/media/${asset.id}`,
      });
    }

    try {
      const objectMeta = await headObject(asset.r2_object_key);

      const { data: updatedRows, error: updateError } = await session.insforge.database
        .from("media_assets")
        .update({
          status: "ready",
          byte_size: objectMeta.contentLength || asset.byte_size,
          content_type: objectMeta.contentType || asset.content_type,
        })
        .eq("id", asset.id)
        .eq("workspace_id", session.workspaceId)
        .select();

      const updated = updatedRows?.[0];

      if (updateError || !updated) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError?.message ?? "Failed to finalize upload",
        });
      }

      return NextResponse.json({
        assetId: asset.id,
        status: "ready",
        mediaUrl: `/api/media/${asset.id}`,
      });
    } catch {
      await session.insforge.database
        .from("media_assets")
        .update({ status: "failed" })
        .eq("id", asset.id)
        .eq("workspace_id", session.workspaceId);

      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Uploaded object was not found in storage",
      });
    }
  } catch (error) {
    return routeErrorResponse(error);
  }
}
