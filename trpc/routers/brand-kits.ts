import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { brandKitInputSchema, type BrandKitRow } from "@/features/templates/lib/schemas";
import { deleteObject } from "@/lib/r2";
import { createTRPCRouter, workspaceProcedure } from "../init";

const brandKitIdSchema = z.object({
  id: z.string().uuid(),
});

function assertCanWrite(role: string) {
  if (!["owner", "admin", "member"].includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to modify brand kits",
    });
  }
}

function mapBrandKit(row: BrandKitRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    name: row.name,
    logoUrl: row.logo_url,
    logoKey: row.logo_key,
    colors: row.colors,
    fonts: row.fonts,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const brandKitsRouter = createTRPCRouter({
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
        .from("brand_kits")
        .select("*")
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

      return (data as BrandKitRow[]).map(mapBrandKit);
    }),

  getById: workspaceProcedure
    .input(brandKitIdSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("brand_kits")
        .select("*")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .limit(1);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      const brandKit = data?.[0] as BrandKitRow | undefined;
      if (!brandKit) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand kit not found",
        });
      }

      return mapBrandKit(brandKit);
    }),

  create: workspaceProcedure
    .input(brandKitInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      const { data, error } = await ctx.insforge.database
        .from("brand_kits")
        .insert({
          workspace_id: ctx.workspace.id,
          created_by: ctx.user.id,
          name: input.name,
          colors: input.colors,
          fonts: input.fonts,
        })
        .select("*")
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return mapBrandKit(data as BrandKitRow);
    }),

  update: workspaceProcedure
    .input(
      brandKitInputSchema.extend({
        id: z.string().uuid(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      const { data, error } = await ctx.insforge.database
        .from("brand_kits")
        .update({
          name: input.name,
          colors: input.colors,
          fonts: input.fonts,
        })
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .select("*")
        .single();

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return mapBrandKit(data as BrandKitRow);
    }),

  delete: workspaceProcedure
    .input(brandKitIdSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      const { data, error } = await ctx.insforge.database
        .from("brand_kits")
        .select("id, logo_key")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .single();

      if (error || !data) {
        throw new TRPCError({
          code: "NOT_FOUND",
          message: "Brand kit not found",
        });
      }

      const { error: deleteError } = await ctx.insforge.database
        .from("brand_kits")
        .delete()
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id);

      if (deleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: deleteError.message,
        });
      }

      if (data.logo_key) {
        await deleteObject(data.logo_key).catch(() => {});
      }

      return { success: true };
    }),
});

export type BrandKit = ReturnType<typeof mapBrandKit>;
