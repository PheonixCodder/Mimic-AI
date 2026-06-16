"use client";

import { useState } from "react";
import { useMutation, useQuery, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  Loader2,
  Play,
  Workflow,
  XCircle,
  Zap,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { JobCard } from "@/features/jobs/components/job-card";
import { JobsToolbar } from "@/features/jobs/components/jobs-toolbar";
import { JOB_TYPES, type JobStatus, type JobType } from "@/features/jobs/lib/schemas";
import { useTRPC } from "@/trpc/client";
import type { Job } from "@/trpc/routers/jobs";

// ---------------------------------------------------------------------------
// Mock job titles for the "Simulate" button
// ---------------------------------------------------------------------------

const MOCK_TITLES: Record<JobType, string[]> = {
  video_render: ["Product Demo Render", "Onboarding Tutorial", "Social Media Clip"],
  voice_clone: ["Sarah's Voice Clone", "Corporate Narrator", "Brand Ambassador"],
  avatar_generate: ["CEO Digital Twin", "Support Agent Avatar", "Marketing Persona"],
  video_export: ["1080p MP4 Export", "4K WebM Export", "720p Social Cut"],
  caption_generate: ["English Captions", "Multi-language Subtitles", "Accessibility Track"],
  video_preview: ["Avatar Speech Preview", "3-second Lip-sync Test", "Quick Layout Check"],
  clip_generate: ["Cinematic Sunset Clip", "Abstract Background Loop", "Nature B-roll"],
};

function pickRandomTitle(type: JobType): string {
  const titles = MOCK_TITLES[type];
  return titles[Math.floor(Math.random() * titles.length)];
}

// ---------------------------------------------------------------------------
// Stats cards
// ---------------------------------------------------------------------------

type StatCardProps = {
  label: string;
  value: number;
  icon: React.ElementType;
  color: string;
};

function StatCard({ label, value, icon: Icon, color }: StatCardProps) {
  return (
    <Card className="rounded-xl">
      <CardContent className="flex items-center gap-4 p-4">
        <div className={`flex size-10 items-center justify-center rounded-lg ${color}`}>
          <Icon className="size-5 text-white" />
        </div>
        <div>
          <p className="text-2xl font-bold tabular-nums">{value}</p>
          <p className="text-xs text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// JobsView
// ---------------------------------------------------------------------------

export function JobsView() {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);
  const canAdmin = ["owner", "admin"].includes(workspace.role);

  // Filters (client state)
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");

  // Fetch jobs with auto-polling when active jobs exist
  const queryInput = {
    ...(statusFilter !== "all" && { status: statusFilter as JobStatus }),
    ...(typeFilter !== "all" && { type: typeFilter as JobType }),
    ...(search.trim() && { search: search.trim() }),
  };

  const { data: jobs, isLoading } = useQuery({
    ...trpc.jobs.list.queryOptions(queryInput),
    refetchInterval: (query) => {
      const hasActive = query.state.data?.some(
        (j: Job) => j.status === "queued" || j.status === "running",
      );
      return hasActive ? 2500 : false;
    },
  });

  // Mock job creation
  const createMockMutation = useMutation(
    trpc.jobs.createMock.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries({
          queryKey: trpc.jobs.list.queryKey(),
        });
        toast.success("Mock job created");
      },
      onError: (e) => toast.error(e.message ?? "Failed to create mock job"),
    }),
  );

  function handleSimulate() {
    const randomType = JOB_TYPES[Math.floor(Math.random() * JOB_TYPES.length)];
    createMockMutation.mutate({
      type: randomType,
      title: pickRandomTitle(randomType),
    });
  }

  // Computed stats
  const allJobs = jobs ?? [];
  const totalJobs = allJobs.length;
  const runningJobs = allJobs.filter((j) => j.status === "running" || j.status === "queued").length;
  const completedJobs = allJobs.filter((j) => j.status === "completed").length;
  const failedJobs = allJobs.filter((j) => j.status === "failed").length;

  return (
    <DashboardPageShell
      title="Jobs"
      description="Monitor async generation jobs and progress."
      icon={Workflow}
      breadcrumbs={[{ label: "Jobs" }]}
    >
      <div className="space-y-6">
        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="Total Jobs" value={totalJobs} icon={Workflow} color="bg-slate-600" />
          <StatCard label="Active" value={runningJobs} icon={Play} color="bg-blue-600" />
          <StatCard label="Completed" value={completedJobs} icon={CheckCircle2} color="bg-emerald-600" />
          <StatCard label="Failed" value={failedJobs} icon={XCircle} color="bg-red-500" />
        </div>

        {/* Toolbar */}
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <JobsToolbar
            search={search}
            onSearchChange={setSearch}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            typeFilter={typeFilter}
            onTypeFilterChange={setTypeFilter}
          />

          {canWrite && (
            <Button
              variant="default"
              size="sm"
              className="gap-1.5 shrink-0"
              onClick={handleSimulate}
              disabled={createMockMutation.isPending}
            >
              {createMockMutation.isPending ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Zap className="size-4" />
              )}
              Simulate Job
            </Button>
          )}
        </div>

        {/* Job list */}
        {isLoading ? (
          <div className="flex h-40 items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : allJobs.length === 0 ? (
          <Empty className="border">
            <EmptyHeader>
              <EmptyMedia variant="icon">
                <Workflow />
              </EmptyMedia>
              <EmptyTitle>No jobs found</EmptyTitle>
              <EmptyDescription>
                {statusFilter !== "all" || typeFilter !== "all" || search
                  ? "Try adjusting your filters to see more results."
                  : "Jobs will appear here as you generate videos, clone voices, and create avatars."}
              </EmptyDescription>
            </EmptyHeader>
          </Empty>
        ) : (
          <div className="space-y-3">
            {allJobs.map((job: Job) => (
              <JobCard
                key={job.id}
                id={job.id}
                type={job.type}
                title={job.title}
                status={job.status}
                progress={job.progress}
                resourceId={job.resourceId}
                resourceType={job.resourceType}
                errorMessage={job.errorMessage}
                durationMs={job.durationMs}
                createdAt={job.createdAt}
                startedAt={job.startedAt}
                completedAt={job.completedAt}
                canWrite={canWrite}
                canAdmin={canAdmin}
              />
            ))}
          </div>
        )}
      </div>
    </DashboardPageShell>
  );
}
