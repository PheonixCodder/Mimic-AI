import { Suspense } from "react";

import { TextToSpeechView } from "@/features/text-to-speech/views/text-to-speech-view";

export default function TextToSpeechPage() {
  return (
    <div className="flex h-full flex-col">
      <Suspense fallback={<div>Loading...</div>}>
        <TextToSpeechView />
      </Suspense>
    </div>
  );
}