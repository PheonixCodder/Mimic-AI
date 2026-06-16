import { Clapperboard, Film } from "lucide-react";

import { VideoCard } from "./video-card";
import type { VideoItem } from "./video-card";

type VideosListProps = {
  videos: VideoItem[];
  canDelete?: boolean;
};

export function VideosList({ videos, canDelete = false }: VideosListProps) {
  if (!videos.length) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 py-12">
        <div className="relative flex h-14 w-32 items-center justify-center">
          <div className="absolute left-0 -rotate-30 rounded-full bg-muted p-4">
            <Film className="size-5 text-muted-foreground" />
          </div>

          <div className="relative z-10 rounded-full bg-foreground p-4">
            <Clapperboard className="size-5 text-background" />
          </div>

          <div className="absolute right-0 rotate-30 rounded-full bg-muted p-4">
            <Film className="size-5 text-muted-foreground" />
          </div>
        </div>

        <p className="text-lg font-semibold tracking-tight text-foreground">
          No videos yet
        </p>

        <p className="max-w-md text-center text-sm text-muted-foreground">
          Start the generation wizard to save your first video draft.
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
      {videos.map((video) => (
        <VideoCard key={video.id} video={video} canDelete={canDelete} />
      ))}
    </div>
  );
}
