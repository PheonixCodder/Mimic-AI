import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";
import { workspaceHasActiveSubscription } from "@/lib/billing/workspace-subscription";
import { createTRPCRouter, workspaceProcedure } from "../init";

type ModelVariantRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  base_model: string;
  status: string;
  trigger_word: string | null;
  r2_weights_key: string | null;
  replicate_training_id: string | null;
  error_message: string | null;
  training_images_r2_key: string | null;
  created_at: string;
  updated_at: string;
};

function mapModel(row: ModelVariantRow) {
  return {
    id: row.id,
    name: row.name,
    baseModel: row.base_model,
    status: row.status,
    triggerWord: row.trigger_word,
    r2WeightsKey: row.r2_weights_key,
    replicateTrainingId: row.replicate_training_id,
    errorMessage: row.error_message,
    trainingImagesR2Key: row.training_images_r2_key,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const modelVariantsRouter = createTRPCRouter({
  list: workspaceProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.insforge.database
      .from("model_variants")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false });

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return ((data ?? []) as ModelVariantRow[]).map(mapModel);
  }),

  startTraining: workspaceProcedure
    .input(z.object({
      name: z.string().trim().min(1).max(80),
      triggerWord: z.string().trim().min(2).max(20),
      trainingImagesR2Key: z.string().min(1),
    }))
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Polar subscription gate
      const hasSubscription = await workspaceHasActiveSubscription(
        ctx.workspace.id,
        ctx.workspace.name,
        ctx.user.email ?? `workspace-${ctx.workspace.id}@mimic.ai`
      );
      if (!hasSubscription) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "An active subscription is required to train custom models",
        });
      }

      // Create model_variants row
      const { data: model, error: modelError } = await ctx.insforge.database
        .from("model_variants")
        .insert([{
          workspace_id: ctx.workspace.id,
          created_by: ctx.user.id,
          name: input.name,
          trigger_word: input.triggerWord,
          training_images_r2_key: input.trainingImagesR2Key,
          status: "pending",
        }])
        .select()
        .single();

      if (modelError || !model) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: modelError?.message });

      const modelRow = model as ModelVariantRow;

      // Create job
      const { data: job, error: jobError } = await ctx.insforge.database
        .from("jobs")
        .insert([{
          workspace_id: ctx.workspace.id,
          created_by: ctx.user.id,
          type: "model_finetune",
          title: `Fine-tune: ${input.name}`,
          resource_id: modelRow.id,
          resource_type: "model",
          status: "queued",
          progress: 0,
        }])
        .select()
        .single();

      if (jobError || !job) {
        await ctx.insforge.database.from("model_variants").delete().eq("id", modelRow.id);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: jobError?.message });
      }

      let handle: { id: string };
      try {
        handle = await tasks.trigger("run-job", { jobId: (job as { id: string }).id });
      } catch {
        await ctx.insforge.database.from("jobs").delete().eq("id", (job as { id: string }).id);
        await ctx.insforge.database.from("model_variants").delete().eq("id", modelRow.id);
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: "Failed to start training pipeline" });
      }

      await ctx.insforge.database.from("jobs").update({ trigger_run_id: handle.id }).eq("id", (job as { id: string }).id);

      return { modelId: modelRow.id, jobId: (job as { id: string }).id };
    }),

  delete: workspaceProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.insforge.database
        .from("model_variants")
        .delete()
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id);
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      return { success: true };
    }),

  getReady: workspaceProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.insforge.database
      .from("model_variants")
      .select("id, name, trigger_word, r2_weights_key")
      .eq("workspace_id", ctx.workspace.id)
      .eq("status", "ready")
      .order("created_at", { ascending: false });
    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return (data ?? []) as { id: string; name: string; trigger_word: string | null; r2_weights_key: string | null }[];
  }),
});
