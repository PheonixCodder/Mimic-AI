import { tool } from "@langchain/core/tools";
import { z } from "zod";
import { insforgeAdmin } from "@/lib/insforge/admin";

// Define the default system skills content
export const DEFAULT_SKILLS = [
  {
    name: "script_writing",
    description: "Database schemas, prompt structures, and guidelines for generating video scripts, templates, and brand voice kits.",
    content: `
# Script Writing & Brand Alignment Guidelines

## Tables & Schema Reference

### scripts
- id (UUID)
- title (TEXT)
- content (TEXT) - The spoken dialogue of the script. Do NOT include screenplay markers or parentheses.
- project_id (UUID)

### templates
- id (UUID)
- name (TEXT)
- system_prompt (TEXT)
- aspect_ratio (TEXT) - "16:9" (landscape), "9:16" (portrait), "1:1" (square)

### brand_kits
- id (UUID)
- name (TEXT)
- font_family (TEXT) - OutFit, Inter, Roboto
- primary_color (TEXT) - hex color

## Rules for Script Generation
1. Only return spoken text. Never add stage directions (like [Laughs] or *Smiling*).
2. Segment scripts into paragraphs representing scene blocks.
3. Align scripts with active templates and brand colors if specified by the user.
`
  },
  {
    name: "video_production",
    description: "Inference pipelines, talking avatar rendering, cost estimations, and safety gate consent rules.",
    content: `
# Video Production & Composition Workflows

## Tools & Pipeline Reference

### video_render / generate_video
- Spawns Talking Avatars (LivePortrait / LatentSync on Modal GPU).
- Triggers a Trigger.dev task ("run-job") with payload: { jobId }
- Execution Stages:
  1. validating_inputs (15%)
  2. generating_speech (40%)
  3. rendering_avatar (70%)
  4. combining_tracks (90%)
  5. uploading_r2 (95%)

### cost_estimate
- Always calculate price estimate before rendering.
- Polar billing meters track compute units and apply pricing per second of video.

## Creation Requirements
To trigger a video generation, you MUST gather or lookup:
- avatarId (Alex, Ava, etc.)
- voiceId (cloned custom voice or system voice)
- scriptId (script written in the project)
- projectId (project container ID)
- title

*Edge Case Resolution*: If the user says "Create video with Ava avatar", first lookup Ava's ID, query the available voices in the workspace, and if a script is missing, ask the user to verify/write a script.
`
  },
  {
    name: "system_metrics",
    description: "Audit trail events, Trigger.dev background task states, and Polar billing usage parameters.",
    content: `
# Analytics, Metrics, & Monitoring Reference

## Jobs Queue Status
- queued: Job is in line.
- running: Task is active on Trigger.dev.
- completed: Job succeeded.
- failed: Job crashed (Modal error, out-of-memory, etc.).

## Audit Log Actions
- "workspace.created", "video.generated", "voice.cloned", "script.updated"

## Webhooks
- Webhook subscriptions trigger events ("job.running", "job.completed") to external URLs.
`
  }
];

/**
 * Ensures that the default system skills are seeded in the database for the active workspace.
 * This runs on-demand before executing the agent loop.
 */
export async function ensureDefaultSkills(workspaceId: string): Promise<void> {
  const rows = DEFAULT_SKILLS.map((skill) => ({
    workspace_id: workspaceId,
    name: skill.name,
    description: skill.description,
    content: skill.content,
  }));

  const { error } = await insforgeAdmin.database
    .from("agent_skills")
    .upsert(rows, { onConflict: "workspace_id,name", ignoreDuplicates: true });

  if (error) {
    console.error("Failed to seed default skills:", error.message);
  }
}

/**
 * Creates the load_skill tool bound to the current workspace.
 */
export function createLoadSkillTool(workspaceId: string) {
  return tool(
    async ({ name }: { name: string }) => {
      const { data, error } = await insforgeAdmin.database
        .from("agent_skills")
        .select("content")
        .eq("workspace_id", workspaceId)
        .eq("name", name)
        .maybeSingle();

      if (error) {
        return `Failed to load skill "${name}": ${error.message}`;
      }
      if (!data) {
        return `Skill "${name}" was not found in this workspace. Available skills are: ${DEFAULT_SKILLS.map(s => s.name).join(", ")}`;
      }

      return data.content;
    },
    {
      name: "load_skill",
      description: "Loads detailed schema, business instructions, or execution workflows for a vertical (e.g. 'script_writing', 'video_production', 'system_metrics') on-demand.",
      schema: z.object({
        name: z.string().describe("The name of the skill to load (e.g., 'script_writing', 'video_production', 'system_metrics')"),
      }),
    }
  );
}
