import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { uploadObject, deleteObject } from "@/lib/r2";
import { requireWorkspaceSession, routeErrorResponse } from "@/server/media/session";

const MAX_UPLOAD_SIZE_BYTES = 5 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    const url = new URL(request.url);
    const brandKitId = url.searchParams.get("brandKitId");

    if (!brandKitId) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "brandKitId is required" });
    }

    // Verify this brand kit belongs to the workspace
    const { data: kits, error: kitError } = await session.insforge.database
      .from("brand_kits")
      .select("id")
      .eq("id", brandKitId)
      .eq("workspace_id", session.workspaceId)
      .limit(1);

    if (kitError) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: kitError.message });
    }

    if (!kits?.[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Brand kit not found" });
    }

    const contentType = request.headers.get("content-type");
    const normalizedContentType = contentType?.split(";")?.[0]?.trim() ?? "";

    if (!ALLOWED_CONTENT_TYPES.has(normalizedContentType)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Logo must be PNG, JPEG, WebP, or SVG",
      });
    }

    const fileBuffer = await request.arrayBuffer();

    if (!fileBuffer.byteLength) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "Please upload a logo file" });
    }

    if (fileBuffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Logo file exceeds the 5 MB size limit",
      });
    }

    const extension = normalizedContentType === "image/svg+xml" ? "svg"
      : normalizedContentType === "image/png" ? "png"
      : normalizedContentType === "image/webp" ? "webp"
      : "jpg";

    const logoKey = `brand-kits/${session.workspaceId}/${brandKitId}/logo-${randomUUID()}.${extension}`;

    // Get the existing logo key to clean up later
    const { data: existing } = await session.insforge.database
      .from("brand_kits")
      .select("logo_key")
      .eq("id", brandKitId)
      .single();

    await uploadObject({ key: logoKey, buffer: Buffer.from(fileBuffer), contentType: normalizedContentType });

    // Build the logo URL relative path used by the proxy
    const logoUrl = `/api/brand-kits/logos/${brandKitId}`;

    const { error: updateError } = await session.insforge.database
      .from("brand_kits")
      .update({ logo_key: logoKey, logo_url: logoUrl })
      .eq("id", brandKitId)
      .eq("workspace_id", session.workspaceId);

    if (updateError) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: updateError.message });
    }

    // Clean up old logo after successful upload (best-effort)
    if (existing?.logo_key && existing.logo_key !== logoKey) {
      await deleteObject(existing.logo_key).catch(() => {});
    }

    return NextResponse.json({ logoUrl, logoKey });
  } catch (error) {
    return routeErrorResponse(error);
  }
}
