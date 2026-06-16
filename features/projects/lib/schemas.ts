import { z } from "zod";

export const projectInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z
    .string()
    .trim()
    .max(2000, "Description must be 2000 characters or less")
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type ProjectInput = z.infer<typeof projectInputSchema>;

export type ProjectRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  description: string | null;
  created_at: string;
  updated_at: string;
};
