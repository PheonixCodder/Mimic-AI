"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";

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
import { BrandKitForm } from "./brand-kit-form";
import type { BrandKit } from "@/trpc/routers/brand-kits";

const DEFAULT_VALUES = {
  name: "",
  logoFile: null as File | null,
  colors: {
    primary: "#16A34A",
    secondary: "#15803D",
    background: "#F0FDF4",
    text: "#166534",
  },
  fonts: {
    primary: "Inter",
    header: "Outfit",
  },
};

type BrandKitCreateDialogProps = {
  children?: React.ReactNode;
  onSuccess?: (kit: BrandKit) => void;
};

function BrandKitCreateContent({
  onSuccess,
  onClose,
}: {
  onSuccess?: (kit: BrandKit) => void;
  onClose: () => void;
}) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [values, setValues] = useState({ ...DEFAULT_VALUES });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation(
    trpc.brandKits.create.mutationOptions({
      onSuccess: async (kit) => {
        // Upload logo if one was chosen
        if (values.logoFile) {
          try {
            await fetch(`/api/brand-kits/upload?brandKitId=${kit.id}`, {
              method: "POST",
              headers: { "Content-Type": values.logoFile.type },
              body: values.logoFile,
            });
          } catch {
            // non-fatal — kit is saved, logo upload failed silently
            toast.warning("Brand kit saved, but logo upload failed. You can retry from edit.");
          }
        }
        await queryClient.invalidateQueries({ queryKey: trpc.brandKits.list.queryKey() });
        toast.success("Brand kit created");
        onSuccess?.(kit);
        onClose();
      },
      onError: (e) => toast.error(e.message ?? "Failed to create brand kit"),
    }),
  );

  function validate() {
    const newErrors: Record<string, string> = {};
    if (!values.name.trim()) newErrors.name = "Name is required";
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit() {
    if (!validate()) return;
    await createMutation.mutateAsync({
      name: values.name,
      colors: values.colors,
      fonts: values.fonts,
    });
  }

  const submitButton = (
    <Button
      type="button"
      onClick={handleSubmit}
      disabled={createMutation.isPending}
    >
      {createMutation.isPending ? "Creating..." : "Create brand kit"}
    </Button>
  );

  return (
    <BrandKitForm
      values={values}
      errors={errors}
      onChange={(partial) => setValues((v) => ({ ...v, ...partial }))}
    />
  );
}

export function BrandKitCreateDialog({ children, onSuccess }: BrandKitCreateDialogProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const [values, setValues] = useState({ ...DEFAULT_VALUES });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const createMutation = useMutation(
    trpc.brandKits.create.mutationOptions({
      onSuccess: async (kit) => {
        if (values.logoFile) {
          await fetch(`/api/brand-kits/upload?brandKitId=${kit.id}`, {
            method: "POST",
            headers: { "Content-Type": values.logoFile.type },
            body: values.logoFile,
          }).catch(() => {});
        }
        await queryClient.invalidateQueries({ queryKey: trpc.brandKits.list.queryKey() });
        toast.success("Brand kit created");
        onSuccess?.(kit);
        setOpen(false);
        setValues({ ...DEFAULT_VALUES });
      },
      onError: (e) => toast.error(e.message ?? "Failed to create brand kit"),
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
    await createMutation.mutateAsync({
      name: values.name,
      colors: values.colors,
      fonts: values.fonts,
    });
  }

  const submitButton = (
    <Button type="button" onClick={handleSubmit} disabled={createMutation.isPending}>
      {createMutation.isPending ? "Creating..." : "Create brand kit"}
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
      <Drawer open={open} onOpenChange={setOpen}>
        {children ? <DrawerTrigger asChild>{children}</DrawerTrigger> : null}
        <DrawerContent>
          <DrawerHeader>
            <DrawerTitle>New brand kit</DrawerTitle>
            <DrawerDescription>Define your workspace's brand colours and fonts.</DrawerDescription>
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
    <Dialog open={open} onOpenChange={setOpen}>
      {children ? (
        <DialogTrigger nativeButton render={children as React.ReactElement} />
      ) : null}
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="text-left">
          <DialogTitle>New brand kit</DialogTitle>
          <DialogDescription>Define your workspace's brand colours and fonts.</DialogDescription>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto pr-1">{form}</div>
        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
          {submitButton}
        </div>
      </DialogContent>
    </Dialog>
  );
}
