"use client";

import { Mic2 } from "lucide-react";
import { useStore } from "@tanstack/react-form";

import { VoiceSelectorButton } from "./voice-selector-button";

import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useTypedAppFormContext } from "@/hooks/use-app-form";

import { ttsFormOptions } from "./text-to-speech-form";
import { GenerateButton } from "./generate-button";

const TEXT_MAX_LENGTH = 10000;

export function TextInputPanel() {
  const form = useTypedAppFormContext(ttsFormOptions);

  const text = useStore(form.store, (s) => s.values.text);
  const isSubmitting = useStore(form.store, (s) => s.isSubmitting);
  const isValid = useStore(form.store, (s) => s.isValid);

  return (
    <div className="flex h-full min-h-0 flex-col flex-1">
      {/* Text input area */}
      <div className="relative min-h-0 flex-1">
        <form.Field name="text">
          {(field) => (
            <Textarea
              value={field.state.value}
              onChange={(e) => field.handleChange(e.target.value)}
              placeholder="Enter the text you want to convert to speech..."
              className="absolute inset-0 resize-none border-0 bg-transparent p-4 pb-6 lg:p-6 lg:pb-8 text-base leading-relaxed tracking-tight shadow-none focus-visible:ring-0"
              maxLength={TEXT_MAX_LENGTH}
              disabled={isSubmitting}
            />
          )}
        </form.Field>
        {/* Bottom fade overlay */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-8 bg-gradient-to-t from-background to-transparent" />
      </div>
      
      {/* Action bar */}
      <div className="shrink-0 p-4 lg:p-6">
        {/* Mobile layout */}
        <div className="flex flex-col gap-3 lg:hidden">
          <VoiceSelectorButton />
          <GenerateButton
            className="w-full"
            disabled={isSubmitting || !isValid}
            isSubmitting={isSubmitting}
            onSubmit={() => form.handleSubmit()}
          />
        </div>
        
        {/* Desktop layout */}
        <div className="hidden items-center justify-between lg:flex">
          <div className="flex items-center gap-3">
            <VoiceSelectorButton />
            {text.length > 0 && (
              <p className="text-xs text-muted-foreground">
                {text.length.toLocaleString()} / {TEXT_MAX_LENGTH.toLocaleString()} characters
              </p>
            )}
          </div>
          <GenerateButton
            size="sm"
            disabled={isSubmitting || !isValid}
            isSubmitting={isSubmitting}
            onSubmit={() => form.handleSubmit()}
          />
        </div>
      </div>
    </div>
  );
}