import { TRPCError } from "@trpc/server";
import { z } from "zod";

import { getCharacterCount } from "@/features/scripts/lib/character-count";
import { scriptInputSchema, type ScriptRow } from "@/features/scripts/lib/schemas";
import { polar } from "@/lib/polar";
import { getPolarMeterConfig } from "@/lib/polar-meters";
import { createTRPCRouter, workspaceProcedure } from "../init";

const scriptIdSchema = z.object({
  id: z.string().uuid(),
});

function assertCanWrite(role: string) {
  if (!["owner", "admin", "member"].includes(role)) {
    throw new TRPCError({
      code: "FORBIDDEN",
      message: "You do not have permission to modify scripts",
    });
  }
}

function mapScript(row: ScriptRow) {
  return {
    id: row.id,
    workspaceId: row.workspace_id,
    createdBy: row.created_by,
    projectId: row.project_id,
    title: row.title,
    content: row.content,
    characterCount: row.character_count,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function buildSearchFilter(query?: string) {
  if (!query) {
    return null;
  }

  const term = `%${query}%`;
  return `title.ilike.${term},content.ilike.${term}`;
}

async function assertProjectAccessible(
  database: Awaited<
    ReturnType<typeof import("@/lib/insforge/server").createInsForgeServerClient>
  >["database"],
  workspaceId: string,
  projectId: string,
) {
  const { data, error } = await database
    .from("projects")
    .select("id")
    .eq("id", projectId)
    .eq("workspace_id", workspaceId)
    .limit(1);

  if (error) {
    throw new TRPCError({
      code: "INTERNAL_SERVER_ERROR",
      message: error.message,
    });
  }

  if (!data?.[0]) {
    throw new TRPCError({
      code: "BAD_REQUEST",
      message: "Project not found",
    });
  }
}

export const scriptsRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z
        .object({
          query: z.string().trim().optional(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const searchFilter = buildSearchFilter(input?.query);

      let query = ctx.insforge.database
        .from("scripts")
        .select("*")
        .eq("workspace_id", ctx.workspace.id)
        .order("updated_at", { ascending: false });

      if (searchFilter) {
        query = query.or(searchFilter);
      }

      const { data, error } = await query;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      return ((data ?? []) as ScriptRow[]).map(mapScript);
    }),

  getById: workspaceProcedure
    .input(scriptIdSchema)
    .query(async ({ ctx, input }) => {
      const { data, error } = await ctx.insforge.database
        .from("scripts")
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

      const row = data?.[0] as ScriptRow | undefined;

      if (!row) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Script not found" });
      }

      const script = mapScript(row);

      let projectName: string | null = null;

      if (row.project_id) {
        const { data: projects } = await ctx.insforge.database
          .from("projects")
          .select("name")
          .eq("id", row.project_id)
          .limit(1);
        projectName =
          (projects?.[0] as { name: string } | undefined)?.name ?? null;
      }

      return {
        ...script,
        projectName,
      };
    }),

  create: workspaceProcedure
    .input(scriptInputSchema)
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      if (input.projectId) {
        await assertProjectAccessible(
          ctx.insforge.database,
          ctx.workspace.id,
          input.projectId,
        );
      }

      const characterCount = getCharacterCount(input.content);

      const { data, error } = await ctx.insforge.database
        .from("scripts")
        .insert({
          workspace_id: ctx.workspace.id,
          created_by: ctx.user.id,
          project_id: input.projectId ?? null,
          title: input.title,
          content: input.content,
          character_count: characterCount,
        })
        .select();

      const script = data?.[0] as ScriptRow | undefined;

      if (error || !script) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error?.message ?? "Failed to create script",
        });
      }

      // Ingest script character usage — fire-and-forget
      if (characterCount > 0) {
        const meters = getPolarMeterConfig();
        polar.events
          .ingest({
            events: [
              {
                name: meters.script,
                externalCustomerId: ctx.workspace.id,
                metadata: { [meters.scriptProperty]: characterCount },
              },
            ],
          })
          .catch((err) =>
            console.warn("[Polar] script_generation meter ingest failed:", err),
          );
      }

      return mapScript(script);
    }),

  update: workspaceProcedure
    .input(
      z
        .object({
          id: z.string().uuid(),
        })
        .merge(scriptInputSchema),
    )
    .mutation(async ({ ctx, input }) => {
      assertCanWrite(ctx.role);

      if (input.projectId) {
        await assertProjectAccessible(
          ctx.insforge.database,
          ctx.workspace.id,
          input.projectId,
        );
      }

      const characterCount = getCharacterCount(input.content);

      const { data, error } = await ctx.insforge.database
        .from("scripts")
        .update({
          title: input.title,
          content: input.content,
          project_id: input.projectId ?? null,
          character_count: characterCount,
        })
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id)
        .select();

      const script = data?.[0] as ScriptRow | undefined;

      if (error) {
        throw new TRPCError({
          code: "INTERNAL_SERVER_ERROR",
          message: error.message,
        });
      }

      if (!script) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Script not found" });
      }

      // Ingest script character usage on update — fire-and-forget
      if (characterCount > 0) {
        const meters = getPolarMeterConfig();
        polar.events
          .ingest({
            events: [
              {
                name: meters.script,
                externalCustomerId: ctx.workspace.id,
                metadata: { [meters.scriptProperty]: characterCount },
              },
            ],
          })
          .catch((err) =>
            console.warn("[Polar] script_generation meter ingest failed:", err),
          );
      }

      return mapScript(script);
    }),

  delete: workspaceProcedure
    .input(scriptIdSchema)
    .mutation(async ({ ctx, input }) => {
      const { data: existing, error: existingError } = await ctx.insforge.database
        .from("scripts")
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

      const script = existing?.[0] as
        | { id: string; created_by: string }
        | undefined;

      if (!script) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Script not found" });
      }

      const canDelete =
        ["owner", "admin"].includes(ctx.role) ||
        script.created_by === ctx.user.id;

      if (!canDelete) {
        throw new TRPCError({
          code: "FORBIDDEN",
          message: "You do not have permission to delete this script",
        });
      }

      const { error } = await ctx.insforge.database
        .from("scripts")
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

export type Script = ReturnType<typeof mapScript>;
