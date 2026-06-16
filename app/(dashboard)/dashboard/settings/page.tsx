import type { Metadata } from "next";

import { SettingsView } from "@/features/settings/views/settings-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Settings",
};

export default async function SettingsPage() {
  await Promise.all([
    prefetch(trpc.profile.getMe.queryOptions()),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
    prefetch(trpc.workspaces.getMembers.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <SettingsView />
    </HydrateClient>
  );
}
