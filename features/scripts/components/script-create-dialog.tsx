"use client";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
  DrawerTrigger,
} from "@/components/ui/drawer";
import { useSuspenseQuery } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { ScriptForm } from "@/features/scripts/components/script-form";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Script } from "@/trpc/routers/scripts";
import { useTRPC } from "@/trpc/client";

const FORM_ID = "script-create-dialog-form";

type ScriptCreateDialogProps = {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onSuccess?: (script: Script) => void;
};

function ScriptCreateDialogBody({
  onClose,
  onSuccess,
}: {
  onClose: () => void;
  onSuccess?: (script: Script) => void;
}) {
  const trpc = useTRPC();
  const { data: projects } = useSuspenseQuery(trpc.projects.list.queryOptions());
  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);

  return (
    <ScriptForm
      mode="create"
      projects={projects}
      canWrite={canWrite}
      formId={FORM_ID}
      hideSubmit
      onSuccess={(script) => {
        toast.success("Script created");
        onSuccess?.(script);
        onClose();
      }}
    />
  );
}

export function ScriptCreateDialog({
  children,
  open,
  onOpenChange,
  onSuccess,
}: ScriptCreateDialogProps) {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = useState(false);
  const isControlled = open !== undefined;
  const dialogOpen = isControlled ? open : internalOpen;

  function handleOpenChange(nextOpen: boolean) {
    if (!isControlled) {
      setInternalOpen(nextOpen);
    }
    onOpenChange?.(nextOpen);
  }

  function handleClose() {
    handleOpenChange(false);
  }

  if (isMobile) {
    return (
      <Drawer open={dialogOpen} onOpenChange={handleOpenChange}>
        {children ? <DrawerTrigger asChild>{children}</DrawerTrigger> : null}
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create script</DrawerTitle>
            <DrawerDescription>
              Draft narration to reuse across video productions.
            </DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-4">
            <ScriptCreateDialogBody onClose={handleClose} onSuccess={onSuccess} />
          </div>
          <DrawerFooter>
            <Button type="submit" form={FORM_ID}>
              Create script
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
    <Dialog open={dialogOpen} onOpenChange={handleOpenChange}>
      {children ? (
        <DialogTrigger nativeButton render={children as React.ReactElement} />
      ) : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>Create script</DialogTitle>
          <DialogDescription>
            Draft narration to reuse across video productions.
          </DialogDescription>
        </DialogHeader>
        <ScriptCreateDialogBody onClose={handleClose} onSuccess={onSuccess} />
        <DialogFooter>
          <Button variant="outline" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form={FORM_ID}>
            Create script
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
