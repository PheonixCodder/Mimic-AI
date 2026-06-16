import type { Metadata } from "next";

import { JobsView } from "@/features/jobs/views/jobs-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Jobs",
};

export default async function JobsPage() {
  await Promise.all([
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
    prefetch(trpc.jobs.list.queryOptions({})),
  ]);

  return (
    <HydrateClient>
      <JobsView />
    </HydrateClient>
  );
}
