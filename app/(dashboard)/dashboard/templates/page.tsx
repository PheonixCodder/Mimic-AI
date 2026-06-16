import type { Metadata } from "next";

import { TemplatesView } from "@/features/templates/views/templates-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Templates",
};

export default async function TemplatesPage() {
  await Promise.all([
    prefetch(trpc.templates.list.queryOptions({})),
    prefetch(trpc.brandKits.list.queryOptions({})),
    prefetch(trpc.voices.getAll.queryOptions({})),
    prefetch(trpc.avatars.getAll.queryOptions({})),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <TemplatesView />
    </HydrateClient>
  );
}
