import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { AvatarTwinView } from "@/features/avatars/views/avatar-twin-view";

export const metadata: Metadata = { title: "Digital Twin" };

export default async function AvatarTwinPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await Promise.all([
    prefetch(trpc.avatars.getById.queryOptions({ id })),
    prefetch(trpc.digitalTwins.get.queryOptions({ avatarId: id })),
  ]);
  return (
    <HydrateClient>
      <AvatarTwinView avatarId={id} />
    </HydrateClient>
  );
}
