"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
import { useIsMobile } from "@/hooks/use-mobile";
import { useTRPC } from "@/trpc/client";
import { TemplateForm } from "./template-form";
import type { BrandKit } from "@/trpc/routers/brand-kits";
import type { Template } from "@/trpc/routers/templates";
import type { Voice } from "@/trpc/routers/voices";
import type { Avatar } from "@/trpc/routers/avatars";
import type { TemplateInput } from "@/features/templates/lib/schemas";

type TemplateEditDialogProps = {
  template: Template | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  brandKits: BrandKit[];
  voices: Voice[];
  avatars: Avatar[];
  onSuccess?: (template: Template) => void;
};

export function TemplateEditDialog({
  template,
  open,
  onOpenChange,
  brandKits,
  voices,
  avatars,
  onSuccess,
}: TemplateEditDialogProps) {
  const isMobile = useIsMobile();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [values, setValues] = useState<TemplateInput>({
    name: "",
    description: null as string | null,
    brandKitId: null as string | null,
    voiceId: null as string | null,
    avatarId: null as string | null,
    layoutConfig: {
      aspectRatio: "16:9",
      avatarPosition: "center",
      avatarSize: "medium",
      subtitlesEnabled: true,
    },
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (template) {
      setValues({
        name: template.name,
        description: template.description,
        brandKitId: template.brandKitId,
        voiceId: template.voiceId,
        avatarId: template.avatarId,
        layoutConfig: template.layoutConfig,
      });
      setErrors({});
    }
  }, [template]);

  const updateMutation = useMutation(
    trpc.templates.update.mutationOptions({
      onSuccess: async (updated) => {
        await queryClient.invalidateQueries({ queryKey: trpc.templates.list.queryKey() });
        toast.success("Template updated");
        onSuccess?.(updated);
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message ?? "Failed to update template"),
    }),
  );

  function validate() {
    const errs: Record<string, string> = {};
    if (!values.name.trim()) errs.name = "Name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!template || !validate()) return;
    await updateMutation.mutateAsync({ id: template.id, ...values });
  }

  const submitButton = (
    <Button type="button" onClick={handleSubmit} disabled={updateMutation.isPending}>
      {updateMutation.isPending ? "Saving..." : "Save changes"}
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
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit template</DrawerTitle>
            <DrawerDescription>Update this template's settings.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-2">{form}</div>
          <DrawerFooter>
            {submitButton}
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
          <DialogTitle>Edit template</DialogTitle>
          <DialogDescription>Update this template's settings.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[65vh] overflow-y-auto pr-1">{form}</div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {submitButton}
        </div>
      </DialogContent>
    </Dialog>
  );
}
