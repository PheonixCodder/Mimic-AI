import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { avatarCreateMetadataSchema } from "@/features/avatars/lib/schemas";
import { uploadObject } from "@/lib/r2";
import { polar } from "@/lib/polar";
import { getPolarMeterConfig } from "@/lib/polar-meters";
import { validateMinImageDimensions } from "@/server/media/image-dimensions";
import { requireWorkspaceSession, routeErrorResponse } from "@/server/media/session";
import { isCloudinaryConfigured, removeBackground } from "@/lib/cloudinary";

const MAX_UPLOAD_SIZE_BYTES = 10 * 1024 * 1024;
const ALLOWED_CONTENT_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
]);

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    const url = new URL(request.url);

    const validation = avatarCreateMetadataSchema.safeParse({
      name: url.searchParams.get("name") ?? undefined,
      style: url.searchParams.get("style") ?? undefined,
      description: url.searchParams.get("description") ?? undefined,
      modelVariantId: url.searchParams.get("modelVariantId") ?? undefined,
    });

    if (!validation.success) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: validation.error.issues[0]?.message ?? "Invalid input",
      });
    }

    const { name, style, description, modelVariantId } = validation.data;
    const fileBuffer = await request.arrayBuffer();

    if (!fileBuffer.byteLength) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Please upload an image file",
      });
    }

    if (fileBuffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Image file exceeds the 10 MB size limit",
      });
    }

    const contentType = request.headers.get("content-type");

    if (!contentType) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Missing Content-Type header",
      });
    }

    const normalizedContentType =
      contentType.split(";")[0]?.trim() || "image/png";

    if (!ALLOWED_CONTENT_TYPES.has(normalizedContentType)) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Content type "${normalizedContentType}" is not allowed for avatar uploads`,
      });
    }

    const dimensionCheck = validateMinImageDimensions(
      Buffer.from(fileBuffer),
      normalizedContentType,
    );

    if (!dimensionCheck.ok) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: dimensionCheck.message,
      });
    }

    let uploadBuffer: Buffer = Buffer.from(fileBuffer);
    let finalContentType = normalizedContentType;

    const removeBgParam = url.searchParams.get("removeBackground") === "true";
    if (removeBgParam) {
      if (isCloudinaryConfigured()) {
        try {
          const processed = await removeBackground(uploadBuffer, normalizedContentType);
          uploadBuffer = processed;
          finalContentType = "image/png";
        } catch (err) {
          console.error("Cloudinary background removal failed, falling back to raw upload:", err);
        }
      } else {
        console.warn("Cloudinary background removal requested but Cloudinary is not configured");
      }
    }

    const avatarId = randomUUID();
    const r2ObjectKey = `avatars/${session.workspaceId}/${avatarId}`;
    let createdAvatarId: string | null = null;

    try {
      const { data: created, error } = await session.insforge.database
        .from("avatars")
        .insert({
          id: avatarId,
          workspace_id: session.workspaceId,
          created_by: session.userId,
          variant: "custom",
          name,
          description,
          style,
          status: "ready",
          model_variant_id: modelVariantId ?? null,
        })
        .select("id");

      const avatar = created?.[0] as { id: string } | undefined;

      if (error || !avatar) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create avatar",
        });
      }

      createdAvatarId = avatar.id;

      await uploadObject({
        buffer: uploadBuffer,
        key: r2ObjectKey,
        contentType: finalContentType,
      });

      const { error: updateError } = await session.insforge.database
        .from("avatars")
        .update({ r2_object_key: r2ObjectKey })
        .eq("id", avatar.id);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      // Trigger automatic validation job
      try {
        const { data: validationJob } = await session.insforge.database
          .from("jobs")
          .insert([{
            workspace_id: session.workspaceId,
            created_by: session.userId,
            type: "avatar_validate",
            title: `Validating avatar: ${name}`,
            resource_id: avatar.id,
            resource_type: "avatar",
            status: "queued",
            progress: 0,
            metadata: {
              avatar_id: avatar.id,
              avatar_name: name,
              r2_object_key: r2ObjectKey,
              auto_validation: true,
            },
          }])
          .select("id");

        if (validationJob?.[0]) {
          // Trigger the validation job
          const { tasks } = await import("@trigger.dev/sdk/v3");
          await tasks.trigger("run-job", {
            jobId: validationJob[0].id,
          });
        }
      } catch (validationError) {
        // Log but don't block avatar creation
        console.warn("Failed to trigger automatic validation:", validationError);
      }
    } catch (error) {
      if (createdAvatarId) {
        await session.insforge.database
          .from("avatars")
          .delete()
          .eq("id", createdAvatarId);
      }

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create avatar. Please retry.",
      });
    }

    // Ingest avatar generation usage event — fire-and-forget, never block the response
    const meters = getPolarMeterConfig();
    polar.events
      .ingest({
        events: [
          {
            name: meters.avatar,
            externalCustomerId: session.workspaceId,
            metadata: {},
          },
        ],
      })
      .catch((err) =>
        console.warn("[Polar] avatar_generation meter ingest failed:", err),
      );

    return NextResponse.json(
      { name, message: "Avatar created successfully" },
      { status: 201 },
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}
