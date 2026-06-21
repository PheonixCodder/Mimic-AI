"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CheckCircle2, Mic, XCircle, AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { useAudioPlayback } from "@/hooks/use-audio-playback";
import { useJobStatus } from "@/hooks/use-job-status";
import { useTRPC } from "@/trpc/client";

function ScoreBar({ score, label }: { score: number; label?: string }) {
  const pct = Math.round(score * 100);
  const color = pct >= 80 ? "bg-primary" : pct >= 60 ? "bg-amber-500" : "bg-destructive";
  
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label || "Score"}</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function ValidationMetrics({ validationResults }: { validationResults: any }) {
  const metrics = validationResults?.metrics;
  if (!metrics) return null;

  return (
    <div className="space-y-3">
      <h4 className="text-sm font-medium">Detailed Analysis</h4>
      <div className="grid gap-3">
        {metrics.noise_score && (
          <ScoreBar score={metrics.noise_score} label="Noise Level" />
        )}
        {metrics.clarity_score && (
          <ScoreBar score={metrics.clarity_score} label="Clarity" />
        )}
        {metrics.consistency_score && (
          <ScoreBar score={metrics.consistency_score} label="Consistency" />
        )}
      </div>
      
      {(metrics.duration || metrics.sample_rate) && (
        <div className="text-xs text-muted-foreground space-y-1">
          {metrics.duration && (
            <div>Duration: {metrics.duration}s</div>
          )}
          {metrics.sample_rate && (
            <div>Sample Rate: {metrics.sample_rate} Hz</div>
          )}
          {metrics.signal_to_noise_ratio && (
            <div>SNR: {metrics.signal_to_noise_ratio} dB</div>
          )}
        </div>
      )}
    </div>
  );
}

function qualityLabel(score: number): string {
  if (score >= 0.8) return "Excellent";
  if (score >= 0.7) return "Good"; 
  if (score >= 0.4) return "Acceptable";
  return "Needs Improvement";
}

function getQualityColor(score: number): string {
  if (score >= 0.7) return "text-primary";
  if (score >= 0.4) return "text-amber-600";
  return "text-destructive";
}

export function VoiceValidateView({ voiceId }: { voiceId: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: voice } = useSuspenseQuery(trpc.voices.getById.queryOptions({ id: voiceId }));

  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [stage, setStage] = useState<"audio" | "analyzing" | "results">(
    voice.qualityScore !== null ? "results" : "audio"
  );

  const { isPlaying, isLoading, togglePlay } = useAudioPlayback(`/api/voices/${encodeURIComponent(voiceId)}`);

  // Real-time job status polling
  const { job, isPolling, isCompleted, isFailed, stage: jobStage, progress } = useJobStatus(currentJobId);

  // Handle job completion
  useEffect(() => {
    if (isCompleted) {
      // Refresh voice data to get new validation results
      queryClient.invalidateQueries({ queryKey: [['voices', 'getById'], { input: { id: voiceId }, type: 'query' }] });
      setStage("results");
      setCurrentJobId(null);
      toast.success("Voice validation completed!");
    } else if (isFailed && job) {
      toast.error(job.errorMessage || "Validation failed");
      setStage("audio");
      setCurrentJobId(null);
    }
  }, [isCompleted, isFailed, job, queryClient, voiceId]);

  const validateMutation = useMutation(
    trpc.voices.validate.mutationOptions({
      onSuccess: (result) => {
        if (result.jobId) {
          setCurrentJobId(result.jobId);
          setStage("analyzing");
          toast.success("Validation started!");
        }
      },
      onError: (e) => {
        toast.error(e.message ?? "Validation failed");
        setStage("audio");
      },
    })
  );

  // Redirect system voices back
  if (voice.variant !== "custom") {
    router.replace("/dashboard/voices");
    return null;
  }

  const hasResults = voice.validationResults && voice.qualityScore !== null;
  const isAutoValidated = voice.autoValidatedAt !== null;

  return (
    <DashboardPageShell
      title="Voice Validation"
      description="Analyze your voice clone's quality and get detailed metrics."
      icon={Mic}
      breadcrumbs={[
        { label: "Voices", href: "/dashboard/voices" },
        { label: voice.name },
        { label: "Validate" },
      ]}
    >
      <div className="mx-auto max-w-lg space-y-6">
        {/* Step 1: Audio check */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              1. Audio Preview
              {isAutoValidated && (
                <Badge variant="secondary" className="text-xs">
                  Auto-validated
                </Badge>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Play the reference audio to confirm it sounds correct.
            </p>
            <div className="flex items-center gap-3">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={togglePlay} 
                disabled={isLoading || !voice.r2ObjectKey} 
                className="gap-1.5"
              >
                {isLoading ? <Spinner className="size-4" /> : isPlaying ? "Pause" : "Play audio"}
              </Button>
              {!voice.r2ObjectKey && (
                <span className="text-xs text-destructive">No audio uploaded</span>
              )}
            </div>
            {stage === "audio" && (
              <Button
                disabled={!voice.r2ObjectKey || validateMutation.isPending}
                onClick={() => validateMutation.mutate({ id: voiceId })}
                className="w-full"
              >
                {validateMutation.isPending ? (
                  <>
                    <Spinner className="size-4" />
                    Starting analysis...
                  </>
                ) : (
                  "Analyze Quality"
                )}
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Analysis */}
        {(stage === "analyzing" || stage === "results") && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base">2. Quality Analysis</CardTitle>
            </CardHeader>
            <CardContent>
              {stage === "analyzing" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Spinner className="size-5 text-primary" />
                    {jobStage === "downloading_audio" && "Downloading audio file..."}
                    {jobStage === "analyzing_quality" && "Analyzing audio quality..."}
                    {jobStage === "storing_results" && "Storing results..."}
                    {!jobStage && "Analyzing audio quality..."}
                  </div>
                  <Progress value={progress || 30} className="h-2" />
                  {progress && (
                    <div className="text-xs text-muted-foreground text-center">
                      {progress}% complete
                    </div>
                  )}
                </div>
              ) : hasResults ? (
                <div className="space-y-4">
                  <ScoreBar score={voice.qualityScore || 0} label="Overall Quality" />
                  
                  <div className="flex items-center gap-2">
                    {(voice.qualityScore || 0) >= 0.7 ? (
                      <Badge className="gap-1 bg-primary text-primary-foreground">
                        <CheckCircle2 className="size-3" /> 
                        {voice.validationResults?.quality_label || qualityLabel(voice.qualityScore || 0)}
                      </Badge>
                    ) : (voice.qualityScore || 0) >= 0.4 ? (
                      <Badge variant="secondary" className="gap-1">
                        <AlertTriangle className="size-3" /> 
                        {voice.validationResults?.quality_label || qualityLabel(voice.qualityScore || 0)}
                      </Badge>
                    ) : (
                      <Badge variant="destructive" className="gap-1">
                        <XCircle className="size-3" /> 
                        {voice.validationResults?.quality_label || qualityLabel(voice.qualityScore || 0)}
                      </Badge>
                    )}
                  </div>

                  {voice.validationResults?.recommendation && (
                    <p className="text-sm text-muted-foreground">
                      {voice.validationResults.recommendation}
                    </p>
                  )}

                  {voice.validationResults && (
                    <ValidationMetrics validationResults={voice.validationResults} />
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => { setStage("audio"); setCurrentJobId(null); }} 
                      className="flex-1 gap-2"
                      disabled={validateMutation.isPending}
                    >
                      <RotateCcw className="size-4" />
                      Re-analyze
                    </Button>
                    <Button onClick={() => router.push("/dashboard/voices")} className="flex-1">
                      Done
                    </Button>
                  </div>
                </div>
              ) : null}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardPageShell>
  );
}
