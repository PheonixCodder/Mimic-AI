import { TRPCError } from "@trpc/server";

import { getObjectStream } from "@/lib/r2";
import { createInsForgeServerClient } from "@/lib/insforge/server";
import { routeErrorResponse } from "@/server/media/session";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ brandKitId: string }> },
) {
  try {
    const { brandKitId } = await params;
    const insforge = await createInsForgeServerClient();
    const { data: authData, error: authError } = await insforge.auth.getCurrentUser();

    if (authError || !authData?.user) {
      throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
    }

    const { data: kits, error } = await insforge.database
      .from("brand_kits")
      .select("id, workspace_id, logo_key")
      .eq("id", brandKitId)
      .limit(1);

    if (error) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    }

    const kit = kits?.[0] as { id: string; workspace_id: string; logo_key: string | null } | undefined;

    if (!kit) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Brand kit not found" });
    }

    // Verify workspace membership
    const { data: members, error: memberError } = await insforge.database
      .from("workspace_members")
      .select("workspace_id")
      .eq("user_id", authData.user.id)
      .eq("workspace_id", kit.workspace_id)
      .limit(1);

    if (memberError) {
      throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: memberError.message });
    }

    if (!members?.[0]) {
      throw new TRPCError({ code: "NOT_FOUND", message: "Brand kit not found" });
    }

    if (!kit.logo_key) {
      throw new TRPCError({ code: "BAD_REQUEST", message: "No logo uploaded for this brand kit" });
    }

    const object = await getObjectStream(kit.logo_key);

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
        error.code === "UNAUTHORIZED" ? 401
        : error.code === "NOT_FOUND" ? 404
        : error.code === "BAD_REQUEST" ? 409
        : 500;
      return new Response(error.message, { status });
    }
    return routeErrorResponse(error);
  }
}
