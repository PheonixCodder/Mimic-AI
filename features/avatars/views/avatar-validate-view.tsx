"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useSuspenseQuery, useQueryClient } from "@tanstack/react-query";
import { useJobStatus } from "@/hooks/use-job-status";
import { toast } from "sonner";
import { CheckCircle2, UserRound, XCircle, AlertTriangle, Eye } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Progress } from "@/components/ui/progress";
import { DashboardPageShell } from "@/features/dashboard/components/dashboard-page-shell";
import { useTRPC } from "@/trpc/client";

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Overall Score</span>
        <span className="font-semibold">{pct}%</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function MetricBar({ label, score, suffix = "" }: { label: string; score: number; suffix?: string }) {
  const pct = Math.round(score * 100);
  const color = pct >= 70 ? "bg-emerald-500" : pct >= 40 ? "bg-amber-500" : "bg-red-500";
  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{pct}%{suffix}</span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-muted">
        <div className={`h-full ${color} transition-all duration-500`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function getQualityIcon(label: string) {
  switch (label) {
    case "excellent": return <CheckCircle2 className="size-3 text-emerald-600" />;
    case "good": return <CheckCircle2 className="size-3 text-blue-600" />;
    case "acceptable": return <AlertTriangle className="size-3 text-amber-600" />;
    default: return <XCircle className="size-3 text-red-600" />;
  }
}

export function AvatarValidateView({ avatarId }: { avatarId: string }) {
  const router = useRouter();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: avatar } = useSuspenseQuery(trpc.avatars.getById.queryOptions({ id: avatarId }));

  const hasValidation = avatar.validationResults && avatar.readinessScore !== null;
  const [currentJobId, setCurrentJobId] = useState<string | null>(null);
  const [stage, setStage] = useState<"image" | "analyzing" | "score">(
    hasValidation ? "score" : "image"
  );
  
  // Real-time job status polling
  const { job, isPolling, isCompleted, isFailed, stage: jobStage, progress } = useJobStatus(currentJobId);

  const [result, setResult] = useState<{ 
    readinessScore: number | null; 
    validationResults: any; 
    passed: boolean;
    jobId?: string;
  } | null>(
    hasValidation
      ? { 
          readinessScore: avatar.readinessScore, 
          validationResults: avatar.validationResults,
          passed: (avatar.readinessScore ?? 0) >= 0.6 
        }
      : null
  );

  // Sync results when query validation gets updated
  useEffect(() => {
    if (hasValidation) {
      setResult({
        readinessScore: avatar.readinessScore,
        validationResults: avatar.validationResults,
        passed: (avatar.readinessScore ?? 0) >= 0.6
      });
    }
  }, [avatar.readinessScore, avatar.validationResults, hasValidation]);

  // Handle job completion
  useEffect(() => {
    if (isCompleted) {
      queryClient.invalidateQueries({ queryKey: [['avatars', 'getById'], { input: { id: avatarId }, type: 'query' }] });
      setStage("score");
      setCurrentJobId(null);
      toast.success("Avatar validation completed!");
    } else if (isFailed && job) {
      toast.error(job.errorMessage || "Validation failed");
      setStage("image");
      setCurrentJobId(null);
    }
  }, [isCompleted, isFailed, job, queryClient, avatarId]);

  const validateMutation = useMutation(
    trpc.avatars.validate.mutationOptions({
      onSuccess: (data) => {
        if (data.jobId) {
          setCurrentJobId(data.jobId);
          setStage("analyzing");
          toast.success("Validation started!");
        } else {
          setResult(data);
          setStage("score");
        }
      },
      onError: (e) => {
        toast.error(e.message ?? "Validation failed");
        setStage("image");
      },
    })
  );

  useEffect(() => {
    if (stage === "analyzing" && !currentJobId) {
      const t = setTimeout(() => validateMutation.mutate({ id: avatarId }), 1500);
      return () => clearTimeout(t);
    }
  }, [stage, currentJobId, avatarId]);

  if (avatar.variant !== "custom") {
    router.replace("/dashboard/avatars");
    return null;
  }

  const validationResults = result?.validationResults;
  const metrics = validationResults?.metrics;

  return (
    <DashboardPageShell
      title="Validate Avatar"
      description="Analyze your avatar's suitability for video generation."
      icon={UserRound}
      breadcrumbs={[
        { label: "Avatars", href: "/dashboard/avatars" },
        { label: avatar.name },
        { label: "Validate" },
      ]}
    >
      <div className="mx-auto max-w-2xl space-y-6">
        {/* Step 1: Image check */}
        <Card className="rounded-2xl">
          <CardHeader>
            <CardTitle className="text-base flex items-center gap-2">
              <Eye className="size-4" />
              1. Avatar Image
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Review your avatar portrait before quality analysis.
            </p>
            {avatar.r2ObjectKey ? (
              <img
                src={`/api/avatars/${encodeURIComponent(avatarId)}`}
                alt={avatar.name}
                className="h-40 w-40 rounded-xl object-cover border mx-auto"
              />
            ) : (
              <span className="text-xs text-destructive">No image uploaded</span>
            )}
            {stage === "image" && (
              <Button
                disabled={!avatar.r2ObjectKey}
                onClick={() => setStage("analyzing")}
                className="w-full"
              >
                Start Quality Analysis
              </Button>
            )}
          </CardContent>
        </Card>

        {/* Step 2: Analysis + score */}
        {(stage === "analyzing" || stage === "score") && (
          <Card className="rounded-2xl">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <UserRound className="size-4" />
                2. Quality Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              {stage === "analyzing" ? (
                <div className="space-y-4">
                  <div className="flex items-center gap-3 text-sm text-muted-foreground">
                    <Spinner className="size-5 text-primary" />
                    {jobStage === "downloading_image" && "Downloading image file..."}
                    {jobStage === "analyzing_quality" && "Analyzing image quality..."}
                    {jobStage === "storing_results" && "Storing results..."}
                    {!jobStage && "Analyzing image quality..."}
                  </div>
                  <Progress value={progress || 30} className="h-2" />
                  {progress > 0 && (
                    <div className="text-xs text-muted-foreground text-center">
                      {progress}% complete
                    </div>
                  )}
                </div>
              ) : result && result.readinessScore !== null ? (
                <div className="space-y-6">
                  <ScoreBar score={result.readinessScore} />
                  
                  {/* Quality Status */}
                  <div className="flex items-center gap-2">
                    {validationResults?.quality_label && getQualityIcon(validationResults.quality_label)}
                    <span className="font-medium capitalize">
                      {validationResults?.quality_label || "Unknown"} Quality
                    </span>
                    {result.passed ? (
                      <Badge className="ml-auto bg-emerald-500 text-white">Ready for Video</Badge>
                    ) : (
                      <Badge variant="destructive" className="ml-auto">Needs Improvement</Badge>
                    )}
                  </div>

                  {/* Recommendation */}
                  {validationResults?.recommendation && (
                    <div className="rounded-lg bg-muted/50 p-3">
                      <p className="text-sm text-muted-foreground">
                        {validationResults.recommendation}
                      </p>
                    </div>
                  )}

                  {/* Detailed Metrics */}
                  {metrics && (
                    <div className="space-y-3">
                      <h4 className="font-medium text-sm">Quality Breakdown</h4>
                      <div className="grid grid-cols-1 gap-3">
                        {metrics.faces_detected !== undefined && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Faces Detected</span>
                            <span className="font-medium">{metrics.faces_detected}</span>
                          </div>
                        )}
                        {metrics.width && metrics.height && (
                          <div className="flex justify-between text-xs">
                            <span className="text-muted-foreground">Resolution</span>
                            <span className="font-medium">{metrics.width}×{metrics.height}</span>
                          </div>
                        )}
                        {metrics.resolution_score !== undefined && (
                          <MetricBar label="Resolution Quality" score={metrics.resolution_score} />
                        )}
                        {metrics.face_score !== undefined && (
                          <MetricBar label="Face Quality" score={metrics.face_score} />
                        )}
                        {metrics.brightness_score !== undefined && (
                          <MetricBar label="Lighting" score={metrics.brightness_score} />
                        )}
                        {metrics.sharpness_score !== undefined && (
                          <MetricBar label="Sharpness" score={metrics.sharpness_score} />
                        )}
                        {metrics.contrast_score !== undefined && (
                          <MetricBar label="Contrast" score={metrics.contrast_score} />
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <Button 
                      variant="outline" 
                      onClick={() => { 
                        setStage("analyzing"); 
                        setResult(null); 
                        validateMutation.reset();
                      }} 
                      className="flex-1"
                    >
                      Re-analyze
                    </Button>
                    <Button onClick={() => router.push("/dashboard/avatars")} className="flex-1">
                      Done
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-sm text-muted-foreground">
                  <Spinner className="size-5 text-primary" />
                  Validation job queued - waiting for results...
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </DashboardPageShell>
  );
}
