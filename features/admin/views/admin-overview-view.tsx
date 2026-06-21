"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Activity, Building2, Users, Video } from "lucide-react";
import { useTRPC } from "@/trpc/client";

function StatCard({ label, value, icon: Icon }: { label: string; value: number; icon: React.ElementType }) {
  return (
    <div className="rounded-xl border bg-card p-5 space-y-2">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        <Icon className="size-3.5" />
        {label}
      </div>
      <p className="text-3xl font-bold tracking-tight">{value.toLocaleString()}</p>
    </div>
  );
}

function formatDate(v: string) {
  return new Intl.DateTimeFormat(undefined, { dateStyle: "medium" }).format(new Date(v));
}

const STATUS_COLORS: Record<string, string> = {
  queued: "bg-amber-50 text-amber-700",
  running: "bg-blue-50 text-blue-700",
  completed: "bg-green-50 text-green-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-muted text-muted-foreground",
};

export function AdminOverviewView() {
  const trpc = useTRPC();
  const { data: stats } = useSuspenseQuery(trpc.admin.getStats.queryOptions());
  const { data: workspaces } = useSuspenseQuery(trpc.admin.listWorkspaces.queryOptions());
  const { data: jobs } = useSuspenseQuery(trpc.admin.listJobs.queryOptions({}));

  return (
    <div className="space-y-8 max-w-6xl">
      <div>
        <h1 className="text-lg font-semibold tracking-tight">Platform Overview</h1>
        <p className="text-sm text-muted-foreground mt-1">Read-only system dashboard.</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        <StatCard label="Workspaces" value={stats.totalWorkspaces} icon={Building2} />
        <StatCard label="Users" value={stats.totalUsers} icon={Users} />
        <StatCard label="Videos" value={stats.totalVideos} icon={Video} />
        <StatCard label="Active jobs" value={stats.activeJobs} icon={Activity} />
      </div>

      {/* Workspaces */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Workspaces ({workspaces.length})</h2>
        <div className="rounded-2xl border divide-y overflow-hidden">
          {workspaces.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No workspaces yet.</p>
          ) : (
            workspaces.map((ws) => (
              <div key={ws.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{ws.name}</p>
                  <p className="text-xs text-muted-foreground">{ws.ownerEmail ?? ws.id.slice(0, 8)}</p>
                </div>
                <span className="text-xs text-muted-foreground">{ws.memberCount} members</span>
                <span className="text-xs text-muted-foreground">{formatDate(ws.createdAt)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Jobs */}
      <div className="space-y-3">
        <h2 className="text-sm font-semibold tracking-tight">Recent jobs ({jobs.length})</h2>
        <div className="rounded-2xl border divide-y overflow-hidden">
          {jobs.length === 0 ? (
            <p className="px-4 py-6 text-sm text-muted-foreground">No jobs yet.</p>
          ) : (
            jobs.map((job) => (
              <div key={job.id} className="flex items-center gap-4 px-4 py-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium truncate">{job.title}</p>
                  <p className="text-xs font-mono text-muted-foreground">{job.type}</p>
                </div>
                <span className={`inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ${STATUS_COLORS[job.status] ?? "bg-muted text-muted-foreground"}`}>
                  {job.status}
                </span>
                {job.status === "running" && (
                  <div className="w-20 h-1.5 overflow-hidden rounded-full bg-muted">
                    <div className="h-full bg-primary transition-all" style={{ width: `${job.progress}%` }} />
                  </div>
                )}
                <span className="text-xs text-muted-foreground shrink-0">{formatDate(job.created_at)}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
