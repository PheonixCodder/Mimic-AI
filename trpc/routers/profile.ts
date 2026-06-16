import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, protectedProcedure } from "../init";

type ProfileRow = {
  user_id: string;
  display_name: string | null;
  avatar_url: string | null;
  active_workspace_id: string | null;
  notification_preferences: { video_render: boolean; billing_alerts: boolean } | null;
};

export const profileRouter = createTRPCRouter({
  getMe: protectedProcedure.query(async ({ ctx }) => {
    const { data: profiles, error } = await ctx.insforge.database
      .from("profiles")
      .select("*")
      .eq("user_id", ctx.user.id)
      .limit(1);

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    return {
      user: ctx.user,
      profile: (profiles?.[0] as ProfileRow | undefined) ?? null,
    };
  }),

  /**
   * Update the user's display name.
   */
  updateProfile: protectedProcedure
    .input(
      z.object({
        displayName: z.string().min(1).max(80),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.insforge.database
        .from("profiles")
        .update({ display_name: input.displayName })
        .eq("user_id", ctx.user.id);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true };
    }),

  /**
   * Update the user's notification preferences.
   */
  updatePreferences: protectedProcedure
    .input(
      z.object({
        videoRender: z.boolean(),
        billingAlerts: z.boolean(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { error } = await ctx.insforge.database
        .from("profiles")
        .update({
          notification_preferences: {
            video_render: input.videoRender,
            billing_alerts: input.billingAlerts,
          },
        })
        .eq("user_id", ctx.user.id);

      if (error) {
        throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      }

      return { success: true };
    }),
});
