"use client";

import Link from "next/link";
import { Clapperboard, FileText, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { Script } from "@/trpc/routers/scripts";

function formatUpdatedAt(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value));
}

type ScriptCardProps = {
  script: Script;
  canWrite?: boolean;
  onDelete: (script: Script) => void;
};

export function ScriptCard({
  script,
  canWrite = false,
  onDelete,
}: ScriptCardProps) {
  return (
    <div className="flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-6">
      <Link
        href={`/dashboard/scripts/${script.id}`}
        className="relative flex h-24 w-20 shrink-0 items-center justify-center bg-muted/50 lg:h-30 lg:w-24"
      >
        <FileText className="size-8 text-muted-foreground lg:size-10" />
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-1.5 lg:gap-2">
        <Link
          href={`/dashboard/scripts/${script.id}`}
          className="line-clamp-1 text-sm font-medium tracking-tight hover:text-primary"
        >
          {script.title}
        </Link>

        <p className="line-clamp-2 text-xs text-muted-foreground">
          {script.content || "No content yet."}
        </p>

        <p className="text-xs text-muted-foreground">
          {script.characterCount.toLocaleString()} characters · Updated{" "}
          {formatUpdatedAt(script.updatedAt)}
        </p>
      </div>

      <div className="ml-1 flex shrink-0 items-center gap-1 lg:ml-3 lg:gap-2">
        <Button
          variant="outline"
          size="sm"
          nativeButton={false}
          render={
            <Link
              href={`/dashboard/videos/new?scriptId=${encodeURIComponent(script.id)}`}
            />
          }
        >
          <Clapperboard />
          Use in video
        </Button>

        {canWrite ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              render={
                <Button
                  variant="outline"
                  size="icon-sm"
                  className="rounded-full"
                  aria-label="Script actions"
                />
              }
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuGroup>
                <DropdownMenuItem
                  nativeButton={false}
                  render={
                    <Link href={`/dashboard/scripts/${script.id}`} />
                  }
                >
                  <Pencil />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem
                  variant="destructive"
                  onClick={() => onDelete(script)}
                >
                  <Trash2 />
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
