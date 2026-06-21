import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";

import { 
  JOB_STATUSES, 
  JOB_TYPES, 
  type JobRow, 
  voiceCloneMetadataSchema 
} from "@/features/jobs/lib/schemas";
import { createTRPCRouter, workspaceProcedure } from "../init";

const jobIdSchema = z.object({
  id: z.string().uuid(),
});

function assertCanWrite(role: string) {
  if (!["owner", "admin", "member"].includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to manage jobs",
    });
  }
}

function assertCanAdmin(role: string) {
  if (!["owner", "admin"].includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "Only workspace owners and admins can perform this action",
    });
  }
}

function mapJob(row: JobRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    type: row.type,
    title: row.title,
    resourceId: row.resource_id,
    resourceType: row.resource_type,
    status: row.status,
    progress: row.progress,
    startedAt: row.started_at,
    completedAt: row.completed_at,
    errorMessage: row.error_message,
    durationMs: row.duration_ms,
    triggerRunId: row.trigger_run_id ?? null,
    metadata: row.metadata,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const jobsRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z.object({
        status: z.enum(JOB_STATUSES).optional(),
        type: z.enum(JOB_TYPES).optional(),
        search: z.string().optional(),
      }),
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.insforge.database
        .from("jobs")
        .select("*")
        .eq("workspace_id", ctx.workspace.id);

      if (input.status) {
        query = query.eq("status", input.status);
      }

      if (input.type) {
        query = query.eq("type", input.type);
      }

      if (input.search) {
        query = query.ilike("title", `%${input.search}%`);
      }

      const { data, error } = await query
        .order("created_at", { ascending: false })
        .limit(100);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message ?? "Failed to retrieve jobs list",
        });
      }

      return (data as JobRow[]).map(mapJob);
    }),

  getById: workspaceProcedure
    .input(jobIdSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("jobs")
        .select("*")
        .eq("workspace_id", ctx.workspace.id)
        .eq("id", input.id)
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      return mapJob(data as JobRow);
    }),

  cancel: workspaceProcedure
    .input(jobIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      const { data: job, error: fetchError } = await ctx.insforge.database
        .from("jobs")
        .select("*")
        .eq("workspace_id", ctx.workspace.id)
        .eq("id", input.id)
        .single();

      if (fetchError || !job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      const record = job as JobRow;

      if (!["queued", "running"].includes(record.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot cancel a job with status '${record.status}'. Only queued or running jobs can be cancelled.`,
        });
      }

      const { error } = await ctx.insforge.database
        .from("jobs")
        .update({ status: "cancelled", completed_at: new Date().toISOString() })
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message ?? "Failed to cancel job",
        });
      }

      await tasks.trigger("send-webhook", {
        workspaceId: ctx.workspace.id,
        event: "job.cancelled",
        payload: {
          jobId: input.id,
          type: record.type,
          title: record.title,
          status: "cancelled",
          progress: record.progress,
          resourceId: record.resource_id,
          resourceType: record.resource_type,
        },
      });

      return { success: true };
    }),

  retry: workspaceProcedure
    .input(jobIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      const { data: job, error: fetchError } = await ctx.insforge.database
        .from("jobs")
        .select("*")
        .eq("workspace_id", ctx.workspace.id)
        .eq("id", input.id)
        .single();

      if (fetchError || !job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      const record = job as JobRow;

      if (!["failed", "cancelled"].includes(record.status)) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot retry a job with status '${record.status}'. Only failed or cancelled jobs can be retried.`,
        });
      }

      const { data, error } = await ctx.insforge.database
        .from("jobs")
        .update({
          status: "queued",
          progress: 0,
          error_message: null,
          started_at: null,
          completed_at: null,
          duration_ms: null,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to retry job",
        });
      }

      await tasks.trigger("send-webhook", {
        workspaceId: ctx.workspace.id,
        event: "job.queued",
        payload: {
          jobId: data.id,
          type: data.type,
          title: data.title,
          status: "queued",
          progress: 0,
          resourceId: data.resource_id,
          resourceType: data.resource_type,
        },
      });

      await tasks.trigger("run-job", { jobId: data.id });

      return mapJob(data as JobRow);
    }),

  delete: workspaceProcedure
    .input(jobIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanAdmin(ctx.role);

      const { data: job, error: fetchError } = await ctx.insforge.database
        .from("jobs")
        .select("*")
        .eq("workspace_id", ctx.workspace.id)
        .eq("id", input.id)
        .single();

      if (fetchError || !job) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Job not found",
        });
      }

      const { error } = await ctx.insforge.database
        .from("jobs")
        .delete()
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message ?? "Failed to delete job record",
        });
      }

      return { success: true };
    }),

  createTTS: workspaceProcedure
    .input(
      z.object({
        text: z.string().min(1).max(10000),
        voiceId: z.string().uuid(),
        temperature: z.number().min(0).max(2).default(0.8),
        topP: z.number().min(0).max(1).default(0.95),
        topK: z.number().min(1).max(10000).default(1000),
        repetitionPenalty: z.number().min(1).max(2).default(1.2),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      // Validate voice exists and is accessible
      const { data: voice, error: voiceError } = await ctx.insforge.database
        .from("voices")
        .select("id, name, r2_object_key, variant, quality_score")
        .eq("id", input.voiceId)
        .or(`workspace_id.eq.${ctx.workspace.id},variant.eq.system`)
        .single();

      if (voiceError || !voice) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Voice not found or not accessible",
        });
      }

      if (!voice.r2_object_key) {
        throw new TRPCError({
          code: "PRECONDITION_FAILED",
          message: "Voice audio not available",
        });
      }

      // Check voice quality for custom voices
      if (voice.variant === "custom") {
        if (voice.quality_score === null) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Voice has not been validated yet. Please validate the voice before generating TTS.",
          });
        }

        if (voice.quality_score < 0.4) {
          throw new TRPCError({
            code: "PRECONDITION_FAILED",
            message: "Voice quality is too low for TTS generation. Please improve or re-upload the voice.",
          });
        }
      }

      const metadata = {
        voice_id: input.voiceId,
        voice_name: voice.name,
        text: input.text,
        temperature: input.temperature,
        top_p: input.topP,
        top_k: input.topK,
        repetition_penalty: input.repetitionPenalty,
        voice_r2_key: voice.r2_object_key,
      };

      const { data, error } = await ctx.insforge.database
        .from("jobs")
        .insert([
          {
            workspace_id: ctx.workspace.id,
            created_by: ctx.user.id,
            type: "voice_clone",
            title: `TTS: ${input.text.substring(0, 50)}${input.text.length > 50 ? '...' : ''}`,
            status: "queued",
            progress: 0,
            metadata,
          },
        ])
        .select()
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create TTS job",
        });
      }

      const createdJob = data as JobRow;

      await tasks.trigger("send-webhook", {
        workspaceId: ctx.workspace.id,
        event: "job.queued",
        payload: {
          jobId: createdJob.id,
          type: createdJob.type,
          title: createdJob.title,
          status: "queued",
          progress: 0,
          resourceId: createdJob.resource_id,
          resourceType: createdJob.resource_type,
        },
      });

      await tasks.trigger("run-job", { jobId: createdJob.id });

      return mapJob(createdJob);
    }),

  createMock: workspaceProcedure
    .input(
      z.object({
        type: z.enum(JOB_TYPES),
        title: z.string().trim().min(1).max(200),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      const { data, error } = await ctx.insforge.database
        .from("jobs")
        .insert([
          {
            workspace_id: ctx.workspace.id,
            created_by: ctx.user.id,
            type: input.type,
            title: input.title,
            status: "queued",
            progress: 0,
          },
        ])
        .select()
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create mock job",
        });
      }

      const createdJob = data as JobRow;

      await tasks.trigger("send-webhook", {
        workspaceId: ctx.workspace.id,
        event: "job.queued",
        payload: {
          jobId: createdJob.id,
          type: createdJob.type,
          title: createdJob.title,
          status: "queued",
          progress: 0,
          resourceId: createdJob.resource_id,
          resourceType: createdJob.resource_type,
        },
      });

      await tasks.trigger("run-job", { jobId: createdJob.id });

      return mapJob(createdJob);
    }),
});

export type Job = ReturnType<typeof mapJob>;
