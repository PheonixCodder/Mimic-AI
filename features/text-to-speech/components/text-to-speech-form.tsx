"use client";

import { z } from "zod";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { formOptions } from "@tanstack/react-form";
import { useMutation } from "@tanstack/react-query";

import { useTRPC } from "@/trpc/client";
import { useAppForm } from "@/hooks/use-app-form";

const ttsFormSchema = z.object({
  text: z.string().min(1, "Please enter some text").max(10000, "Text too long"),
  voiceId: z.string().min(1, "Please select a voice"),
  temperature: z.number().min(0).max(2),
  topP: z.number().min(0).max(1),
  topK: z.number().min(1).max(10000),
  repetitionPenalty: z.number().min(1).max(2),
});

export type TTSFormValues = z.infer<typeof ttsFormSchema>;

export const defaultTTSValues: TTSFormValues = {
  text: "",
  voiceId: "",
  temperature: 0.8,
  topP: 0.95,
  topK: 1000,
  repetitionPenalty: 1.2,
};

export const ttsFormOptions = formOptions({
  defaultValues: defaultTTSValues,
});

export function TextToSpeechForm({
  children,
  defaultValues,
}: {
  children: React.ReactNode;
  defaultValues?: TTSFormValues;
}) {
  const trpc = useTRPC();
  const router = useRouter();
  const createMutation = useMutation(trpc.jobs.createTTS.mutationOptions());

  const form = useAppForm({
    ...ttsFormOptions,
    defaultValues: defaultValues ?? defaultTTSValues,
    validators: {
      onSubmit: ttsFormSchema,
    },
    onSubmit: async ({ value }) => {
      try {
        const job = await createMutation.mutateAsync({
          text: value.text.trim(),
          voiceId: value.voiceId,
          temperature: value.temperature,
          topP: value.topP,
          topK: value.topK,
          repetitionPenalty: value.repetitionPenalty,
        });

        toast.success("TTS generation started! Check the history panel for progress.");
        // Clear the form for next generation
        form.setFieldValue("text", "");
      } catch (error: any) {
        let message = "Failed to generate audio";
        
        if (error?.message?.includes("SUBSCRIPTION_REQUIRED")) {
          message = "Subscription required to generate TTS";
        } else if (error?.message?.includes("Voice not found")) {
          message = "Selected voice is no longer available";
        } else if (error?.message?.includes("Voice audio not available")) {
          message = "Voice audio reference is missing";
        } else if (error?.message) {
          message = error.message;
        }
        
        toast.error(message);
      }
    },
  });

  return <form.AppForm>{children}</form.AppForm>;
}