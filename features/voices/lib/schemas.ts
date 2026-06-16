import { z } from "zod";

import { VOICE_CATEGORIES } from "@/features/voices/data/voice-categories";

export const voiceCreateMetadataSchema = z.object({
  name: z.string().trim().min(1, "Voice name is required").max(120),
  category: z.enum(VOICE_CATEGORIES),
  language: z.string().trim().min(1, "Language is required"),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
});

export type VoiceRow = {
  id: string;
  workspace_id: string | null;
  created_by: string | null;
  variant: "system" | "custom";
  name: string;
  description: string | null;
  category: string;
  language: string;
  r2_object_key: string | null;
  status: string;
  created_at: string;
  updated_at: string;
};
