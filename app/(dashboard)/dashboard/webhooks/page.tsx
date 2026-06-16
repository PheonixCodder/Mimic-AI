import type { Metadata } from "next";

import { WebhooksView } from "@/features/webhooks/views/webhooks-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Webhooks",
};

export default async function WebhooksPage() {
  await Promise.all([
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
    prefetch(trpc.webhooks.list.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <WebhooksView />
    </HydrateClient>
  );
}
