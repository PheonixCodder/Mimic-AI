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
import { SYSTEM_WATERMARK_DEFAULTS } from "@/lib/watermark";
import { BrandKitForm } from "./brand-kit-form";
import type { BrandKit } from "@/trpc/routers/brand-kits";

type BrandKitEditDialogProps = {
  kit: BrandKit | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: (kit: BrandKit) => void;
};

export function BrandKitEditDialog({ kit, open, onOpenChange, onSuccess }: BrandKitEditDialogProps) {
  const isMobile = useIsMobile();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [values, setValues] = useState({
    name: "",
    logoFile: null as File | null,
    colors: { primary: "#16A34A", secondary: "#15803D", background: "#F0FDF4", text: "#166534" },
    fonts: { primary: "Inter", header: "Outfit" },
    watermarkText: SYSTEM_WATERMARK_DEFAULTS.watermarkText,
    watermarkType: SYSTEM_WATERMARK_DEFAULTS.watermarkType,
    watermarkPosition: SYSTEM_WATERMARK_DEFAULTS.watermarkPosition,
    watermarkOpacity: SYSTEM_WATERMARK_DEFAULTS.watermarkOpacity,
    watermarkSize: SYSTEM_WATERMARK_DEFAULTS.watermarkSize,
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (kit) {
      setValues({
        name: kit.name,
        logoFile: null,
        colors: kit.colors,
        fonts: kit.fonts,
        watermarkText: kit.watermarkText,
        watermarkType: kit.watermarkType,
        watermarkPosition: kit.watermarkPosition,
        watermarkOpacity: kit.watermarkOpacity,
        watermarkSize: kit.watermarkSize,
      });
      setErrors({});
    }
  }, [kit]);

  const updateMutation = useMutation(
    trpc.brandKits.update.mutationOptions({
      onSuccess: async (updated) => {
        if (values.logoFile) {
          await fetch(`/api/brand-kits/upload?brandKitId=${updated.id}`, {
            method: "POST",
            headers: { "Content-Type": values.logoFile.type },
            body: values.logoFile,
          }).catch(() => {});
        }
        await queryClient.invalidateQueries({ queryKey: trpc.brandKits.list.queryKey() });
        toast.success("Brand kit updated");
        onSuccess?.(updated);
        onOpenChange(false);
      },
      onError: (e) => toast.error(e.message ?? "Failed to update brand kit"),
    }),
  );

  function validate() {
    const errs: Record<string, string> = {};
    if (!values.name.trim()) errs.name = "Name is required";
    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  async function handleSubmit() {
    if (!kit || !validate()) return;
    await updateMutation.mutateAsync({
      id: kit.id,
      name: values.name,
      colors: values.colors,
      fonts: values.fonts,
      watermarkText: values.watermarkText,
      watermarkType: values.watermarkType,
      watermarkPosition: values.watermarkPosition,
      watermarkOpacity: values.watermarkOpacity,
      watermarkSize: values.watermarkSize,
    });
  }

  const submitButton = (
    <Button type="button" onClick={handleSubmit} disabled={updateMutation.isPending}>
      {updateMutation.isPending ? "Saving..." : "Save changes"}
    </Button>
  );

  const form = (
    <BrandKitForm
      values={values}
      errors={errors}
      onChange={(partial) => setValues((v) => ({ ...v, ...partial }))}
    />
  );

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={onOpenChange}>
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>Edit brand kit</DrawerTitle>
            <DrawerDescription>Update brand colours and fonts.</DrawerDescription>
          </DrawerHeader>
          <div className="overflow-y-auto px-4 pb-2">{form}</div>
          <DrawerFooter>
            {submitButton}
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>Edit brand kit</DialogTitle>
          <DialogDescription>Update brand colours and fonts.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">{form}</div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
          {submitButton}
        </div>
      </DialogContent>
    </Dialog>
  );
}
