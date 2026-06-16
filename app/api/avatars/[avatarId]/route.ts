import { TRPCError } from "@trpc/server";

import { getObjectStream, getPresignedDownloadUrl } from "@/lib/r2";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import type { AvatarRow } from "@/features/avatars/lib/schemas";
import { routeErrorResponse } from "@/server/media/session";
import { isCloudinaryConfigured, getSignedFetchUrl } from "@/lib/cloudinary";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ avatarId: string }> },
) {
  try {
    const { avatarId } = await params;
    const insforge = await createInsForgeServerClient();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const { data: avatars, error } = await insforge.database
      .from("avatars")
      .select("*")
      .eq("id", avatarId)
      .limit(1);

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    const avatar = avatars?.[0] as AvatarRow | undefined;

    if (!avatar) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Avatar not found" });
    }

    if (avatar.variant === "custom") {
      if (!avatar.workspace_id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Avatar not found" });
      }

      const { data: members, error: memberError } = await insforge.database
         .from("workspace_members")
         .select("workspace_id")
         .eq("user_id", authData.user.id)
         .eq("workspace_id", avatar.workspace_id)
         .limit(1);

      if (memberError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: memberError.message,
        });
      }

      if (!members?.[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Avatar not found" });
      }
    }

    if (!avatar.r2_object_key) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Avatar image is not available yet",
      });
    }

    // Check for resize query parameters
    const { searchParams } = new URL(request.url);
    const w = searchParams.get("w");
    const h = searchParams.get("h");

    if (isCloudinaryConfigured() && (w || h)) {
      const width = w ? parseInt(w, 10) : undefined;
      const height = h ? parseInt(h, 10) : undefined;

      if ((width && !isNaN(width)) || (height && !isNaN(height))) {
        // Generate a 1-hour presigned URL for Cloudinary to fetch the private R2 file
        const presignedUrl = await getPresignedDownloadUrl(avatar.r2_object_key, 3600);

        // Generate signed Cloudinary URL
        const cloudinaryUrl = getSignedFetchUrl(presignedUrl, {
          resourceType: "image",
          width: width && !isNaN(width) ? width : undefined,
          height: height && !isNaN(height) ? height : undefined,
          crop: "fill",
          gravity: "face",
        });

        // 307 Temporary Redirect to the signed Cloudinary URL
        return Response.redirect(cloudinaryUrl, 307);
      }
    }

    const object = await getObjectStream(avatar.r2_object_key);

    const headers = new Headers({
      "Content-Type": object.contentType,
      "Cache-Control":
        avatar.variant === "system"
          ? "public, max-age=86400"
          : "private, max-age=3600",
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
