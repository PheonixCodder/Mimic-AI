import { TRPCError } from "@trpc/server";

import { getObjectStream } from "@/lib/r2";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import type { VoiceRow } from "@/features/voices/lib/schemas";
import { routeErrorResponse } from "@/server/media/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ voiceId: string }> },
) {
  try {
    const { voiceId } = await params;
    const insforge = await createInsForgeServerClient();
    const { data: authData, error: authError } =
      await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      throw new TRPCError({
        code: "UNAUTHORIZED",
        message: "Authentication required",
      });
    }

    const { data: voices, error } = await insforge.database
      .from("voices")
      .select("*")
      .eq("id", voiceId)
      .limit(1);

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    const voice = voices?.[0] as VoiceRow | undefined;

    if (!voice) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Voice not found" });
    }

    if (voice.variant === "custom") {
      if (!voice.workspace_id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Voice not found" });
      }

      const { data: members, error: memberError } = await insforge.database
        .from("workspace_members")
        .select("workspace_id")
        .eq("user_id", authData.user.id)
        .eq("workspace_id", voice.workspace_id)
        .limit(1);

      if (memberError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: memberError.message,
        });
      }

      if (!members?.[0]) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Voice not found" });
      }
    }

    if (!voice.r2_object_key) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Voice audio is not available yet",
      });
    }

    const object = await getObjectStream(voice.r2_object_key);

    const headers = new Headers({
      "Content-Type": object.contentType,
      "Cache-Control":
        voice.variant === "system"
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
