"use client";

import { FileText } from "lucide-react";

import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { ScriptEditorForm } from "@/features/scripts/components/script-editor-form";

export function ScriptCreateView() {
  return (
    <DashboardPageShell
      title="New script"
      description="Draft narration before generating a video."
      icon={FileText}
      breadcrumbs={[
        { label: "Scripts", href: "/dashboard/scripts" },
        { label: "New script" },
      ]}
    >
      <ScriptEditorForm mode="create" />
    </DashboardPageShell>
  );
}
