import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { projectInputSchema, type ProjectRow } from "@/features/projects/lib/schemas";
import { createTRPCRouter, workspaceProcedure } from "../init";

const projectIdSchema = z.object({
  id: z.string().uuid(),
});

function assertCanWrite(role: string) {
  if (!["owner", "admin", "member"].includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to modify projects",
    });
  }
}

function mapProject(row: ProjectRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    name: row.name,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export const projectsRouter = createTRPCRouter({
  list: workspaceProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.insforge.database
      .from("projects")
      .select("*")
      .eq("workspace_id", ctx.workspace.id)
      .order("updated_at", { ascending: false });

    if (error) {
      throw new TRPCError({
        code: "INTERNAL_SERVER_ERROR",
        message: error.message,
      });
    }

    return ((data ?? []) as ProjectRow[]).map(mapProject);
  }),

  getById: workspaceProcedure
    .input(projectIdSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("projects")
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

      const project = data?.[0] as ProjectRow | undefined;

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return mapProject(project);
    }),

  create: workspaceProcedure
    .input(projectInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      const { data, error } = await ctx.insforge.database
        .from("projects")
        .insert({
          workspace_id: ctx.workspace.id,
          created_by: ctx.user.id,
          name: input.name,
          description: input.description,
        })
        .select();

      const project = data?.[0] as ProjectRow | undefined;

      if (error || !project) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create project",
        });
      }

      return mapProject(project);
    }),

  update: workspaceProcedure
    .input(
      z.object({
        id: z.string().uuid(),
      }).merge(projectInputSchema),
    )
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      const { data, error } = await ctx.insforge.database
        .from("projects")
        .update({
          name: input.name,
          description: input.description,
        })
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .select();

      const project = data?.[0] as ProjectRow | undefined;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      return mapProject(project);
    }),

  delete: workspaceProcedure
    .input(projectIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: existing, error: existingError } = await ctx.insforge.database
        .from("projects")
        .select("id, created_by")
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .limit(1);

      if (existingError) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: existingError.message,
        });
      }

      const project = existing?.[0] as { id: string; created_by: string } | undefined;

      if (!project) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Project not found" });
      }

      const canDelete =
        ["owner", "admin"].includes(ctx.role) || project.created_by === ctx.user.id;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this project",
        });
      }

      const { error } = await ctx.insforge.database
        .from("projects")
        .delete()
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id);

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return { success: true };
    }),
});

export type Project = ReturnType<typeof mapProject>;
