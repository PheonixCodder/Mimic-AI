"use client";

import { FileText, Pencil } from "lucide-react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { ScriptEditDialog } from "@/features/scripts/components/script-edit-dialog";
import type { Script } from "@/trpc/routers/scripts";
import { cn } from "@/lib/utils";

type ScriptPickerProps = {
  scripts: Script[];
  value: string | null;
  onChange: (scriptId: string) => void;
  canWrite?: boolean;
};

function ScriptPickerItem({
  script,
  selected,
  canWrite,
  onSelect,
  onEdit,
}: {
  script: Script;
  selected: boolean;
  canWrite: boolean;
  onSelect: () => void;
  onEdit: () => void;
}) {
  return (
    <div
      className={cn(
        "flex w-full items-start gap-3 rounded-xl border p-3 transition-colors",
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-start gap-3 text-left"
      >
        <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-muted/50">
          <FileText className="size-5 text-muted-foreground" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{script.title}</p>
          <p className="mt-0.5 line-clamp-2 text-xs text-muted-foreground">
            {script.content || "No content yet."}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {script.characterCount.toLocaleString()} characters
          </p>
        </div>
      </button>
      {canWrite ? (
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className="shrink-0 rounded-full"
          onClick={onEdit}
          aria-label={`Edit ${script.title}`}
        >
          <Pencil className="size-4" />
        </Button>
      ) : null}
    </div>
  );
}

export function ScriptPicker({
  scripts,
  value,
  onChange,
  canWrite = false,
}: ScriptPickerProps) {
  const [editingScript, setEditingScript] = useState<Script | null>(null);

  if (!scripts.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No scripts yet. Create a script to continue.
      </p>
    );
  }

  return (
    <>
      <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
        {scripts.map((script) => (
          <ScriptPickerItem
            key={script.id}
            script={script}
            selected={value === script.id}
            canWrite={canWrite}
            onSelect={() => onChange(script.id)}
            onEdit={() => setEditingScript(script)}
          />
        ))}
      </div>

      {editingScript ? (
        <ScriptEditDialog
          script={editingScript}
          open={Boolean(editingScript)}
          onOpenChange={(open) => {
            if (!open) {
              setEditingScript(null);
            }
          }}
          onSuccess={(saved) => {
            if (value === saved.id) {
              onChange(saved.id);
            }
            setEditingScript(null);
          }}
        />
      ) : null}
    </>
  );
}
