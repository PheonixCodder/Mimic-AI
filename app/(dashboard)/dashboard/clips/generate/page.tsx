import type { Metadata } from "next";

import { ClipGenerateView } from "@/features/clips/views/clip-generate-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Generate AI Clip",
};

export default async function ClipGeneratePage() {
  await Promise.all([
    prefetch(trpc.projects.list.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <ClipGenerateView />
    </HydrateClient>
  );
}
