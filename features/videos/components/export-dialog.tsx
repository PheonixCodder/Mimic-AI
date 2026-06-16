"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ShieldAlert, Sparkles, Loader2, Download } from "lucide-react";

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
  const [watermarkEnabled, setWatermarkEnabled] = useState(true);
  const [isPremiumWorkspace, setIsPremiumWorkspace] = useState(false); // Simulated premium toggle

  const exportMutation = useMutation(
    trpc.exports.create.mutationOptions({
      onSuccess: async (created) => {
        await queryClient.invalidateQueries({
          queryKey: trpc.exports.list.queryKey({ videoId }),
        });
        toast.success("Export job started!");
        onSuccess?.(created);
        setOpen(false);
        // Reset states
        setResolution("1080p");
        setFormat("mp4");
        setWatermarkEnabled(true);
      },
      onError: (e) => {
        toast.error(e.message ?? "Failed to create export job");
      },
    }),
  );

  const handleExport = () => {
    if (!watermarkEnabled && !isPremiumWorkspace) {
      toast.error("Please upgrade your workspace to remove the watermark.");
      return;
    }

    exportMutation.mutate({
      videoId,
      resolution,
      format,
      watermarkEnabled,
    });
  };

  const simulateUpgrade = () => {
    setIsPremiumWorkspace(true);
    toast.success("Workspace mock-upgraded to premium!", {
      description: "You can now disable the watermark for exports.",
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

        <div className="space-y-3 pt-2">
          <label className="flex items-center gap-2 text-sm font-medium cursor-pointer select-none">
            <input
              type="checkbox"
              checked={watermarkEnabled}
              onChange={(e) => setWatermarkEnabled(e.target.checked)}
              className="size-4 rounded border-input text-primary focus:ring-primary"
            />
            Include Mimic AI watermark
          </label>

          {/* Premium Watermark Gate Alert */}
          {!watermarkEnabled && !isPremiumWorkspace ? (
            <div className="rounded-xl border border-amber-200/50 bg-amber-50/50 p-3 text-xs text-amber-800 dark:border-amber-900/30 dark:bg-amber-950/20 dark:text-amber-400">
              <div className="flex gap-2">
                <ShieldAlert className="size-4 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="space-y-2">
                  <p className="font-semibold">Upgrade Required</p>
                  <p>
                    Removing the brand watermark requires a premium workspace plan. Try simulating
                    an upgrade to test watermark-free renders.
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    size="xs"
                    onClick={simulateUpgrade}
                    className="gap-1 border-amber-300 text-amber-900 hover:bg-amber-100 hover:text-amber-900 dark:border-amber-800 dark:text-amber-300 dark:hover:bg-amber-900/40"
                  >
                    <Sparkles className="size-3 text-amber-600 dark:text-amber-400" />
                    Simulate Premium Upgrade
                  </Button>
                </div>
              </div>
            </div>
          ) : isPremiumWorkspace ? (
            <div className="rounded-xl border border-green-200/50 bg-green-50/50 p-3 text-xs text-green-800 dark:border-green-900/30 dark:bg-green-950/20 dark:text-green-400">
              <p className="font-semibold flex items-center gap-1.5">
                <Sparkles className="size-3.5 text-green-600 dark:text-green-400" />
                Premium active (Simulated) — Watermark-free exports unlocked.
              </p>
            </div>
          ) : null}
        </div>
      </div>
    );
  };

  if (isMobile) {
    return (
      <Drawer open={open} onOpenChange={setOpen}>
        {children ? <DrawerTrigger asChild>{children}</DrawerTrigger> : null}
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
            <DrawerClose asChild>
              <Button variant="outline" className="w-full">
                Cancel
              </Button>
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
