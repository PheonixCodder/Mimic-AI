import { Film } from "lucide-react";

import { ClipCard } from "./clip-card";
import type { ClipItem } from "./clip-card";

type ClipsListProps = {
  clips: ClipItem[];
  canDelete?: boolean;
};

export function ClipsList({ clips, canDelete = false }: ClipsListProps) {
  if (!clips.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="relative flex h-14 w-32 items-center justify-center">
          <div className="absolute left-0 -rotate-30 rounded-full bg-muted p-4">
            <Film className="size-5 text-muted-foreground" />
          </div>

          <div className="relative z-10 rounded-full bg-foreground p-4">
            <Film className="size-5 text-background" />
          </div>

          <div className="absolute right-0 rotate-30 rounded-full bg-muted p-4">
            <Film className="size-5 text-muted-foreground" />
          </div>
        </div>

        <p className="text-lg font-semibold tracking-tight text-foreground">
          No clips yet
        </p>

        <p className="max-w-md text-center text-sm text-muted-foreground">
          Generate your first AI video clip to start.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {clips.map((clip) => (
        <ClipCard key={clip.id} clip={clip} canDelete={canDelete} />
      ))}
    </div>
  );
}
