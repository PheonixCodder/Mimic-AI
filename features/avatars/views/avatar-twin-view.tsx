"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { useTRPC } from "@/trpc/client";

const SPEAKING_STYLES = [
  { value: "conversational", label: "Conversational" },
  { value: "formal", label: "Formal" },
  { value: "casual", label: "Casual" },
  { value: "authoritative", label: "Authoritative" },
  { value: "storytelling", label: "Storytelling" },
] as const;

const TONES = [
  { value: "professional", label: "Professional" },
  { value: "friendly", label: "Friendly" },
  { value: "energetic", label: "Energetic" },
  { value: "calm", label: "Calm" },
  { value: "inspirational", label: "Inspirational" },
] as const;

type SpeakingStyle = (typeof SPEAKING_STYLES)[number]["value"];
type Tone = (typeof TONES)[number]["value"];

export function AvatarTwinView({ avatarId }: { avatarId: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: avatar } = useSuspenseQuery(trpc.avatars.getById.queryOptions({ id: avatarId }));
  const { data: twin } = useQuery(trpc.digitalTwins.get.queryOptions({ avatarId }));

  const [speakingStyle, setSpeakingStyle] = useState<SpeakingStyle>("conversational");
  const [tone, setTone] = useState<Tone>("professional");
  const [personality, setPersonality] = useState("");
  const [vocabulary, setVocabulary] = useState("");

  // Pre-fill when twin loads
  useEffect(() => {
    if (twin) {
      setSpeakingStyle(twin.speakingStyle as SpeakingStyle);
      setTone(twin.tone as Tone);
      setPersonality(twin.personality ?? "");
      setVocabulary(twin.vocabulary ?? "");
    }
  }, [twin]);

  const upsertMutation = useMutation(
    trpc.digitalTwins.upsert.mutationOptions({
      onSuccess: () => {
        toast.success("Digital twin saved");
        queryClient.invalidateQueries(trpc.digitalTwins.get.queryFilter());
      },
      onError: (e: { message?: string }) => toast.error(e.message ?? "Failed to save"),
    })
  );

  if (avatar.variant !== "custom") {
    router.replace("/dashboard/avatars");
    return null;
  }

  return (
    <DashboardPageShell
      title="Digital Twin"
      description="Define your avatar's persistent speaking style and brand personality."
      icon={Brain}
      breadcrumbs={[
        { label: "Avatars", href: "/dashboard/avatars" },
        { label: avatar.name },
        { label: "Digital Twin" },
      ]}
    >
      <div className="max-w-xl space-y-6">
        {/* Avatar preview */}
        <div className="flex items-center gap-3">
          <img
            src={`/api/avatars/${encodeURIComponent(avatarId)}`}
            alt={avatar.name}
            className="size-14 rounded-full object-cover border"
          />
          <div>
            <p className="text-sm font-semibold">{avatar.name}</p>
            <p className="text-xs text-muted-foreground">
              {twin ? "Twin configured" : "Not configured yet"}
            </p>
          </div>
        </div>

        {/* Speaking style */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Speaking style</p>
          <Select value={speakingStyle} onValueChange={(v) => setSpeakingStyle((v ?? "conversational") as SpeakingStyle)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {SPEAKING_STYLES.map((s) => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Tone */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Tone</p>
          <Select value={tone} onValueChange={(v) => setTone((v ?? "professional") as Tone)}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {TONES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>

        {/* Personality */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Personality <span className="text-muted-foreground font-normal">(optional)</span></p>
          <Textarea
            placeholder="e.g. Warm, data-driven, uses concrete examples, avoids corporate speak"
            value={personality}
            onChange={(e) => setPersonality(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        {/* Vocabulary */}
        <div className="space-y-1.5">
          <p className="text-sm font-medium">Vocabulary preferences <span className="text-muted-foreground font-normal">(optional)</span></p>
          <Textarea
            placeholder="e.g. Short sentences, avoid jargon, prefer active voice"
            value={vocabulary}
            onChange={(e) => setVocabulary(e.target.value)}
            rows={3}
            className="resize-none"
          />
        </div>

        <Button
          className="w-full"
          onClick={() => upsertMutation.mutate({ avatarId, speakingStyle, tone, personality: personality || null, vocabulary: vocabulary || null })}
          disabled={upsertMutation.isPending}
        >
          {upsertMutation.isPending ? "Saving…" : "Save digital twin"}
        </Button>
      </div>
    </DashboardPageShell>
  );
}
