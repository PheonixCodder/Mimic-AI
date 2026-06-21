"use client";

import React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
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
import { useTRPC } from "@/trpc/client";
import { TemplateForm } from "./template-form";
import type { BrandKit } from "@/trpc/routers/brand-kits";
import type { Template } from "@/trpc/routers/templates";
import type { Voice } from "@/trpc/routers/voices";
import type { Avatar } from "@/trpc/routers/avatars";
import type { TemplateInput } from "@/features/templates/lib/schemas";

const DEFAULT_VALUES = {
  name: "",
  description: null as string | null,
  brandKitId: null as string | null,
  voiceId: null as string | null,
  avatarId: null as string | null,
  layoutConfig: {
    aspectRatio: "16:9" as const,
    avatarPosition: "center" as const,
    avatarSize: "medium" as const,
    subtitlesEnabled: true,
  },
};

type TemplateCreateDialogProps = {
  children?: React.ReactNode;
  brandKits: BrandKit[];
  voices: Voice[];
  avatars: Avatar[];
  onSuccess?: (template: Template) => void;
};

export function TemplateCreateDialog({
  children,
  brandKits,
  voices,
  avatars,
  onSuccess,
}: TemplateCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [values, setValues] = useState<TemplateInput>({ ...DEFAULT_VALUES });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation(
    trpc.templates.create.mutationOptions({
      onSuccess: async (template) => {
        await queryClient.invalidateQueries({ queryKey: trpc.templates.list.queryKey() });
        toast.success("Template created");
        onSuccess?.(template);
        setOpen(false);
        setValues({ ...DEFAULT_VALUES });
      },
      onError: (e) => toast.error(e.message ?? "Failed to create template"),
    }),
  );

  function validate() {
    const errs: Record<string, string> = {};
    if (!values.name.trim()) errs.name = "Name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    await createMutation.mutateAsync(values);
  }

  const submitButton = (
    <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending}>
      {createMutation.isPending ? "Creating..." : "Create template"}
    </Button>
  );

  const form = (
    <TemplateForm
      values={values}
      errors={errors}
      onChange={(partial) => setValues((v) => ({ ...v, ...partial }))}
      brandKits={brandKits}
      voices={voices}
      avatars={avatars}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {children ? (
          <DrawerTrigger>
            {React.cloneElement(children as React.ReactElement<any>, {
              onClick: () => setOpen(true)
            })}
          </DrawerTrigger>
        ) : null}
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>New template</DrawerTitle>
            <DrawerDescription>Save reusable video settings as a template.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-2">{form}</div>
          <DrawerFooter>
            {submitButton}
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? (
        <DialogTrigger nativeButton render={children as React.ReactElement} />
      ) : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>New template</DialogTitle>
          <DialogDescription>Save reusable video settings as a template.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">{form}</div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          {submitButton}
        </div>
      </DialogContent>
    </Dialog>
  );
}
