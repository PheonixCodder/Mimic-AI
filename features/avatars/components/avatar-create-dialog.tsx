"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useIsMobile } from "@/hooks/use-mobile";
import { AvatarCreateForm } from "./avatar-create-form";
import { Button } from "@/components/ui/button";

type AvatarCreateDialogProps = {
  children?: React.ReactNode;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
};

export function AvatarCreateDialog({
  children,
  open,
  onOpenChange,
}: AvatarCreateDialogProps) {
  const isMobile = useIsMobile();

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        {children ? (
          <DrawerTrigger asChild>
            {children}
          </DrawerTrigger>
        ) : null}
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Create custom avatar</DrawerTitle>
            <DrawerDescription>
              Upload a front-facing portrait to add a new avatar to your library.
            </DrawerDescription>
          </DrawerHeader>
          <AvatarCreateForm
            scrollable
            onSuccess={() => onOpenChange?.(false)}
            footer={(submit) => (
              <DrawerFooter>
                {submit}
                <Button variant="outline" onClick={() => onOpenChange?.(false)}>
                  Cancel
                </Button>
              </DrawerFooter>
            )}
          />
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children ? (
        <DialogTrigger nativeButton render={children as React.ReactElement} />
      ) : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>Create custom avatar</DialogTitle>
          <DialogDescription>
            Upload a front-facing portrait to add a new avatar to your library.
          </DialogDescription>
        </DialogHeader>
        <AvatarCreateForm onSuccess={() => onOpenChange?.(false)} />
      </DialogContent>
    </Dialog>
  );
}
