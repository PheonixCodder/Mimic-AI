import type { Metadata } from "next";

import { ScriptsView } from "@/features/scripts/views/scripts-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Scripts",
};

export default async function ScriptsPage() {
  await Promise.all([
    prefetch(trpc.scripts.list.queryOptions({})),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <ScriptsView />
    </HydrateClient>
  );
}
