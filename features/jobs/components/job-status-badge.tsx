import { JOB_STATUS_META } from "@/features/jobs/data/job-options";
import type { JobStatus } from "@/features/jobs/lib/schemas";
import { cn } from "@/lib/utils";

type JobStatusBadgeProps = {
  status: JobStatus;
  className?: string;
};

export function JobStatusBadge({ status, className }: JobStatusBadgeProps) {
  const meta = JOB_STATUS_META[status];
  const Icon = meta.icon;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium",
        meta.bgColor,
        meta.color,
        className,
      )}
    >
      <Icon className={cn("size-3", meta.animate && "animate-spin")} />
      {meta.label}
    </span>
  );
}
