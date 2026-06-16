import type { Metadata } from "next";

import { ScriptCreateView } from "@/features/scripts/views/script-create-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "New script",
};

export default async function NewScriptPage() {
  await Promise.all([
    prefetch(trpc.projects.list.queryOptions()),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <ScriptCreateView />
    </HydrateClient>
  );
}
