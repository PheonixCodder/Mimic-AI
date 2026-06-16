"use client";

import { FileText } from "lucide-react";

import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { ScriptCard } from "@/features/scripts/components/script-card";
import type { Script } from "@/trpc/routers/scripts";

type ScriptsListProps = {
  scripts: Script[];
  canWrite?: boolean;
  onDelete: (script: Script) => void;
};

export function ScriptsList({
  scripts,
  canWrite = false,
  onDelete,
}: ScriptsListProps) {
  if (scripts.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <FileText />
          </EmptyMedia>
          <EmptyTitle>No scripts yet</EmptyTitle>
          <EmptyDescription>
            Create your first script to draft narration before generating a video.
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="space-y-3">
      {scripts.map((script) => (
        <ScriptCard
          key={script.id}
          script={script}
          canWrite={canWrite}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
