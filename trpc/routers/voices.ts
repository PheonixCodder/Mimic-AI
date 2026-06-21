import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { VoiceRow } from "@/features/voices/lib/schemas";
import { deleteObject } from "@/lib/r2";
import { writeAuditLog } from "@/lib/audit";
import { createTRPCRouter, workspaceProcedure } from "../init";

const voiceIdSchema = z.object({
  id: z.string().uuid(),
});

function mapVoice(row: VoiceRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    category: row.category,
    language: row.language,
    variant: row.variant,
    status: row.status,
    qualityScore: row.quality_score ?? null,
    validationResults: row.validation_results ?? null,
    autoValidatedAt: row.auto_validated_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSearchFilter(query?: string) {
  if (!query) {
    return null;
  }

  const term = `%${query}%`;
  return `name.ilike.${term},description.ilike.${term}`;
}

export const voicesRouter = createTRPCRouter({
  getAll: workspaceProcedure
    .input(
      z
        .object({
          query: z.string().trim().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const searchFilter = buildSearchFilter(input?.query);

      let customQuery = ctx.insforge.database
        .from("voices")
        .select(
          "id, workspace_id, created_by, name, description, category, language, variant, status, quality_score, validation_results, auto_validated_at, created_at, updated_at",
        )
        .eq("variant", "custom")
        .eq("workspace_id", ctx.workspace.id)
        .order("created_at", { ascending: false });

      let systemQuery = ctx.insforge.database
        .from("voices")
        .select(
          "id, workspace_id, created_by, name, description, category, language, variant, status, quality_score, validation_results, auto_validated_at, created_at, updated_at",
        )
        .eq("variant", "system")
        .order("name", { ascending: true });

      if (searchFilter) {
        customQuery = customQuery.or(searchFilter);
        systemQuery = systemQuery.or(searchFilter);
      }

      const [customResult, systemResult] = await Promise.all([
        customQuery,
        systemQuery,
      ]);

      if (customResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: customResult.error.message,
        });
      }

      if (systemResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: systemResult.error.message,
        });
      }

      return {
        custom: ((customResult.data ?? []) as VoiceRow[]).map(mapVoice),
        system: ((systemResult.data ?? []) as VoiceRow[]).map(mapVoice),
      };
    }),

  delete: workspaceProcedure
    .input(voiceIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("voices")
        .select("id, variant, created_by, r2_object_key")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .eq("variant", "custom")
        .limit(1);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const voice = data?.[0] as
        | {
            id: string;
            variant: string;
            created_by: string | null;
            r2_object_key: string | null;
          }
        | undefined;

      if (!voice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Voice not found" });
      }

      const canDelete =
        ["owner", "admin"].includes(ctx.role) || voice.created_by === ctx.user.id;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this voice",
        });
      }

      const { error: deleteError } = await ctx.insforge.database
        .from("voices")
        .delete()
        .eq("id", voice.id);

      if (deleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: deleteError.message,
        });
      }

      if (voice.r2_object_key) {
        await deleteObject(voice.r2_object_key).catch(() => {});
      }

      writeAuditLog({ workspaceId: ctx.workspace.id, userId: ctx.user.id, action: "voice.deleted", resourceType: "voice", resourceId: voice.id });
      return { success: true };
    }),

  getById: workspaceProcedure
    .input(voiceIdSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("voices")
        .select("id, workspace_id, created_by, name, description, category, language, variant, status, quality_score, validation_results, auto_validated_at, r2_object_key, created_at, updated_at")
        .eq("id", input.id)
        .limit(1);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      const row = data?.[0] as (import("@/features/voices/lib/schemas").VoiceRow & { r2_object_key: string | null }) | undefined;
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Voice not found" });

      // system voices are accessible to all; custom voices scoped to workspace
      if (row.variant === "custom" && row.workspace_id !== ctx.workspace.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Voice not found" });
      }

      return { ...mapVoice(row), r2ObjectKey: row.r2_object_key };
    }),

  validate: workspaceProcedure
    .input(voiceIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("voices")
        .select("*")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .eq("variant", "custom")
        .single();

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      const voice = data as VoiceRow | undefined;
      if (!voice) throw new TRPCError({ code: "NOT_FOUND", message: "Voice not found" });
      if (!voice.r2_object_key) throw new TRPCError({ code: "BAD_REQUEST", message: "Voice audio not uploaded yet" });

      // Trigger manual validation job
      const { tasks } = await import("@trigger.dev/sdk/v3");
      
      // Create validation job
      const { data: validationJob, error: jobError } = await ctx.insforge.database
        .from("jobs")
        .insert([{
          workspace_id: ctx.workspace.id,
          created_by: ctx.user.id,
          type: "voice_validate",
          title: `Voice validation: ${voice.name}`,
          resource_id: voice.id,
          resource_type: "voice",
          status: "queued",
          progress: 0,
          metadata: {
            voice_id: voice.id,
            voice_name: voice.name,
            r2_object_key: voice.r2_object_key,
            language: voice.language,
            auto_validation: true,
          },
        }])
        .select()
        .single();

      if (jobError || !validationJob) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR", 
          message: jobError?.message ?? "Failed to create job"
        });
      }

      // Trigger the validation job
      await tasks.trigger("run-job", { jobId: validationJob.id });

      writeAuditLog({ workspaceId: ctx.workspace.id, userId: ctx.user.id, action: "voice.validated", resourceType: "voice", resourceId: input.id });
      
      // Return job ID for real-time tracking
      return { 
        jobId: validationJob.id,
        status: "started"
      };
    }),
});

export type Voice = ReturnType<typeof mapVoice>;
