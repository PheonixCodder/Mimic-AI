import "server-only";

import { TRPCError } from "@trpc/server";
import { createInsForgeServerClient } from "@/lib/insforge/server";

type WorkspaceSession = {
  userId: string;
  workspaceId: string;
  role: string;
  insforge: Awaited<ReturnType<typeof createInsForgeServerClient>>;
};

export async function requireWorkspaceSession(): Promise<WorkspaceSession> {
  const insforge = await createInsForgeServerClient();
  const { data: authData, error: authError } = await insforge.auth.getCurrentUser();

  if (authError || !authData?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED", message: "Authentication required" });
  }

  const { data: profiles, error: profileError } = await insforge.database
    .from("profiles")
    .select("active_workspace_id")
    .eq("user_id", authData.user.id)
    .limit(1);

  if (profileError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: profileError.message,
    });
  }

  const profile = profiles?.[0] as { active_workspace_id: string | null } | undefined;

  const { data: members, error: membersError } = await insforge.database
    .from("workspace_members")
    .select("workspace_id, role")
    .eq("user_id", authData.user.id);

  if (membersError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: membersError.message,
    });
  }

  const memberRows = (members ?? []) as Array<{
    workspace_id: string;
    role: string;
  }>;

  if (memberRows.length === 0) {
    throw new TRPCError({ code: "FORBIDDEN", message: "Workspace required" });
  }

  const activeMember =
    memberRows.find((member) => member.workspace_id === profile?.active_workspace_id) ??
    memberRows[0];

  if (activeMember.role === "viewer") {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Viewers cannot upload media",
    });
  }

  return {
    userId: authData.user.id,
    workspaceId: activeMember.workspace_id,
    role: activeMember.role,
    insforge,
  };
}

export function routeErrorResponse(error: unknown) {
  if (error instanceof TRPCError) {
    const status =
      error.code === "UNAUTHORIZED"
        ? 401
        : error.code === "FORBIDDEN"
          ? 403
          : error.code === "NOT_FOUND"
            ? 404
            : error.code === "BAD_REQUEST"
              ? 400
              : 500;

    return Response.json({ error: error.code, message: error.message }, { status });
  }

  console.error(error);
  return Response.json(
    { error: "INTERNAL_SERVER_ERROR", message: "Something went wrong" },
    { status: 500 },
  );
}
