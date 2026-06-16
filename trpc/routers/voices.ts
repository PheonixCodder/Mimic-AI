import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { VoiceRow } from "@/features/voices/lib/schemas";
import { deleteObject } from "@/lib/r2";
import { createTRPCRouter, workspaceProcedure } from "../init";

const voiceIdSchema = z.object({
  id: z.string().uuid(),
});

function mapVoice(row: VoiceRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    category: row.category,
    language: row.language,
    variant: row.variant,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSearchFilter(query?: string) {
  if (!query) {
    return null;
  }

  const term = `%${query}%`;
  return `name.ilike.${term},description.ilike.${term}`;
}

export const voicesRouter = createTRPCRouter({
  getAll: workspaceProcedure
    .input(
      z
        .object({
          query: z.string().trim().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const searchFilter = buildSearchFilter(input?.query);

      let customQuery = ctx.insforge.database
        .from("voices")
        .select(
          "id, workspace_id, created_by, name, description, category, language, variant, status, created_at, updated_at",
        )
        .eq("variant", "custom")
        .eq("workspace_id", ctx.workspace.id)
        .order("created_at", { ascending: false });

      let systemQuery = ctx.insforge.database
        .from("voices")
        .select(
          "id, workspace_id, created_by, name, description, category, language, variant, status, created_at, updated_at",
        )
        .eq("variant", "system")
        .order("name", { ascending: true });

      if (searchFilter) {
        customQuery = customQuery.or(searchFilter);
        systemQuery = systemQuery.or(searchFilter);
      }

      const [customResult, systemResult] = await Promise.all([
        customQuery,
        systemQuery,
      ]);

      if (customResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: customResult.error.message,
        });
      }

      if (systemResult.error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: systemResult.error.message,
        });
      }

      return {
        custom: ((customResult.data ?? []) as VoiceRow[]).map(mapVoice),
        system: ((systemResult.data ?? []) as VoiceRow[]).map(mapVoice),
      };
    }),

  delete: workspaceProcedure
    .input(voiceIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("voices")
        .select("id, variant, created_by, r2_object_key")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .eq("variant", "custom")
        .limit(1);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const voice = data?.[0] as
        | {
            id: string;
            variant: string;
            created_by: string | null;
            r2_object_key: string | null;
          }
        | undefined;

      if (!voice) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Voice not found" });
      }

      const canDelete =
        ["owner", "admin"].includes(ctx.role) || voice.created_by === ctx.user.id;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this voice",
        });
      }

      const { error: deleteError } = await ctx.insforge.database
        .from("voices")
        .delete()
        .eq("id", voice.id);

      if (deleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: deleteError.message,
        });
      }

      if (voice.r2_object_key) {
        await deleteObject(voice.r2_object_key).catch(() => {});
      }

      return { success: true };
    }),
});

export type Voice = ReturnType<typeof mapVoice>;
