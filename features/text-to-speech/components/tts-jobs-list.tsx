"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Play, Volume2, VolumeX, Download, Video, Pause } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";

import { JobStatusBadge } from "@/features/jobs/components/job-status-badge";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { useTRPC } from "@/trpc/client";
import type { Job } from "@/trpc/routers/jobs";

export function TTSJobsList() {
  const trpc = useTRPC();
  const { data: jobs } = useSuspenseQuery(
    trpc.jobs.list.queryOptions({ type: "voice_clone" })
  );

  if (jobs.length === 0) {
    return (
      <div className="flex h-full items-center justify-center p-4">
        <Empty>
          <EmptyMedia>
            <Volume2 className="size-8 text-muted-foreground" />
          </EmptyMedia>
          <EmptyHeader>
            <EmptyTitle>No TTS generations yet</EmptyTitle>
            <EmptyDescription>
              Your generated audio files will appear here
            </EmptyDescription>
          </EmptyHeader>
        </Empty>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 p-4">
      {jobs.map((job) => (
        <TTSJobCard key={job.id} job={job} />
      ))}
    </div>
  );
}

function TTSJobCard({ job }: { job: Job }) {
  const isCompleted = job.status === "completed";
  const metadata = job.metadata as {
    voice_name?: string;
    text?: string;
  } | null;

  // Audio playback for completed jobs
  const audioSrc = isCompleted && job.resourceId 
    ? `/api/media/${encodeURIComponent(job.resourceId)}` 
    : null;
  const { isPlaying, isLoading, togglePlay } = useAudioPlayback(audioSrc || "");

  const handleDownload = () => {
    if (audioSrc) {
      const link = document.createElement('a');
      link.href = audioSrc;
      link.download = `tts-${job.id}.wav`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  return (
    <Card className="border border-border/50">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 mb-2">
              <JobStatusBadge status={job.status} />
              {metadata?.voice_name && (
                <Badge variant="secondary" className="text-xs">
                  {metadata.voice_name}
                </Badge>
              )}
            </div>
            
            <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
              {metadata?.text || job.title}
            </p>
            
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>{new Date(job.createdAt).toLocaleTimeString()}</span>
              {job.durationMs && (
                <span>• {(job.durationMs / 1000).toFixed(1)}s</span>
              )}
            </div>
          </div>
          
          <div className="flex items-center gap-1">
            {isCompleted && job.resourceId ? (
              <>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0"
                  onClick={togglePlay}
                  disabled={isLoading}
                  title={isPlaying ? "Pause audio" : "Play audio"}
                >
                  {isLoading ? (
                    <div className="size-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                  ) : isPlaying ? (
                    <Pause className="size-4" />
                  ) : (
                    <Play className="size-4" />
                  )}
                </Button>
                <Button 
                  size="sm" 
                  variant="ghost" 
                  className="h-8 w-8 p-0"
                  onClick={handleDownload}
                  title="Download audio"
                >
                  <Download className="size-4" />
                </Button>
                <Link href="/dashboard/videos/new">
                  <Button size="sm" variant="ghost" className="h-8 w-8 p-0" title="Create video with this audio">
                    <Video className="size-4" />
                  </Button>
                </Link>
              </>
            ) : (
              <div className="flex items-center justify-center size-8">
                <VolumeX className="size-4 text-muted-foreground" />
              </div>
            )}
          </div>
        </div>
        
        {job.status === "running" && (
          <div className="mt-3">
            <div className="flex items-center justify-between text-xs text-muted-foreground mb-1">
              <span>Progress</span>
              <span>{job.progress}%</span>
            </div>
            <div className="h-1.5 bg-muted rounded-full overflow-hidden">
              <div 
                className="h-full bg-primary transition-all duration-300 ease-out"
                style={{ width: `${job.progress}%` }}
              />
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}