import { initTRPC, TRPCError } from "@trpc/server";
import superjson from "superjson";
import { createInsForgeServerClient } from "@/lib/insforge/server";

export const createTRPCContext = async () => {
  const insforge = await createInsForgeServerClient();
  return { insforge };
};

const t = initTRPC.context<typeof createTRPCContext>().create({
  transformer: superjson,
});

export const createTRPCRouter = t.router;
export const createCallerFactory = t.createCallerFactory;
export const publicProcedure = t.procedure;

export const protectedProcedure = t.procedure.use(async ({ ctx, next }) => {
  const { data, error } = await ctx.insforge.auth.getCurrentUser();

  if (error || !data?.user) {
    throw new TRPCError({ code: "UNAUTHORIZED" });
  }

  return next({
    ctx: {
      ...ctx,
      user: data.user,
    },
  });
});

type WorkspaceContext = {
  workspace: {
    id: string;
    name: string;
    slug: string;
    owner_id: string;
    polar_external_id: string | null;
    created_at: string;
    updated_at: string;
  };
  role: string;
};

export const workspaceProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const { data: profiles, error: profileError } = await ctx.insforge.database
    .from("profiles")
    .select("active_workspace_id")
    .eq("user_id", ctx.user.id)
    .limit(1);

  if (profileError) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: profileError.message,
    });
  }

  const profile = profiles?.[0] as { active_workspace_id: string | null } | undefined;

  const { data: members, error: membersError } = await ctx.insforge.database
    .from("workspace_members")
    .select("*")
    .eq("user_id", ctx.user.id);

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
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Workspace required",
    });
  }

  const activeMember =
    memberRows.find((member) => member.workspace_id === profile?.active_workspace_id) ??
    memberRows[0];

  const { data: workspaces, error: workspaceError } = await ctx.insforge.database
    .from("workspaces")
    .select("*")
    .eq("id", activeMember.workspace_id)
    .limit(1);

  if (workspaceError || !workspaces?.[0]) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: workspaceError?.message ?? "Workspace not found",
    });
  }

  const workspaceContext: WorkspaceContext = {
    workspace: workspaces[0] as WorkspaceContext["workspace"],
    role: activeMember.role,
  };

  return next({
    ctx: {
      ...ctx,
      ...workspaceContext,
    },
  });
});
