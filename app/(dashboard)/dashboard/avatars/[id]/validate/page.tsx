import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { AvatarValidateView } from "@/features/avatars/views/avatar-validate-view";

export const metadata: Metadata = { title: "Validate Avatar" };

export default async function AvatarValidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await prefetch(trpc.avatars.getById.queryOptions({ id }));
  return (
    <HydrateClient>
      <AvatarValidateView avatarId={id} />
    </HydrateClient>
  );
}
