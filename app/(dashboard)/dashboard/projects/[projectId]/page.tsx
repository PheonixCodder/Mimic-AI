import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { ProjectDetailView } from "@/features/projects/views/project-detail-view";
import { HydrateClient, getTRPCCaller, prefetch, trpc } from "@/trpc/server";

type ProjectDetailPageProps = {
  params: Promise<{ projectId: string }>;
};

export async function generateMetadata({
  params,
}: ProjectDetailPageProps): Promise<Metadata> {
  const { projectId } = await params;

  try {
    const caller = await getTRPCCaller();
    const project = await caller.projects.getById({ id: projectId });
    return { title: project.name };
  } catch {
    return { title: "Project" };
  }
}

export default async function ProjectDetailPage({ params }: ProjectDetailPageProps) {
  const { projectId } = await params;
  const caller = await getTRPCCaller();

  try {
    await caller.projects.getById({ id: projectId });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      notFound();
    }

    throw error;
  }

  await prefetch(trpc.projects.getById.queryOptions({ id: projectId }));

  return (
    <HydrateClient>
      <ProjectDetailView projectId={projectId} />
    </HydrateClient>
  );
}
