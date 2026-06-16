"use client";

import { useRouter } from "next/navigation";
import { useMutation, useQuery, useSuspenseQuery } from "@tanstack/react-query";
import { AlertCircle, Clapperboard, Eye, Pause, Play, Plus, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { Spinner } from "@/components/ui/spinner";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Field,
  FieldGroup,
  FieldLabel,
} from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { ScriptCreateDialog } from "@/features/scripts/components/script-create-dialog";
import { AvatarPicker } from "@/features/videos/components/avatar-picker";
import { CostEstimatePanel } from "@/features/videos/components/cost-estimate-panel";
import { ScriptPicker } from "@/features/videos/components/script-picker";
import { VoicePicker } from "@/features/videos/components/voice-picker";
import {
  VideoWizardSteps,
  WIZARD_STEPS,
} from "@/features/videos/components/video-wizard-steps";
import {
  VIDEO_ASPECT_RATIOS,
  VIDEO_ASPECT_RATIO_LABELS,
  VIDEO_RESOLUTIONS,
  VIDEO_RESOLUTION_LABELS,
} from "@/features/videos/data/video-options";
import { useTRPC } from "@/trpc/client";

type WizardState = {
  title: string;
  projectId: string | null;
  scriptId: string | null;
  voiceId: string | null;
  avatarId: string | null;
  aspectRatio: (typeof VIDEO_ASPECT_RATIOS)[number];
  resolution: (typeof VIDEO_RESOLUTIONS)[number];
  consentChecked: boolean;
};

const initialState: WizardState = {
  title: "",
  projectId: null,
  scriptId: null,
  voiceId: null,
  avatarId: null,
  aspectRatio: "16:9",
  resolution: "1080p",
  consentChecked: false,
};

function VoicePreviewWidget({ voiceId, voiceName }: { voiceId: string; voiceName: string }) {
  const audioSrc = `/api/voices/${encodeURIComponent(voiceId)}`;
  const { isPlaying, isLoading, togglePlay } = useAudioPlayback(audioSrc);

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="text-xs font-medium truncate max-w-[120px]">{voiceName}</div>
      <Button
        type="button"
        variant="outline"
        size="icon-sm"
        className="rounded-full shadow-xs"
        onClick={togglePlay}
        disabled={isLoading}
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

function TalkingPreviewWidget({
  draftVideo,
  onGenerate,
  isGenerating,
}: {
  draftVideo: any;
  onGenerate: () => void;
  isGenerating: boolean;
}) {
  const previewStatus = draftVideo?.previewStatus ?? "idle";
  const previewError = draftVideo?.previewError;

  if (previewStatus === "pending" || previewStatus === "processing") {
    return (
      <div className="flex flex-col items-center justify-center gap-2 p-2">
        <Spinner className="size-6 text-primary" />
        <span className="text-xs text-muted-foreground animate-pulse">Rendering...</span>
      </div>
    );
  }

  if (previewStatus === "completed" && draftVideo?.id) {
    return (
      <div className="w-full">
        <video
          src={`/api/videos/${encodeURIComponent(draftVideo.id)}?preview=true`}
          controls
          className="aspect-video w-full rounded-lg bg-black border shadow-xs"
        />
      </div>
    );
  }

  if (previewStatus === "failed") {
    return (
      <div className="flex flex-col items-center justify-center gap-1.5 p-1 text-center">
        <AlertCircle className="size-5 text-destructive" />
        <p className="text-[11px] text-destructive leading-tight font-medium">Failed</p>
        {previewError && (
          <p className="text-[10px] text-muted-foreground max-h-12 overflow-y-auto px-1 leading-tight">
            {previewError}
          </p>
        )}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="mt-1 h-7 text-xs px-2.5"
          onClick={onGenerate}
          disabled={isGenerating}
        >
          {isGenerating ? <Spinner className="size-3 mr-1" /> : <Sparkles className="size-3 mr-1" />}
          Retry
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center gap-2">
      <p className="text-[11px] text-muted-foreground">3s talking test</p>
      <Button
        type="button"
        size="sm"
        className="h-8 text-xs gap-1.5"
        onClick={onGenerate}
        disabled={isGenerating}
      >
        {isGenerating ? <Spinner className="size-3" /> : <Sparkles className="size-3" />}
        Generate
      </Button>
    </div>
  );
}

type VideoWizardInnerProps = {
  initialState?: Partial<WizardState>;
  initialStep?: number;
};

function VideoWizardInner({
  initialState: initialOverrides,
  initialStep = 1,
}: VideoWizardInnerProps) {
  const router = useRouter();
  const trpc = useTRPC();
  const [step, setStep] = useState(initialStep);
  const [state, setState] = useState<WizardState>({
    ...initialState,
    ...initialOverrides,
  });
  const [draftVideoId, setDraftVideoId] = useState<string | null>(null);

  const { data: projects } = useSuspenseQuery(trpc.projects.list.queryOptions());
  const { data: scripts } = useSuspenseQuery(trpc.scripts.list.queryOptions({}));
  const { data: workspace } = useSuspenseQuery(
    trpc.workspaces.getCurrent.queryOptions(),
  );
  const { data: voicesData } = useSuspenseQuery(
    trpc.voices.getAll.queryOptions({}),
  );
  const { data: avatarsData } = useSuspenseQuery(
    trpc.avatars.getAll.queryOptions({}),
  );

  const canWrite = ["owner", "admin", "member"].includes(workspace.role);

  const allVoices = useMemo(
    () => [...voicesData.custom, ...voicesData.system],
    [voicesData],
  );
  const allAvatars = useMemo(
    () => [...avatarsData.custom, ...avatarsData.system],
    [avatarsData],
  );

  const selectedVoice = allVoices.find((voice) => voice.id === state.voiceId);
  const selectedAvatar = allAvatars.find(
    (avatar) => avatar.id === state.avatarId,
  );
  const selectedProject = projects.find(
    (project) => project.id === state.projectId,
  );
  const selectedScript = scripts.find((script) => script.id === state.scriptId);

  const createMutation = useMutation(
    trpc.videos.create.mutationOptions({
      onSuccess: (video) => {
        toast.success("Video draft saved");
        router.push(`/dashboard/videos/${video.id}`);
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to save draft");
      },
    }),
  );

  const createDraftOnlyMutation = useMutation(
    trpc.videos.create.mutationOptions()
  );

  const { data: draftVideo } = useQuery({
    ...trpc.videos.getById.queryOptions(
      { id: draftVideoId! },
      { enabled: !!draftVideoId }
    ),
    refetchInterval: (query) => {
      const data = query.state.data;
      return data?.previewStatus === "pending" || data?.previewStatus === "processing"
        ? 2000
        : false;
    },
  });

  const generatePreviewMutation = useMutation(
    trpc.videos.generatePreview.mutationOptions({
      onSuccess: () => {
        toast.success("Generating talking preview...");
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to generate preview");
      },
    }),
  );

  async function handleGeneratePreview() {
    let currentVideoId = draftVideoId;

    if (!currentVideoId) {
      if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
        return;
      }

      try {
        const video = await createDraftOnlyMutation.mutateAsync({
          title: state.title.trim(),
          scriptId: state.scriptId!,
          voiceId: state.voiceId!,
          avatarId: state.avatarId!,
          projectId: state.projectId,
          aspectRatio: state.aspectRatio,
          resolution: state.resolution,
        });

        currentVideoId = video.id;
        setDraftVideoId(video.id);
        toast.success("Video draft saved");
      } catch (err: any) {
        toast.error(err.message ?? "Failed to save draft");
        return;
      }
    }

    if (currentVideoId) {
      await generatePreviewMutation.mutateAsync({ id: currentVideoId });
    }
  }

  function handleSaveDraftOrRedirect() {
    if (draftVideoId) {
      toast.success("Video draft saved");
      router.push(`/dashboard/videos/${draftVideoId}`);
    } else {
      handleSaveDraft();
    }
  }

  function updateState(partial: Partial<WizardState>) {
    setState((current) => ({ ...current, ...partial }));
  }

  function handleScriptSelect(scriptId: string) {
    const script = scripts.find((item) => item.id === scriptId);

    updateState({
      scriptId,
      ...(script && !state.title.trim() ? { title: script.title } : {}),
      ...(script?.projectId && !state.projectId
        ? { projectId: script.projectId }
        : {}),
    });
  }

  function validateStep(currentStep: number): boolean {
    if (currentStep === 1 && !state.title.trim()) {
      toast.error("Enter a video title");
      return false;
    }

    if (currentStep === 2 && !state.scriptId) {
      toast.error("Select a script");
      return false;
    }

    if (currentStep === 3 && (!state.voiceId || !state.avatarId)) {
      toast.error("Select a voice and avatar");
      return false;
    }

    return true;
  }

  function handleContinue() {
    if (!validateStep(step)) {
      return;
    }

    if (step < WIZARD_STEPS.length) {
      setStep((current) => current + 1);
    }
  }

  function handleBack() {
    if (step > 1) {
      setStep((current) => current - 1);
    }
  }

  async function handleSaveDraft() {
    if (!validateStep(1) || !validateStep(2) || !validateStep(3)) {
      return;
    }

    await createMutation.mutateAsync({
      title: state.title.trim(),
      scriptId: state.scriptId!,
      voiceId: state.voiceId!,
      avatarId: state.avatarId!,
      projectId: state.projectId,
      aspectRatio: state.aspectRatio,
      resolution: state.resolution,
    });
  }

  return (
    <DashboardPageShell
      title="Generate video"
      description="Configure your production and save a draft before generation."
      icon={Clapperboard}
      breadcrumbs={[
        { label: "Videos", href: "/dashboard/videos" },
        { label: "New video" },
      ]}
    >
      <div className="mx-auto max-w-3xl space-y-8">
        <VideoWizardSteps currentStep={step} />

        {step === 1 ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Basics</CardTitle>
              <CardDescription>
                Name your video and optionally link it to a project.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="video-title">Title</FieldLabel>
                  <Input
                    id="video-title"
                    value={state.title}
                    onChange={(event) =>
                      updateState({ title: event.target.value })
                    }
                    placeholder="Product launch explainer"
                    maxLength={120}
                  />
                </Field>

                <Field>
                  <FieldLabel htmlFor="video-project">Project (optional)</FieldLabel>
                  <Select
                    value={state.projectId ?? "none"}
                    onValueChange={(value) => {
                      updateState({
                        projectId: value === "none" ? null : value,
                      });
                    }}
                  >
                    <SelectTrigger id="video-project" className="w-full">
                      <SelectValue placeholder="Select project..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No project</SelectItem>
                      {projects.map((project) => (
                        <SelectItem key={project.id} value={project.id}>
                          {project.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        ) : null}

        {step === 2 ? (
          <Card className="rounded-2xl">
            <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
              <div>
                <CardTitle>Script</CardTitle>
                <CardDescription>
                  Choose a script from your library or create a new one.
                </CardDescription>
              </div>
              {canWrite ? (
                <ScriptCreateDialog
                  onSuccess={(script) => {
                    handleScriptSelect(script.id);
                  }}
                >
                  <Button size="sm" variant="outline">
                    <Plus />
                    New script
                  </Button>
                </ScriptCreateDialog>
              ) : null}
            </CardHeader>
            <CardContent>
              <ScriptPicker
                scripts={scripts}
                value={state.scriptId}
                onChange={handleScriptSelect}
                canWrite={canWrite}
              />
            </CardContent>
          </Card>
        ) : null}

        {step === 3 ? (
          <div className="grid gap-6 lg:grid-cols-2">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Voice</CardTitle>
                <CardDescription>Choose a narrator for this video.</CardDescription>
              </CardHeader>
              <CardContent>
                <VoicePicker
                  voices={allVoices}
                  value={state.voiceId}
                  onChange={(voiceId) => updateState({ voiceId })}
                />
              </CardContent>
            </Card>

            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Avatar</CardTitle>
                <CardDescription>
                  Choose the on-screen presenter.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <AvatarPicker
                  avatars={allAvatars}
                  value={state.avatarId}
                  onChange={(avatarId) => updateState({ avatarId })}
                />
              </CardContent>
            </Card>
          </div>
        ) : null}

        {step === 4 ? (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle>Output settings</CardTitle>
              <CardDescription>
                Pick the format for your final render.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FieldGroup>
                <Field>
                  <FieldLabel htmlFor="aspect-ratio">Aspect ratio</FieldLabel>
                  <Select
                    value={state.aspectRatio}
                    onValueChange={(value) => {
                      if (value) {
                        updateState({
                          aspectRatio: value as WizardState["aspectRatio"],
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="aspect-ratio" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_ASPECT_RATIOS.map((ratio) => (
                        <SelectItem key={ratio} value={ratio}>
                          {VIDEO_ASPECT_RATIO_LABELS[ratio]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>

                <Field>
                  <FieldLabel htmlFor="resolution">Resolution</FieldLabel>
                  <Select
                    value={state.resolution}
                    onValueChange={(value) => {
                      if (value) {
                        updateState({
                          resolution: value as WizardState["resolution"],
                        });
                      }
                    }}
                  >
                    <SelectTrigger id="resolution" className="w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {VIDEO_RESOLUTIONS.map((res) => (
                        <SelectItem key={res} value={res}>
                          {VIDEO_RESOLUTION_LABELS[res]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
              </FieldGroup>
            </CardContent>
          </Card>
        ) : null}

        {step === 5 ? (
          <div className="space-y-6">
            <Card className="rounded-2xl">
              <CardHeader>
                <CardTitle>Review</CardTitle>
                <CardDescription>
                  Confirm your configuration before saving the draft.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4 text-sm">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div>
                    <p className="text-muted-foreground">Title</p>
                    <p className="font-medium">{state.title}</p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Project</p>
                    <p className="font-medium">
                      {selectedProject?.name ?? "None"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Script</p>
                    <p className="font-medium">
                      {selectedScript?.title ?? "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Voice</p>
                    <p className="font-medium">
                      {selectedVoice?.name ?? "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Avatar</p>
                    <p className="font-medium">
                      {selectedAvatar?.name ?? "Not selected"}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Format</p>
                    <p className="font-medium">
                      {VIDEO_ASPECT_RATIO_LABELS[state.aspectRatio]} ·{" "}
                      {VIDEO_RESOLUTION_LABELS[state.resolution]}
                    </p>
                  </div>
                </div>

                <div>
                  <p className="text-muted-foreground">Script preview</p>
                  <p className="mt-1 line-clamp-4 rounded-lg border bg-muted/30 p-3 text-sm">
                    {selectedScript?.content ?? "No script selected."}
                  </p>
                </div>
              </CardContent>
            </Card>

            <CostEstimatePanel
              scriptLength={selectedScript?.characterCount ?? 0}
              resolution={state.resolution}
            />

            <div className="grid gap-4 sm:grid-cols-3">
              {/* Voice Preview Card */}
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center bg-card shadow-xs">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Voice Preview</p>
                {selectedVoice ? (
                  <VoicePreviewWidget voiceId={selectedVoice.id} voiceName={selectedVoice.name} />
                ) : (
                  <p className="text-xs text-muted-foreground">No voice selected</p>
                )}
              </div>

              {/* Avatar Preview Card */}
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center bg-card shadow-xs">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Avatar Preview</p>
                {selectedAvatar ? (
                  <div className="flex flex-col items-center gap-2">
                    <img
                      src={`/api/avatars/${encodeURIComponent(selectedAvatar.id)}`}
                      alt={selectedAvatar.name}
                      className="size-16 rounded-full object-cover border shadow-xs"
                    />
                    <p className="text-xs font-medium truncate max-w-[120px]">{selectedAvatar.name}</p>
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No avatar selected</p>
                )}
              </div>

              {/* Talking Preview Card */}
              <div className="flex flex-col items-center justify-center gap-2 rounded-xl border p-4 text-center bg-card shadow-xs">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">Talking Preview</p>
                <TalkingPreviewWidget
                  draftVideo={draftVideo}
                  onGenerate={handleGeneratePreview}
                  isGenerating={generatePreviewMutation.isPending}
                />
              </div>
            </div>

            <label className="flex items-start gap-3 rounded-xl border p-4 text-sm bg-muted/20">
              <input
                type="checkbox"
                checked={state.consentChecked}
                onChange={(event) =>
                  updateState({ consentChecked: event.target.checked })
                }
                className="mt-0.5 size-4 rounded border-input"
              />
              <span className="text-muted-foreground">
                I confirm I have rights to use the selected voice and avatar
                assets. (UI only — enforcement comes in Phase 0.)
              </span>
            </label>
          </div>
        ) : null}

        <div className="flex items-center justify-between gap-4">
          <Button
            type="button"
            variant="outline"
            onClick={handleBack}
            disabled={step === 1 || createMutation.isPending}
          >
            Back
          </Button>

          {step < WIZARD_STEPS.length ? (
            <Button type="button" onClick={handleContinue}>
              Continue
            </Button>
          ) : (
            <Button
              type="button"
              onClick={handleSaveDraftOrRedirect}
              disabled={createMutation.isPending}
            >
              {createMutation.isPending ? "Saving..." : "Save draft"}
            </Button>
          )}
        </div>
      </div>
    </DashboardPageShell>
  );
}

function VideoWizardWithPrefill({ scriptId }: { scriptId: string }) {
  const trpc = useTRPC();
  const { data: script } = useSuspenseQuery(
    trpc.scripts.getById.queryOptions({ id: scriptId }),
  );

  return (
    <VideoWizardInner
      initialStep={2}
      initialState={{
        scriptId: script.id,
        title: script.title,
        projectId: script.projectId,
      }}
    />
  );
}

function VideoWizardWithTemplate({ templateId }: { templateId: string }) {
  const trpc = useTRPC();
  const { data: template } = useSuspenseQuery(
    trpc.templates.getById.queryOptions({ id: templateId }),
  );

  return (
    <VideoWizardInner
      initialStep={1}
      initialState={{
        voiceId: template.voiceId ?? null,
        avatarId: template.avatarId ?? null,
        aspectRatio: (template.layoutConfig?.aspectRatio as WizardState["aspectRatio"]) ?? "16:9",
      }}
    />
  );
}

type VideoWizardViewProps = {
  scriptId?: string;
  templateId?: string;
};

export function VideoWizardView({ scriptId, templateId }: VideoWizardViewProps) {
  if (scriptId) {
    return <VideoWizardWithPrefill scriptId={scriptId} />;
  }

  if (templateId) {
    return <VideoWizardWithTemplate templateId={templateId} />;
  }

  return <VideoWizardInner />;
}
