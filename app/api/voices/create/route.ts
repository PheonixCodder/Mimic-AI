import { randomUUID } from "node:crypto";
import { parseBuffer } from "music-metadata";
import { NextResponse } from "next/server";
import { TRPCError } from "@trpc/server";

import { uploadObject } from "@/lib/r2";
import { polar } from "@/lib/polar";
import { getPolarMeterConfig } from "@/lib/polar-meters";
import { voiceCreateMetadataSchema } from "@/features/voices/lib/schemas";
import { requireWorkspaceSession, routeErrorResponse } from "@/server/media/session";

const MAX_UPLOAD_SIZE_BYTES = 20 * 1024 * 1024;
const MIN_AUDIO_DURATION_SECONDS = 10;

export async function POST(request: Request) {
  try {
    const session = await requireWorkspaceSession();
    const url = new URL(request.url);

    const validation = voiceCreateMetadataSchema.safeParse({
      name: url.searchParams.get("name"),
      category: url.searchParams.get("category"),
      language: url.searchParams.get("language"),
      description: url.searchParams.get("description"),
    });

    if (!validation.success) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: validation.error.issues[0]?.message ?? "Invalid input",
      });
    }

    const { name, category, language, description } = validation.data;
    const fileBuffer = await request.arrayBuffer();

    if (!fileBuffer.byteLength) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Please upload an audio file",
      });
    }

    if (fileBuffer.byteLength > MAX_UPLOAD_SIZE_BYTES) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Audio file exceeds the 20 MB size limit",
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
      contentType.split(";")[0]?.trim() || "audio/wav";

    let duration: number;

    try {
      const metadata = await parseBuffer(
        new Uint8Array(fileBuffer),
        { mimeType: normalizedContentType },
        { duration: true },
      );
      duration = metadata.format.duration ?? 0;
    } catch {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "File is not a valid audio file",
      });
    }

    if (duration < MIN_AUDIO_DURATION_SECONDS) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: `Audio too short (${duration.toFixed(1)}s). Minimum duration is ${MIN_AUDIO_DURATION_SECONDS} seconds.`,
      });
    }

    const voiceId = randomUUID();
    const r2ObjectKey = `voices/${session.workspaceId}/${voiceId}`;
    let createdVoiceId: string | null = null;

    try {
      const { data: created, error } = await session.insforge.database
        .from("voices")
        .insert({
          id: voiceId,
          workspace_id: session.workspaceId,
          created_by: session.userId,
          variant: "custom",
          name,
          description,
          category,
          language,
          status: "ready",
        })
        .select("id");

      const voice = created?.[0] as { id: string } | undefined;

      if (error || !voice) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create voice",
        });
      }

      createdVoiceId = voice.id;

      await uploadObject({
        buffer: Buffer.from(fileBuffer),
        key: r2ObjectKey,
        contentType: normalizedContentType,
      });

      const { error: updateError } = await session.insforge.database
        .from("voices")
        .update({ r2_object_key: r2ObjectKey })
        .eq("id", voice.id);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }
    } catch (error) {
      if (createdVoiceId) {
        await session.insforge.database
          .from("voices")
          .delete()
          .eq("id", createdVoiceId);
      }

      if (error instanceof TRPCError) {
        throw error;
      }

      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: "Failed to create voice. Please retry.",
      });
    }

    // Ingest voice clone usage event — fire-and-forget, never block the response
    const meters = getPolarMeterConfig();
    polar.events
      .ingest({
        events: [
          {
            name: meters.voiceClone,
            externalCustomerId: session.workspaceId,
            metadata: {},
          },
        ],
      })
      .catch((err) =>
        console.warn("[Polar] voice_clone meter ingest failed:", err),
      );

    return NextResponse.json(
      { name, message: "Voice created successfully" },
      { status: 201 },
    );
  } catch (error) {
    return routeErrorResponse(error);
  }
}
