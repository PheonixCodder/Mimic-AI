import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, workspaceProcedure } from "../init";

type ExperimentRow = {
  id: string; workspace_id: string; created_by: string;
  name: string; hypothesis: string | null; status: string;
  winner_variant_id: string | null; created_at: string; updated_at: string;
};
type VariantRow = {
  id: string; experiment_id: string; workspace_id: string;
  label: string; video_id: string | null; notes: string | null; created_at: string;
};

function mapExp(row: ExperimentRow) {
  return { id: row.id, name: row.name, hypothesis: row.hypothesis, status: row.status, winnerVariantId: row.winner_variant_id, createdAt: row.created_at, updatedAt: row.updated_at };
}

export const experimentsRouter = createTRPCRouter({
  list: workspaceProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.insforge.database
      .from("experiments").select("*").eq("workspace_id", ctx.workspace.id).order("created_at", { ascending: false });
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    const exps = (data ?? []) as ExperimentRow[];
    if (!exps.length) return [];
    const { data: variants } = await ctx.insforge.database.from("experiment_variants").select("experiment_id").in("experiment_id", exps.map((e) => e.id));
    const countMap = new Map<string, number>();
    for (const v of (variants ?? []) as { experiment_id: string }[]) countMap.set(v.experiment_id, (countMap.get(v.experiment_id) ?? 0) + 1);
    return exps.map((e) => ({ ...mapExp(e), variantCount: countMap.get(e.id) ?? 0 }));
  }),

  getById: workspaceProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    const { data: exp, error } = await ctx.insforge.database.from("experiments").select("*").eq("id", input.id).eq("workspace_id", ctx.workspace.id).single();
    if (error || !exp) throw new TRPCError({ code: "NOT_FOUND", message: "Experiment not found" });
    const { data: variants } = await ctx.insforge.database.from("experiment_variants").select("*").eq("experiment_id", input.id).order("created_at", { ascending: true });
    const rows = (variants ?? []) as VariantRow[];
    const videoIds = rows.map((v) => v.video_id).filter(Boolean) as string[];
    let videoMap = new Map<string, { title: string; status: string; approvalStatus: string }>();
    if (videoIds.length) {
      const { data: vids } = await ctx.insforge.database.from("videos").select("id, title, status, approval_status").in("id", videoIds);
      for (const v of (vids ?? []) as { id: string; title: string; status: string; approval_status: string }[]) videoMap.set(v.id, { title: v.title, status: v.status, approvalStatus: v.approval_status });
    }
    return {
      ...mapExp(exp as ExperimentRow),
      variants: rows.map((v) => ({ id: v.id, label: v.label, videoId: v.video_id, notes: v.notes, createdAt: v.created_at, video: v.video_id ? (videoMap.get(v.video_id) ?? null) : null })),
    };
  }),

  create: workspaceProcedure
    .input(z.object({ name: z.string().trim().min(1).max(120), hypothesis: z.string().trim().optional() }))
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const { data, error } = await ctx.insforge.database.from("experiments")
        .insert([{ workspace_id: ctx.workspace.id, created_by: ctx.user.id, name: input.name, hypothesis: input.hypothesis ?? null }]).select().single();
      if (error || !data) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error?.message });
      return mapExp(data as ExperimentRow);
    }),

  delete: workspaceProcedure.input(z.object({ id: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const { error } = await ctx.insforge.database.from("experiments").delete().eq("id", input.id).eq("workspace_id", ctx.workspace.id);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return { success: true };
  }),

  updateStatus: workspaceProcedure
    .input(z.object({ id: z.string().uuid(), status: z.enum(["running", "completed"]) }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.insforge.database.from("experiments").update({ status: input.status }).eq("id", input.id).eq("workspace_id", ctx.workspace.id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { success: true };
    }),

  setWinner: workspaceProcedure
    .input(z.object({ experimentId: z.string().uuid(), variantId: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.insforge.database.from("experiments")
        .update({ winner_variant_id: input.variantId, status: "completed" }).eq("id", input.experimentId).eq("workspace_id", ctx.workspace.id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { success: true };
    }),

  addVariant: workspaceProcedure
    .input(z.object({
      experimentId: z.string().uuid(),
      label: z.string().trim().min(1).max(40),
      scriptId: z.string().uuid(),
      voiceId: z.string().uuid(),
      avatarId: z.string().uuid(),
      resolution: z.enum(["720p", "1080p", "4k"]).default("1080p"),
      notes: z.string().trim().optional(),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) throw new TRPCError({ code: "FORBIDDEN" });
      const { data: exp } = await ctx.insforge.database.from("experiments").select("id, name").eq("id", input.experimentId).eq("workspace_id", ctx.workspace.id).single();
      if (!exp) throw new TRPCError({ code: "NOT_FOUND", message: "Experiment not found" });
      const { data: scripts } = await ctx.insforge.database.from("scripts").select("id, content, project_id").eq("id", input.scriptId).eq("workspace_id", ctx.workspace.id).limit(1);
      const script = (scripts ?? [])[0] as { id: string; content: string; project_id: string | null } | undefined;
      if (!script) throw new TRPCError({ code: "NOT_FOUND", message: "Script not found" });
      const expName = (exp as { id: string; name: string }).name;
      const { data: videoData, error: ve } = await ctx.insforge.database.from("videos").insert({
        workspace_id: ctx.workspace.id, created_by: ctx.user.id,
        project_id: script.project_id ?? null, script_id: input.scriptId,
        voice_id: input.voiceId, avatar_id: input.avatarId,
        title: `${expName} — ${input.label}`, script: script.content,
        aspect_ratio: "16:9", resolution: input.resolution, status: "draft",
      }).select().single();
      if (ve || !videoData) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: ve?.message });
      const { data: variantData, error: varErr } = await ctx.insforge.database.from("experiment_variants")
        .insert([{ experiment_id: input.experimentId, workspace_id: ctx.workspace.id, label: input.label, video_id: (videoData as { id: string }).id, notes: input.notes ?? null }]).select().single();
      if (varErr || !variantData) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: varErr?.message });
      return variantData as VariantRow;
    }),

  removeVariant: workspaceProcedure.input(z.object({ variantId: z.string().uuid() })).mutation(async ({ ctx, input }) => {
    const { error } = await ctx.insforge.database.from("experiment_variants").delete().eq("id", input.variantId).eq("workspace_id", ctx.workspace.id);
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return { success: true };
  }),
});
