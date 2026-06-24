import type { Metadata } from "next";
import { AgentView } from "@/features/agent/views/agent-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Co-Producer AI Agent",
};

export default async function AgentPage() {
  await Promise.all([
    prefetch(trpc.agent.listSessions.queryOptions()),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <AgentView />
    </HydrateClient>
  );
}
