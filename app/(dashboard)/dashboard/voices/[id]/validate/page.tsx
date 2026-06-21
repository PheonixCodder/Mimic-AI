import type { Metadata } from "next";
import { HydrateClient, prefetch, trpc } from "@/trpc/server";
import { VoiceValidateView } from "@/features/voices/views/voice-validate-view";

export const metadata: Metadata = { title: "Validate Voice" };

export default async function VoiceValidatePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  await prefetch(trpc.voices.getById.queryOptions({ id }));
  return (
    <HydrateClient>
      <VoiceValidateView voiceId={id} />
    </HydrateClient>
  );
}
