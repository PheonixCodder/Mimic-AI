import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";

import { clipCreateSchema, type ClipRow } from "@/features/clips/lib/schemas";
import { deleteObject } from "@/lib/r2";
import { createTRPCRouter, workspaceProcedure } from "../init";

const clipIdSchema = z.object({
  id: z.string().uuid(),
});

function mapClip(row: ClipRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    projectId: row.project_id,
    title: row.title,
    prompt: row.prompt,
    style: row.style,
    durationSeconds: row.duration_seconds,
    aspectRatio: row.aspect_ratio,
    resolution: row.resolution,
    status: row.status,
    r2ObjectKey: row.r2_object_key,
    errorMessage: row.error_message,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSearchFilter(query?: string) {
  if (!query) {
    return null;
  }

  const term = `%${query}%`;
  return `title.ilike.${term},prompt.ilike.${term}`;
}

export const clipsRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z
        .object({
          query: z.string().trim().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const searchFilter = buildSearchFilter(input?.query);

      let query = ctx.insforge.database
        .from("video_clips")
        .select("*")
        .eq("workspace_id", ctx.workspace.id)
        .order("created_at", { ascending: false });

      if (searchFilter) {
        query = query.or(searchFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return ((data ?? []) as ClipRow[]).map(mapClip);
    }),

  getById: workspaceProcedure
    .input(clipIdSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("video_clips")
        .select("*")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .limit(1);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const row = data?.[0] as ClipRow | undefined;

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Clip not found" });
      }

      const clip = mapClip(row);

      let projectName: string | null = null;

      if (row.project_id) {
        const { data: projects } = await ctx.insforge.database
          .from("projects")
          .select("name")
          .eq("id", row.project_id)
          .limit(1);
        projectName =
          (projects?.[0] as { name: string } | undefined)?.name ?? null;
      }

      return {
        ...clip,
        projectName,
        hasOutput: Boolean(row.r2_object_key),
      };
    }),

  create: workspaceProcedure
    .input(clipCreateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create clips",
        });
      }

      if (input.projectId) {
        const { data: projects, error: projectError } = await ctx.insforge.database
          .from("projects")
          .select("id")
          .eq("id", input.projectId)
          .eq("workspace_id", ctx.workspace.id)
          .limit(1);

        if (projectError) {
          throw new TRPCError({
            code: "INTERNAL_SERVER_ERROR",
            message: projectError.message,
          });
        }

        if (!projects?.[0]) {
          throw new TRPCError({
            code: "BAD_REQUEST",
            message: "Project not found",
          });
        }
      }

      const { data, error } = await ctx.insforge.database
        .from("video_clips")
        .insert({
          workspace_id: ctx.workspace.id,
          created_by: ctx.user.id,
          project_id: input.projectId ?? null,
          title: input.title,
          prompt: input.prompt,
          style: input.style,
          duration_seconds: input.durationSeconds,
          aspect_ratio: input.aspectRatio,
          resolution: input.resolution,
          status: "draft",
        })
        .select();

      const row = data?.[0] as ClipRow | undefined;

      if (error || !row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create clip",
        });
      }

      return mapClip(row);
    }),

  generate: workspaceProcedure
    .input(clipIdSchema)
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to generate clips",
        });
      }

      const { data: clip, error: fetchError } = await ctx.insforge.database
        .from("video_clips")
        .select("*")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (fetchError || !clip) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Clip not found",
        });
      }

      const row = clip as ClipRow;

      if (row.status !== "draft" && row.status !== "failed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot start generation for a clip with status '${row.status}'`,
        });
      }

      const { error: updateError } = await ctx.insforge.database
        .from("video_clips")
        .update({ status: "pending", error_message: null })
        .eq("id", input.id);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      const { data: job, error: jobError } = await ctx.insforge.database
        .from("jobs")
        .insert([
          {
            workspace_id: ctx.workspace.id,
            created_by: ctx.user.id,
            type: "clip_generate",
            title: `Generate: ${row.title}`,
            resource_id: row.id,
            resource_type: "clip",
            status: "queued",
            progress: 0,
          },
        ])
        .select()
        .single();

      if (jobError || !job) {
        await ctx.insforge.database
          .from("video_clips")
          .update({ status: row.status })
          .eq("id", input.id);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: jobError?.message ?? "Failed to create job tracking record.",
        });
      }

      await tasks.trigger("send-webhook", {
        workspaceId: ctx.workspace.id,
        event: "job.queued",
        payload: {
          jobId: job.id,
          type: job.type,
          title: job.title,
          status: "queued",
          progress: 0,
          resourceId: job.resource_id,
          resourceType: job.resource_type,
        },
      });

      await tasks.trigger("run-job", { jobId: job.id });

      return { success: true };
    }),

  delete: workspaceProcedure
    .input(clipIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("video_clips")
        .select("id, created_by, r2_object_key")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .limit(1);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const clip = data?.[0] as
        | { id: string; created_by: string; r2_object_key: string | null }
        | undefined;

      if (!clip) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Clip not found" });
      }

      const canDelete =
        ["owner", "admin"].includes(ctx.role) ||
        clip.created_by === ctx.user.id;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this clip",
        });
      }

      const { error: deleteError } = await ctx.insforge.database
        .from("video_clips")
        .delete()
        .eq("id", clip.id);

      if (deleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: deleteError.message,
        });
      }

      if (clip.r2_object_key) {
        await deleteObject(clip.r2_object_key).catch(() => {});
      }

      return { success: true };
    }),

  update: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        title: z.string().trim().min(1).max(200).optional(),
        prompt: z.string().trim().min(1).max(2000).optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("video_clips")
        .select("id, created_by, status")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .limit(1);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const clip = data?.[0] as
        | { id: string; created_by: string; status: string }
        | undefined;

      if (!clip) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Clip not found" });
      }

      const canUpdate =
        ["owner", "admin"].includes(ctx.role) ||
        clip.created_by === ctx.user.id;

      if (!canUpdate) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update this clip",
        });
      }

      if (clip.status !== "draft") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Only drafts can be updated",
        });
      }

      const { data: updatedData, error: updateError } = await ctx.insforge.database
        .from("video_clips")
        .update({
          title: input.title,
          prompt: input.prompt,
        })
        .eq("id", input.id)
        .select()
        .single();

      if (updateError || !updatedData) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError?.message ?? "Failed to update clip",
        });
      }

      return mapClip(updatedData as ClipRow);
    }),
});

export type Clip = ReturnType<typeof mapClip>;
