import { NextRequest, NextResponse } from "next/server";

export interface BRollClip {
  id: string;
  provider: "pexels" | "pixabay" | "mock";
  title: string;
  thumbnailUrl: string;
  previewUrl: string;
  duration: number;
  width: number;
  height: number;
  tags: string[];
}

// ---------------------------------------------------------------------------
// Mock data — used when API keys are absent
// ---------------------------------------------------------------------------

const MOCK_CLIPS: BRollClip[] = [
  {
    id: "mock:1",
    provider: "mock",
    title: "Ocean Waves at Sunset",
    thumbnailUrl: "https://images.pexels.com/videos/1093662/pictures/preview-0.jpg",
    previewUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: 12,
    width: 1920,
    height: 1080,
    tags: ["ocean", "sunset", "nature", "waves"],
  },
  {
    id: "mock:2",
    provider: "mock",
    title: "City Traffic Time-lapse",
    thumbnailUrl: "https://images.pexels.com/videos/1739010/pictures/preview-0.jpg",
    previewUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: 8,
    width: 1920,
    height: 1080,
    tags: ["city", "traffic", "urban", "timelapse"],
  },
  {
    id: "mock:3",
    provider: "mock",
    title: "Mountain Forest Aerial",
    thumbnailUrl: "https://images.pexels.com/videos/855936/pictures/preview-0.jpg",
    previewUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: 15,
    width: 3840,
    height: 2160,
    tags: ["mountain", "forest", "aerial", "nature"],
  },
  {
    id: "mock:4",
    provider: "mock",
    title: "People Walking in Office",
    thumbnailUrl: "https://images.pexels.com/videos/3253701/pictures/preview-0.jpg",
    previewUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: 10,
    width: 1920,
    height: 1080,
    tags: ["office", "people", "business", "walking"],
  },
  {
    id: "mock:5",
    provider: "mock",
    title: "Tech Abstract Data Visualization",
    thumbnailUrl: "https://images.pexels.com/videos/3129957/pictures/preview-0.jpg",
    previewUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: 20,
    width: 1920,
    height: 1080,
    tags: ["technology", "abstract", "data", "digital"],
  },
  {
    id: "mock:6",
    provider: "mock",
    title: "Coffee Shop Morning Atmosphere",
    thumbnailUrl: "https://images.pexels.com/videos/5490301/pictures/preview-0.jpg",
    previewUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: 14,
    width: 1920,
    height: 1080,
    tags: ["coffee", "morning", "cafe", "lifestyle"],
  },
  {
    id: "mock:7",
    provider: "mock",
    title: "Rain on Window",
    thumbnailUrl: "https://images.pexels.com/videos/8179360/pictures/preview-0.jpg",
    previewUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: 18,
    width: 1920,
    height: 1080,
    tags: ["rain", "window", "weather", "calm"],
  },
  {
    id: "mock:8",
    provider: "mock",
    title: "Drone Shot of Beach",
    thumbnailUrl: "https://images.pexels.com/videos/2169880/pictures/preview-0.jpg",
    previewUrl: "https://www.w3schools.com/html/mov_bbb.mp4",
    duration: 22,
    width: 3840,
    height: 2160,
    tags: ["beach", "drone", "aerial", "sea"],
  },
];

// ---------------------------------------------------------------------------
// Pexels fetcher
// ---------------------------------------------------------------------------

async function fetchPexels(query: string, apiKey: string): Promise<BRollClip[]> {
  const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=20&orientation=landscape`;
  const res = await fetch(url, { headers: { Authorization: apiKey } });
  if (!res.ok) return [];
  const data = await res.json();
  return (data.videos ?? []).map((v: any) => {
    const file = v.video_files?.find((f: any) => f.quality === "sd") ?? v.video_files?.[0];
    const preview = v.video_pictures?.[0]?.picture ?? "";
    return {
      id: `pexels:${v.id}`,
      provider: "pexels" as const,
      title: v.user?.name ? `${query} by ${v.user.name}` : query,
      thumbnailUrl: preview,
      previewUrl: file?.link ?? "",
      duration: v.duration ?? 0,
      width: v.width ?? 1920,
      height: v.height ?? 1080,
      tags: [],
    };
  });
}

// ---------------------------------------------------------------------------
// Pixabay fetcher
// ---------------------------------------------------------------------------

async function fetchPixabay(query: string, apiKey: string): Promise<BRollClip[]> {
  const url = `https://pixabay.com/api/videos/?key=${apiKey}&q=${encodeURIComponent(query)}&per_page=20`;
  const res = await fetch(url);
  if (!res.ok) return [];
  const data = await res.json();
  return (data.hits ?? []).map((v: any) => {
    const file = v.videos?.small ?? v.videos?.medium ?? {};
    return {
      id: `pixabay:${v.id}`,
      provider: "pixabay" as const,
      title: v.tags?.split(",")[0]?.trim() ?? query,
      thumbnailUrl: `https://i.vimeocdn.com/video/${v.picture_id}_295x166.jpg`,
      previewUrl: file.url ?? "",
      duration: file.size ? Math.round(file.size / 100000) : 10,
      width: file.width ?? 1280,
      height: file.height ?? 720,
      tags: (v.tags ?? "").split(",").map((t: string) => t.trim()).filter(Boolean),
    };
  });
}

// ---------------------------------------------------------------------------
// Route handler
// ---------------------------------------------------------------------------

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const query = searchParams.get("q")?.trim() || "nature";

  const pexelsKey = process.env.PEXELS_API_KEY;
  const pixabayKey = process.env.PIXABAY_API_KEY;

  // Fallback to mock data when no API keys are configured
  if (!pexelsKey && !pixabayKey) {
    const filtered = query
      ? MOCK_CLIPS.filter(
          (c) =>
            c.title.toLowerCase().includes(query.toLowerCase()) ||
            c.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
        )
      : MOCK_CLIPS;
    return NextResponse.json({ clips: filtered.length > 0 ? filtered : MOCK_CLIPS });
  }

  const [pexelsResults, pixabayResults] = await Promise.allSettled([
    pexelsKey ? fetchPexels(query, pexelsKey) : Promise.resolve([]),
    pixabayKey ? fetchPixabay(query, pixabayKey) : Promise.resolve([]),
  ]);

  const clips: BRollClip[] = [
    ...(pexelsResults.status === "fulfilled" ? pexelsResults.value : []),
    ...(pixabayResults.status === "fulfilled" ? pixabayResults.value : []),
  ].filter((c) => c.previewUrl);

  // Interleave providers for variety
  const pexels = clips.filter((c) => c.provider === "pexels");
  const pixabay = clips.filter((c) => c.provider === "pixabay");
  const merged: BRollClip[] = [];
  const max = Math.max(pexels.length, pixabay.length);
  for (let i = 0; i < max; i++) {
    if (pexels[i]) merged.push(pexels[i]);
    if (pixabay[i]) merged.push(pixabay[i]);
  }

  return NextResponse.json({ clips: merged.slice(0, 40) });
}
