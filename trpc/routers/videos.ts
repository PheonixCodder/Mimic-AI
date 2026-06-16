import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { tasks } from "@trigger.dev/sdk/v3";

import { videoCreateSchema, type VideoRow, type BRollClip } from "@/features/videos/lib/schemas";
import { deleteObject } from "@/lib/r2";
import { createTRPCRouter, workspaceProcedure } from "../init";

const videoIdSchema = z.object({
  id: z.string().uuid(),
});

type InsforgeDb = Awaited<
  ReturnType<typeof import("@/lib/insforge/server").createInsForgeServerClient>
>["database"];

function mapVideo(row: VideoRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    projectId: row.project_id,
    scriptId: row.script_id,
    voiceId: row.voice_id,
    avatarId: row.avatar_id,
    title: row.title,
    script: row.script,
    aspectRatio: row.aspect_ratio,
    resolution: row.resolution,
    status: row.status,
    r2ObjectKey: row.r2_object_key,
    audioObjectKey: row.audio_object_key,
    previewObjectKey: row.preview_object_key,
    previewStatus: row.preview_status,
    previewError: row.preview_error,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    subtitlesStatus: row.subtitles_status,
    subtitlesError: row.subtitles_error,
    subtitles: row.subtitles,
    brollClips: (row.broll_clips as any) || [],
  };
}

function buildSearchFilter(query?: string) {
  if (!query) {
    return null;
  }

  const term = `%${query}%`;
  return `title.ilike.${term},script.ilike.${term}`;
}

async function assertVoiceAccessible(
  database: InsforgeDb,
  workspaceId: string,
  voiceId: string,
) {
  const { data, error } = await database
    .from("voices")
    .select("id, variant, workspace_id")
    .eq("id", voiceId)
    .limit(1);

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  const voice = data?.[0] as
    | { id: string; variant: string; workspace_id: string | null }
    | undefined;

  if (!voice) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Voice not found" });
  }

  if (voice.variant === "custom" && voice.workspace_id !== workspaceId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Voice not found" });
  }
}

async function assertScriptAccessible(
  database: InsforgeDb,
  workspaceId: string,
  scriptId: string,
) {
  const { data, error } = await database
    .from("scripts")
    .select("id, content, project_id")
    .eq("id", scriptId)
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  const script = data?.[0] as
    | { id: string; content: string; project_id: string | null }
    | undefined;

  if (!script) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Script not found" });
  }

  return script;
}

async function assertAvatarAccessible(
  database: InsforgeDb,
  workspaceId: string,
  avatarId: string,
) {
  const { data, error } = await database
    .from("avatars")
    .select("id, variant, workspace_id")
    .eq("id", avatarId)
    .limit(1);

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  const avatar = data?.[0] as
    | { id: string; variant: string; workspace_id: string | null }
    | undefined;

  if (!avatar) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Avatar not found" });
  }

  if (avatar.variant === "custom" && avatar.workspace_id !== workspaceId) {
    throw new TRPCError({ code: "BAD_REQUEST", message: "Avatar not found" });
  }
}

export const videosRouter = createTRPCRouter({
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
        .from("videos")
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

      return ((data ?? []) as VideoRow[]).map(mapVideo);
    }),

  getById: workspaceProcedure
    .input(videoIdSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("videos")
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

      const row = data?.[0] as VideoRow | undefined;

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      const video = mapVideo(row);

      let voiceName: string | null = null;
      let avatarName: string | null = null;
      let projectName: string | null = null;
      let scriptTitle: string | null = null;

      if (row.voice_id) {
        const { data: voices } = await ctx.insforge.database
          .from("voices")
          .select("name")
          .eq("id", row.voice_id)
          .limit(1);
        voiceName = (voices?.[0] as { name: string } | undefined)?.name ?? null;
      }

      if (row.avatar_id) {
        const { data: avatars } = await ctx.insforge.database
          .from("avatars")
          .select("name")
          .eq("id", row.avatar_id)
          .limit(1);
        avatarName = (avatars?.[0] as { name: string } | undefined)?.name ?? null;
      }

      if (row.project_id) {
        const { data: projects } = await ctx.insforge.database
          .from("projects")
          .select("name")
          .eq("id", row.project_id)
          .limit(1);
        projectName =
          (projects?.[0] as { name: string } | undefined)?.name ?? null;
      }

      if (row.script_id) {
        const { data: scripts } = await ctx.insforge.database
          .from("scripts")
          .select("title")
          .eq("id", row.script_id)
          .limit(1);
        scriptTitle =
          (scripts?.[0] as { title: string } | undefined)?.title ?? null;
      }

      return {
        ...video,
        voiceName,
        avatarName,
        projectName,
        scriptTitle,
        hasOutput: Boolean(row.r2_object_key),
        previewObjectKey: row.preview_object_key,
        hasPreview: Boolean(row.preview_object_key),
      };
    }),

  create: workspaceProcedure
    .input(videoCreateSchema)
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to create videos",
        });
      }

      await assertVoiceAccessible(
        ctx.insforge.database,
        ctx.workspace.id,
        input.voiceId,
      );
      await assertAvatarAccessible(
        ctx.insforge.database,
        ctx.workspace.id,
        input.avatarId,
      );

      const script = await assertScriptAccessible(
        ctx.insforge.database,
        ctx.workspace.id,
        input.scriptId,
      );

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

      const projectId =
        input.projectId ?? script.project_id ?? null;

      const { data, error } = await ctx.insforge.database
        .from("videos")
        .insert({
          workspace_id: ctx.workspace.id,
          created_by: ctx.user.id,
          project_id: projectId,
          script_id: input.scriptId,
          voice_id: input.voiceId,
          avatar_id: input.avatarId,
          title: input.title,
          script: script.content,
          aspect_ratio: input.aspectRatio,
          resolution: input.resolution,
          status: "draft",
        })
        .select();

      const row = data?.[0] as VideoRow | undefined;

      if (error || !row) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create video",
        });
      }

      return mapVideo(row);
    }),

  generate: workspaceProcedure
    .input(videoIdSchema)
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to generate videos",
        });
      }

      // Fetch video details
      const { data: video, error: fetchError } = await ctx.insforge.database
        .from("videos")
        .select("*")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (fetchError || !video) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found",
        });
      }

      const row = video as VideoRow;

      if (row.status !== "draft" && row.status !== "failed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Cannot start generation for a video with status '${row.status}'`,
        });
      }

      // Update video status to pending
      const { error: updateError } = await ctx.insforge.database
        .from("videos")
        .update({ status: "pending" })
        .eq("id", input.id);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      // Create a unified job tracking record
      const { data: job, error: jobError } = await ctx.insforge.database
        .from("jobs")
        .insert([
          {
            workspace_id: ctx.workspace.id,
            created_by: ctx.user.id,
            type: "video_render",
            title: `Render: ${row.title}`,
            resource_id: row.id,
            resource_type: "video",
            status: "queued",
            progress: 0,
          },
        ])
        .select()
        .single();

      if (jobError || !job) {
        // Rollback video status if job creation fails
        await ctx.insforge.database
          .from("videos")
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

      // Trigger background task execution
      await tasks.trigger("run-job", { jobId: job.id });

      return { success: true };
    }),

  generatePreview: workspaceProcedure
    .input(videoIdSchema)
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to generate previews",
        });
      }

      const { data: video, error: fetchError } = await ctx.insforge.database
        .from("videos")
        .select("*")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (fetchError || !video) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found",
        });
      }

      const row = video as VideoRow;

      if (row.preview_status === "pending" || row.preview_status === "processing") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Preview generation is already in progress",
        });
      }

      // Update preview status to pending
      const { error: updateError } = await ctx.insforge.database
        .from("videos")
        .update({ preview_status: "pending", preview_error: null })
        .eq("id", input.id);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      // Create a job for preview generation
      const { data: job, error: jobError } = await ctx.insforge.database
        .from("jobs")
        .insert([
          {
            workspace_id: ctx.workspace.id,
            created_by: ctx.user.id,
            type: "video_preview",
            title: `Preview: ${row.title}`,
            resource_id: row.id,
            resource_type: "video",
            status: "queued",
            progress: 0,
          },
        ])
        .select()
        .single();

      if (jobError || !job) {
        await ctx.insforge.database
          .from("videos")
          .update({ preview_status: "idle" })
          .eq("id", input.id);

        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: jobError?.message ?? "Failed to create preview job",
        });
      }

      await tasks.trigger("run-job", { jobId: job.id });

      return { success: true };
    }),

  generateCaptions: workspaceProcedure
    .input(videoIdSchema)
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to generate captions",
        });
      }

      // Fetch video details
      const { data: video, error: fetchError } = await ctx.insforge.database
        .from("videos")
        .select("*")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (fetchError || !video) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found",
        });
      }

      const row = video as VideoRow;

      if (row.status !== "completed") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Cannot generate captions for an incomplete video",
        });
      }

      if (row.subtitles_status === "pending" || row.subtitles_status === "processing") {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: "Caption generation is already in progress",
        });
      }

      // Update subtitles status to pending
      const { error: updateError } = await ctx.insforge.database
        .from("videos")
        .update({ subtitles_status: "pending", subtitles_error: null })
        .eq("id", input.id);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      // Create a unified job tracking record
      const { data: job, error: jobError } = await ctx.insforge.database
        .from("jobs")
        .insert([
          {
            workspace_id: ctx.workspace.id,
            created_by: ctx.user.id,
            type: "caption_generate",
            title: `Captions: ${row.title}`,
            resource_id: row.id,
            resource_type: "video",
            status: "queued",
            progress: 0,
          },
        ])
        .select()
        .single();

      if (jobError || !job) {
        // Rollback subtitles status if job creation fails
        await ctx.insforge.database
          .from("videos")
          .update({ subtitles_status: row.subtitles_status })
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

      // Trigger background task execution
      await tasks.trigger("run-job", { jobId: job.id });

      return { success: true };
    }),

  updateCaptions: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        subtitles: z.array(
          z.object({
            start: z.number(),
            end: z.number(),
            text: z.string(),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update captions",
        });
      }

      const { data: video, error: fetchError } = await ctx.insforge.database
        .from("videos")
        .select("id")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .limit(1);

      if (fetchError || !video?.[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found",
        });
      }

      const { error: updateError } = await ctx.insforge.database
        .from("videos")
        .update({
          subtitles: input.subtitles,
          subtitles_status: "completed",
        })
        .eq("id", input.id);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      return { success: true };
    }),

  delete: workspaceProcedure
    .input(videoIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("videos")
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

      const video = data?.[0] as
        | { id: string; created_by: string; r2_object_key: string | null }
        | undefined;

      if (!video) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Video not found" });
      }

      const canDelete =
        ["owner", "admin"].includes(ctx.role) ||
        video.created_by === ctx.user.id;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this video",
        });
      }

      const { error: deleteError } = await ctx.insforge.database
        .from("videos")
        .delete()
        .eq("id", video.id);

      if (deleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: deleteError.message,
        });
      }

      if (video.r2_object_key) {
        await deleteObject(video.r2_object_key).catch(() => {});
      }

      return { success: true };
    }),

  updateBroll: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        brollClips: z.array(
          z.object({
            id: z.string(),
            provider: z.enum(["pexels", "pixabay", "mock"]),
            title: z.string(),
            thumbnailUrl: z.string(),
            previewUrl: z.string(),
            duration: z.number(),
            width: z.number(),
            height: z.number(),
            tags: z.array(z.string()),
          })
        ),
      })
    )
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to update B-roll clips",
        });
      }

      const { data: video, error: fetchError } = await ctx.insforge.database
        .from("videos")
        .select("id")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .limit(1);

      if (fetchError || !video?.[0]) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Video not found",
        });
      }

      const { error: updateError } = await ctx.insforge.database
        .from("videos")
        .update({
          broll_clips: input.brollClips,
        })
        .eq("id", input.id);

      if (updateError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: updateError.message,
        });
      }

      return { success: true };
    }),
});

export type Video = ReturnType<typeof mapVideo>;
