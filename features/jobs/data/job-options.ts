import {
  Ban,
  Captions,
  CheckCircle2,
  Clapperboard,
  Clock,
  Cpu,
  Download,
  Eye,
  Film,
  Loader2,
  Mic2,
  UserRound,
  XCircle,
  type LucideIcon,
} from "lucide-react";

import type { JobStatus, JobType } from "@/features/jobs/lib/schemas";

// ---------------------------------------------------------------------------
// Job Type metadata
// ---------------------------------------------------------------------------

export type JobTypeMeta = {
  label: string;
  icon: LucideIcon;
};

export const JOB_TYPE_META: Record<JobType, JobTypeMeta> = {
  video_render: { label: "Video Render", icon: Clapperboard },
  voice_clone: { label: "Voice Clone", icon: Mic2 },
  voice_validate: { label: "Voice Validation", icon: Mic2 },
  avatar_generate: { label: "Avatar Generation", icon: UserRound },
  avatar_validate: { label: "Avatar Validation", icon: UserRound },
  video_export: { label: "Video Export", icon: Download },
  caption_generate: { label: "Caption Generation", icon: Captions },
  video_preview: { label: "Video Preview", icon: Eye },
  clip_generate: { label: "Clip Generate", icon: Film },
  model_finetune: { label: "Model Fine-tune", icon: Cpu },
};

// ---------------------------------------------------------------------------
// Job Status metadata
// ---------------------------------------------------------------------------

export type JobStatusMeta = {
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  animate?: boolean;
};

export const JOB_STATUS_META: Record<JobStatus, JobStatusMeta> = {
  queued: {
    label: "Queued",
    icon: Clock,
    color: "text-amber-600",
    bgColor: "bg-amber-50",
  },
  running: {
    label: "Running",
    icon: Loader2,
    color: "text-blue-600",
    bgColor: "bg-blue-50",
    animate: true,
  },
  completed: {
    label: "Completed",
    icon: CheckCircle2,
    color: "text-emerald-600",
    bgColor: "bg-emerald-50",
  },
  failed: {
    label: "Failed",
    icon: XCircle,
    color: "text-destructive",
    bgColor: "bg-red-50",
  },
  cancelled: {
    label: "Cancelled",
    icon: Ban,
    color: "text-muted-foreground",
    bgColor: "bg-muted",
  },
};

// ---------------------------------------------------------------------------
// Filter labels for toolbar dropdowns
// ---------------------------------------------------------------------------

export const JOB_STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "queued", label: "Queued" },
  { value: "running", label: "Running" },
  { value: "completed", label: "Completed" },
  { value: "failed", label: "Failed" },
  { value: "cancelled", label: "Cancelled" },
] as const;

export const JOB_TYPE_FILTER_OPTIONS = [
  { value: "all", label: "All types" },
  { value: "video_render", label: "Video Render" },
  { value: "voice_clone", label: "Voice Clone" },
  { value: "voice_validate", label: "Voice Validation" },
  { value: "avatar_generate", label: "Avatar Generation" },
  { value: "avatar_validate", label: "Avatar Validation" },
  { value: "video_export", label: "Video Export" },
  { value: "caption_generate", label: "Caption Generation" },
  { value: "clip_generate", label: "Clip Generate" },
] as const;
