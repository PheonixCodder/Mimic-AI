import type { Metadata } from "next";

import { VoicesView } from "@/features/voices/views/voices-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Voices",
};

export default async function VoicesPage() {
  await Promise.all([
    prefetch(trpc.voices.getAll.queryOptions({})),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <VoicesView />
    </HydrateClient>
  );
}
