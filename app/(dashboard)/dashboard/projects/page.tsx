import type { Metadata } from "next";

import { ProjectsView } from "@/features/projects/views/projects-view";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";

export const metadata: Metadata = {
  title: "Projects",
};

export default async function ProjectsPage() {
  await Promise.all([
    prefetch(trpc.projects.list.queryOptions()),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <ProjectsView />
    </HydrateClient>
  );
}
