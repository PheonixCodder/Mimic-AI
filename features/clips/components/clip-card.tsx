"use client";

import Link from "next/link";
import { Film, Play, Trash2, Loader2 } from "lucide-react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";

import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ClipStatusBadge } from "./clip-status-badge";
import { CLIP_STYLE_LABELS } from "../data/clip-options";
import type { ClipStyle } from "../lib/schemas";
import type { Clip } from "@/trpc/routers/clips";
import { useTRPC } from "@/trpc/client";

export type ClipItem = Clip;

type ClipCardProps = {
  clip: ClipItem;
  canDelete?: boolean;
};

const STYLE_BADGES: Record<string, string> = {
  cinematic: "bg-blue-50 text-blue-700 border-blue-200/60 dark:bg-blue-900/20 dark:text-blue-400 dark:border-blue-800/40",
  animated: "bg-orange-50 text-orange-700 border-orange-200/60 dark:bg-orange-900/20 dark:text-orange-400 dark:border-orange-800/40",
  abstract: "bg-purple-50 text-purple-700 border-purple-200/60 dark:bg-purple-900/20 dark:text-purple-400 dark:border-purple-800/40",
  nature: "bg-emerald-50 text-emerald-700 border-emerald-200/60 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-800/40",
  minimal: "bg-zinc-50 text-zinc-700 border-zinc-200/60 dark:bg-zinc-900/20 dark:text-zinc-400 dark:border-zinc-800/40",
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function ClipCard({ clip, canDelete = false }: ClipCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const deleteMutation = useMutation(
    trpc.clips.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Clip deleted");
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

  const isIdle = clip.status === "draft" || clip.status === "failed";
  const isPendingOrProcessing = clip.status === "pending" || clip.status === "processing";

  return (
    <div className="flex items-center gap-4 overflow-hidden rounded-xl border p-3 dark:border-zinc-800">
      <div className="relative h-24 w-28 shrink-0 overflow-hidden rounded-lg bg-muted dark:bg-zinc-900 lg:h-28 lg:w-32">
        {clip.r2ObjectKey ? (
          <video
            src={`/api/clips/${clip.id}`}
            className="size-full object-cover"
            controls={false}
            muted
            loop
            playsInline
            onMouseEnter={(e) => e.currentTarget.play().catch(() => {})}
            onMouseLeave={(e) => {
              e.currentTarget.pause();
              e.currentTarget.currentTime = 0;
            }}
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            {isPendingOrProcessing ? (
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            ) : (
              <Film className="size-8 text-muted-foreground" />
            )}
          </div>
        )}
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1 lg:gap-1.5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="line-clamp-1 text-sm font-semibold tracking-tight text-foreground">
            {clip.title}
          </span>
          <ClipStatusBadge status={clip.status} />
          <span className={`inline-flex items-center rounded-md border px-1.5 py-0.5 text-[10px] font-medium transition-colors ${STYLE_BADGES[clip.style as ClipStyle] || ""}`}>
            {CLIP_STYLE_LABELS[clip.style as ClipStyle] ?? clip.style}
          </span>
        </div>

        <p className="line-clamp-2 text-xs text-muted-foreground">
          {clip.prompt || "No prompt provided."}
        </p>

        <p className="text-[10px] text-muted-foreground/80 lg:text-xs">
          {clip.durationSeconds}s · {clip.aspectRatio} · {clip.resolution} · Updated{" "}
          {formatUpdatedAt(clip.updatedAt)}
        </p>
      </div>

      <div className="flex shrink-0 items-center gap-1.5 pr-1 lg:pr-3">
        {isIdle ? (
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-full border-primary/20 hover:bg-primary/5 dark:border-primary/30"
            disabled={generateMutation.isPending}
            onClick={() => generateMutation.mutate({ id: clip.id })}
            title="Generate Clip"
          >
            {generateMutation.isPending ? (
              <Loader2 className="size-4 animate-spin text-primary" />
            ) : (
              <Play className="size-4 fill-primary text-primary" />
            )}
          </Button>
        ) : null}

        {canDelete ? (
          <Button
            variant="outline"
            size="icon"
            className="size-8 rounded-full border-destructive/20 text-destructive hover:bg-destructive/5 dark:border-destructive/30"
            disabled={deleteMutation.isPending}
            onClick={() => setShowDeleteDialog(true)}
            title="Delete Clip"
          >
            <Trash2 className="size-4" />
          </Button>
        ) : null}

        {canDelete ? (
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent className="max-w-md rounded-2xl">
              <AlertDialogHeader>
                <AlertDialogTitle>Delete clip?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{clip.title}&quot;?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending} className="rounded-xl">
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  className="rounded-xl"
                  onClick={() => {
                    deleteMutation.mutate(
                      { id: clip.id },
                      { onSuccess: () => setShowDeleteDialog(false) },
                    );
                  }}
                >
                  {deleteMutation.isPending ? "Deleting..." : "Delete"}
                </Button>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : null}
      </div>
    </div>
  );
}
