import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { TRPCError } from "@trpc/server";

import { VideoDetailView } from "@/features/videos/views/video-detail-view";
import { HydrateClient, getTRPCCaller, prefetch, trpc } from "@/trpc/server";

type VideoDetailPageProps = {
  params: Promise<{ videoId: string }>;
};

export async function generateMetadata({
  params,
}: VideoDetailPageProps): Promise<Metadata> {
  const { videoId } = await params;

  try {
    const caller = await getTRPCCaller();
    const video = await caller.videos.getById({ id: videoId });
    return { title: video.title };
  } catch {
    return { title: "Video" };
  }
}

export default async function VideoDetailPage({ params }: VideoDetailPageProps) {
  const { videoId } = await params;
  const caller = await getTRPCCaller();

  try {
    await caller.videos.getById({ id: videoId });
  } catch (error) {
    if (error instanceof TRPCError && error.code === "NOT_FOUND") {
      notFound();
    }

    throw error;
  }

  await Promise.all([
    prefetch(trpc.videos.getById.queryOptions({ id: videoId })),
    prefetch(trpc.workspaces.getCurrent.queryOptions()),
  ]);

  return (
    <HydrateClient>
      <VideoDetailView videoId={videoId} />
    </HydrateClient>
  );
}
