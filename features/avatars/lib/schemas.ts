import { z } from "zod";

import { AVATAR_STYLES } from "@/features/avatars/data/avatar-styles";

export const avatarCreateMetadataSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  style: z.enum(AVATAR_STYLES),
  description: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .transform((value) => (value && value.length > 0 ? value : null)),
  modelVariantId: z.string().uuid().optional().nullable(),
});

export type AvatarRow = {
  id: string;
  workspace_id: string | null;
  created_by: string | null;
  variant: "system" | "custom";
  name: string;
  description: string | null;
  style: string;
  r2_object_key: string | null;
  status: string;
  readiness_score: number | null;
  validation_results: Record<string, any> | null;
  auto_validated_at: string | null;
  model_variant_id: string | null;
  created_at: string;
  updated_at: string;
};
