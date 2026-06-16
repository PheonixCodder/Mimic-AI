import type { ClipStatus } from "@/features/clips/data/clip-options";
import { Badge } from "@/components/ui/badge";

const STATUS_CONFIG: Record<
  ClipStatus,
  { label: string; variant: "secondary" | "outline" | "default" | "destructive" }
> = {
  draft: { label: "Draft", variant: "secondary" },
  pending: { label: "Pending", variant: "outline" },
  processing: { label: "Processing", variant: "default" },
  completed: { label: "Completed", variant: "default" },
  failed: { label: "Failed", variant: "destructive" },
};

type ClipStatusBadgeProps = {
  status: string;
};

export function ClipStatusBadge({ status }: ClipStatusBadgeProps) {
  const config = STATUS_CONFIG[status as ClipStatus] ?? {
    label: status,
    variant: "outline" as const,
  };

  return <Badge variant={config.variant}>{config.label}</Badge>;
}
