"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { FileText } from "lucide-react";

import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { ScriptEditorForm } from "@/features/scripts/components/script-editor-form";
import { useTRPC } from "@/trpc/client";

type ScriptEditViewProps = {
  scriptId: string;
};

export function ScriptEditView({ scriptId }: ScriptEditViewProps) {
  const trpc = useTRPC();
  const { data: script } = useSuspenseQuery(
    trpc.scripts.getById.queryOptions({ id: scriptId }),
  );

  return (
    <DashboardPageShell
      title={script.title}
      description="Edit your script and reuse it in the video wizard."
      icon={FileText}
      breadcrumbs={[
        { label: "Scripts", href: "/dashboard/scripts" },
        { label: script.title },
      ]}
    >
      <ScriptEditorForm mode="edit" script={script} />
    </DashboardPageShell>
  );
}
