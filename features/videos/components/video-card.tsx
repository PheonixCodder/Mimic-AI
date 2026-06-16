"use client";

import Link from "next/link";
import { Clapperboard, MoreHorizontal, Trash2 } from "lucide-react";
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
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VideoStatusBadge } from "@/features/videos/components/video-status-badge";
import type { Video } from "@/trpc/routers/videos";
import { useTRPC } from "@/trpc/client";

export type VideoItem = Video;

type VideoCardProps = {
  video: VideoItem;
  canDelete?: boolean;
};

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

export function VideoCard({ video, canDelete = false }: VideoCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const thumbnailSrc = video.avatarId
    ? `/api/avatars/${encodeURIComponent(video.avatarId)}`
    : null;

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteMutation = useMutation(
    trpc.videos.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Video deleted");
        await queryClient.invalidateQueries({
          queryKey: trpc.videos.list.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete video");
      },
    }),
  );

  return (
    <div className="flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-6">
      <Link
        href={`/dashboard/videos/${video.id}`}
        className="relative h-24 w-28 shrink-0 overflow-hidden bg-muted lg:h-30 lg:w-32"
      >
        {thumbnailSrc ? (
          <img
            src={thumbnailSrc}
            alt={video.title}
            className="size-full object-cover"
          />
        ) : (
          <div className="flex size-full items-center justify-center">
            <Clapperboard className="size-8 text-muted-foreground" />
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/dashboard/videos/${video.id}`}
            className="line-clamp-1 text-sm font-medium tracking-tight hover:text-primary"
          >
            {video.title}
          </Link>
          <VideoStatusBadge status={video.status} />
        </div>

        <p className="line-clamp-2 text-xs text-muted-foreground">
          {video.script || "No script yet."}
        </p>

        <p className="text-xs text-muted-foreground">
          {video.aspectRatio} · {video.resolution} · Updated{" "}
          {formatUpdatedAt(video.updatedAt)}
        </p>
      </div>

      <div className="ml-1 flex shrink-0 items-center gap-1 lg:ml-3">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={<Link href={`/dashboard/videos/${video.id}`} />}
        >
          Open
        </Button>

        {canDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label="Video actions"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => setShowDeleteDialog(true)}
                >
                  <Trash2 />
                  Delete video
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {canDelete ? (
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete video?</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{video.title}&quot;?
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel disabled={deleteMutation.isPending}>
                  Cancel
                </AlertDialogCancel>
                <Button
                  variant="destructive"
                  disabled={deleteMutation.isPending}
                  onClick={() => {
                    deleteMutation.mutate(
                      { id: video.id },
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
