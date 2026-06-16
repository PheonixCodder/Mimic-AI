"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { Film } from "lucide-react";

import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { ClipsList } from "@/features/clips/components/clips-list";
import { ClipsToolbar } from "@/features/clips/components/clips-toolbar";
import { clipsSearchParams } from "@/features/clips/lib/params";
import { useTRPC } from "@/trpc/client";

export function ClipsView() {
  const trpc = useTRPC();
  const [query] = useQueryState("query", clipsSearchParams.query);

  const { data: clips } = useSuspenseQuery(
    trpc.clips.list.queryOptions(
      { query: query || undefined },
      {
        refetchInterval: (queryResult) => {
          const hasActiveJobs = queryResult?.state?.data?.some(
            (clip) => clip.status === "pending" || clip.status === "processing"
          );
          return hasActiveJobs ? 2000 : false;
        },
      },
    ),
  );

  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);

  return (
    <DashboardPageShell
      title="AI Clips"
      description="Generate short AI video clips for your productions."
      icon={Film}
      breadcrumbs={[{ label: "Clips" }]}
    >
      <div className="space-y-6">
        <ClipsToolbar canCreate={canWrite} />
        <ClipsList clips={clips} canDelete={canWrite} />
      </div>
    </DashboardPageShell>
  );
}
