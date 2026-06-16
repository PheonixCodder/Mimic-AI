import { z } from "zod";

export const brandKitInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  colors: z.object({
    primary: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
    secondary: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
    background: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
    text: z.string().regex(/^#[0-9A-F]{6}$/i, "Must be a valid hex color"),
  }),
  fonts: z.object({
    primary: z.string().min(1, "Primary font is required"),
    header: z.string().min(1, "Header font is required"),
  }),
});

export type BrandKitInput = z.infer<typeof brandKitInputSchema>;

export type BrandKitRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  logo_url: string | null;
  logo_key: string | null;
  colors: {
    primary: string;
    secondary: string;
    background: string;
    text: string;
  };
  fonts: {
    primary: string;
    header: string;
  };
  created_at: string;
  updated_at: string;
};

export const templateInputSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  description: z.string().trim().max(500).optional().nullable(),
  brandKitId: z.string().uuid().optional().nullable(),
  avatarId: z.string().uuid().optional().nullable(),
  voiceId: z.string().uuid().optional().nullable(),
  layoutConfig: z.object({
    aspectRatio: z.enum(["16:9", "9:16", "1:1"]),
    avatarPosition: z.enum(["left", "center", "right"]),
    avatarSize: z.enum(["small", "medium", "large"]),
    subtitlesEnabled: z.boolean(),
  }),
});

export type TemplateInput = z.infer<typeof templateInputSchema>;

export type TemplateRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  brand_kit_id: string | null;
  avatar_id: string | null;
  voice_id: string | null;
  name: string;
  description: string | null;
  layout_config: {
    aspectRatio: "16:9" | "9:16" | "1:1";
    avatarPosition: "left" | "center" | "right";
    avatarSize: "small" | "medium" | "large";
    subtitlesEnabled: boolean;
  };
  created_at: string;
  updated_at: string;
};
