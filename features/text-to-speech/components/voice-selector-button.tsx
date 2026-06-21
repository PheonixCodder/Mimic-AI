"use client";

import { ChevronDown, Mic2 } from "lucide-react";
import { useStore } from "@tanstack/react-form";
import { useSuspenseQuery } from "@tanstack/react-query";

import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTypedAppFormContext } from "@/hooks/use-app-form";
import { useTRPC } from "@/trpc/client";

import { ttsFormOptions } from "./text-to-speech-form";

export function VoiceSelectorButton() {
  const trpc = useTRPC();
  const { data: voices } = useSuspenseQuery(trpc.voices.getAll.queryOptions());

  const form = useTypedAppFormContext(ttsFormOptions);
  const voiceId = useStore(form.store, (s) => s.values.voiceId);

  const allVoices = [...voices.custom, ...voices.system];
  const currentVoice = allVoices.find((v) => v.id === voiceId);

  return (
    <form.Field name="voiceId">
      {(field) => (
        <Select
          value={field.state.value}
          onValueChange={(value) => field.handleChange(value || "")}
        >
          <SelectTrigger className="min-w-[200px]">
            <div className="flex items-center gap-2">
              <Mic2 className="size-4" />
              <SelectValue placeholder="Select voice..." />
            </div>
          </SelectTrigger>
          <SelectContent>
            {voices.custom.length > 0 && (
              <>
                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                  Custom Voices
                </div>
                {voices.custom.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex items-center gap-2">
                      <span>{voice.name}</span>
                      {voice.description && (
                        <span className="text-xs text-muted-foreground">
                          • {voice.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
            {voices.system.length > 0 && (
              <>
                {voices.custom.length > 0 && (
                  <div className="border-t my-1" />
                )}
                <div className="px-2 py-1.5 text-sm font-medium text-muted-foreground">
                  System Voices
                </div>
                {voices.system.map((voice) => (
                  <SelectItem key={voice.id} value={voice.id}>
                    <div className="flex items-center gap-2">
                      <span>{voice.name}</span>
                      {voice.description && (
                        <span className="text-xs text-muted-foreground">
                          • {voice.description}
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </>
            )}
          </SelectContent>
        </Select>
      )}
    </form.Field>
  );
}