"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  ArrowLeft,
  Clapperboard,
  Trash2,
  Download,
  Play,
  Loader2,
  Sparkles,
  Search,
  Check,
  X,
  Edit,
  Save,
  Languages,
  FileText,
  VideoIcon,
  HelpCircle,
} from "lucide-react";
import { toast } from "sonner";
import { useRealtimeRun } from "@trigger.dev/react-hooks";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { VideoStatusBadge } from "@/features/videos/components/video-status-badge";
import { ExportDialog } from "@/features/videos/components/export-dialog";
import { ExportsList } from "@/features/videos/components/exports-list";
import { BRollPanel } from "@/features/videos/components/broll-panel";
import {
  VIDEO_ASPECT_RATIO_LABELS,
  VIDEO_RESOLUTION_LABELS,
  type VideoAspectRatio,
  type VideoResolution,
} from "@/features/videos/data/video-options";
import { useTRPC } from "@/trpc/client";

// ---------------------------------------------------------------------------
// Client-side Download Helpers for Subtitles
// ---------------------------------------------------------------------------

function formatTimeSRT(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")},${String(ms).padStart(3, "0")}`;
}

function formatTimeVTT(seconds: number): string {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function downloadSRT(subtitles: { start: number; end: number; text: string }[], filename: string) {
  const content = subtitles
    .map((cue, i) => `${i + 1}\n${formatTimeSRT(cue.start)} --> ${formatTimeSRT(cue.end)}\n${cue.text}\n`)
    .join("\n");
  triggerDownload(content, `${filename}.srt`, "text/srt");
}

function downloadVTT(subtitles: { start: number; end: number; text: string }[], filename: string) {
  const content =
    `WEBVTT\n\n` +
    subtitles
      .map((cue, i) => `${i + 1}\n${formatTimeVTT(cue.start)} --> ${formatTimeVTT(cue.end)}\n${cue.text}\n`)
      .join("\n");
  triggerDownload(content, `${filename}.vtt`, "text/vtt");
}

function downloadTXT(subtitles: { start: number; end: number; text: string }[], filename: string) {
  const content = subtitles.map((cue) => cue.text).join(" ");
  triggerDownload(content, `${filename}.txt`, "text/plain");
}

function triggerDownload(content: string, filename: string, contentType: string) {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

// ---------------------------------------------------------------------------
// VideoDetailView Component
// ---------------------------------------------------------------------------

type VideoDetailViewProps = {
  videoId: string;
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function VideoDetailView({ videoId }: VideoDetailViewProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const videoRef = useRef<HTMLVideoElement>(null);

  // Subtitle/transcript states
  const [currentTime, setCurrentTime] = useState(0);
  const [searchQuery, setSearchQuery] = useState("");
  const [isEditing, setIsEditing] = useState(false);
  const [editedSubtitles, setEditedSubtitles] = useState<{ start: number; end: number; text: string }[]>([]);

  const { data: video } = useSuspenseQuery({
    ...trpc.videos.getById.queryOptions({ id: videoId }),
    refetchInterval: (query) => {
      const status = query.state.data?.status;
      const previewStatus = query.state.data?.previewStatus;
      const subtitlesStatus = query.state.data?.subtitlesStatus;
      return status === "pending" ||
        status === "processing" ||
        previewStatus === "pending" ||
        previewStatus === "processing" ||
        subtitlesStatus === "pending" ||
        subtitlesStatus === "processing"
        ? 2000
        : false;
    },
  });

  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  // Poll active jobs in this workspace
  const { data: jobs } = useQuery({
    ...trpc.jobs.list.queryOptions({}),
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some(
        (j) => j.status === "queued" || j.status === "running",
      );
      return hasActive ? 2000 : false;
    },
    enabled:
      video.status === "pending" ||
      video.status === "processing" ||
      video.previewStatus === "pending" ||
      video.previewStatus === "processing" ||
      video.subtitlesStatus === "pending" ||
      video.subtitlesStatus === "processing",
  });

  // Load subtitles into editor buffer when completed
  useEffect(() => {
    if (video?.subtitles) {
      setEditedSubtitles(video.subtitles);
    }
  }, [video?.subtitles]);

  // Find active job corresponding to this video
  const activeJob = jobs?.find(
    (j) =>
      (j.type === "video_render" || j.type === "video_preview") &&
      j.resourceId === video.id &&
      (j.status === "queued" || j.status === "running")
  );

  const activeCaptionJob = jobs?.find(
    (j) =>
      j.type === "caption_generate" &&
      j.resourceId === video.id &&
      (j.status === "queued" || j.status === "running")
  );

  const canDelete = ["owner", "admin", "member"].includes(workspace.role);

  const STAGE_LABELS: Record<string, string> = {
    starting: "Starting…",
    validating_inputs: "Validating inputs…",
    generating_speech: "Generating speech…",
    rendering_avatar: "Rendering avatar…",
    combining_tracks: "Combining tracks…",
    uploading_r2: "Uploading result…",
    generating_preview_speech: "Generating preview audio…",
    rendering_preview: "Rendering preview…",
    uploading_preview: "Uploading preview…",
  };

  const isActiveGeneration = video.status === "pending" || video.status === "processing" ||
    video.previewStatus === "pending" || video.previewStatus === "processing";

  const { data: realtimeToken } = useQuery({
    ...trpc.videos.getRealtimeToken.queryOptions({ videoId }),
    enabled: isActiveGeneration,
    refetchInterval: false,
  });

  const { run: liveRun } = useRealtimeRun(realtimeToken?.runId ?? undefined, {
    accessToken: realtimeToken?.token ?? undefined,
    baseURL: "https://api.trigger.dev",
    enabled: !!realtimeToken?.runId && !!realtimeToken?.token,
    onComplete: async () => {
      await queryClient.invalidateQueries({ queryKey: trpc.videos.getById.queryKey({ id: videoId }) });
      await queryClient.invalidateQueries({ queryKey: trpc.jobs.list.queryKey() });
    },
  });

  const liveStage = liveRun?.metadata?.stage as string | undefined;

  const deleteMutation = useMutation(
    trpc.videos.delete.mutationOptions({
      onSuccess: () => {
        toast.success("Video deleted");
        router.push("/dashboard/videos");
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to delete video");
      },
    }),
  );

  const generateMutation = useMutation(
    trpc.videos.generate.mutationOptions({
      onSuccess: async () => {
        toast.success("Generation started!");
        await queryClient.invalidateQueries({
          queryKey: trpc.videos.getById.queryKey({ id: videoId }),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.jobs.list.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to start generation");
      },
    }),
  );

  const generatePreviewMutation = useMutation(
    trpc.videos.generatePreview.mutationOptions({
      onSuccess: async () => {
        toast.success("Preview generation started!");
        await queryClient.invalidateQueries({
          queryKey: trpc.videos.getById.queryKey({ id: videoId }),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.jobs.list.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to start preview generation");
      },
    }),
  );

  const generateCaptionsMutation = useMutation(
    trpc.videos.generateCaptions.mutationOptions({
      onSuccess: async () => {
        toast.success("Transcription started!");
        await queryClient.invalidateQueries({
          queryKey: trpc.videos.getById.queryKey({ id: videoId }),
        });
        await queryClient.invalidateQueries({
          queryKey: trpc.jobs.list.queryKey(),
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to start transcription");
      },
    }),
  );

  const updateCaptionsMutation = useMutation(
    trpc.videos.updateCaptions.mutationOptions({
      onSuccess: async () => {
        toast.success("Subtitles updated successfully!");
        setIsEditing(false);
        await queryClient.invalidateQueries({
          queryKey: trpc.videos.getById.queryKey({ id: videoId }),
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to save subtitles");
      },
    }),
  );

  const videoSrc = video.hasOutput
    ? `/api/videos/${encodeURIComponent(video.id)}`
    : null;

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
  };

  const seekTo = (start: number) => {
    if (videoRef.current) {
      videoRef.current.currentTime = start;
      videoRef.current.play().catch(() => {});
    }
  };

  // Filtered subtitles list based on search query
  const rawSubtitles = video.subtitles || [];
  const filteredSubtitles = rawSubtitles.filter((cue) =>
    cue.text.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardPageShell
      title={video.title}
      description="Video overview and production configuration."
      icon={Clapperboard}
      breadcrumbs={[
        { label: "Videos", href: "/dashboard/videos" },
        { label: video.title },
      ]}
    >
      <div className="space-y-6">
        <div className="flex flex-wrap items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            nativeButton={false}
            render={<Link href="/dashboard/videos" />}
          >
            <ArrowLeft />
            Back to videos
          </Button>

          <VideoStatusBadge status={video.status} />

          {video.approvalStatus === "approved" ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              ✓ Approved
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700 border border-amber-200/50">
              Pending approval
            </span>
          )}

          {video.consentConfirmedAt ? (
            <span className="inline-flex items-center gap-1 rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
              ✓ Consent confirmed
            </span>
          ) : null}

          {video.status === "completed" ? (
            <ExportDialog videoId={video.id}>
              <Button variant="default" size="sm" className="gap-1.5 ml-auto">
                <Download className="size-4" />
                Export
              </Button>
            </ExportDialog>
          ) : null}

          {(video.status === "draft" || video.status === "failed") && canDelete ? (
            <div className="flex items-center gap-2 ml-auto">
              <Button
                variant="outline"
                size="sm"
                className="gap-1.5"
                onClick={() => generatePreviewMutation.mutate({ id: video.id })}
                disabled={
                  generatePreviewMutation.isPending ||
                  generateMutation.isPending ||
                  video.previewStatus === "pending" ||
                  video.previewStatus === "processing"
                }
              >
                {generatePreviewMutation.isPending ||
                video.previewStatus === "pending" ||
                video.previewStatus === "processing" ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                Generate preview
              </Button>
              <Button
                variant="default"
                size="sm"
                className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/80"
                onClick={() => generateMutation.mutate({ id: video.id })}
                disabled={
                  generateMutation.isPending ||
                  generatePreviewMutation.isPending ||
                  video.previewStatus === "pending" ||
                  video.previewStatus === "processing" ||
                  video.approvalStatus !== "approved"
                }
                title={video.approvalStatus !== "approved" ? "Approve the video in the wizard first" : undefined}
              >
                {generateMutation.isPending ? (
                  <Loader2 className="size-4 animate-spin" />
                ) : (
                  <Play className="size-4" />
                )}
                Generate video
              </Button>
            </div>
          ) : null}

          {canDelete ? (
            <Button
              variant="outline"
              size="sm"
              className={video.status === "completed" || video.status === "draft" || video.status === "failed" ? "" : "ml-auto"}
              onClick={() => deleteMutation.mutate({ id: video.id })}
              disabled={deleteMutation.isPending || generateMutation.isPending}
            >
              <Trash2 />
              {deleteMutation.isPending ? "Deleting..." : "Delete"}
            </Button>
          ) : null}
        </div>

        {video.status === "completed" ? (
          /* 🎬 Two-Column Video Editor Layout for Completed Videos */
          <div className="grid gap-6 lg:grid-cols-12 items-start">
            {/* Left Column: Player & Exports */}
            <div className="lg:col-span-7 space-y-6">
              <Card className="rounded-2xl overflow-hidden shadow-sm">
                <CardHeader className="p-4 pb-0">
                  <CardTitle className="text-base font-semibold">Video Output</CardTitle>
                  <CardDescription>
                    Created {formatDate(video.createdAt)} · Updated {formatDate(video.updatedAt)}
                  </CardDescription>
                </CardHeader>
                <CardContent className="p-4">
                  {videoSrc ? (
                    <video
                      ref={videoRef}
                      src={videoSrc}
                      poster={`${videoSrc}?w=640&h=360&poster=true`}
                      controls
                      onTimeUpdate={handleTimeUpdate}
                      className="aspect-video w-full rounded-xl border bg-black shadow-inner"
                    />
                  ) : (
                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
                      <Clapperboard className="size-10 text-muted-foreground animate-pulse" />
                      <p className="text-sm font-medium">Loading player...</p>
                    </div>
                  )}
                </CardContent>
              </Card>

              <ExportsList videoId={video.id} canWrite={canDelete} />
            </div>

            {/* Right Column: Interactive Tabbed Workspace */}
            <div className="lg:col-span-5 h-full">
              <Tabs defaultValue="captions" className="w-full flex flex-col h-full min-h-[460px]">
                <TabsList className="w-full justify-start border-b rounded-none bg-transparent p-0 mb-4" variant="line">
                  <TabsTrigger
                    value="captions"
                    className="data-active:border-b-2 data-active:border-primary rounded-none bg-transparent border-transparent px-4 py-2 text-sm font-medium transition-all"
                  >
                    Captions
                  </TabsTrigger>
                  <TabsTrigger
                    value="broll"
                    className="data-active:border-b-2 data-active:border-primary rounded-none bg-transparent border-transparent px-4 py-2 text-sm font-medium transition-all"
                  >
                    B-Roll
                  </TabsTrigger>
                  <TabsTrigger
                    value="config"
                    className="data-active:border-b-2 data-active:border-primary rounded-none bg-transparent border-transparent px-4 py-2 text-sm font-medium transition-all"
                  >
                    Configuration
                  </TabsTrigger>
                  <TabsTrigger
                    value="script"
                    className="data-active:border-b-2 data-active:border-primary rounded-none bg-transparent border-transparent px-4 py-2 text-sm font-medium transition-all"
                  >
                    Original Script
                  </TabsTrigger>
                </TabsList>

                {/* 📝 Captions & Interactive Transcript Tab */}
                <TabsContent
                  value="captions"
                  className="flex flex-col h-full bg-card border rounded-2xl p-4 shadow-sm min-h-[420px]"
                >
                  {video.subtitlesStatus === "none" || video.subtitlesStatus === "failed" ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
                      <div className="size-12 bg-primary/10 rounded-full flex items-center justify-center text-primary">
                        <Sparkles className="size-6 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">No Captions Yet</h4>
                        <p className="text-xs text-muted-foreground max-w-[280px] mt-1">
                          Automatically generate synchronized subtitles using serverless Whisper transcription.
                        </p>
                      </div>

                      {video.subtitlesStatus === "failed" && video.subtitlesError && (
                        <p className="text-xs text-destructive bg-destructive/5 border border-destructive/20 px-3 py-1.5 rounded-lg max-w-[320px]">
                          Error: {video.subtitlesError}
                        </p>
                      )}

                      <Button
                        variant="default"
                        size="sm"
                        className="gap-1.5 bg-primary text-primary-foreground hover:bg-primary/90"
                        onClick={() => generateCaptionsMutation.mutate({ id: video.id })}
                        disabled={generateCaptionsMutation.isPending}
                      >
                        {generateCaptionsMutation.isPending ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <Languages className="size-4" />
                        )}
                        Generate Captions
                      </Button>
                    </div>
                  ) : video.subtitlesStatus === "pending" || video.subtitlesStatus === "processing" ? (
                    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-10 text-center">
                      <Loader2 className="size-8 animate-spin text-primary" />
                      <div>
                        <h4 className="text-sm font-semibold text-foreground">
                          {activeCaptionJob?.status === "running"
                            ? `Generating Subtitles (${activeCaptionJob.progress}%)`
                            : "Queued for transcription..."}
                        </h4>
                        <p className="text-xs text-muted-foreground max-w-[280px] mt-1">
                          Transcribing audio using Faster-Whisper on Modal. This usually completes in under 30 seconds.
                        </p>
                      </div>
                      {activeCaptionJob?.status === "running" && (
                        <div className="w-full max-w-xs px-4">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${activeCaptionJob.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  ) : (
                    // Subtitles status is completed - render full interactive workspace
                    <div className="flex flex-col flex-1 space-y-3">
                      <div className="flex items-center justify-between gap-2 border-b pb-3">
                        <div className="relative flex-1 max-w-[240px]">
                          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
                          <Input
                            placeholder="Search words..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-8 h-9 text-xs"
                          />
                        </div>

                        <div className="flex items-center gap-1.5">
                          {/* Subtitles Download Dropdown */}
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              render={
                                <Button variant="outline" size="sm" className="h-9 gap-1 text-xs" />
                              }
                            >
                              <Download className="size-3.5" />
                              Download
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="text-xs">
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => downloadSRT(rawSubtitles, video.title)}
                              >
                                <FileText className="size-3.5 text-muted-foreground" />
                                SRT Subtitles (.srt)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => downloadVTT(rawSubtitles, video.title)}
                              >
                                <FileText className="size-3.5 text-muted-foreground" />
                                WebVTT Subtitles (.vtt)
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                className="gap-2 cursor-pointer"
                                onClick={() => downloadTXT(rawSubtitles, video.title)}
                              >
                                <FileText className="size-3.5 text-muted-foreground" />
                                Plain Transcript (.txt)
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>

                          {/* Toggle Edit Mode */}
                          {isEditing ? (
                            <div className="flex items-center gap-1">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-9 px-2 text-destructive border-destructive/30 hover:bg-destructive/5"
                                onClick={() => {
                                  setIsEditing(false);
                                  setEditedSubtitles(rawSubtitles);
                                }}
                              >
                                <X className="size-3.5" />
                              </Button>
                              <Button
                                variant="default"
                                size="sm"
                                className="h-9 gap-1 bg-primary text-primary-foreground text-xs"
                                onClick={() =>
                                  updateCaptionsMutation.mutate({
                                    id: video.id,
                                    subtitles: editedSubtitles,
                                  })
                                }
                                disabled={updateCaptionsMutation.isPending}
                              >
                                {updateCaptionsMutation.isPending ? (
                                  <Loader2 className="size-3.5 animate-spin" />
                                ) : (
                                  <Save className="size-3.5" />
                                )}
                                Save
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-9 gap-1 text-xs"
                              onClick={() => {
                                setIsEditing(true);
                                setEditedSubtitles(rawSubtitles);
                              }}
                            >
                              <Edit className="size-3.5" />
                              Edit
                            </Button>
                          )}
                        </div>
                      </div>

                      {/* Interactive Cues Box */}
                      <div className="flex-1 overflow-y-auto max-h-[340px] space-y-1.5 pr-1 custom-scrollbar">
                        {isEditing ? (
                          editedSubtitles.map((cue, idx) => (
                            <div
                              key={idx}
                              className="flex gap-2 items-center border p-2 rounded-lg bg-muted/10 focus-within:border-primary/50 transition-all"
                            >
                              <span className="text-[10px] text-muted-foreground w-12 font-mono tabular-nums">
                                {formatTimeVTT(cue.start).slice(3, -1)}
                              </span>
                              <Input
                                value={cue.text}
                                onChange={(e) => {
                                  const updated = [...editedSubtitles];
                                  updated[idx] = { ...updated[idx], text: e.target.value };
                                  setEditedSubtitles(updated);
                                }}
                                className="h-8 py-1 text-xs flex-1 bg-background"
                              />
                            </div>
                          ))
                        ) : filteredSubtitles.length > 0 ? (
                          filteredSubtitles.map((cue, idx) => {
                            const isActive = currentTime >= cue.start && currentTime <= cue.end;
                            return (
                              <button
                                key={idx}
                                onClick={() => seekTo(cue.start)}
                                className={`w-full text-left p-2 rounded-lg border text-xs transition-all flex gap-3 ${
                                  isActive
                                    ? "bg-primary/5 border-primary/40 shadow-sm font-medium text-foreground translate-x-1"
                                    : "bg-transparent border-transparent text-muted-foreground hover:bg-muted/30 hover:text-foreground"
                                }`}
                              >
                                <span className="font-mono text-[10px] mt-0.5 tabular-nums text-muted-foreground/80 shrink-0">
                                  {formatTimeVTT(cue.start).slice(3, -1)}
                                </span>
                                <span className="leading-relaxed">{cue.text}</span>
                              </button>
                            );
                          })
                        ) : (
                          <div className="flex flex-col items-center justify-center py-10 text-muted-foreground text-xs gap-1">
                            <Search className="size-5 text-muted-foreground/50" />
                            <span>No matching words found</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </TabsContent>

                {/* 🎥 B-Roll Tab */}
                <TabsContent value="broll" className="p-0 border-none bg-transparent">
                  <BRollPanel videoId={video.id} initialClips={video.brollClips as any} />
                </TabsContent>

                {/* ⚙️ Video Configuration Tab */}
                <TabsContent value="config" className="bg-card border rounded-2xl p-5 shadow-sm space-y-4">
                  <h4 className="text-sm font-semibold border-b pb-2">Production Metadata</h4>
                  <div className="grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <p className="text-muted-foreground">Voice</p>
                      <p className="font-semibold mt-0.5 text-foreground">{video.voiceName ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Avatar Profile</p>
                      <p className="font-semibold mt-0.5 text-foreground">{video.avatarName ?? "—"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Project Bucket</p>
                      <p className="font-semibold mt-0.5 text-foreground">{video.projectName ?? "None"}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Export Template</p>
                      <p className="font-semibold mt-0.5 text-foreground">
                        {VIDEO_ASPECT_RATIO_LABELS[video.aspectRatio as VideoAspectRatio]} ·{" "}
                        {VIDEO_RESOLUTION_LABELS[video.resolution as VideoResolution]}
                      </p>
                    </div>
                  </div>
                </TabsContent>

                {/* 📝 Original script tab */}
                <TabsContent value="script" className="bg-card border rounded-2xl p-5 shadow-sm space-y-3">
                  <div className="flex items-center justify-between border-b pb-2">
                    <h4 className="text-sm font-semibold">Source Script</h4>
                    {video.scriptId && video.scriptTitle && (
                      <Link
                        href={`/dashboard/scripts/${video.scriptId}`}
                        className="text-xs text-primary hover:underline flex items-center gap-1"
                      >
                        <FileText className="size-3.5" />
                        {video.scriptTitle}
                      </Link>
                    )}
                  </div>
                  <div className="max-h-[300px] overflow-y-auto custom-scrollbar">
                    <p className="whitespace-pre-wrap text-xs leading-relaxed text-muted-foreground">
                      {video.script || "No script provided."}
                    </p>
                  </div>
                </TabsContent>
              </Tabs>
            </div>
          </div>
        ) : (
          /* 🎥 Legacy single-column layout for Drafts/Pending/Failed States */
          <div className="space-y-6">
            <Card className="rounded-2xl shadow-sm">
              <CardHeader>
                <CardTitle>Preview</CardTitle>
                <CardDescription>
                  Created {formatDate(video.createdAt)} · Updated {formatDate(video.updatedAt)}
                </CardDescription>
              </CardHeader>
              <CardContent>
                {video.status === "pending" || video.status === "processing" ? (
                  activeJob ? (
                    <div className="flex aspect-video w-full max-w-3xl flex-col items-center justify-center gap-4 rounded-xl border bg-muted/10 p-8 text-center">
                      <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span className="capitalize">
                          {liveStage
                            ? STAGE_LABELS[liveStage] ?? liveStage
                            : activeJob.status === "running"
                            ? `Rendering: ${activeJob.progress}%`
                            : "Queued for generation..."}
                        </span>
                      </div>
                      {activeJob.status === "running" && (
                        <div className="w-full max-w-xs">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${activeJob.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <p className="max-w-md text-xs text-muted-foreground">
                        Your generation task is executing in the background. You can monitor progress here or check the job queue.
                      </p>
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
                      <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      <p className="text-sm font-medium">Preparing generation pipeline...</p>
                    </div>
                  )
                ) : video.previewStatus === "pending" || video.previewStatus === "processing" ? (
                  activeJob ? (
                    <div className="flex aspect-video w-full max-w-3xl flex-col items-center justify-center gap-4 rounded-xl border bg-muted/10 p-8 text-center">
                      <div className="flex items-center gap-2 rounded-full border bg-background px-4 py-2 text-sm text-muted-foreground shadow-sm">
                        <Loader2 className="size-4 animate-spin text-primary" />
                        <span className="capitalize">
                          {liveStage
                            ? STAGE_LABELS[liveStage] ?? liveStage
                            : activeJob.status === "running"
                            ? `Generating preview: ${activeJob.progress}%`
                            : "Queued for preview..."}
                        </span>
                      </div>
                      {activeJob.status === "running" && (
                        <div className="w-full max-w-xs">
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{ width: `${activeJob.progress}%` }}
                            />
                          </div>
                        </div>
                      )}
                      <p className="max-w-md text-xs text-muted-foreground">
                        Generating a short 3-second talking avatar preview.
                      </p>
                    </div>
                  ) : (
                    <div className="flex aspect-video w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
                      <Loader2 className="size-8 animate-spin text-muted-foreground" />
                      <p className="text-sm font-medium">Preparing preview pipeline...</p>
                    </div>
                  )
                ) : video.status === "failed" ? (
                  <div className="flex aspect-video w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center">
                    <Clapperboard className="size-10 text-destructive" />
                    <p className="text-sm font-medium text-destructive">Generation failed</p>
                    <p className="max-w-md text-xs text-muted-foreground">
                      The background pipeline encountered an error during render. Please check the job log or click Generate to retry.
                    </p>
                  </div>
                ) : (
                  <div className="flex flex-col gap-6 w-full max-w-3xl">
                    {video.hasPreview && (
                      <div className="space-y-2">
                        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                          3-second Avatar Preview
                        </p>
                        <video
                          src={`/api/videos/${encodeURIComponent(video.id)}?preview=true`}
                          controls
                          className="aspect-video w-full rounded-xl border bg-black shadow-sm"
                        />
                      </div>
                    )}

                    <div className="flex aspect-video w-full flex-col items-center justify-center gap-3 rounded-xl border border-dashed bg-muted/30 p-8 text-center">
                      <Clapperboard className="size-10 text-muted-foreground" />
                      <p className="text-sm font-medium">Draft — no full video output yet</p>
                      <p className="max-w-md text-xs text-muted-foreground">
                        Submit for generation when the pipeline is ready. Track jobs from the{" "}
                        <Link href="/dashboard/jobs" className="text-primary underline">
                          job queue
                        </Link>
                        .
                      </p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Configuration</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div>
                    <p className="text-muted-foreground">Voice</p>
                    <p className="font-medium">{video.voiceName ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avatar</p>
                    <p className="font-medium">{video.avatarName ?? "—"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Project</p>
                    <p className="font-medium">{video.projectName ?? "None"}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Format</p>
                    <p className="font-medium">
                      {VIDEO_ASPECT_RATIO_LABELS[video.aspectRatio as VideoAspectRatio]} ·{" "}
                      {VIDEO_RESOLUTION_LABELS[video.resolution as VideoResolution]}
                    </p>
                  </div>
                </CardContent>
              </Card>

              <Card className="rounded-2xl">
                <CardHeader>
                  <CardTitle className="text-base">Script</CardTitle>
                  {video.scriptId && video.scriptTitle ? (
                    <CardDescription>
                      Linked to{" "}
                      <Link href={`/dashboard/scripts/${video.scriptId}`} className="text-primary underline">
                        {video.scriptTitle}
                      </Link>
                    </CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {video.script || "No script provided."}
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </DashboardPageShell>
  );
}
