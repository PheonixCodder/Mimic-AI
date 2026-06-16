# Memory — Phase 1 Foundation & Phase 2 AI Pipeline (Items 26-30)

Last updated: 2026-06-16 10:24 AM

## What was built

### Phase 1 — Foundation & Core Studios
- **Marketing Layout (Item 11):** Route group `app/(marketing)/` with shared sticky header & footer. Landing, pricing comparison (Starter/Pro/Scale), and examples page.
- **Core Workspace & Studios:** Projects CRUD, Voice library UI + clone flow, Avatar library + upload flow, Video library + wizard shell, Script studio, templates & brand kits, Export studio, Job queue UI, Webhooks, polar billing foundation, settings page.
- **Infrastructure:** R2, Cloudinary, Polar billing, Trigger.dev wired.

### Phase 2 — AI Generation Pipeline (Items 26-30)
- **Talking Avatars (Item 26):** Deployed Modal app `mimic-talking-avatar` with `simulate` mode (default, OpenCV face motion warping + ffmpeg audio) and `hallo3` mode (real GPU A100 inference). Wired preview and validation workflows.
- **Video Generation / Clips (Item 27):** Deployed Modal app `mimic-video-generation` (simulate + wan2 modes), DB migrations and tRPC `clipsRouter` CRUD, streaming route, and interactive Clips UI library.
- **Caption Generation (Item 28):** Deployed Modal app `mimic-caption-generation` (faster-whisper), database transcript columns, interactive subtitles highlighting + manual edits, and SRT/WebVTT/TXT downloads.
- **Final Rendering Pipeline (Item 29):** Deployed Modal app `mimic-video-composition` for overlaying captions and watermarks.
- **B-roll Integration (Item 30):**
  - Database migration `20260625100000_videos-broll.sql` applied.
  - Server-side search proxy `app/api/broll/search/route.ts` fanning out to Pexels + Pixabay in parallel (falls back to mock data when keys are absent).
  - Extended tRPC router [trpc/routers/videos.ts](file:///C:/Users/ubaid/OneDrive/Desktop/mimic-ai/trpc/routers/videos.ts) with `updateBroll` and mapped the `broll_clips` column.
  - Added `BRollClip` type to `features/videos/lib/schemas.ts`.
  - Created `<BRollPanel>` component (`features/videos/components/broll-panel.tsx`) with search, hover-play preview, selection tray, and DB saving.
  - Embedded "B-Roll" tab inside the video detail view page.

---

## Decisions made

- **Single long-scroll homepage** at `/` — resolves routing conflict with `app/page.tsx`.
- **`buttonVariants + Link`** — Use instead of `Button asChild` since the current shadcn version does not support it.
- **Parallel stock search & interleaving:** Queries fan out to Pexels + Pixabay in parallel and results are interleaved for maximum variety.
- **Graceful fallback:** API search proxy serves curated mock data when API credentials are not set, keeping the UI fully functional.
- **Hover-play previews:** Muted `<video>` elements render on hover in the stock browser grid for instant visual verification.

---

## Problems solved

- **Database migration timestamp conflict:** Renamed `20260616120000_videos-broll.sql` to `20260625100000_videos-broll.sql` to prevent head mismatches.
- **Next.js routing conflict:** Removed old root placeholder `app/page.tsx` to let marketing layout handle `/` cleanly.

---

## Current state

- All Phase 1 modules (Items 7-25) are fully functional.
- Phase 2 Items 26-30 are complete, verified type-safe with `tsc`, and database migrations are fully up to date.

---

## Next session starts with

**Phase 2 — AI Generation Pipeline (Item 31)**
- Implement the **Watermark engine** (Items with free tier watermark overlay / paid tier clean output).

---

## Open Questions

None.
