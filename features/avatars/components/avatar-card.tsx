"use client";

import { MoreHorizontal, Trash2, UserRound } from "lucide-react";
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
import {
  AVATAR_STYLE_LABELS,
  type AvatarStyle,
} from "@/features/avatars/data/avatar-styles";
import type { Avatar } from "@/trpc/routers/avatars";
import { useTRPC } from "@/trpc/client";

export type AvatarItem = Avatar;

type AvatarCardProps = {
  avatar: AvatarItem;
  canDelete?: boolean;
};

export function AvatarCard({ avatar, canDelete = false }: AvatarCardProps) {
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const styleLabel =
    AVATAR_STYLE_LABELS[avatar.style as AvatarStyle] ?? avatar.style;

  const imageSrc = `/api/avatars/${encodeURIComponent(avatar.id)}`;

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const deleteMutation = useMutation(
    trpc.avatars.delete.mutationOptions({
      onSuccess: async () => {
        toast.success("Avatar deleted");
        await queryClient.invalidateQueries({
          queryKey: trpc.avatars.getAll.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete avatar");
      },
    }),
  );

  return (
    <div className="flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-6">
      <div className="relative h-24 w-20 shrink-0 overflow-hidden lg:h-30 lg:w-24">
        <img
          src={`${imageSrc}?w=160&h=160`}
          alt={avatar.name}
          className="size-full object-cover"
        />
      </div>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:gap-3">
        <div className="line-clamp-1 flex items-center gap-1.5 text-sm font-medium tracking-tight">
          {avatar.name}
          <span className="size-1 shrink-0 rounded-full bg-muted-foreground/50" />
          <span className="text-primary">{styleLabel}</span>
        </div>

        <p className="line-clamp-2 text-xs text-muted-foreground">
          {avatar.description || "No description provided."}
        </p>
      </div>

      <div className="ml-1 flex shrink-0 items-center gap-1 lg:ml-3 lg:gap-2">
        <Button
          variant="outline"
          size="icon-sm"
          className="rounded-full"
          nativeButton={false}
          render={<a href={imageSrc} target="_blank" rel="noreferrer" />}
          aria-label="View avatar"
        >
          <UserRound className="size-4" />
        </Button>

        {avatar.variant === "custom" && canDelete ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label="Avatar actions"
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
                  Delete avatar
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {avatar.variant === "custom" && canDelete ? (
          <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete avatar</AlertDialogTitle>
                <AlertDialogDescription>
                  Are you sure you want to delete &quot;{avatar.name}&quot;?
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
                      { id: avatar.id },
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
