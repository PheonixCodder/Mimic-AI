"use client";

import { Pencil, Trash2, MoreHorizontal, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { BrandKit } from "@/trpc/routers/brand-kits";

type BrandKitCardProps = {
  kit: BrandKit;
  canWrite: boolean;
  onEdit: (kit: BrandKit) => void;
  onDelete: (kit: BrandKit) => void;
};

export function BrandKitCard({ kit, canWrite, onEdit, onDelete }: BrandKitCardProps) {
  const initials = kit.name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? "")
    .join("");

  return (
    <div className="flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-4">
      {/* Logo / Monogram */}
      <div className="relative flex h-24 w-20 shrink-0 items-center justify-center overflow-hidden bg-muted lg:h-28 lg:w-24">
        {kit.logoUrl ? (
          <img
            src={kit.logoUrl}
            alt={kit.name}
            className="size-full object-contain p-2"
          />
        ) : (
          <div className="flex flex-col items-center gap-1">
            <div
              className="flex size-10 items-center justify-center rounded-xl text-white text-sm font-bold"
              style={{ backgroundColor: kit.colors.primary }}
            >
              {initials || <Palette className="size-4" />}
            </div>
          </div>
        )}
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-2 px-3 py-3">
        <div>
          <p className="line-clamp-1 text-sm font-medium tracking-tight">{kit.name}</p>
          <p className="text-xs text-muted-foreground">{kit.fonts.primary} / {kit.fonts.header}</p>
        </div>

        {/* Colour swatches */}
        <div className="flex items-center gap-1.5">
          {[kit.colors.primary, kit.colors.secondary, kit.colors.background, kit.colors.text].map(
            (color, i) => (
              <div
                key={i}
                title={color}
                className="size-5 rounded-md border shadow-sm"
                style={{ backgroundColor: color }}
              />
            ),
          )}
          <span className="ml-1 text-xs text-muted-foreground">{kit.colors.primary}</span>
        </div>
      </div>

      {/* Actions */}
      {canWrite ? (
        <DropdownMenu>
          <DropdownMenuTrigger
            render={
              <Button variant="ghost" size="icon-sm" aria-label="Brand kit actions" />
            }
          >
            <MoreHorizontal className="size-4" />
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuGroup>
              <DropdownMenuItem onClick={() => onEdit(kit)}>
                <Pencil className="mr-2 size-4" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => onDelete(kit)}
              >
                <Trash2 className="mr-2 size-4" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : null}
    </div>
  );
}
