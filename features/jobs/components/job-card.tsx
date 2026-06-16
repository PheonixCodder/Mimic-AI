"use client";

import Link from "next/link";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Ban,
  MoreHorizontal,
  RefreshCw,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Progress } from "@/components/ui/progress";
import { JOB_STATUS_META, JOB_TYPE_META } from "@/features/jobs/data/job-options";
import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import type { JobStatus, JobType } from "@/features/jobs/lib/schemas";
import { cn } from "@/lib/utils";
import { useTRPC } from "@/trpc/client";

type JobCardProps = {
  id: string;
  type: JobType;
  title: string;
  status: JobStatus;
  progress: number;
  resourceId: string | null;
  resourceType: string | null;
  errorMessage: string | null;
  durationMs: number | null;
  createdAt: string;
  startedAt: string | null;
  completedAt: string | null;
  canWrite: boolean;
  canAdmin: boolean;
};

function formatRelativeTime(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = now - then;

  if (diff < 60_000) return "Just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return `${Math.floor(diff / 86_400_000)}d ago`;
}

function formatDuration(ms: number) {
  if (ms < 1_000) return `${ms}ms`;
  if (ms < 60_000) return `${(ms / 1_000).toFixed(1)}s`;
  return `${Math.floor(ms / 60_000)}m ${Math.round((ms % 60_000) / 1_000)}s`;
}

function getResourceHref(resourceType: string | null, resourceId: string | null) {
  if (!resourceType || !resourceId) return null;
  const paths: Record<string, string> = {
    video: `/dashboard/videos/${resourceId}`,
    voice: `/dashboard/voices`,
    avatar: `/dashboard/avatars`,
    export: `/dashboard/videos`,
  };
  return paths[resourceType] ?? null;
}

export function JobCard({
  id,
  type,
  title,
  status,
  progress,
  resourceId,
  resourceType,
  errorMessage,
  durationMs,
  createdAt,
  canWrite,
  canAdmin,
}: JobCardProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const typeMeta = JOB_TYPE_META[type];
  const TypeIcon = typeMeta.icon;

  const isActive = status === "queued" || status === "running";
  const canCancel = canWrite && isActive;
  const canRetry = canWrite && (status === "failed" || status === "cancelled");
  const canDelete = canAdmin;

  const resourceHref = getResourceHref(resourceType, resourceId);

  const invalidateJobs = async () => {
    await queryClient.invalidateQueries({ queryKey: trpc.jobs.list.queryKey() });
  };

  const cancelMutation = useMutation(
    trpc.jobs.cancel.mutationOptions({
      onSuccess: async () => {
        await invalidateJobs();
        toast.success("Job cancelled");
      },
      onError: (e) => toast.error(e.message ?? "Failed to cancel job"),
    }),
  );

  const retryMutation = useMutation(
    trpc.jobs.retry.mutationOptions({
      onSuccess: async () => {
        await invalidateJobs();
        toast.success("Job requeued");
      },
      onError: (e) => toast.error(e.message ?? "Failed to retry job"),
    }),
  );

  const deleteMutation = useMutation(
    trpc.jobs.delete.mutationOptions({
      onSuccess: async () => {
        await invalidateJobs();
        toast.success("Job deleted");
      },
      onError: (e) => toast.error(e.message ?? "Failed to delete job"),
    }),
  );

  const isMutating =
    cancelMutation.isPending || retryMutation.isPending || deleteMutation.isPending;

  return (
    <div className="flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-6">
      {/* Type icon slot */}
      <div
        className={cn(
          "relative flex h-20 w-16 shrink-0 items-center justify-center lg:h-24 lg:w-20",
          JOB_STATUS_META[status].bgColor,
        )}
      >
        <TypeIcon className={cn("size-6 lg:size-7", JOB_STATUS_META[status].color)} />
      </div>

      {/* Content */}
      <div className="flex min-w-0 flex-1 flex-col gap-1 px-3 py-3">
        <div className="flex items-center gap-2">
          {resourceHref ? (
            <Link
              href={resourceHref}
              className="line-clamp-1 text-sm font-medium tracking-tight hover:text-primary"
            >
              {title}
            </Link>
          ) : (
            <span className="line-clamp-1 text-sm font-medium tracking-tight">
              {title}
            </span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
          <span className="font-medium text-primary">{typeMeta.label}</span>
          <span>{formatRelativeTime(createdAt)}</span>
          {durationMs != null && status === "completed" && (
            <span>Completed in {formatDuration(durationMs)}</span>
          )}
        </div>

        {/* Progress bar for running jobs */}
        {status === "running" && (
          <div className="mt-1 flex items-center gap-2">
            <Progress value={progress} className="h-1.5 flex-1" />
            <span className="text-[10px] font-medium tabular-nums text-blue-600">
              {progress}%
            </span>
          </div>
        )}

        {/* Error message for failed jobs */}
        {status === "failed" && errorMessage && (
          <p className="mt-0.5 line-clamp-1 text-[11px] text-destructive">
            {errorMessage}
          </p>
        )}
      </div>

      {/* Right: status + actions */}
      <div className="flex shrink-0 items-center gap-3">
        <JobStatusBadge status={status} className="hidden sm:inline-flex" />

        {(canCancel || canRetry || canDelete) && (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="ghost"
                  size="icon-sm"
                  className="text-muted-foreground"
                  disabled={isMutating}
                  aria-label="Job actions"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40">
              <DropdownMenuGroup>
                {canCancel && (
                  <DropdownMenuItem
                    onClick={() => cancelMutation.mutate({ id })}
                    disabled={cancelMutation.isPending}
                  >
                    <Ban className="mr-2 size-3.5" />
                    Cancel
                  </DropdownMenuItem>
                )}
                {canRetry && (
                  <DropdownMenuItem
                    onClick={() => retryMutation.mutate({ id })}
                    disabled={retryMutation.isPending}
                  >
                    <RefreshCw className="mr-2 size-3.5" />
                    Retry
                  </DropdownMenuItem>
                )}
              </DropdownMenuGroup>
              {canDelete && (canCancel || canRetry) && <DropdownMenuSeparator />}
              {canDelete && (
                <DropdownMenuItem
                  onClick={() => deleteMutation.mutate({ id })}
                  disabled={deleteMutation.isPending}
                  variant="destructive"
                >
                  <Trash2 className="mr-2 size-3.5" />
                  Delete
                </DropdownMenuItem>
              )}
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </div>
    </div>
  );
}
