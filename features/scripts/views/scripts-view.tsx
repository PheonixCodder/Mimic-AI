"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { FileText } from "lucide-react";
import { useState } from "react";

import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { DeleteScriptDialog } from "@/features/scripts/components/delete-script-dialog";
import { ScriptsList } from "@/features/scripts/components/scripts-list";
import { ScriptsToolbar } from "@/features/scripts/components/scripts-toolbar";
import { scriptsSearchParams } from "@/features/scripts/lib/params";
import type { Script } from "@/trpc/routers/scripts";
import { useTRPC } from "@/trpc/client";

export function ScriptsView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [query] = useQueryState("query", scriptsSearchParams.query);
  const [deletingScript, setDeletingScript] = useState<Script | null>(null);

  const { data: scripts } = useSuspenseQuery(
    trpc.scripts.list.queryOptions({ query: query || undefined }),
  );
  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);

  const deleteMutation = useMutation(
    trpc.scripts.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.scripts.list.queryKey(),
        });
      },
    }),
  );

  async function handleDelete(scriptId: string) {
    await deleteMutation.mutateAsync({ id: scriptId });
    setDeletingScript(null);
  }

  return (
    <DashboardPageShell
      title="Scripts"
      description="Draft and manage scripts for your productions."
      icon={FileText}
      breadcrumbs={[{ label: "Scripts" }]}
    >
      <div className="space-y-6">
        <ScriptsToolbar canCreate={canWrite} />
        <ScriptsList
          scripts={scripts}
          canWrite={canWrite}
          onDelete={setDeletingScript}
        />
      </div>

      <DeleteScriptDialog
        script={deletingScript}
        open={Boolean(deletingScript)}
        onOpenChange={(open) => {
          if (!open) {
            setDeletingScript(null);
          }
        }}
        onConfirm={handleDelete}
      />
    </DashboardPageShell>
  );
}
