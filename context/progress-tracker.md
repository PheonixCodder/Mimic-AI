# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 2 — AI Generation Pipeline ✅ COMPLETED (Consolidated & Type-Checked on main)
**Last completed:** Branch split audit, consolidation, and main-branch merge (Items 26-30 fully integrated)
**Next:** Real-time preview engine (Item 32)

---

## Progress

### Phase 0 — Generation Safety Layer
- [ ] 01 Voice validation pipeline
- [ ] 02 Avatar validation pipeline
- [ ] 03 Content moderation checks
- [ ] 04 Cost transparency engine
- [ ] 05 Preview & approval workflow
- [ ] 06 Consent confirmation gate

### Phase 1 — Foundation & Core Studios
- [x] 07 InsForge Auth setup
- [x] 08 Custom workspace system (partial — bootstrap + tRPC, invites later)
- [x] 09 Dashboard shell
- [x] 10 shadcn/ui init (radix-nova, green palette)
- [x] 11 Marketing layout (landing, features, pricing, examples)
- [x] 12 Projects CRUD
- [x] 13 Voice library UI + clone flow
- [x] 14 Avatar library UI + create flow
- [x] 15 Video library UI + generation wizard shell
- [x] 16 Script studio
- [x] 17 Templates & brand kits
- [x] 18 Export studio
- [x] 19 Job queue UI
- [x] 20 Webhooks UI + API
- [x] 21 Cloudflare R2 integration
- [x] 22 Cloudinary integration
- [x] 23 Polar billing foundations
- [x] 24 Settings page
- [x] 25 Trigger.dev setup

### Phase 2 — AI Generation Pipeline
- [x] 26 Talking avatars
- [x] 27 Video generation
- [x] 28 Caption generation
- [x] 29 Final rendering pipeline
- [x] 30 B-roll integration
- [x] 31 Watermark engine
- [ ] 32 Real-time preview engine
- [ ] 33 Team features

### Phase 3 — Enterprise
- [ ] 34 SSO
- [ ] 35 Audit center
- [ ] 36 API platform
- [ ] 37 A/B testing studio
- [ ] 38 Admin panel

### Phase 4 — Differentiation
- [ ] 39 Fine-tuning studio
- [ ] 40 Digital Twin Memory
- [ ] 41 Advanced enterprise controls
- [ ] 42 Kubernetes deployment support

---

## Decisions Made During Build

| Date | Decision | Rationale |
|------|----------|-----------|
| 2026-06-13 | Use Trigger.dev for async AI jobs | Reference sample pattern; realtime UI progress |
| 2026-06-13 | Use tRPC (not Server Actions only) | Match sample architecture; type-safe API |
| 2026-06-13 | Custom InsForge workspaces (no Clerk orgs) | InsForge has no built-in org management |
| 2026-06-13 | shadcn radix-nova with green palette | Sample design + mimic-ai brand colors |
| 2026-06-13 | Keep `app/` at root (no `src/` prefix) | Match current Next.js scaffold |
| 2026-06-13 | Bun as package manager | Already in project; sample uses Bun |
| 2026-06-13 | Core flow: Validate → Preview → Estimate → Approve → Generate → Export → Optimize | Reduces wasted GPU, billing disputes, churn |
| 2026-06-14 | InsForge foundation migration applied | profiles, workspaces, workspace_members + RLS |
| 2026-06-15 | R2 upload + media proxy routes | media_assets table, presign/complete, /api/media/[assetId] stream |
| 2026-06-15 | Projects CRUD | projects table + RLS, tRPC router, list/detail UI with role-based permissions |
| 2026-06-15 | Voice library + clone flow | voices table, system seed script, library UI, upload/record clone |
| 2026-06-15 | Avatar library + upload flow | avatars table, system seed from scripts/avatars, portrait cards, image upload |
| 2026-06-15 | Video library + wizard shell | videos table, draft-only create, 5-step wizard, library cards, detail shell |
| 2026-06-15 | Script studio | scripts table, CRUD tRPC, library + editor pages, wizard ?scriptId= prefill |
| 2026-06-15 | Templates & brand kits | brand_kits + templates tables + RLS, logo upload/proxy routes, templates CRUD UI, wizard template prefill |
| 2026-06-15 | Export studio | video_exports table + RLS, export dialog/drawers, upgrade simulation, download streaming proxy, polling queue |
| 2026-06-15 | Job queue UI | jobs table + RLS, cancel/retry/delete procedures, multi-stage background simulated jobs, automatic polling state refresh |
| 2026-06-15 | Trigger.dev Setup | runJobTask task created to orchestrating renders, clones, and exports; Next.js routers connected using tasks.trigger |
| 2026-06-15 | Webhooks UI + API | Created webhook_endpoints & webhook_deliveries tables + RLS, built tRPC webhooksRouter, registered background sendWebhookTask, integrated job state change hooks, and created developer dashboard UI |
| 2026-06-15 | Polar Billing Foundations | Integrated Polar SDK with `getStateExternal` customer state, on-the-fly customer creation, tRPC `billing` router (getStatus, createCheckout, createPortalSession), sidebar usage widget, settings page billing panel, and metered event ingestion on voice clones, avatars, scripts, and video renders. |
| 2026-06-15 | Settings page (Item 24) | DB migration adds `notification_preferences` JSONB to profiles. tRPC `workspaces` router extended with `update`, `getMembers`, `updateMemberRole`, `removeMember`, `addMember`. `profile` router extended with `updateProfile`, `updatePreferences`. Settings view rebuilt as a 5-tab layout: Profile, Workspace, Team, Notifications, Billing. |
| 2026-06-15 | Marketing layout (Item 11) | `app/(marketing)/` route group with shared sticky nav + footer. Long-scroll homepage at `/` (Hero, Features, How It Works, Examples, Pricing, CTA). Dedicated `/pricing` page with full comparison table. Auth layout updated with back-to-home nav. All buttons use `buttonVariants + Link` (no `asChild`). `app/page.tsx` deleted to resolve routing conflict. |
| 2026-06-15 | Talking avatars pipeline (Item 26) | Modal `mimic-talking-avatar` app in `simulate` mode (OpenCV face warping + ffmpeg merge). Chatterbox TTS wired for speech. `run-job.ts` orchestrates `video_render` + `video_preview` task types. `trpc/routers/videos.ts` exposes `generatePreview` + R2 keys. API proxy at `/api/videos/[videoId]?preview=true`. Step 5 of video wizard has interactive `VoicePreviewWidget` + `TalkingPreviewWidget` with polling. |
| 2026-06-16 | Caption generation (Item 28) | Created `modal/caption_generation.py` Modal app running `faster-whisper`. Configured DB migration for subtitles columns, tRPC routes, and Trigger.dev `caption_generate` job type. Rebuilt video detail view with interactive transcript cue highlighting sync, seek, manual edit, and downloads (SRT/WebVTT/TXT). |
| 2026-06-16 | Final rendering pipeline (Item 29) | Created `modal/video_composition.py` Modal app (simulate + FFmpeg/moviepy modes). Wired `video_export` job type in `trigger/run-job.ts` — fetches export record + source video, calls Modal `/compose` with subtitles + watermark settings, updates `video_exports` table on success/failure. Deployed to Modal. `VIDEO_COMPOSITION_API_URL` + `VIDEO_COMPOSITION_API_KEY` added to `.env.local`. tsc passes clean. |
| 2026-06-16 | B-roll integration (Item 30) | Server-side parallel search proxy (Pexels + Pixabay), updateBroll tRPC procedure, stock footage library browser tab with hover-play previews, selection tray, and DB persistence. |
| 2026-06-17 | Watermark engine (Item 31) | Free-tier Polar gating with forced system defaults; premium customization for exports/clips; brand kit watermark defaults; FFmpeg + OpenCV pipelines |

---

## Notes

- Next.js 16 + Tailwind v4 + shadcn radix-nova; Outfit as the primary UI font
- `sample/` directory contains Resonance AI reference project — do not deploy, use as pattern reference only
- MVP target: 6–8 weeks
- Light mode first; dark mode planned later
