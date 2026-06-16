import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";

import { JOB_STATUSES, JOB_TYPES, type JobRow } from "@/features/jobs/lib/schemas";
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
