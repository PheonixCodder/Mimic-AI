"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Film, Loader2, ArrowLeft } from "lucide-react";
import { useMutation, useSuspenseQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import Link from "next/link";

import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { Button } from "@/components/ui/button";
import { useTRPC } from "@/trpc/client";
import {
  CLIP_STYLES,
  CLIP_DURATIONS,
  CLIP_ASPECT_RATIOS,
  CLIP_RESOLUTIONS,
  type ClipStyle,
  type ClipDuration,
  type ClipAspectRatio,
  type ClipResolution,
} from "../lib/schemas";
import {
  CLIP_STYLE_LABELS,
  CLIP_DURATION_LABELS,
  CLIP_ASPECT_RATIO_LABELS,
  CLIP_RESOLUTION_LABELS,
} from "../data/clip-options";

const STYLE_DOTS: Record<ClipStyle, string> = {
  cinematic: "bg-blue-500",
  animated: "bg-orange-500",
  abstract: "bg-purple-500",
  nature: "bg-emerald-500",
  minimal: "bg-zinc-400",
};

export function ClipGenerateView() {
  const trpc = useTRPC();
  const router = useRouter();

  // Fetch projects for dropdown
  const { data: projects } = useSuspenseQuery(
    trpc.projects.list.queryOptions(),
  );

  // Form states
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState<ClipStyle>("cinematic");
  const [durationSeconds, setDurationSeconds] = useState<ClipDuration>(5);
  const [aspectRatio, setAspectRatio] = useState<ClipAspectRatio>("16:9");
  const [resolution, setResolution] = useState<ClipResolution>("1080p");
  const [projectId, setProjectId] = useState<string>("none");

  const [errors, setErrors] = useState<Record<string, string>>({});

  const generateMutation = useMutation(
    trpc.clips.generate.mutationOptions({
      onSuccess: () => {
        toast.success("Generation job queued successfully!");
        router.push("/dashboard/clips");
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to start generation");
      },
    }),
  );

  const createMutation = useMutation(
    trpc.clips.create.mutationOptions({
      onSuccess: (clip) => {
        generateMutation.mutate({ id: clip.id });
      },
      onError: (err) => {
        toast.error(err.message ?? "Failed to create clip draft");
      },
    }),
  );

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const newErrors: Record<string, string> = {};

    if (!title.trim()) {
      newErrors.title = "Title is required";
    }
    if (!prompt.trim()) {
      newErrors.prompt = "Prompt is required";
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors);
      return;
    }

    setErrors({});
    createMutation.mutate({
      title,
      prompt,
      style,
      durationSeconds,
      aspectRatio,
      resolution,
      projectId: projectId === "none" ? undefined : projectId,
    });
  };

  const isPending = createMutation.isPending || generateMutation.isPending;

  return (
    <DashboardPageShell
      title="Generate AI Clip"
      description="Describe a scene and let AI create a short video clip for your production."
      icon={Film}
      breadcrumbs={[
        { label: "Clips", href: "/dashboard/clips" },
        { label: "Generate" },
      ]}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 pl-0 text-muted-foreground hover:bg-transparent hover:text-foreground"
            nativeButton={false}
            render={<Link href="/dashboard/clips" />}
          >
            <ArrowLeft className="size-4" />
            Back to clips
          </Button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="space-y-6 rounded-2xl border bg-card p-6 dark:border-zinc-800"
        >
          <Field>
            <FieldLabel htmlFor="clip-title">Clip Title</FieldLabel>
            <Input
              id="clip-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="E.g., Cinematic sunset clip"
              disabled={isPending}
            />
            {errors.title ? <FieldError>{errors.title}</FieldError> : null}
          </Field>

          <Field>
            <div className="mb-1 flex items-center justify-between">
              <FieldLabel htmlFor="clip-prompt" className="mb-0">
                Prompt
              </FieldLabel>
              <span className="text-[10px] text-muted-foreground">
                {prompt.length}/2000
              </span>
            </div>
            <Textarea
              id="clip-prompt"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe what should happen in the video clip in detail (e.g., A slow panning shot of a neon-lit cyberpunk street with raindrops catching the light...)"
              maxLength={2000}
              rows={4}
              disabled={isPending}
            />
            {errors.prompt ? <FieldError>{errors.prompt}</FieldError> : null}
          </Field>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="clip-style">Visual Style</FieldLabel>
              <Select
                value={style}
                onValueChange={(val) => setStyle(val as ClipStyle)}
                disabled={isPending}
              >
                <SelectTrigger id="clip-style">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIP_STYLES.map((s) => (
                    <SelectItem key={s} value={s}>
                      <span className="flex items-center">
                        <span
                          className={`mr-2 inline-block size-2 rounded-full ${STYLE_DOTS[s]}`}
                        />
                        {CLIP_STYLE_LABELS[s]}
                      </span>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="clip-duration">Duration</FieldLabel>
              <Select
                value={String(durationSeconds)}
                onValueChange={(val) =>
                  setDurationSeconds(Number(val) as ClipDuration)
                }
                disabled={isPending}
              >
                <SelectTrigger id="clip-duration">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIP_DURATIONS.map((d) => (
                    <SelectItem key={d} value={String(d)}>
                      {CLIP_DURATION_LABELS[d]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <Field>
              <FieldLabel htmlFor="clip-aspect-ratio">Aspect Ratio</FieldLabel>
              <Select
                value={aspectRatio}
                onValueChange={(val) => setAspectRatio(val as ClipAspectRatio)}
                disabled={isPending}
              >
                <SelectTrigger id="clip-aspect-ratio">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIP_ASPECT_RATIOS.map((ar) => (
                    <SelectItem key={ar} value={ar}>
                      {CLIP_ASPECT_RATIO_LABELS[ar]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>

            <Field>
              <FieldLabel htmlFor="clip-resolution">Resolution</FieldLabel>
              <Select
                value={resolution}
                onValueChange={(val) => setResolution(val as ClipResolution)}
                disabled={isPending}
              >
                <SelectTrigger id="clip-resolution">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLIP_RESOLUTIONS.map((res) => (
                    <SelectItem key={res} value={res}>
                      {CLIP_RESOLUTION_LABELS[res]}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </Field>
          </div>

          <Field>
            <FieldLabel htmlFor="clip-project">Project (Optional)</FieldLabel>
            <Select
              value={projectId}
              onValueChange={(v) => setProjectId(v ?? "")}
              disabled={isPending}
            >
              <SelectTrigger id="clip-project">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">No project (Unassigned)</SelectItem>
                {projects.map((proj) => (
                  <SelectItem key={proj.id} value={proj.id}>
                    {proj.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </Field>

          <div className="pt-2">
            <Button
              type="submit"
              className="w-full gap-2 rounded-xl"
              disabled={isPending}
            >
              {isPending ? (
                <>
                  <Loader2 className="size-4 animate-spin" />
                  Generating Clip...
                </>
              ) : (
                <>
                  <Film className="size-4" />
                  Generate Clip
                </>
              )}
            </Button>
          </div>
        </form>
      </div>
    </DashboardPageShell>
  );
}
