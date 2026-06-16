import type { Metadata } from "next";

import { VideosView } from "@/features/videos/views/videos-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Videos",
};

export default async function VideosPage() {
  await Promise.all([
    prefetch(trpc.videos.list.queryOptions({})),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <VideosView />
    </HydrateClient>
  );
}
