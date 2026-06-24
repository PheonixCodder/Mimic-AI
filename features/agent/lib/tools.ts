import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { insforgeAdmin } from "@/lib/insforge/admin";
import { tasks } from "@trigger.dev/sdk/v3";

/**
 * Helper to register all workspace-scoped tools for the agent.
 * @param userId - The active user's ID
 * @param workspaceId - The current workspace ID
 */
export function createWorkspaceTools(userId: string, workspaceId: string) {
  return [
    // 1. List Projects
    tool(
      async () => {
        const { data, error } = await insforgeAdmin.database
          .from("projects")
          .select("id, name, description, created_at")
          .eq("workspace_id", workspaceId);

        if (error) return `Failed to list projects: ${error.message}`;
        return JSON.stringify(data ?? []);
      },
      {
        name: "list_projects",
        description: "Returns a list of all projects inside the current workspace.",
        schema: z.object({}),
      }
    ),

    // 2. Create Project
    tool(
      async ({ name, description }: { name: string; description?: string }) => {
        const { data, error } = await insforgeAdmin.database
          .from("projects")
          .insert([
            {
              workspace_id: workspaceId,
              created_by: userId,
              name,
              description,
            }
          ])
          .select()
          .single();

        if (error) return `Failed to create project: ${error.message}`;
        return `Project created successfully:\n${JSON.stringify(data)}`;
      },
      {
        name: "create_project",
        description: "Creates a new project container in the active workspace. Input: { name: string, description?: string }",
        schema: z.object({
          name: z.string().describe("The name of the project"),
          description: z.string().optional().describe("Optional description for the project"),
        }),
      }
    ),

    // 3. List Scripts
    tool(
      async ({ projectId }: { projectId?: string }) => {
        let query = insforgeAdmin.database
          .from("scripts")
          .select("id, title, content, project_id, created_at")
          .eq("workspace_id", workspaceId);

        if (projectId) {
          query = query.eq("project_id", projectId);
        }

        const { data, error } = await query;
        if (error) return `Failed to list scripts: ${error.message}`;
        return JSON.stringify(data ?? []);
      },
      {
        name: "list_scripts",
        description: "Returns a list of scripts in the workspace. Optionally filter by projectId.",
        schema: z.object({
          projectId: z.string().uuid().optional().describe("Filter scripts by project ID"),
        }),
      }
    ),

    // 4. Create Script
    tool(
      async ({ title, content, projectId }: { title: string; content: string; projectId: string }) => {
        // Confirm project exists
        const { data: project } = await insforgeAdmin.database
          .from("projects")
          .select("id")
          .eq("id", projectId)
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        if (!project) {
          return `Error: Project with ID "${projectId}" was not found in this workspace. Please create or verify the project ID first.`;
        }

        const { data, error } = await insforgeAdmin.database
          .from("scripts")
          .insert([
            {
              workspace_id: workspaceId,
              created_by: userId,
              project_id: projectId,
              title,
              content,
            }
          ])
          .select()
          .single();

        if (error) return `Failed to create script: ${error.message}`;
        return `Script created successfully:\n${JSON.stringify(data)}`;
      },
      {
        name: "create_script",
        description: "Writes and saves a new script draft in a project. Input: { title: string, content: string, projectId: UUID }",
        schema: z.object({
          title: z.string().describe("Title of the script"),
          content: z.string().describe("The spoken dialogue content (plain text, no directions)"),
          projectId: z.string().uuid().describe("The UUID of the project container"),
        }),
      }
    ),

    // 5. List Avatars
    tool(
      async () => {
        const { data, error } = await insforgeAdmin.database
          .from("avatars")
          .select("id, name, variant, style, status, readiness_score")
          .or(`workspace_id.eq.${workspaceId},variant.eq.system`);

        if (error) return `Failed to list avatars: ${error.message}`;
        return JSON.stringify(data ?? []);
      },
      {
        name: "list_avatars",
        description: "Returns a list of all system and custom talking avatars available in the active workspace.",
        schema: z.object({}),
      }
    ),

    // 6. List Voices
    tool(
      async () => {
        const { data, error } = await insforgeAdmin.database
          .from("voices")
          .select("id, name, variant, category, language, status, quality_score")
          .or(`workspace_id.eq.${workspaceId},variant.eq.system`);

        if (error) return `Failed to list voices: ${error.message}`;
        return JSON.stringify(data ?? []);
      },
      {
        name: "list_voices",
        description: "Returns a list of all cloned custom voices and system voices available in the workspace.",
        schema: z.object({}),
      }
    ),

    // 7. Generate Video (Trigger.dev Integration)
    // NOTE: This is designated as an interrupted tool. The agent loop halts for user approval
    // when this tool is executed, rendering the parameter editor wizard modal in the UI.
    tool(
      async ({ title, projectId, avatarId, voiceId, scriptId }: {
        title: string;
        projectId: string;
        avatarId: string;
        voiceId: string;
        scriptId: string;
      }) => {
        // Validate script and project belong to workspace
        const { data: project } = await insforgeAdmin.database
          .from("projects")
          .select("id")
          .eq("id", projectId)
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        if (!project) return `Error: Project ID "${projectId}" was not found in this workspace.`;

        // Validate avatar belongs to workspace (or is system avatar)
        const { data: avatar } = await insforgeAdmin.database
          .from("avatars")
          .select("id")
          .eq("id", avatarId)
          .or(`workspace_id.eq.${workspaceId},variant.eq.system`)
          .maybeSingle();
        if (!avatar) return `Error: Avatar ID "${avatarId}" was not found in this workspace.`;

        // Validate voice belongs to workspace (or is system voice)
        const { data: voice } = await insforgeAdmin.database
          .from("voices")
          .select("id")
          .eq("id", voiceId)
          .or(`workspace_id.eq.${workspaceId},variant.eq.system`)
          .maybeSingle();
        if (!voice) return `Error: Voice ID "${voiceId}" was not found in this workspace.`;

        // Validate script belongs to workspace
        const { data: script } = await insforgeAdmin.database
          .from("scripts")
          .select("id")
          .eq("id", scriptId)
          .eq("workspace_id", workspaceId)
          .maybeSingle();
        if (!script) return `Error: Script ID "${scriptId}" was not found in this workspace.`;

        // 1. Create Video Row
        const { data: video, error: videoError } = await insforgeAdmin.database
          .from("videos")
          .insert([
            {
              workspace_id: workspaceId,
              created_by: userId,
              project_id: projectId,
              avatar_id: avatarId,
              voice_id: voiceId,
              script_id: scriptId,
              title,
              status: "pending",
              aspect_ratio: "16:9",
              resolution: "1080p",
            }
          ])
          .select()
          .single();

        if (videoError || !video) {
          return `Failed to create video record: ${videoError?.message || "unknown"}`;
        }

        // 2. Create Job Row
        const { data: job, error: jobError } = await insforgeAdmin.database
          .from("jobs")
          .insert([
            {
              workspace_id: workspaceId,
              created_by: userId,
              type: "video_render",
              status: "queued",
              progress: 0,
              resource_id: video.id,
              resource_type: "video",
              title: `Render video: ${title}`,
              metadata: {
                title,
                avatarId,
                voiceId,
                scriptId,
                projectId,
              }
            }
          ])
          .select()
          .single();

        if (jobError || !job) {
          // Rollback video record
          await insforgeAdmin.database.from("videos").delete().eq("id", video.id);
          return `Failed to create background render job: ${jobError?.message || "unknown"}`;
        }

        // 3. Trigger Trigger.dev Task execution
        let runHandle: { id: string };
        try {
          runHandle = await tasks.trigger("run-job", { jobId: job.id });
        } catch (err) {
          // Rollback job & video
          await insforgeAdmin.database.from("jobs").delete().eq("id", job.id);
          await insforgeAdmin.database.from("videos").delete().eq("id", video.id);
          return `Failed to queue render task with background worker: ${err instanceof Error ? err.message : String(err)}`;
        }

        // 4. Update Job with trigger run ID
        await insforgeAdmin.database
          .from("jobs")
          .update({ trigger_run_id: runHandle.id })
          .eq("id", job.id);

        return JSON.stringify({
          message: "Video composition successfully queued on Trigger.dev",
          videoId: video.id,
          jobId: job.id,
          triggerRunId: runHandle.id,
          status: "queued",
          stages: [
            "validating_inputs (15%)",
            "generating_speech (40%)",
            "rendering_avatar (70%)",
            "combining_tracks (90%)",
            "uploading_r2 (95%)"
          ]
        });
      },
      {
        name: "generate_video",
        description: "Saves a video record and triggers an asynchronous video rendering task using the background compositor. Input: { title: string, projectId: UUID, avatarId: UUID, voiceId: UUID, scriptId: UUID }",
        schema: z.object({
          title: z.string().describe("Title of the rendering video"),
          projectId: z.string().uuid().describe("The project container ID"),
          avatarId: z.string().uuid().describe("The avatar ID to render"),
          voiceId: z.string().uuid().describe("The voice ID to synthesize speech from"),
          scriptId: z.string().uuid().describe("The script ID containing the spoken text"),
        }),
      }
    ),

    // 8. Check Job Status
    tool(
      async ({ jobId }: { jobId: string }) => {
        const { data: job, error } = await insforgeAdmin.database
          .from("jobs")
          .select("id, status, progress, updated_at, type, title, trigger_run_id")
          .eq("id", jobId)
          .eq("workspace_id", workspaceId)
          .maybeSingle();

        if (error) return `Failed to check job: ${error.message}`;
        if (!job) return `Job "${jobId}" was not found in this workspace.`;

        return JSON.stringify(job);
      },
      {
        name: "check_job_status",
        description: "Returns the current execution progress, run status, and updated timestamps of a background task. Input: { jobId: UUID }",
        schema: z.object({
          jobId: z.string().uuid().describe("The ID of the background job to monitor"),
        }),
      }
    )
  ];
}
