import "server-only";
import { insforgeAdmin } from "@/lib/insforge/admin";

export type AuditAction =
  | "video.created" | "video.approved" | "video.generated" | "video.deleted"
  | "voice.deleted" | "voice.validated"
  | "avatar.deleted" | "avatar.validated"
  | "member.added" | "member.removed" | "member.role_changed"
  | "api_key.created" | "api_key.revoked"
  | "workspace.updated" | "workspace.created";

export interface AuditParams {
  workspaceId: string;
  userId: string;
  action: AuditAction;
  resourceType?: string;
  resourceId?: string;
  metadata?: Record<string, unknown>;
}

/** Fire-and-forget — never await, never blocks the calling mutation. */
export function writeAuditLog(params: AuditParams): void {
  void Promise.resolve(
    insforgeAdmin.database
      .from("audit_logs")
      .insert([{
        workspace_id: params.workspaceId,
        user_id: params.userId,
        action: params.action,
        resource_type: params.resourceType ?? null,
        resource_id: params.resourceId ?? null,
        metadata: params.metadata ?? null,
      }])
  ).catch(() => {});
}
