"use client";

import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  Download,
  Play,
  Trash2,
  Loader2,
  Copy,
  Check,
  Film,
  Calendar,
  Layers,
  Clock,
  Tv,
  AlertCircle
} from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipStatusBadge } from "./clip-status-badge";
import { CLIP_STYLE_LABELS } from "../data/clip-options";
import type { ClipStyle } from "../lib/schemas";
import type { Clip } from "@/trpc/routers/clips";
import { useTRPC } from "@/trpc/client";

type ClipViewerDialogProps = {
  clip: Clip;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canDelete?: boolean;
};

const STYLE_BADGES: Record<string, string> = {
  cinematic: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40",
  animated: "bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/40",
  abstract: "bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/40",
  nature: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40",
  minimal: "bg-zinc-50 text-zinc-700 border-zinc-200/60 dark:bg-zinc-900/20 dark:text-zinc-400 dark:border-zinc-800/40",
};

export function ClipViewerDialog({
  clip,
  open,
  onOpenChange,
  canDelete = false,
}: ClipViewerDialogProps) {
  const [copied, setCopied] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    trpc.clips.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Clip deleted");
        onOpenChange(false);
        await queryClient.invalidateQueries({
          queryKey: trpc.clips.list.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete clip");
      },
    }),
  );

  const generateMutation = useMutation(
    trpc.clips.generate.mutationOptions({
      onSuccess: async () => {
        toast.success("Generation started");
        await queryClient.invalidateQueries({
          queryKey: trpc.clips.list.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to start generation");
      },
    }),
  );

  const handleCopy = async () => {
    if (!clip.prompt) return;
    try {
      await navigator.clipboard.writeText(clip.prompt);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      toast.success("Prompt copied to clipboard");
    } catch {
      toast.error("Failed to copy prompt");
    }
  };

  const handleDownload = () => {
    // Triggers download of video via streaming API endpoint
    window.open(`/api/clips/${clip.id}`, "_blank");
  };

  const isIdle = clip.status === "draft" || clip.status === "failed";
  const isPendingOrProcessing = clip.status === "pending" || clip.status === "processing";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="min-w-4xl p-0 overflow-hidden border dark:border-zinc-800 bg-background rounded-2xl">
        <DialogHeader className="sr-only">
          <DialogTitle>{clip.title}</DialogTitle>
          <DialogDescription>View and manage AI video clip details.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-12 w-full h-[550px] md:h-[620px] divide-y md:divide-y-0 md:divide-x divide-zinc-200 dark:divide-zinc-800">
          {/* Left Column: Interactive Video Workspace */}
          <div className="col-span-1 md:col-span-7 bg-zinc-950 flex flex-col items-center justify-center relative overflow-hidden h-[260px] md:h-full">
            {clip.r2ObjectKey ? (
              <video
                src={`/api/clips/${clip.id}`}
                controls
                autoPlay
                loop
                playsInline
                className="w-full h-full object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-8 size-full">
                {isPendingOrProcessing ? (
                  <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                    <div className="relative flex items-center justify-center h-16 w-16">
                      <span className="absolute animate-ping inline-flex h-full w-full rounded-full bg-emerald-400 opacity-25"></span>
                      <div className="relative rounded-full bg-emerald-500/10 p-4 border border-emerald-500/25">
                        <Loader2 className="size-8 text-emerald-500 animate-spin" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-lg text-white">Generating Clip...</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        Mimic AI is running Wan2 video diffusion. This page will update in real-time when the GPU job completes.
                      </p>
                    </div>
                  </div>
                ) : clip.status === "failed" ? (
                  <div className="flex flex-col items-center gap-4 text-center max-w-sm px-4">
                    <div className="rounded-full bg-destructive/10 p-4 border border-destructive/20 text-destructive shadow-lg shadow-destructive/5">
                      <AlertCircle className="size-8" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-lg text-white">Generation Failed</h3>
                      <p className="text-xs text-zinc-400 break-words leading-relaxed max-h-24 overflow-y-auto px-1">
                        {clip.errorMessage || "An unknown error occurred during video generation."}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-4 text-center max-w-sm">
                    <div className="rounded-full bg-zinc-900 p-4 border border-zinc-800 text-zinc-400">
                      <Film className="size-8" />
                    </div>
                    <div className="space-y-1.5">
                      <h3 className="font-semibold text-lg text-white">Draft Clip</h3>
                      <p className="text-xs text-zinc-400 leading-relaxed">
                        This clip configuration has been saved. Trigger generation below to spin up the GPU pipeline.
                      </p>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Right Column: Metadata & Management Dashboard */}
          <div className="col-span-1 md:col-span-5 p-6 flex flex-col justify-between h-[290px] md:h-full overflow-y-auto bg-zinc-50/30 dark:bg-zinc-950/10 font-sans">
            <div className="space-y-5">
              {/* Header Details */}
              <div className="space-y-1.5">
                <h2 className="text-lg font-bold tracking-tight text-foreground line-clamp-2">
                  {clip.title}
                </h2>
                <div className="flex flex-wrap items-center gap-2 pt-0.5">
                  <ClipStatusBadge status={clip.status} />
                  <Badge
                    variant="outline"
                    className={`text-[10px] font-medium border capitalize ${
                      STYLE_BADGES[clip.style as ClipStyle] || ""
                    }`}
                  >
                    {CLIP_STYLE_LABELS[clip.style as ClipStyle] ?? clip.style}
                  </Badge>
                </div>
              </div>

              {/* Prompt Visualizer */}
              <div className="space-y-2">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Generation Prompt
                </span>
                <div className="relative group rounded-xl border border-zinc-200/80 dark:border-zinc-800/80 bg-background/60 p-3 text-xs text-foreground leading-relaxed shadow-2xs">
                  <p className="pr-7 select-text whitespace-pre-wrap max-h-32 overflow-y-auto">
                    {clip.prompt || "No prompt provided."}
                  </p>
                  {clip.prompt && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="absolute top-2.5 right-2.5 size-6 rounded-md hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                      onClick={handleCopy}
                      title="Copy Prompt"
                    >
                      {copied ? (
                        <Check className="size-3.5 text-emerald-600" />
                      ) : (
                        <Copy className="size-3.5 text-muted-foreground" />
                      )}
                    </Button>
                  )}
                </div>
              </div>

              {/* Technical Specifications */}
              <div className="space-y-2.5">
                <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Specifications
                </span>
                <div className="grid grid-cols-2 gap-3.5 rounded-xl border border-zinc-200/60 dark:border-zinc-800/60 p-3 text-xs bg-background/30 shadow-3xs">
                  <div className="flex items-center gap-2">
                    <Clock className="size-4 text-muted-foreground/75" />
                    <div>
                      <div className="text-[10px] text-muted-foreground font-medium">Duration</div>
                      <div className="font-semibold">{clip.durationSeconds}s</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Tv className="size-4 text-muted-foreground/75" />
                    <div>
                      <div className="text-[10px] text-muted-foreground font-medium">Aspect Ratio</div>
                      <div className="font-semibold">{clip.aspectRatio}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Layers className="size-4 text-muted-foreground/75" />
                    <div>
                      <div className="text-[10px] text-muted-foreground font-medium">Resolution</div>
                      <div className="font-semibold">{clip.resolution}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <Calendar className="size-4 text-muted-foreground/75" />
                    <div>
                      <div className="text-[10px] text-muted-foreground font-medium">Updated</div>
                      <div className="font-semibold tracking-tight">
                        {new Intl.DateTimeFormat(undefined, {
                          month: "short",
                          day: "numeric"
                        }).format(new Date(clip.updatedAt))}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions Panel */}
            <div className="pt-4 mt-6 border-t border-zinc-200/80 dark:border-zinc-800/80 space-y-2">
              {clip.r2ObjectKey && (
                <Button
                  className="w-full bg-gradient-to-r from-emerald-600 to-green-700 hover:from-emerald-500 hover:to-green-600 text-white rounded-xl shadow-lg shadow-emerald-500/10 gap-2 border border-emerald-500/25 transition-all font-medium h-10 cursor-pointer"
                  onClick={handleDownload}
                >
                  <Download className="size-4" />
                  Download Clip
                </Button>
              )}

              {isIdle && (
                <Button
                  className="w-full bg-primary hover:bg-primary/95 text-primary-foreground rounded-xl shadow-md gap-2 transition-all font-medium h-10 cursor-pointer"
                  disabled={generateMutation.isPending}
                  onClick={() => generateMutation.mutate({ id: clip.id })}
                >
                  {generateMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Play className="size-4 fill-current" />
                  )}
                  {generateMutation.isPending ? "Starting Queue..." : "Generate Video"}
                </Button>
              )}

              {canDelete && !isPendingOrProcessing && (
                <Button
                  variant="outline"
                  className="w-full border-destructive/20 text-destructive hover:bg-destructive/5 rounded-xl gap-2 transition-all h-10 cursor-pointer"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    if (confirm(`Are you sure you want to delete "${clip.title}"?`)) {
                      deleteMutation.mutate({ id: clip.id });
                    }
                  }}
                >
                  {deleteMutation.isPending ? (
                    <Loader2 className="size-4 animate-spin text-destructive" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Delete Clip
                </Button>
              )}
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
