"use client";

import { useState, useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useDebouncedCallback } from "use-debounce";
import { Film, Search, Loader2, Check, X, FilmIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useTRPC } from "@/trpc/client";
import type { BRollClip } from "@/features/videos/lib/schemas";

type BRollPanelProps = {
  videoId: string;
  initialClips?: BRollClip[];
};

function BRollCard({
  clip,
  isSelected,
  onSelect,
}: {
  clip: BRollClip;
  isSelected: boolean;
  onSelect: () => void;
}) {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`relative group cursor-pointer overflow-hidden rounded-xl border bg-muted/20 transition-all hover:shadow-md ${
        isSelected ? "border-primary ring-1 ring-primary/30" : "hover:border-border"
      }`}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onSelect}
    >
      <div className="relative aspect-video w-full overflow-hidden bg-black">
        {isHovered && clip.previewUrl ? (
          <video
            src={clip.previewUrl}
            muted
            autoPlay
            loop
            playsInline
            className="size-full object-cover"
          />
        ) : (
          <img
            src={clip.thumbnailUrl || "/placeholder-broll.jpg"}
            alt={clip.title}
            className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
        )}

        <div className="absolute top-2 right-2 flex gap-1 z-10">
          <Badge variant="secondary" className="text-[9px] py-0 px-1.5 bg-black/60 text-white border-none backdrop-blur-sm">
            {clip.provider}
          </Badge>
          <Badge variant="secondary" className="text-[9px] py-0 px-1.5 bg-black/60 text-white border-none backdrop-blur-sm">
            {clip.duration}s
          </Badge>
        </div>

        {isSelected && (
          <div className="absolute inset-0 bg-primary/20 border-2 border-primary flex items-center justify-center z-10">
            <div className="bg-primary text-primary-foreground rounded-full p-1.5 shadow-md scale-100 animate-in zoom-in-75 duration-200">
              <Check className="size-4 stroke-[3]" />
            </div>
          </div>
        )}
      </div>

      <div className="p-2.5">
        <p className="line-clamp-1 text-xs font-medium text-foreground">
          {clip.title}
        </p>
        <p className="text-[10px] text-muted-foreground mt-0.5 font-mono">
          {clip.width} × {clip.height}
        </p>
      </div>
    </div>
  );
}

export function BRollPanel({ videoId, initialClips = [] }: BRollPanelProps) {
  const trpc = useTRPC();
  const queryClient = useQueryClient();

  const [query, setQuery] = useState("");
  const [searchQuery, setSearchQuery] = useState("nature");
  const [selectedClips, setSelectedClips] = useState<BRollClip[]>(initialClips);

  // Sync with initialClips on load
  useEffect(() => {
    if (initialClips && initialClips.length > 0) {
      setSelectedClips(initialClips);
    }
  }, [initialClips]);

  const debouncedSearch = useDebouncedCallback((val: string) => {
    setSearchQuery(val.trim() || "nature");
  }, 400);

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setQuery(e.target.value);
    debouncedSearch(e.target.value);
  };

  const { data: clips = [], isLoading, isError } = useQuery({
    queryKey: ["broll-search", searchQuery],
    queryFn: async () => {
      const res = await fetch(`/api/broll/search?q=${encodeURIComponent(searchQuery)}`);
      if (!res.ok) throw new Error("Failed to fetch clips");
      const data = await res.json();
      return data.clips as BRollClip[];
    },
    staleTime: 60 * 1000 * 5, // 5 min cache
  });

  const updateBrollMutation = useMutation(
    trpc.videos.updateBroll.mutationOptions({
      onSuccess: async () => {
        toast.success("B-roll clips saved successfully!");
        await queryClient.invalidateQueries({
          queryKey: trpc.videos.getById.queryKey({ id: videoId }),
        });
      },
      onError: (error) => {
        toast.error(error.message ?? "Failed to save B-roll");
      },
    }),
  );

  const toggleSelect = (clip: BRollClip) => {
    setSelectedClips((prev) => {
      const exists = prev.some((c) => c.id === clip.id);
      if (exists) {
        return prev.filter((c) => c.id !== clip.id);
      } else {
        if (prev.length >= 8) {
          toast.warning("You can select up to 8 B-roll clips per video.");
          return prev;
        }
        return [...prev, clip];
      }
    });
  };

  return (
    <div className="flex flex-col h-full bg-card border rounded-2xl p-4 shadow-sm min-h-[420px]">
      <div className="flex items-center gap-2 border-b pb-3 mb-3">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
          <Input
            placeholder="Search stock footage (Pexels + Pixabay)..."
            value={query}
            onChange={handleSearchChange}
            className="pl-8 h-9 text-xs"
          />
        </div>

        {selectedClips.length > 0 && (
          <Button
            variant="default"
            size="sm"
            className="h-9 text-xs bg-primary text-primary-foreground hover:bg-primary/95"
            disabled={updateBrollMutation.isPending}
            onClick={() =>
              updateBrollMutation.mutate({
                id: videoId,
                brollClips: selectedClips,
              })
            }
          >
            {updateBrollMutation.isPending ? (
              <Loader2 className="size-3.5 animate-spin mr-1" />
            ) : (
              <Check className="size-3.5 mr-1" />
            )}
            Save Selection
          </Button>
        )}
      </div>

      {/* Grid search results */}
      <div className="flex-1 overflow-y-auto max-h-[290px] pr-1 mb-4 custom-scrollbar">
        {isLoading ? (
          <div className="flex h-40 flex-col items-center justify-center gap-2">
            <Loader2 className="size-6 animate-spin text-primary" />
            <p className="text-xs text-muted-foreground">Searching stock libraries...</p>
          </div>
        ) : isError ? (
          <div className="flex h-40 flex-col items-center justify-center text-center p-4">
            <p className="text-xs text-destructive">Failed to fetch clips. Please try again.</p>
          </div>
        ) : clips.length === 0 ? (
          <div className="flex h-40 flex-col items-center justify-center text-center p-4 gap-1.5">
            <Film className="size-6 text-muted-foreground/50" />
            <p className="text-xs text-muted-foreground">No stock clips found for &quot;{searchQuery}&quot;</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
            {clips.map((clip) => (
              <BRollCard
                key={clip.id}
                clip={clip}
                isSelected={selectedClips.some((c) => c.id === clip.id)}
                onSelect={() => toggleSelect(clip)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Selected tray */}
      {selectedClips.length > 0 && (
        <div className="border-t pt-3 mt-auto">
          <div className="flex items-center justify-between mb-2">
            <h5 className="text-[11px] font-semibold text-foreground flex items-center gap-1">
              <FilmIcon className="size-3.5 text-primary" />
              Selected Tray ({selectedClips.length} / 8)
            </h5>
            <Button
              variant="ghost"
              size="sm"
              className="h-6 text-[10px] text-muted-foreground hover:text-foreground hover:bg-muted"
              onClick={() => setSelectedClips([])}
            >
              Clear Tray
            </Button>
          </div>

          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-thin">
            {selectedClips.map((clip) => (
              <div
                key={clip.id}
                className="relative h-14 w-24 shrink-0 overflow-hidden rounded-lg border bg-muted group shadow-sm"
              >
                <img
                  src={clip.thumbnailUrl}
                  alt={clip.title}
                  className="size-full object-cover"
                />
                <div className="absolute inset-0 bg-black/45 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <button
                    className="bg-destructive text-destructive-foreground rounded-full p-0.5 shadow-md hover:scale-110 transition-transform"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedClips((prev) => prev.filter((c) => c.id !== clip.id));
                    }}
                  >
                    <X className="size-3" />
                  </button>
                </div>
                <div className="absolute bottom-0.5 right-0.5 bg-black/60 text-white text-[8px] px-1 rounded font-mono">
                  {clip.duration}s
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
