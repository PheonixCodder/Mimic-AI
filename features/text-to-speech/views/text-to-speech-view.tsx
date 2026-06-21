"use client";

import { Suspense } from "react";

import { TextToSpeechForm, defaultTTSValues, type TTSFormValues } from "@/features/text-to-speech/components/text-to-speech-form";
import { TextInputPanel } from "@/features/text-to-speech/components/text-input-panel";
import { TTSJobsList } from "@/features/text-to-speech/components/tts-jobs-list";

export function TextToSpeechView({
  initialValues,
}: {
  initialValues?: Partial<TTSFormValues>;
}) {
  const defaultValues: TTSFormValues = {
    ...defaultTTSValues,
    ...initialValues,
  };

  return (
    <div className="flex h-full flex-col">
      <div className="border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="flex h-14 items-center px-4">
          <h1 className="text-xl font-semibold">Text-to-Speech</h1>
        </div>
      </div>
      
      <div className="flex flex-1 overflow-hidden">
        {/* Left panel - Text input and controls */}
        <div className="flex w-full lg:w-1/2 flex-col">
          <TextToSpeechForm defaultValues={defaultValues}>
            <TextInputPanel />
          </TextToSpeechForm>
        </div>
        
        {/* Right panel - Job history (desktop only) */}
        <div className="hidden lg:flex lg:w-1/2 border-l flex-col">
          <div className="border-b bg-background/95 backdrop-blur">
            <div className="flex h-14 items-center px-4">
              <h2 className="text-lg font-medium">Recent Generations</h2>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            <Suspense fallback={<div className="p-4">Loading...</div>}>
              <TTSJobsList />
            </Suspense>
          </div>
        </div>
      </div>
    </div>
  );
}