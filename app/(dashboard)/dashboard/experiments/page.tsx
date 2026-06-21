import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ExperimentsView } from "@/features/experiments/views/experiments-view";

export const metadata: Metadata = { title: "Experiments" };

export default async function ExperimentsPage() {
  await Promise.all([
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
    prefetch(trpc.experiments.list.queryOptions()),
  ]);
  return (
    <HydrateClient>
      <ExperimentsView />
    </HydrateClient>
  );
}
