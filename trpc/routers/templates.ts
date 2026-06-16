import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { templateInputSchema, type TemplateRow } from "@/features/templates/lib/schemas";
import { createTRPCRouter, workspaceProcedure } from "../init";

const templateIdSchema = z.object({
  id: z.string().uuid(),
});

function assertCanWrite(role: string) {
  if (!["owner", "admin", "member"].includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to modify templates",
    });
  }
}

function mapTemplate(row: any) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    brandKitId: row.brand_kit_id,
    brandKitName: row.brand_kit?.name ?? null,
    avatarId: row.avatar_id,
    avatarName: row.avatar?.name ?? null,
    voiceId: row.voice_id,
    voiceName: row.voice?.name ?? null,
    name: row.name,
    description: row.description,
    layoutConfig: row.layout_config,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const templatesRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z
        .object({
          query: z.string().trim().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      let query = ctx.insforge.database
        .from("templates")
        .select(`
          *,
          brand_kit:brand_kit_id (name),
          avatar:avatar_id (name),
          voice:voice_id (name)
        `)
        .eq("workspace_id", ctx.workspace.id)
        .order("updated_at", { ascending: false });

      if (input?.query) {
        query = query.ilike("name", `%${input.query}%`);
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return (data ?? []).map(mapTemplate);
    }),

  getById: workspaceProcedure
    .input(templateIdSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("templates")
        .select(`
          *,
          brand_kit:brand_kit_id (name),
          avatar:avatar_id (name),
          voice:voice_id (name)
        `)
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .limit(1);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const template = data?.[0];
      if (!template) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      return mapTemplate(template);
    }),

  create: workspaceProcedure
    .input(templateInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      const { data, error } = await ctx.insforge.database
        .from("templates")
        .insert({
          workspace_id: ctx.workspace.id,
          created_by: ctx.user.id,
          brand_kit_id: input.brandKitId || null,
          avatar_id: input.avatarId || null,
          voice_id: input.voiceId || null,
          name: input.name,
          description: input.description || null,
          layout_config: input.layoutConfig,
        })
        .select(`
          *,
          brand_kit:brand_kit_id (name),
          avatar:avatar_id (name),
          voice:voice_id (name)
        `)
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return mapTemplate(data);
    }),

  update: workspaceProcedure
    .input(
      templateInputSchema.extend({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      const { data, error } = await ctx.insforge.database
        .from("templates")
        .update({
          brand_kit_id: input.brandKitId || null,
          avatar_id: input.avatarId || null,
          voice_id: input.voiceId || null,
          name: input.name,
          description: input.description || null,
          layout_config: input.layoutConfig,
        })
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .select(`
          *,
          brand_kit:brand_kit_id (name),
          avatar:avatar_id (name),
          voice:voice_id (name)
        `)
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return mapTemplate(data);
    }),

  delete: workspaceProcedure
    .input(templateIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      const { data, error } = await ctx.insforge.database
        .from("templates")
        .select("id")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Template not found",
        });
      }

      const { error: deleteError } = await ctx.insforge.database
        .from("templates")
        .delete()
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id);

      if (deleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: deleteError.message,
        });
      }

      return { success: true };
    }),
});

export type Template = ReturnType<typeof mapTemplate>;
