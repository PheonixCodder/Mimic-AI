import { TRPCError } from "@trpc/server";
import { z } from "zod";
import { createTRPCRouter, workspaceProcedure } from "../init";

type AuditLogRow = {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string | null;
  resource_id: string | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
};

export const auditLogsRouter = createTRPCRouter({
  list: workspaceProcedure
    .input(
      z.object({
        action: z.string().optional(),
        limit: z.number().min(1).max(200).default(100),
      }).optional()
    )
    .query(async ({ ctx, input }) => {
      if (!["owner", "admin"].includes(ctx.role)) {
        throw new TRPCError({ code: "FORBIDDEN", message: "Only owners and admins can view audit logs" });
      }

      let query = ctx.insforge.database
        .from("audit_logs")
        .select("id, user_id, action, resource_type, resource_id, metadata, created_at")
        .eq("workspace_id", ctx.workspace.id)
        .order("created_at", { ascending: false })
        .limit(input?.limit ?? 100);

      if (input?.action) {
        query = query.eq("action", input.action);
      }

      const { data, error } = await query;
      if (error) throw new TRPCError({ code: "INTERNAL_SERVER_ERROR", message: error.message });

      return ((data ?? []) as AuditLogRow[]).map((row) => ({
        id: row.id,
        userId: row.user_id,
        action: row.action,
        resourceType: row.resource_type,
        resourceId: row.resource_id,
        metadata: row.metadata,
        createdAt: row.created_at,
      }));
    }),
});
