"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { Users } from "lucide-react";

import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { AvatarsList } from "@/features/avatars/components/avatars-list";
import { AvatarsToolbar } from "@/features/avatars/components/avatars-toolbar";
import { avatarsSearchParams } from "@/features/avatars/lib/params";
import { useTRPC } from "@/trpc/client";

export function AvatarsView() {
  const trpc = useTRPC();
  const [query] = useQueryState("query", avatarsSearchParams.query);
  const { data } = useSuspenseQuery(
    trpc.avatars.getAll.queryOptions({ query: query || undefined }),
  );
  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);

  return (
    <DashboardPageShell
      title="Avatars"
      description="Browse built-in portraits or upload custom avatars for video generation."
      icon={Users}
      breadcrumbs={[{ label: "Avatars" }]}
    >
      <div className="space-y-10">
        <AvatarsToolbar canCreate={canWrite} />
        <AvatarsList
          title="Team Avatars"
          avatars={data.custom}
          canDelete={canWrite}
        />
        <AvatarsList title="Built-in Avatars" avatars={data.system} />
      </div>
    </DashboardPageShell>
  );
}
