import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ExperimentDetailView } from "@/features/experiments/views/experiment-detail-view";

export const metadata: Metadata = { title: "Experiment" };

export default async function ExperimentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await Promise.all([
    prefetch(trpc.experiments.getById.queryOptions({ id })),
    prefetch(trpc.voices.getAll.queryOptions({})),
    prefetch(trpc.avatars.getAll.queryOptions({})),
    prefetch(trpc.scripts.list.queryOptions({})),
  ]);
  return (
    <HydrateClient>
      <ExperimentDetailView experimentId={id} />
    </HydrateClient>
  );
}
