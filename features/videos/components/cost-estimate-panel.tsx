"use client";

import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTRPC } from "@/trpc/client";
import type { VideoResolution } from "@/features/videos/data/video-options";

type Props = {
  script: string;
  voiceId: string;
  avatarId: string;
  resolution: VideoResolution;
  includeCaptions?: boolean;
  onEstimateReady?: (estimate: { total: number; formattedTotal: string }) => void;
};

export function CostEstimatePanel({
  script,
  voiceId,
  avatarId,
  resolution,
  includeCaptions = true,
  onEstimateReady,
}: Props) {
  const trpc = useTRPC();

  const enabled = script.length > 0 && voiceId.length > 0 && avatarId.length > 0;

  const { data, isPending, isError } = useQuery({
    ...trpc.estimate.calculateDraft.queryOptions(
      { script, voiceId, avatarId, resolution, includeCaptions },
      { enabled },
    ),
    enabled,
  });

  useEffect(() => {
    if (data) {
      onEstimateReady?.({ total: data.total, formattedTotal: data.formattedTotal });
    }
  }, [data, onEstimateReady]);

  return (
    <div className="space-y-4 rounded-xl border p-4">
      <div>
        <h3 className="text-sm font-semibold tracking-tight">Estimated cost</h3>
        <p className="text-xs text-muted-foreground">
          Calculated from your script, voice, avatar, and resolution.
        </p>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Amount</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isPending || !enabled ? (
            <>
              {[0, 1, 2].map((i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-16" /></TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-20" /></TableCell>
              </TableRow>
            </>
          ) : isError ? (
            <TableRow>
              <TableCell colSpan={2} className="text-xs text-destructive">
                Failed to load estimate. Check your voice and avatar selection.
              </TableCell>
            </TableRow>
          ) : (
            <>
              {data.lineItems.map((item) => (
                <TableRow key={item.name}>
                  <TableCell className="text-sm">
                    {item.name}
                    <span className="ml-1 text-xs text-muted-foreground">
                      ({item.quantity} {item.unit})
                    </span>
                  </TableCell>
                  <TableCell className="text-right text-sm">{item.formattedTotal}</TableCell>
                </TableRow>
              ))}
              <TableRow>
                <TableCell className="font-medium">Estimated total</TableCell>
                <TableCell className="text-right font-medium">{data.formattedTotal}</TableCell>
              </TableRow>
            </>
          )}
        </TableBody>
      </Table>
    </div>
  );
}
