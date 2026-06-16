import type { Metadata } from "next";

import { DashboardView } from "@/features/dashboard/views/dashboard-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  await prefetch(trpc.workspaces.getCurrent.queryOptions());

  return (
    <HydrateClient>
      <DashboardView />
    </HydrateClient>
  );
}
