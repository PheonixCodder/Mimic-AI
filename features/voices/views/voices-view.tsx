"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { useQueryState } from "nuqs";
import { Mic } from "lucide-react";

import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { VoicesList } from "@/features/voices/components/voices-list";
import { VoicesToolbar } from "@/features/voices/components/voices-toolbar";
import { voicesSearchParams } from "@/features/voices/lib/params";
import { useTRPC } from "@/trpc/client";

export function VoicesView() {
  const trpc = useTRPC();
  const [query] = useQueryState("query", voicesSearchParams.query);
  const { data } = useSuspenseQuery(
    trpc.voices.getAll.queryOptions({ query: query || undefined }),
  );
  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);

  return (
    <DashboardPageShell
      title="Voices"
      description="Browse built-in voices or clone custom ones for your workspace."
      icon={Mic}
      breadcrumbs={[{ label: "Voices" }]}
    >
      <div className="space-y-10">
        <VoicesToolbar canCreate={canWrite} />
        <VoicesList
          title="Team Voices"
          voices={data.custom}
          canDelete={canWrite}
        />
        <VoicesList title="Built-in Voices" voices={data.system} />
      </div>
    </DashboardPageShell>
  );
}
