import { TRPCError } from "@trpc/server";

import { getObjectStream } from "@/lib/r2";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import type { VideoExportRow, VideoRow } from "@/features/videos/lib/schemas";
import { routeErrorResponse } from "@/server/media/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ exportId: string }> },
) {
  try {
    const { exportId } = await params;
    const insforge = await createInsForgeServerClient();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    // Retrieve export item
    const { data: exports, error: exportError } = await insforge.database
      .from("video_exports")
      .select("*")
      .eq("id", exportId)
      .limit(1);

    if (exportError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: exportError.message,
      });
    }

    const exportItem = exports?.[0] as VideoExportRow | undefined;

    if (!exportItem) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Export not found" });
    }

    // Verify workspace membership
    const { data: members, error: memberError } = await insforge.database
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", authData.user.id)
      .eq("workspace_id", exportItem.workspace_id)
      .limit(1);

    if (memberError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: memberError.message,
      });
    }

    if (!members?.[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Export not found" });
    }

    if (exportItem.status !== "completed") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Export is not ready for download",
      });
    }

    // Retrieve base video to get the actual source file (mock fallback)
    const { data: videos, error: videoError } = await insforge.database
      .from("videos")
      .select("*")
      .eq("id", exportItem.video_id)
      .limit(1);

    if (videoError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: videoError.message,
      });
    }

    const video = videos?.[0] as VideoRow | undefined;

    if (!video || !video.r2_object_key) {
      throw new TRPCError({
        code: "NOT_FOUND",
        message: "Source video output not found",
      });
    }

    // Try to stream the export's custom key, fall back to base video key if not uploaded yet
    let objectKey = exportItem.r2_object_key || video.r2_object_key;
    let object;

    try {
      object = await getObjectStream(objectKey);
    } catch (e) {
      console.warn("Custom export file not found in R2, streaming base video instead", e);
      objectKey = video.r2_object_key;
      object = await getObjectStream(objectKey);
    }

    const headers = new Headers({
      "Content-Type": object.contentType,
      "Cache-Control": "private, max-age=3600",
      "Content-Disposition": `attachment; filename="video-export-${exportId}.${exportItem.format}"`,
    });

    if (object.contentLength != null) {
      headers.set("Content-Length", String(object.contentLength));
    }

    return new Response(object.body, { headers });
  } catch (error) {
    if (error instanceof TRPCError) {
      const status =
        error.code === "UNAUTHORIZED"
          ? 401
          : error.code === "NOT_FOUND"
            ? 404
            : error.code === "BAD_REQUEST"
              ? 409
              : 500;

      return new Response(error.message, { status });
    }

    return routeErrorResponse(error);
  }
}
