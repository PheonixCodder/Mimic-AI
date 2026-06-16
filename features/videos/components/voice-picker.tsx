"use client";

import { Pause, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import {
  VOICE_CATEGORY_LABELS,
  type VoiceCategory,
} from "@/features/voices/data/voice-categories";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import type { Voice } from "@/trpc/routers/voices";
import { cn } from "@/lib/utils";

type VoicePickerProps = {
  voices: Voice[];
  value: string | null;
  onChange: (voiceId: string) => void;
};

function VoicePickerItem({
  voice,
  selected,
  onSelect,
}: {
  voice: Voice;
  selected: boolean;
  onSelect: () => void;
}) {
  const audioSrc = `/api/voices/${encodeURIComponent(voice.id)}`;
  const { isPlaying, isLoading, togglePlay } = useAudioPlayback(audioSrc);
  const categoryLabel =
    VOICE_CATEGORY_LABELS[voice.category as VoiceCategory] ?? voice.category;

  return (
    <div
      className={cn(
        "flex w-full items-center gap-3 rounded-xl border p-3 transition-colors",
        selected ? "border-primary bg-primary/5" : "hover:bg-muted/50",
      )}
    >
      <button
        type="button"
        onClick={onSelect}
        className="flex min-w-0 flex-1 items-center gap-3 text-left"
      >
        <VoiceAvatar
          seed={voice.id}
          name={voice.name}
          className="size-10 border border-white shadow-xs"
        />
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium">{voice.name}</p>
          <p className="truncate text-xs text-muted-foreground">{categoryLabel}</p>
        </div>
      </button>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="shrink-0 rounded-full"
        onClick={togglePlay}
        disabled={isLoading}
        aria-label={isPlaying ? "Pause preview" : "Play preview"}
      >
        {isLoading ? (
          <Spinner className="size-4" />
        ) : isPlaying ? (
          <Pause className="size-4" />
        ) : (
          <Play className="size-4" />
        )}
      </Button>
    </div>
  );
}

export function VoicePicker({ voices, value, onChange }: VoicePickerProps) {
  if (!voices.length) {
    return (
      <p className="text-sm text-muted-foreground">
        No voices available. Add voices in the voice library first.
      </p>
    );
  }

  return (
    <div className="grid max-h-64 gap-2 overflow-y-auto pr-1">
      {voices.map((voice) => (
        <VoicePickerItem
          key={voice.id}
          voice={voice}
          selected={value === voice.id}
          onSelect={() => onChange(voice.id)}
        />
      ))}
    </div>
  );
}
