import { TRPCError } from "@trpc/server";
import { z } from "zod";

import type { AvatarRow } from "@/features/avatars/lib/schemas";
import { deleteObject } from "@/lib/r2";
import { writeAuditLog } from "@/lib/audit";
import { createTRPCRouter, workspaceProcedure } from "../init";

const avatarIdSchema = z.object({
  id: z.string().uuid(),
});

function mapAvatar(row: AvatarRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    style: row.style,
    variant: row.variant,
    status: row.status,
    readinessScore: row.readiness_score,
    validationResults: row.validation_results ?? null,
    autoValidatedAt: row.auto_validated_at,
    modelVariantId: row.model_variant_id ?? null,
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

export const avatarsRouter = createTRPCRouter({
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
        .from("avatars")
        .select(
          "id, workspace_id, created_by, name, description, style, variant, status, readiness_score, created_at, updated_at",
        )
        .eq("variant", "custom")
        .eq("workspace_id", ctx.workspace.id)
        .order("created_at", { ascending: false });

      let systemQuery = ctx.insforge.database
        .from("avatars")
        .select(
          "id, workspace_id, created_by, name, description, style, variant, status, readiness_score, created_at, updated_at",
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
        custom: ((customResult.data ?? []) as AvatarRow[]).map(mapAvatar),
        system: ((systemResult.data ?? []) as AvatarRow[]).map(mapAvatar),
      };
    }),

  delete: workspaceProcedure
    .input(avatarIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("avatars")
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

      const avatar = data?.[0] as
        | {
            id: string;
            variant: string;
            created_by: string | null;
            r2_object_key: string | null;
          }
        | undefined;

      if (!avatar) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Avatar not found" });
      }

      const canDelete =
        ["owner", "admin"].includes(ctx.role) ||
        avatar.created_by === ctx.user.id;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this avatar",
        });
      }

      const { error: deleteError } = await ctx.insforge.database
        .from("avatars")
        .delete()
        .eq("id", avatar.id);

      if (deleteError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: deleteError.message,
        });
      }

      if (avatar.r2_object_key) {
        await deleteObject(avatar.r2_object_key).catch(() => {});
      }

      writeAuditLog({ workspaceId: ctx.workspace.id, userId: ctx.user.id, action: "avatar.deleted", resourceType: "avatar", resourceId: avatar.id });
      return { success: true };
    }),

  getById: workspaceProcedure
    .input(avatarIdSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("avatars")
        .select("id, workspace_id, created_by, name, description, style, variant, status, readiness_score, validation_results, auto_validated_at, model_variant_id, r2_object_key, created_at, updated_at")
        .eq("id", input.id)
        .limit(1);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      const row = data?.[0] as (import("@/features/avatars/lib/schemas").AvatarRow & { r2_object_key: string | null }) | undefined;
      if (!row) throw new TRPCError({ code: "NOT_FOUND", message: "Avatar not found" });

      if (row.variant === "custom" && row.workspace_id !== ctx.workspace.id) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Avatar not found" });
      }

      return { ...mapAvatar(row), r2ObjectKey: row.r2_object_key };
    }),

  validate: workspaceProcedure
    .input(avatarIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("avatars")
        .select("id, variant, workspace_id, style, r2_object_key, name, validation_results, readiness_score")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .eq("variant", "custom")
        .limit(1);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      const avatar = data?.[0] as { 
        id: string; 
        variant: string; 
        workspace_id: string | null; 
        style: string; 
        r2_object_key: string | null;
        name: string;
        validation_results: Record<string, any> | null;
        readiness_score: number | null;
      } | undefined;
      
      if (!avatar) throw new TRPCError({ code: "NOT_FOUND", message: "Avatar not found" });
      if (!avatar.r2_object_key) throw new TRPCError({ code: "BAD_REQUEST", message: "Avatar image not uploaded yet" });

      // Create validation job
      const { data: validationJob } = await ctx.insforge.database
        .from("jobs")
        .insert([{
          workspace_id: ctx.workspace.id,
          created_by: ctx.user.id,
          type: "avatar_validate",
          title: `Manual validation: ${avatar.name}`,
          resource_id: avatar.id,
          resource_type: "avatar",
          status: "queued",
          progress: 0,
          metadata: {
            avatar_id: avatar.id,
            avatar_name: avatar.name,
            r2_object_key: avatar.r2_object_key,
            auto_validation: false,
          },
        }])
        .select("id");

      if (validationJob?.[0]) {
        // Trigger the validation job
        const { tasks } = await import("@trigger.dev/sdk/v3");
        await tasks.trigger("run-job", {
          jobId: validationJob[0].id,
        });
      }

      writeAuditLog({ 
        workspaceId: ctx.workspace.id, 
        userId: ctx.user.id, 
        action: "avatar.validated", 
        resourceType: "avatar", 
        resourceId: input.id 
      });

      return { 
        readinessScore: avatar.readiness_score ?? null,
        validationResults: avatar.validation_results ?? null,
        jobId: validationJob?.[0]?.id ?? null,
        passed: (avatar.readiness_score ?? 0) >= 0.6 
      };
    }),
});

export type Avatar = ReturnType<typeof mapAvatar>;
