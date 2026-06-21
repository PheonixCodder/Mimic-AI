"use client";

import { Pause, Play, MessageSquareText } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";
import { VoiceAvatar } from "@/components/voice-avatar/voice-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  VOICE_CATEGORY_LABELS,
  type VoiceCategory,
} from "@/features/voices/data/voice-categories";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import type { Voice } from "@/trpc/routers/voices";
import { useTRPC } from "@/trpc/client";
import { useMutation } from "@tanstack/react-query";
import { cn } from "@/lib/utils";

type VoicePickerProps = {
  voices: Voice[];
  value: string | null;
  onChange: (voiceId: string) => void;
  currentScript?: string;
};

function TTSGenerationDialog({ voice, defaultText }: { voice: Voice; defaultText: string }) {
  const [text, setText] = useState(defaultText.substring(0, 500)); // Limit for preview
  const [isOpen, setIsOpen] = useState(false);
  const trpc = useTRPC();

  const createTTSMutation = useMutation(trpc.jobs.createTTS.mutationOptions());

  const handleGenerate = async () => {
    if (!text.trim()) {
      toast.error("Please enter some text to generate");
      return;
    }

    // Check voice quality before generating TTS
    if (voice.qualityScore !== null && voice.qualityScore < 0.4) {
      toast.error("Voice quality is too low for TTS generation. Please validate or improve the voice first.");
      return;
    }

    if (voice.qualityScore === null) {
      toast.error("Voice has not been validated yet. Please validate the voice before generating TTS.");
      return;
    }

    try {
      await createTTSMutation.mutateAsync({
        text: text.trim(),
        voiceId: voice.id,
        temperature: 0.8,
        topP: 0.95,
        topK: 1000,
        repetitionPenalty: 1.2,
      });

      toast.success("TTS generation started! Check the Jobs page for progress.");
      setIsOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Failed to generate TTS";
      toast.error(message);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger>
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          title={`Generate TTS with ${voice.name}`}
        >
          <MessageSquareText className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Generate TTS Preview</DialogTitle>
          <DialogDescription>
            Generate a speech sample with {voice.name} to test how it sounds
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="tts-text">Text to generate</Label>
            <Textarea
              id="tts-text"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Enter text to convert to speech..."
              className="mt-1"
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {text.length}/500 characters
            </p>
          </div>
          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              onClick={handleGenerate}
              disabled={createTTSMutation.isPending || !text.trim()}
            >
              {createTTSMutation.isPending ? (
                <>
                  <Spinner className="size-4" />
                  Generating...
                </>
              ) : (
                "Generate TTS"
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function VoicePickerItem({
  voice,
  selected,
  onSelect,
  currentScript,
}: {
  voice: Voice;
  selected: boolean;
  onSelect: () => void;
  currentScript?: string;
}) {
  const audioSrc = `/api/voices/${encodeURIComponent(voice.id)}`;
  const { isPlaying, isLoading, togglePlay } = useAudioPlayback(audioSrc);
  const categoryLabel =
    VOICE_CATEGORY_LABELS[voice.category as VoiceCategory] ?? voice.category;

  const defaultText = currentScript || "Hi there, I am ready to narrate your video.";

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
          {voice.variant === "custom" && (
            <div className="flex items-center gap-2 mt-0.5">
              <p className={`text-[10px] font-medium ${
                voice.qualityScore === null
                  ? "text-muted-foreground"
                  : voice.qualityScore >= 0.7
                  ? "text-primary"
                  : voice.qualityScore >= 0.4
                  ? "text-amber-600"
                  : "text-destructive"
              }`}>
                {voice.qualityScore === null
                  ? "Not validated"
                  : `${Math.round(voice.qualityScore * 100)}% quality`}
              </p>
              {voice.qualityScore !== null && voice.qualityScore < 0.4 && (
                <p className="text-[10px] text-destructive">• Not suitable for TTS</p>
              )}
            </div>
          )}
        </div>
      </button>
      <div className="flex items-center gap-2">
        {currentScript && (
          <TTSGenerationDialog voice={voice} defaultText={defaultText} />
        )}
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
    </div>
  );
}

export function VoicePicker({ voices, value, onChange, currentScript }: VoicePickerProps) {
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
          currentScript={currentScript}
        />
      ))}
    </div>
  );
}
