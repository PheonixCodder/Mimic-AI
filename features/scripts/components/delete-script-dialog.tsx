"use client";

import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import type { Script } from "@/trpc/routers/scripts";

type DeleteScriptDialogProps = {
  script: Script | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onConfirm: (scriptId: string) => Promise<void>;
};

export function DeleteScriptDialog({
  script,
  open,
  onOpenChange,
  onConfirm,
}: DeleteScriptDialogProps) {
  const [isPending, setIsPending] = useState(false);

  async function handleDelete() {
    if (!script) {
      return;
    }

    setIsPending(true);

    try {
      await onConfirm(script.id);
      onOpenChange(false);
      toast.success("Script deleted");
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Failed to delete script",
      );
    } finally {
      setIsPending(false);
    }
  }

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete script?</AlertDialogTitle>
          <AlertDialogDescription>
            This will permanently delete{" "}
            <span className="font-medium text-foreground">{script?.title}</span>.
            Videos that already copied this script will keep their inline text.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
          <Button
            variant="destructive"
            onClick={handleDelete}
            disabled={isPending}
          >
            {isPending ? "Deleting..." : "Delete script"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
