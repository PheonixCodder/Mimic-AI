"use client";

import { useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { useTRPC } from "@/trpc/client";

const ACTION_GROUPS = [
  { value: "", label: "All actions" },
  { value: "video.created", label: "Video created" },
  { value: "video.approved", label: "Video approved" },
  { value: "video.generated", label: "Video generated" },
  { value: "video.deleted", label: "Video deleted" },
  { value: "voice.deleted", label: "Voice deleted" },
  { value: "voice.validated", label: "Voice validated" },
  { value: "avatar.deleted", label: "Avatar deleted" },
  { value: "avatar.validated", label: "Avatar validated" },
  { value: "member.added", label: "Member added" },
  { value: "member.removed", label: "Member removed" },
  { value: "member.role_changed", label: "Role changed" },
  { value: "api_key.created", label: "API key created" },
  { value: "api_key.revoked", label: "API key revoked" },
  { value: "workspace.updated", label: "Workspace updated" },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function downloadBlob(content: string, filename: string, mime: string) {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

type Log = {
  id: string;
  userId: string | null;
  action: string;
  resourceType: string | null;
  resourceId: string | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
};

function exportCSV(logs: Log[]) {
  const header = "id,action,resource_type,resource_id,user_id,created_at";
  const rows = logs.map((l) =>
    [l.id, l.action, l.resourceType ?? "", l.resourceId ?? "", l.userId ?? "", l.createdAt].join(",")
  );
  downloadBlob([header, ...rows].join("\n"), "audit-logs.csv", "text/csv");
}

function exportJSON(logs: Log[]) {
  downloadBlob(JSON.stringify(logs, null, 2), "audit-logs.json", "application/json");
}

export function AuditView() {
  const trpc = useTRPC();
  const [actionFilter, setActionFilter] = useState("");

  const { data: logs } = useSuspenseQuery(
    trpc.auditLogs.list.queryOptions(
      actionFilter ? { action: actionFilter } : {}
    )
  );

  return (
    <DashboardPageShell
      title="Audit Center"
      description="Read-only log of workspace actions. Visible to owners and admins only."
      icon={ScrollText}
      breadcrumbs={[{ label: "Audit" }]}
    >
      <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={actionFilter} onValueChange={(v) => setActionFilter(v ?? "")}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACTION_GROUPS.map((a) => (
                <SelectItem key={a.value || "_all"} value={a.value}>
                  {a.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <div className="ml-auto flex gap-2">
            <Button variant="outline" size="sm" onClick={() => exportCSV(logs)}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportJSON(logs)}>
              Export JSON
            </Button>
          </div>
        </div>

        {logs.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed py-16 gap-3 text-center">
            <ScrollText className="size-8 text-muted-foreground" />
            <p className="text-sm font-medium">No audit logs yet</p>
            <p className="text-xs text-muted-foreground max-w-xs">
              Actions like generating videos, managing members, and creating API keys will appear here.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border divide-y overflow-hidden">
            {logs.map((log) => (
              <div key={log.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <span className="text-xs text-muted-foreground font-mono w-36 shrink-0">
                  {formatDate(log.createdAt)}
                </span>
                <span className="inline-flex items-center rounded-md bg-muted px-2 py-0.5 text-xs font-medium font-mono">
                  {log.action}
                </span>
                {log.resourceType && log.resourceId && (
                  <span className="text-xs text-muted-foreground truncate">
                    {log.resourceType} · <span className="font-mono">{log.resourceId.slice(0, 8)}…</span>
                  </span>
                )}
                {log.userId && (
                  <span className="ml-auto text-xs text-muted-foreground font-mono shrink-0">
                    {log.userId.slice(0, 8)}…
                  </span>
                )}
              </div>
            ))}
          </div>
        )}

        <p className="text-xs text-muted-foreground">
          Showing latest {logs.length} entries.
        </p>
      </div>
    </DashboardPageShell>
  );
}
