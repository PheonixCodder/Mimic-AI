"use client";

import { Palette } from "lucide-react";
import {
  Empty,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
  EmptyDescription,
} from "@/components/ui/empty";
import { BrandKitCard } from "./brand-kit-card";
import type { BrandKit } from "@/trpc/routers/brand-kits";

type BrandKitsListProps = {
  kits: BrandKit[];
  canWrite: boolean;
  onEdit: (kit: BrandKit) => void;
  onDelete: (kit: BrandKit) => void;
};

export function BrandKitsList({ kits, canWrite, onEdit, onDelete }: BrandKitsListProps) {
  if (kits.length === 0) {
    return (
      <Empty className="border">
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <Palette />
          </EmptyMedia>
          <EmptyTitle>No brand kits</EmptyTitle>
          <EmptyDescription>
            {canWrite
              ? "Create your first brand kit to define workspace colours, logos, and fonts."
              : "No brand kits have been created in this workspace."}
          </EmptyDescription>
        </EmptyHeader>
      </Empty>
    );
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
      {kits.map((kit) => (
        <BrandKitCard
          key={kit.id}
          kit={kit}
          canWrite={canWrite}
          onEdit={onEdit}
          onDelete={onDelete}
        />
      ))}
    </div>
  );
}
