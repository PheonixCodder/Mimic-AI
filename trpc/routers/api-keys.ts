import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { generateApiKey, hashApiKey } from "@/lib/api-keys";
import { writeAuditLog } from "@/lib/audit";
import { createTRPCRouter, workspaceProcedure } from "../init";

type ApiKeyRow = {
  id: string;
  workspace_id: string;
  created_by: string;
  name: string;
  key_hash: string;
  key_prefix: string;
  last_used_at: string | null;
  created_at: string;
};

function mapKey(row: ApiKeyRow) {
  return {
    id: row.id,
    name: row.name,
    keyPrefix: row.key_prefix,
    lastUsedAt: row.last_used_at ?? null,
    createdAt: row.created_at,
  };
}

export const apiKeysRouter = createTRPCRouter({
  list: workspaceProcedure.query(async ({ ctx }) => {
    const { data, error } = await ctx.insforge.database
      .from("api_keys")
      .select("id, workspace_id, created_by, name, key_hash, key_prefix, last_used_at, created_at")
      .eq("workspace_id", ctx.workspace.id)
      .order("created_at", { ascending: false });

    if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
    return ((data ?? []) as ApiKeyRow[]).map(mapKey);
  }),

  create: workspaceProcedure
    .input(z.object({ name: z.string().trim().min(1).max(80) }))
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin"].includes(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owners and admins can create API keys" });
      }

      const rawKey = generateApiKey();
      const keyHash = await hashApiKey(rawKey);
      const keyPrefix = rawKey.slice(0, 16); // "mk_live_xxxxxxxx"

      const { error } = await ctx.insforge.database
        .from("api_keys")
        .insert([{
          workspace_id: ctx.workspace.id,
          created_by: ctx.user.id,
          name: input.name,
          key_hash: keyHash,
          key_prefix: keyPrefix,
        }]);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      writeAuditLog({ workspaceId: ctx.workspace.id, userId: ctx.user.id, action: "api_key.created", metadata: { name: input.name } });
      return { rawKey }; // shown once, never again
    }),

  revoke: workspaceProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      if (!["owner", "admin"].includes(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owners and admins can revoke API keys" });
      }

      const { error } = await ctx.insforge.database
        .from("api_keys")
        .delete()
        .eq("id", input.id)
        .eq("workspace_id", ctx.workspace.id);

      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });
      writeAuditLog({ workspaceId: ctx.workspace.id, userId: ctx.user.id, action: "api_key.revoked", resourceId: input.id });
      return { success: true };
    }),
});
