"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Trash2, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { useTRPC } from "@/trpc/client";
import type { VideoExport } from "@/trpc/routers/exports";

type ExportsListProps = {
  videoId: string;
  canWrite: boolean;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function ExportsList({ videoId, canWrite }: ExportsListProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  // Load exports list. Auto-poll if any job is pending or processing.
  const { data: exports, isLoading } = useQuery({
    ...trpc.exports.list.queryOptions({ videoId }),
    refetchInterval: (query) => {
      const hasActiveJobs = query.state.data?.some(
        (job) => job.status === "pending" || job.status === "processing",
      );
      return hasActiveJobs ? 2500 : false;
    },
  });

  const deleteMutation = useMutation(
    trpc.exports.delete.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.exports.list.queryKey({ videoId }),
        });
        toast.success("Export deleted");
      },
      onError: (e) => {
        toast.error(e.message ?? "Failed to delete export");
      },
    }),
  );

  if (isLoading) {
    return (
      <Card className="rounded-2xl">
        <CardContent className="flex h-32 items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </CardContent>
      </Card>
    );
  }

  if (!exports || exports.length === 0) {
    return (
      <Card className="rounded-2xl border-dashed">
        <CardContent className="flex flex-col items-center justify-center gap-2 py-8 text-center">
          <p className="text-sm font-medium text-muted-foreground">No exports generated yet</p>
          <p className="max-w-xs text-xs text-muted-foreground">
            Generate customized versions of your video in different resolutions or formats.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="rounded-2xl">
      <CardHeader>
        <CardTitle className="text-base">Export History</CardTitle>
        <CardDescription>
          Download generated formats or check active render statuses.
        </CardDescription>
      </CardHeader>
      <CardContent className="divide-y divide-border">
        {exports.map((exp: VideoExport) => {
          const isPending = exp.status === "pending";
          const isProcessing = exp.status === "processing";
          const isCompleted = exp.status === "completed";
          const isFailed = exp.status === "failed";

          return (
            <div key={exp.id} className="flex flex-wrap items-center justify-between gap-4 py-3 first:pt-0 last:pb-0">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold uppercase tracking-wider">
                    {exp.resolution} · {exp.format}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5 text-[10px] text-muted-foreground">
                    {exp.watermarkEnabled
                      ? exp.watermarkType === "logo"
                        ? "Logo watermark"
                        : `${exp.watermarkText ?? "mimic.ai"} watermark`
                      : "Watermark-free"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Requested {formatDate(exp.createdAt)}
                </p>
              </div>

              <div className="flex items-center gap-3">
                {/* Status Indicator */}
                {isPending && (
                  <span className="flex items-center gap-1.5 text-xs text-amber-600 font-medium">
                    <Loader2 className="size-3.5 animate-spin" />
                    Queued
                  </span>
                )}
                {isProcessing && (
                  <span className="flex items-center gap-1.5 text-xs text-blue-600 font-medium">
                    <Loader2 className="size-3.5 animate-spin" />
                    Rendering
                  </span>
                )}
                {isFailed && (
                  <span className="flex items-center gap-1.5 text-xs text-destructive font-medium">
                    <AlertCircle className="size-3.5" />
                    Failed
                  </span>
                )}
                {isCompleted && (
                  <span className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium">
                    <CheckCircle2 className="size-3.5" />
                    Ready
                  </span>
                )}

                {/* Actions */}
                <div className="flex items-center gap-1.5">
                  {isCompleted && exp.r2ObjectUrl ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="h-8 gap-1 px-2.5"
                      render={
                        <a
                          href={exp.r2ObjectUrl}
                          download={`mimic-video-${exp.id}.${exp.format}`}
                        />
                      }
                    >
                      <Download className="size-3.5" />
                      Download
                    </Button>
                  ) : null}

                  {canWrite ? (
                    <Button
                      variant="ghost"
                      size="icon-xs"
                      onClick={() => deleteMutation.mutate({ id: exp.id })}
                      disabled={deleteMutation.isPending || isPending || isProcessing}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label="Delete export"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  ) : null}
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
