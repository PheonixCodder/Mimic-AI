import { z } from "zod";

export const scriptInputSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(120),
  content: z.string().trim().min(1, "Script content is required").max(50000),
  projectId: z.string().uuid().optional().nullable(),
});

export type ScriptInput = z.infer<typeof scriptInputSchema>;

export type ScriptRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  project_id: string | null;
  title: string;
  content: string;
  character_count: number;
  created_at: string;
  updated_at: string;
};
