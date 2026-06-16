import { TRPCError } from "@trpc/server";

import { getObjectStream, getPresignedDownloadUrl } from "@/lib/r2";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { routeErrorResponse } from "@/server/media/session";
import type { MediaAssetRow } from "@/server/media/types";
import { isCloudinaryConfigured, getSignedFetchUrl } from "@/lib/cloudinary";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ assetId: string }> },
) {
  try {
    const { assetId } = await params;
    const insforge = await createInsForgeServerClient();
    const { data: authData, error: authError } = await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { data: assets, error } = await insforge.database
      .from("media_assets")
      .select("*")
      .eq("id", assetId)
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

    if (asset.status !== "ready") {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Media is not ready yet",
      });
    }

    // Check for resize query parameters
    const { searchParams } = new URL(request.url);
    const w = searchParams.get("w");
    const h = searchParams.get("h");
    const poster = searchParams.get("poster") === "true";

    if (isCloudinaryConfigured() && (w || h)) {
      const width = w ? parseInt(w, 10) : undefined;
      const height = h ? parseInt(h, 10) : undefined;

      if ((width && !isNaN(width)) || (height && !isNaN(height))) {
        // Generate a 1-hour presigned URL for Cloudinary to fetch the private R2 file
        const presignedUrl = await getPresignedDownloadUrl(asset.r2_object_key, 3600);

        const isVideo = asset.content_type?.startsWith("video/");
        
        // Generate signed Cloudinary URL
        const cloudinaryUrl = getSignedFetchUrl(presignedUrl, {
          resourceType: isVideo ? "video" : "image",
          width: width && !isNaN(width) ? width : undefined,
          height: height && !isNaN(height) ? height : undefined,
          crop: "fill",
          gravity: isVideo ? "auto" : "face",
          format: isVideo && poster ? "jpg" : undefined,
        });

        // 307 Temporary Redirect to the signed Cloudinary URL
        return Response.redirect(cloudinaryUrl, 307);
      }
    }

    const object = await getObjectStream(asset.r2_object_key);

    const headers = new Headers({
      "Content-Type": object.contentType,
      "Cache-Control": "private, max-age=3600",
    });

    if (object.contentLength != null) {
      headers.set("Content-Length", String(object.contentLength));
    }

    if (asset.filename) {
      headers.set(
        "Content-Disposition",
        `inline; filename="${asset.filename.replace(/"/g, "")}"`,
      );
    }

    return new Response(object.body, { headers });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
