import type { Metadata } from "next";

import { VideoWizardView } from "@/features/videos/views/video-wizard-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Generate video",
};

type NewVideoPageProps = {
  searchParams: Promise<{ scriptId?: string; templateId?: string }>;
};

export default async function NewVideoPage({ searchParams }: NewVideoPageProps) {
  const { scriptId, templateId } = await searchParams;

  const prefetches = [
    prefetch(trpc.projects.list.queryOptions()),
    prefetch(trpc.scripts.list.queryOptions({})),
    prefetch(trpc.voices.getAll.queryOptions({})),
    prefetch(trpc.avatars.getAll.queryOptions({})),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ];

  if (scriptId) {
    prefetches.push(
      prefetch(trpc.scripts.getById.queryOptions({ id: scriptId })),
    );
  }

  if (templateId) {
    prefetches.push(
      prefetch(trpc.templates.getById.queryOptions({ id: templateId })),
    );
  }

  await Promise.all(prefetches);

  return (
    <HydrateClient>
      <VideoWizardView scriptId={scriptId} templateId={templateId} />
    </HydrateClient>
  );
}
