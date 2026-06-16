import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";

import { videoExportCreateSchema, type VideoExportRow } from "@/features/videos/lib/schemas";
import { deleteObject } from "@/lib/r2";
import { createTRPCRouter, workspaceProcedure } from "../init";

const exportIdSchema = z.object({
  id: z.string().uuid(),
});

function assertCanWrite(role: string) {
  if (!["owner", "admin", "member"].includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to export videos",
    });
  }
}

function mapVideoExport(row: VideoExportRow) {
  return {
    id: row.id,
    videoId: row.video_id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    resolution: row.resolution,
    format: row.format,
    watermarkEnabled: row.watermark_enabled,
    status: row.status,
    r2ObjectKey: row.r2_object_key,
    r2ObjectUrl: row.r2_object_url,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const exportsRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(z.object({ videoId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("video_exports")
        .select("*")
        .eq("workspace_id", ctx.workspace.id)
        .eq("video_id", input.videoId)
        .order("created_at", { ascending: false });

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message ?? "Failed to retrieve exports list",
        });
      }

      return (data as VideoExportRow[]).map(mapVideoExport);
    }),

  create: workspaceProcedure
    .input(videoExportCreateSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      // Validate video exists in workspace
      const { data: video, error: videoError } = await ctx.insforge.database
        .from("videos")
        .select("id, title, status")
        .eq("workspace_id", ctx.workspace.id)
        .eq("id", input.videoId)
        .single();

      if (videoError || !video) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found",
        });
      }

      if (video.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Video must be in 'completed' status before it can be exported.",
        });
      }

      // Create new export record
      const { data, error } = await ctx.insforge.database
        .from("video_exports")
        .insert([
          {
            video_id: input.videoId,
            workspace_id: ctx.workspace.id,
            created_by: ctx.user.id,
            resolution: input.resolution,
            format: input.format,
            watermark_enabled: input.watermarkEnabled,
            status: "pending",
          },
        ])
        .select()
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create export job record.",
        });
      }

      const createdExport = data as VideoExportRow;

      // Create a unified job tracking record
      const { data: job, error: jobError } = await ctx.insforge.database
        .from("jobs")
        .insert([
          {
            workspace_id: ctx.workspace.id,
            created_by: ctx.user.id,
            type: "video_export",
            title: `Export: ${video.title} (${input.resolution})`,
            resource_id: createdExport.id,
            resource_type: "export",
            status: "queued",
            progress: 0,
          },
        ])
        .select()
        .single();

      if (jobError || !job) {
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

      // Trigger background task execution
      await tasks.trigger("run-job", { jobId: job.id });

      return mapVideoExport(createdExport);
    }),

  delete: workspaceProcedure
    .input(exportIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      // Check if export exists in workspace
      const { data: exportItem, error: fetchError } = await ctx.insforge.database
        .from("video_exports")
        .select("*")
        .eq("workspace_id", ctx.workspace.id)
        .eq("id", input.id)
        .single();

      if (fetchError || !exportItem) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Export record not found",
        });
      }

      // Delete from DB
      const { error } = await ctx.insforge.database
        .from("video_exports")
        .delete()
        .eq("id", input.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message ?? "Failed to delete export record.",
        });
      }

      // Delete from R2 if completed
      const record = exportItem as VideoExportRow;
      if (record.r2_object_key) {
        try {
          await deleteObject(record.r2_object_key);
        } catch (e) {
          console.error(`Failed to delete export R2 object key: ${record.r2_object_key}`, e);
        }
      }

      return { success: true };
    }),
});

export type VideoExport = ReturnType<typeof mapVideoExport>;
