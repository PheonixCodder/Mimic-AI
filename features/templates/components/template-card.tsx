"use client";

import Link from "next/link";
import {
  Clapperboard,
  MoreHorizontal,
  Pencil,
  Trash2,
  UserRound,
  Mic2,
  Subtitles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { Template } from "@/trpc/routers/templates";

const ASPECT_RATIO_LABELS: Record<string, string> = {
  "16:9": "16:9 Landscape",
  "9:16": "9:16 Portrait",
  "1:1": "1:1 Square",
};

type TemplateCardProps = {
  template: Template;
  canWrite: boolean;
  onEdit: (template: Template) => void;
  onDelete: (template: Template) => void;
};

export function TemplateCard({ template, canWrite, onEdit, onDelete }: TemplateCardProps) {
  return (
    <div className="flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-4">
      {/* Aspect ratio visual */}
      <div className="relative flex h-24 w-20 shrink-0 items-center justify-center bg-muted lg:h-28 lg:w-24">
        <div
          className="flex items-center justify-center rounded-md bg-primary/10 text-primary text-[10px] font-bold"
          style={{
            width: template.layoutConfig.aspectRatio === "9:16" ? 28 : template.layoutConfig.aspectRatio === "1:1" ? 36 : 48,
            height: template.layoutConfig.aspectRatio === "9:16" ? 50 : template.layoutConfig.aspectRatio === "1:1" ? 36 : 28,
          }}
        >
          <Clapperboard className="size-4 text-primary" />
        </div>
      </div>

      {/* Info */}
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 px-3 py-3">
        <div>
          <p className="line-clamp-1 text-sm font-medium tracking-tight">{template.name}</p>
          {template.description ? (
            <p className="line-clamp-1 text-xs text-muted-foreground">{template.description}</p>
          ) : null}
        </div>

        <div className="flex flex-wrap items-center gap-1.5">
          <Badge variant="secondary" className="text-[10px]">
            {ASPECT_RATIO_LABELS[template.layoutConfig.aspectRatio] ?? template.layoutConfig.aspectRatio}
          </Badge>
          {template.voiceName ? (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Mic2 className="size-2.5" />
              {template.voiceName}
            </Badge>
          ) : null}
          {template.avatarName ? (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <UserRound className="size-2.5" />
              {template.avatarName}
            </Badge>
          ) : null}
          {template.layoutConfig.subtitlesEnabled ? (
            <Badge variant="outline" className="gap-1 text-[10px]">
              <Subtitles className="size-2.5" />
              Subtitles
            </Badge>
          ) : null}
        </div>

        {template.brandKitName ? (
          <p className="text-xs text-muted-foreground">Brand: {template.brandKitName}</p>
        ) : null}
      </div>

      {/* Actions */}
      <div className="flex shrink-0 flex-col items-end gap-2">
        <Button
          render={<Link href={`/dashboard/videos/new?templateId=${template.id}`} />}
          nativeButton={false}
          variant="outline"
          size="sm"
          className="text-xs"
        >
          <Clapperboard className="size-3.5" />
          Use
        </Button>

        {canWrite ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-sm" aria-label="Template actions" />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem onClick={() => onEdit(template)}>
                  <Pencil className="mr-2 size-4" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(template)}
                >
                  <Trash2 className="mr-2 size-4" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>
    </div>
  );
}
