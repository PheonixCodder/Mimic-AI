import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, workspaceProcedure } from "../init";

type TwinRow = {
  id: string;
  avatar_id: string;
  workspace_id: string;
  speaking_style: string;
  tone: string;
  personality: string | null;
  vocabulary: string | null;
  updated_at: string;
};

const twinInputSchema = z.object({
  avatarId: z.string().uuid(),
  speakingStyle: z.enum(["conversational", "formal", "casual", "authoritative", "storytelling"]),
  tone: z.enum(["professional", "friendly", "energetic", "calm", "inspirational"]),
  personality: z.string().trim().max(500).optional().nullable(),
  vocabulary: z.string().trim().max(500).optional().nullable(),
});

export const digitalTwinsRouter = createTRPCRouter({
  get: workspaceProcedure
    .input(z.object({ avatarId: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const { data } = await ctx.insforge.database
        .from("digital_twins")
        .select("*")
        .eq("avatar_id", input.avatarId)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (!data) return null;
      return mapTwin(data as TwinRow);
    }),

  upsert: workspaceProcedure
    .input(twinInputSchema)
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin", "member"].includes(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      // Check avatar belongs to workspace
      const { data: avatar } = await ctx.insforge.database
        .from("avatars")
        .select("id, variant")
        .eq("id", input.avatarId)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (!avatar) throw new TRPCError({ code: "NOT_FOUND", message: "Avatar not found" });
      if ((avatar as { variant: string }).variant !== "custom") {
        throw new TRPCError({ code: "BAD_REQUEST", message: "Digital twins can only be configured for custom avatars" });
      }

      // Upsert
      const { data, error } = await ctx.insforge.database
        .from("digital_twins")
        .upsert({
          avatar_id: input.avatarId,
          workspace_id: ctx.workspace.id,
          speaking_style: input.speakingStyle,
          tone: input.tone,
          personality: input.personality ?? null,
          vocabulary: input.vocabulary ?? null,
          updated_at: new Date().toISOString(),
        }, { onConflict: "avatar_id" })
        .select()
        .single();

      if (error || !data) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error?.message });
      return mapTwin(data as TwinRow);
    }),
});

function mapTwin(row: TwinRow) {
  return {
    id: row.id,
    avatarId: row.avatar_id,
    speakingStyle: row.speaking_style,
    tone: row.tone,
    personality: row.personality,
    vocabulary: row.vocabulary,
    updatedAt: row.updated_at,
  };
}
