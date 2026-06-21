import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { AdminOverviewView } from "@/features/admin/views/admin-overview-view";

export const metadata: Metadata = { title: "Admin" };

export default async function AdminPage() {
  await Promise.all([
    prefetch(trpc.admin.getStats.queryOptions()),
    prefetch(trpc.admin.listWorkspaces.queryOptions()),
    prefetch(trpc.admin.listJobs.queryOptions({})),
  ]);
  return (
    <HydrateClient>
      <AdminOverviewView />
    </HydrateClient>
  );
}
