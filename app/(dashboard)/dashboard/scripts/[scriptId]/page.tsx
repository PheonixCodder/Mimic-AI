import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { ScriptEditView } from "@/features/scripts/views/script-edit-view";
import { HydrateClient, getTRPCCaller, prefetch, trpc } from "@/trpc/server";

type ScriptDetailPageProps = {
  params: Promise<{ scriptId: string }>;
};

export async function generateMetadata({
  params,
}: ScriptDetailPageProps): Promise<Metadata> {
  const { scriptId } = await params;

  try {
    const caller = await getTRPCCaller();
    const script = await caller.scripts.getById({ id: scriptId });
    return { title: script.title };
  } catch {
    return { title: "Script" };
  }
}

export default async function ScriptDetailPage({ params }: ScriptDetailPageProps) {
  const { scriptId } = await params;
  const caller = await getTRPCCaller();

  try {
    await caller.scripts.getById({ id: scriptId });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      notFound();
    }

    throw error;
  }

  await Promise.all([
    prefetch(trpc.scripts.getById.queryOptions({ id: scriptId })),
    prefetch(trpc.projects.list.queryOptions()),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <ScriptEditView scriptId={scriptId} />
    </HydrateClient>
  );
}
