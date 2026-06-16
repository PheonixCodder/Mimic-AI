import type { Metadata } from "next";

import { AvatarsView } from "@/features/avatars/views/avatars-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Avatars",
};

export default async function AvatarsPage() {
  await Promise.all([
    prefetch(trpc.avatars.getAll.queryOptions({})),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <AvatarsView />
    </HydrateClient>
  );
}
