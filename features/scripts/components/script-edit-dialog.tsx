"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import { useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScriptForm } from "@/features/scripts/components/script-form";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Script } from "@/trpc/routers/scripts";
import { useTRPC } from "@/trpc/client";

type ScriptEditDialogProps = {
  script: Script;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (script: Script) => void;
};

function ScriptEditDialogContent({
  script,
  onClose,
  onSuccess,
}: {
  script: Script;
  onClose: () => void;
  onSuccess?: (script: Script) => void;
}) {
  const trpc = useTRPC();
  const { data: projects } = useSuspenseQuery(trpc.projects.list.queryOptions());
  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);
  const formId = `script-edit-dialog-form-${script.id}`;

  return (
    <ScriptForm
      mode="edit"
      script={script}
      projects={projects}
      canWrite={canWrite}
      formId={formId}
      hideSubmit
      onSuccess={(saved) => {
        toast.success("Script saved");
        onSuccess?.(saved);
        onClose();
      }}
    />
  );
}

export function ScriptEditDialog({
  script,
  open,
  onOpenChange,
  onSuccess,
}: ScriptEditDialogProps) {
  const isMobile = useIsMobile();
  const formId = `script-edit-dialog-form-${script.id}`;

  function handleClose() {
    onOpenChange(false);
  }

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit script</DrawerTitle>
            <DrawerDescription>{script.title}</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <ScriptEditDialogContent
              script={script}
              onClose={handleClose}
              onSuccess={onSuccess}
            />
          </div>
          <DrawerFooter>
            <Button type="submit" form={formId}>
              Save changes
            </Button>
            <DrawerClose asChild>
              <Button variant="outline">Cancel</Button>
            </DrawerClose>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>Edit script</DialogTitle>
          <DialogDescription>{script.title}</DialogDescription>
        </DialogHeader>
        <ScriptEditDialogContent
          script={script}
          onClose={handleClose}
          onSuccess={onSuccess}
        />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form={formId}>
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
