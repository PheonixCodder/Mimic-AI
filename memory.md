# Memory — Phase 2 AI Pipeline (Items 26-31) — Ready for talking preview testing

Last updated: 2026-06-17

## What was built

### Phase 1 — Foundation & Core Studios
- **Marketing Layout (Item 11):** Route group `app/(marketing)/` with shared sticky header & footer. Landing, pricing comparison (Starter/Pro/Scale), and examples page.
- **Core Workspace & Studios:** Projects CRUD, Voice library UI + clone flow, Avatar library + upload flow, Video library + wizard shell, Script studio, templates & brand kits, Export studio, Job queue UI, Webhooks, polar billing foundation, settings page.
- **Infrastructure:** R2, Cloudinary, Polar billing, Trigger.dev wired.

### Phase 2 — AI Generation Pipeline (Items 26-31)
- **Talking Avatars (Item 26):** Deployed Modal app `mimic-talking-avatar` with `simulate` mode (default, OpenCV face motion warping + ffmpeg audio) and `hallo3` mode (real GPU A100 inference). Wired preview and validation workflows.
- **Video Generation / Clips (Item 27):** Deployed Modal app `mimic-video-generation` (simulate + wan2 modes), CPU simulate fallback `mimic-video-generation-simulate`, DB migrations and tRPC `clipsRouter` CRUD, streaming route, and interactive Clips UI library.
- **Caption Generation (Item 28):** Deployed Modal app `mimic-caption-generation` (faster-whisper), database transcript columns, interactive subtitles highlighting + manual edits, and SRT/WebVTT/TXT downloads.
- **Final Rendering Pipeline (Item 29):** Deployed Modal app `mimic-video-composition` for overlaying captions and watermarks.
- **B-roll Integration (Item 30):**
  - Database migration `20260625100000_videos-broll.sql` applied.
  - Server-side search proxy `app/api/broll/search/route.ts` fanning out to Pexels + Pixabay in parallel (falls back to mock data when keys are absent).
  - Extended tRPC router `trpc/routers/videos.ts` with `updateBroll` and mapped the `broll_clips` column.
  - Added `BRollClip` type to `features/videos/lib/schemas.ts`.
  - Created `<BRollPanel>` component (`features/videos/components/broll-panel.tsx`) with search, hover-play preview, selection tray, and DB saving.
  - Embedded "B-Roll" tab inside the video detail view page.
- **Watermark Engine (Item 31):**
  - Free-tier forced `mimic.ai` system watermark; paid-tier customization (text, logo, position, opacity, size).
  - Brand-kit watermark defaults stored in `brand_kits` table.
  - Watermark settings persisted on `video_clips` and `video_exports` rows.
  - Reusable UI component `features/watermark/components/watermark-settings-fields.tsx` integrated into clip generation and export dialogs.
  - Modal pipelines (`video_generation.py`, `video_generation_simulate.py`, `video_composition.py`) render text/logo overlays via FFmpeg/OpenCV.
  - New helper `lib/billing/workspace-subscription.ts` resolves premium status via Polar.

### Database migration fix
- Created and applied `20260627100001_jobs-extend-types.sql` to extend `jobs.type` check constraint to include `video_preview` and `clip_generate`, and `jobs.resource_type` to include `clip`. This fixes the talking preview error: `new row for relation "jobs" violates check constraint "jobs_type_check"`.

---

## Decisions made

- **Single long-scroll homepage** at `/` — resolves routing conflict with `app/page.tsx`.
- **`buttonVariants + Link`** — Use instead of `Button asChild` since the current shadcn version does not support it.
- **Parallel stock search & interleaving:** Queries fan out to Pexels + Pixabay in parallel and results are interleaved for maximum variety.
- **Graceful fallback:** API search proxy serves curated mock data when API credentials are not set, keeping the UI fully functional.
- **Hover-play previews:** Muted `<video>` elements render on hover in the stock browser grid for instant visual verification.
- **Free-tier watermark gating:** Polar subscription status determines whether watermark is editable/removable; free plans always burn the default system watermark.

---

## Problems solved

- **Database migration timestamp conflict:** Renamed `20260616120000_videos-broll.sql` to `20260625100000_videos-broll.sql` to prevent head mismatches.
- **Next.js routing conflict:** Removed old root placeholder `app/page.tsx` to let marketing layout handle `/` cleanly.
- **Talking preview job-type constraint:** `jobs.type` originally did not allow `video_preview`; added `20260627100001_jobs-extend-types.sql` to extend the CHECK constraint and applied it successfully.

---

## Current state

- All Phase 1 modules (Items 7-25) are fully functional.
- Phase 2 Items 26-31 are complete and database migrations are up to date.
- The talking preview job constraint bug is fixed; ready to test `/dashboard/videos/new` through the review step again.
- All Modal apps are deployed (talking avatar, video generation, caption generation, video composition).

---

## Next session starts with

**Test the talking preview flow**
- Retry the generation wizard at `http://localhost:3000/dashboard/videos/new` and click **Generate talking preview** in the review step to confirm the job is queued and the Modal preview renders successfully.
- If the preview works, move on to **Item 32 — Real-time preview engine** (15 fps stream during generation).

---

## Open questions

None.
