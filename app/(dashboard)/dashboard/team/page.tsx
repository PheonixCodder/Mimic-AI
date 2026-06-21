import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { TeamView } from "@/features/team/views/team-view";

export const metadata: Metadata = { title: "Team" };

export default async function TeamPage() {
  await Promise.all([
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
    prefetch(trpc.workspaces.getMembers.queryOptions()),
  ]);
  return (
    <HydrateClient>
      <TeamView />
    </HydrateClient>
  );
}
