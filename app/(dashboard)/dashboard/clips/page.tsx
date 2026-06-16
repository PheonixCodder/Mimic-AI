import type { Metadata } from "next";

import { ClipsView } from "@/features/clips/views/clips-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "AI Clips",
};

export default async function ClipsPage() {
  await Promise.all([
    prefetch(trpc.clips.list.queryOptions({})),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <ClipsView />
    </HydrateClient>
  );
}
