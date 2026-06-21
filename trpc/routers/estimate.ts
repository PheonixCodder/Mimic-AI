import { z } from "zod";

import {
  estimateVideoCost,
  estimateDurationFromScript,
  formatCurrency,
  PRICING,
  type Resolution,
} from "@/lib/pricing/estimate";
import { createTRPCRouter, workspaceProcedure } from "../init";

const estimateVideoInputSchema = z.object({
  videoId: z.string().uuid(),
});

const estimateDraftInputSchema = z.object({
  script: z.string().min(1),
  resolution: z.enum(["720p", "1080p", "4k"]),
  voiceId: z.string().uuid(),
  avatarId: z.string().uuid(),
  includeCaptions: z.boolean().default(true),
});

function enrichEstimate(estimate: ReturnType<typeof estimateVideoCost>) {
  return {
    ...estimate,
    formattedTotal: formatCurrency(estimate.total),
    lineItems: estimate.lineItems.map((item) => ({
      ...item,
      formattedTotal: formatCurrency(item.total),
      formattedUnitCost: formatCurrency(item.unitCost),
    })),
  };
}

export const estimateRouter = createTRPCRouter({
  /**
   * Calculate a real cost estimate from a saved video row.
   */
  calculate: workspaceProcedure
    .input(estimateVideoInputSchema)
    .query(async ({ ctx, input }) => {
      const { database } = ctx.insforge;

      const { data: video, error } = await database
        .from("videos")
        .select(
          "script, resolution, voice_id, avatar_id, voice:voices!voice_id(variant), avatar:avatars!avatar_id(variant)"
        )
        .eq("id", input.videoId)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (error) {
        throw new Error(`Failed to load video: ${error.message}`);
      }
      if (!video) {
        throw new Error("Video not found");
      }

      const typedVideo = video as unknown as {
        script: string;
        resolution: string;
        voice_id: string | null;
        avatar_id: string | null;
        voice: { variant: string } | null;
        avatar: { variant: string } | null;
      };

      const isCustomVoice =
        typedVideo.voice_id != null && typedVideo.voice?.variant === "custom";
      const isCustomAvatar =
        typedVideo.avatar_id != null && typedVideo.avatar?.variant === "custom";

      const estimate = estimateVideoCost({
        scriptCharacterCount: typedVideo.script.length,
        resolution: typedVideo.resolution as Resolution,
        isCustomVoice,
        isCustomAvatar,
        includeCaptions: true,
      });

      return enrichEstimate(estimate);
    }),

  /**
   * Calculate a real cost estimate from a draft configuration.
   *
   * Useful in the wizard before a video row has been saved.
   */
  calculateDraft: workspaceProcedure
    .input(estimateDraftInputSchema)
    .query(async ({ ctx, input }) => {
      const { database } = ctx.insforge;

      const { data: voice, error: voiceError } = await database
        .from("voices")
        .select("variant")
        .eq("id", input.voiceId)
        .single();

      if (voiceError) {
        throw new Error(`Failed to load voice: ${voiceError.message}`);
      }

      const { data: avatar, error: avatarError } = await database
        .from("avatars")
        .select("variant")
        .eq("id", input.avatarId)
        .single();

      if (avatarError) {
        throw new Error(`Failed to load avatar: ${avatarError.message}`);
      }

      const estimate = estimateVideoCost({
        scriptCharacterCount: input.script.length,
        resolution: input.resolution,
        isCustomVoice: voice.variant === "custom",
        isCustomAvatar: avatar.variant === "custom",
        includeCaptions: input.includeCaptions,
      });

      return {
        ...enrichEstimate(estimate),
        estimatedDurationSeconds: estimateDurationFromScript(input.script.length),
      };
    }),

  /**
   * Return the current pricing table. Useful for the pricing page and UI.
   */
  getPricing: workspaceProcedure.query(() => {
    return {
      currency: "USD" as const,
      voiceClone: PRICING.voiceClone,
      avatarGeneration: PRICING.avatarGeneration,
      scriptPerCharacter: PRICING.scriptPerCharacter,
      captionGeneration: PRICING.captionGeneration,
      computeUnitRates: PRICING.computeUnitRates,
      resolutionMultiplier: PRICING.resolutionMultiplier,
    };
  }),
});
