import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { ApiKeysView } from "@/features/api-keys/views/api-keys-view";

export const metadata: Metadata = { title: "API Keys" };

export default async function ApiPage() {
  await Promise.all([
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
    prefetch(trpc.apiKeys.list.queryOptions()),
  ]);
  return (
    <HydrateClient>
      <ApiKeysView />
    </HydrateClient>
  );
}
