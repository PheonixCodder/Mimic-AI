import type { VideoStatus } from "@/features/videos/data/video-options";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  VideoStatus,
  { label: string; variant: "secondary" | "outline" | "default" | "destructive" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  processing: { label: "Processing", variant: "default" },
  completed: { label: "Completed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

type VideoStatusBadgeProps = {
  status: string;
};

export function VideoStatusBadge({ status }: VideoStatusBadgeProps) {
  const config = STATUS_CONFIG[status as VideoStatus] ?? {
    label: status,
    variant: "outline" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
