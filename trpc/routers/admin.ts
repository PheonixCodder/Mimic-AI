import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { isPlatformAdmin } from "@/lib/admin-guard";
import { insforgeAdmin } from "@/lib/insforge/admin";
import { createTRPCRouter, protectedProcedure } from "../init";

const adminProcedure = protectedProcedure.use(async ({ ctx, next }) => {
  const isAdmin = await isPlatformAdmin(ctx.user.id);
  if (!isAdmin) throw new TRPCError({ code: "FORBIDDEN", message: "Platform admin access required" });
  return next({ ctx });
});

export const adminRouter = createTRPCRouter({
  getStats: adminProcedure.query(async () => {
    const [workspaces, profiles, videos, jobs] = await Promise.all([
      insforgeAdmin.database.from("workspaces").select("id", { count: "exact", head: true }),
      insforgeAdmin.database.from("profiles").select("user_id", { count: "exact", head: true }),
      insforgeAdmin.database.from("videos").select("id", { count: "exact", head: true }),
      insforgeAdmin.database.from("jobs").select("id, status", { count: "exact" }),
    ]);

    const allJobs = (jobs.data ?? []) as { status: string }[];
    const activeJobs = allJobs.filter((j) => j.status === "queued" || j.status === "running").length;

    return {
      totalWorkspaces: workspaces.count ?? 0,
      totalUsers: profiles.count ?? 0,
      totalVideos: videos.count ?? 0,
      totalJobs: jobs.count ?? 0,
      activeJobs,
    };
  }),

  listWorkspaces: adminProcedure.query(async () => {
    const { data: workspaces, error } = await insforgeAdmin.database
      .from("workspaces")
      .select("id, name, slug, owner_id, created_at")
      .order("created_at", { ascending: false })
      .limit(100);

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

    const rows = (workspaces ?? []) as { id: string; name: string; slug: string; owner_id: string; created_at: string }[];
    const ownerIds = [...new Set(rows.map((r) => r.owner_id))];

    const { data: profiles } = await insforgeAdmin.database
      .from("profiles")
      .select("user_id, display_name, email")
      .in("user_id", ownerIds);

    const profileMap = new Map(
      ((profiles ?? []) as { user_id: string; display_name: string | null; email: string | null }[])
        .map((p) => [p.user_id, p])
    );

    // Get member counts
    const { data: memberCounts } = await insforgeAdmin.database
      .from("workspace_members")
      .select("workspace_id")
      .in("workspace_id", rows.map((r) => r.id));

    const memberCountMap = new Map<string, number>();
    for (const m of (memberCounts ?? []) as { workspace_id: string }[]) {
      memberCountMap.set(m.workspace_id, (memberCountMap.get(m.workspace_id) ?? 0) + 1);
    }

    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      slug: r.slug,
      ownerEmail: profileMap.get(r.owner_id)?.email ?? null,
      ownerName: profileMap.get(r.owner_id)?.display_name ?? null,
      memberCount: memberCountMap.get(r.id) ?? 0,
      createdAt: r.created_at,
    }));
  }),

  listJobs: adminProcedure
    .input(z.object({ status: z.string().optional() }).optional())
    .query(async ({ input }) => {
      let query = insforgeAdmin.database
        .from("jobs")
        .select("id, workspace_id, type, title, status, progress, created_at, error_message")
        .order("created_at", { ascending: false })
        .limit(100);

      if (input?.status) query = query.eq("status", input.status);

      const { data, error } = await query;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      return (data ?? []) as {
        id: string;
        workspace_id: string;
        type: string;
        title: string;
        status: string;
        progress: number;
        created_at: string;
        error_message: string | null;
      }[];
    }),
});
