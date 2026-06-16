"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { Clapperboard } from "lucide-react";

import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { VideosList } from "@/features/videos/components/videos-list";
import { VideosToolbar } from "@/features/videos/components/videos-toolbar";
import { videosSearchParams } from "@/features/videos/lib/params";
import { useTRPC } from "@/trpc/client";

export function VideosView() {
  const trpc = useTRPC();
  const [query] = useQueryState("query", videosSearchParams.query);
  const { data: videos } = useSuspenseQuery(
    trpc.videos.list.queryOptions({ query: query || undefined }),
  );
  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);

  return (
    <DashboardPageShell
      title="Videos"
      description="Create, review, and export AI-generated videos."
      icon={Clapperboard}
      breadcrumbs={[{ label: "Videos" }]}
    >
      <div className="space-y-6">
        <VideosToolbar canCreate={canWrite} />
        <VideosList videos={videos} canDelete={canWrite} />
      </div>
    </DashboardPageShell>
  );
}
