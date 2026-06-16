import { TRPCError } from "@trpc/server";

import { getObjectStream, getPresignedDownloadUrl } from "@/lib/r2";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import type { VideoRow } from "@/features/videos/lib/schemas";
import { routeErrorResponse } from "@/server/media/session";
import { isCloudinaryConfigured, getSignedFetchUrl } from "@/lib/cloudinary";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ videoId: string }> },
) {
  try {
    const { videoId } = await params;
    const insforge = await createInsForgeServerClient();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const { data: videos, error } = await insforge.database
      .from("videos")
      .select("*")
      .eq("id", videoId)
      .limit(1);

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    const video = videos?.[0] as VideoRow | undefined;

    if (!video) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
    }

    const { data: members, error: memberError } = await insforge.database
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", authData.user.id)
      .eq("workspace_id", video.workspace_id)
      .limit(1);

    if (memberError) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: memberError.message,
      });
    }

    if (!members?.[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
    }

    if (!video.r2_object_key && !video.preview_object_key) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Video is not available yet",
      });
    }

    // Check for preview query parameter
    const { searchParams } = new URL(request.url);
    const isPreview = searchParams.get("preview") === "true";
    const objectKey = isPreview
      ? video.preview_object_key
      : video.r2_object_key;

    if (!objectKey) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: isPreview ? "Preview is not available yet" : "Video is not available yet",
      });
    }

    // Check for resize/poster query parameters
    const w = searchParams.get("w");
    const h = searchParams.get("h");
    const poster = searchParams.get("poster") === "true";

    if (isCloudinaryConfigured() && (w || h)) {
      const width = w ? parseInt(w, 10) : undefined;
      const height = h ? parseInt(h, 10) : undefined;

      if ((width && !isNaN(width)) || (height && !isNaN(height))) {
        // Generate a 1-hour presigned URL for Cloudinary to fetch the private R2 file
        const presignedUrl = await getPresignedDownloadUrl(objectKey, 3600);

        // Generate signed Cloudinary URL
        const cloudinaryUrl = getSignedFetchUrl(presignedUrl, {
          resourceType: "video",
          width: width && !isNaN(width) ? width : undefined,
          height: height && !isNaN(height) ? height : undefined,
          crop: "fill",
          gravity: "auto",
          format: poster ? "jpg" : undefined,
        });

        // 307 Temporary Redirect to the signed Cloudinary URL
        return Response.redirect(cloudinaryUrl, 307);
      }
    }

    const object = await getObjectStream(objectKey);

    const headers = new Headers({
      "Content-Type": object.contentType,
      "Cache-Control": "private, max-age=3600",
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
