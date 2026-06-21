"use client";

import React from "react";
import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Download } from "lucide-react";

import { Button } from "@/components/ui/button";
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Field, FieldLabel } from "@/components/ui/field";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  createDefaultWatermarkSettings,
  WatermarkSettingsFields,
  type WatermarkSettingsValue,
} from "@/features/watermark/components/watermark-settings-fields";
import { useTRPC } from "@/trpc/client";
import type { VideoExport } from "@/trpc/routers/exports";

type ExportDialogProps = {
  videoId: string;
  children?: React.ReactNode;
  onSuccess?: (exportItem: VideoExport) => void;
};

export function ExportDialog({ videoId, children, onSuccess }: ExportDialogProps) {
  const [open, setOpen] = useState(false);
  const isMobile = useIsMobile();
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [resolution, setResolution] = useState<"720p" | "1080p" | "4k">("1080p");
  const [format, setFormat] = useState<"mp4" | "webm">("mp4");
  const [watermarkSettings, setWatermarkSettings] = useState<WatermarkSettingsValue>(
    createDefaultWatermarkSettings(),
  );
  const [devPremiumOverride, setDevPremiumOverride] = useState(false);

  const { data: billingStatus } = useQuery({
    ...trpc.billing.getStatus.queryOptions(),
    enabled: open,
  });

  const isPremium =
    (billingStatus?.hasActiveSubscription ?? false) || devPremiumOverride;

  const checkoutMutation = useMutation(
    trpc.billing.createCheckout.mutationOptions({
      onSuccess: (data) => {
        window.location.href = data.checkoutUrl;
      },
      onError: (e) => {
        toast.error(e.message ?? "Failed to start checkout");
      },
    }),
  );

  const exportMutation = useMutation(
    trpc.exports.create.mutationOptions({
      onSuccess: async (created) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.exports.list.queryKey({ videoId }),
        });
        toast.success("Export job started!");
        onSuccess?.(created);
        setOpen(false);
        setResolution("1080p");
        setFormat("mp4");
        setWatermarkSettings(createDefaultWatermarkSettings());
        setDevPremiumOverride(false);
      },
      onError: (e) => {
        toast.error(e.message ?? "Failed to create export job");
      },
    }),
  );

  const handleExport = () => {
    if (!watermarkSettings.watermarkEnabled && !isPremium) {
      toast.error("Please upgrade your workspace to remove the watermark.");
      return;
    }

    exportMutation.mutate({
      videoId,
      resolution,
      format,
      ...watermarkSettings,
    });
  };

  const renderForm = () => {
    return (
      <div className="space-y-4 py-4 text-left">
        <Field>
          <FieldLabel htmlFor="export-res">Resolution</FieldLabel>
          <Select
            value={resolution}
            onValueChange={(val) => setResolution(val as typeof resolution)}
          >
            <SelectTrigger id="export-res" className="w-full">
              <SelectValue placeholder="Select resolution" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="720p">720p HD</SelectItem>
              <SelectItem value="1080p">1080p Full HD</SelectItem>
              <SelectItem value="4k">4K Ultra HD (Premium)</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <Field>
          <FieldLabel htmlFor="export-format">Format</FieldLabel>
          <Select
            value={format}
            onValueChange={(val) => setFormat(val as typeof format)}
          >
            <SelectTrigger id="export-format" className="w-full">
              <SelectValue placeholder="Select format" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="mp4">MP4 (H.264)</SelectItem>
              <SelectItem value="webm">WebM (VP9)</SelectItem>
            </SelectContent>
          </Select>
        </Field>

        <WatermarkSettingsFields
          value={watermarkSettings}
          onChange={(partial) =>
            setWatermarkSettings((current) => ({ ...current, ...partial }))
          }
          isPremium={isPremium}
          disabled={exportMutation.isPending}
          onUpgradeCheckout={() => checkoutMutation.mutate()}
          isCheckoutPending={checkoutMutation.isPending}
        />
      </div>
    );
  };

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
            <DrawerTitle>Export Video</DrawerTitle>
            <DrawerDescription>
              Select rendering options and queue your download.
            </DrawerDescription>
          </DrawerHeader>
          <div className="px-4">{renderForm()}</div>
          <DrawerFooter className="pt-2">
            <Button
              onClick={handleExport}
              disabled={exportMutation.isPending}
              className="w-full gap-1.5"
            >
              {exportMutation.isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Starting render...
                </>
              ) : (
                <>
                  <Download className="size-4" />
                  Start Export
                </>
              )}
            </Button>
              <Button variant="outline" className="w-full" onClick={() => setOpen(false)}>
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Export Video</DialogTitle>
          <DialogDescription>
            Select rendering options and queue your download.
          </DialogDescription>
        </DialogHeader>

        {renderForm()}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button
            variant="outline"
            onClick={() => setOpen(false)}
            disabled={exportMutation.isPending}
          >
            Cancel
          </Button>
          <Button
            onClick={handleExport}
            disabled={exportMutation.isPending}
            className="gap-1.5"
          >
            {exportMutation.isPending ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Starting render...
              </>
            ) : (
              <>
                <Download className="size-4" />
                Start Export
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
