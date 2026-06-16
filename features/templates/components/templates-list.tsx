"use client";

import { LayoutTemplate } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { TemplateCard } from "./template-card";
import type { Template } from "@/trpc/routers/templates";

type TemplatesListProps = {
  templates: Template[];
  canWrite: boolean;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
};

export function TemplatesList({ templates, canWrite, onEdit, onDelete }: TemplatesListProps) {
  if (templates.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <LayoutTemplate />
          </EmptyMedia>
          <EmptyTitle>No templates</EmptyTitle>
          <EmptyDescription>
            {canWrite
              ? "Create your first template to save reusable video settings."
              : "No templates have been created in this workspace."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {templates.map((template) => (
        <TemplateCard
          key={template.id}
          template={template}
          canWrite={canWrite}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
