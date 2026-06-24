# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status

**Phase:** Phase 0 — Generation Safety Layer (COMPLETE)
**Last completed:** Item 02 — Avatar validation pipeline  
**Next:** Phase 4 — Differentiation (Item 41 Advanced enterprise controls)

---

## Progress

### Phase 0 — Generation Safety Layer (COMPLETE)
- [x] 01 Voice validation pipeline
- [x] 02 Avatar validation pipeline
- [x] 03 Cost transparency engine
- [x] 04 Preview & approval workflow
- [x] 05 Consent confirmation gate

### Phase 1 — Foundation & Core Studios
- [x] 06 InsForge Auth setup
- [x] 07 Custom workspace system (partial — bootstrap + tRPC, invites later)
- [x] 08 Dashboard shell
- [x] 09 shadcn/ui init (radix-nova, green palette)
- [x] 10 Marketing layout (landing, features, pricing, examples)
- [x] 11 Projects CRUD
- [x] 12 Voice library UI + clone flow
- [x] 13 Avatar library UI + create flow
- [x] 14 Video library UI + generation wizard shell
- [x] 15 Script studio
- [x] 16 Templates & brand kits
- [x] 17 Export studio
- [x] 18 Job queue UI
- [x] 19 Webhooks UI + API
- [x] 20 Cloudflare R2 integration
- [x] 21 Cloudinary integration
- [x] 22 Polar billing foundations
- [x] 23 Settings page
- [x] 24 Trigger.dev setup

### Phase 2 — AI Generation Pipeline
- [x] 25 Talking avatars
- [x] 26 Video generation
- [x] 27 Caption generation
- [x] 28 Final rendering pipeline
- [x] 29 B-roll integration
- [x] 30 Watermark engine
- [x] 31 Real-time preview engine
- [x] 32 Team features

### Phase 3 — Enterprise
- [x] 33 Audit center
- [x] 34 API platform
- [x] 35 A/B testing studio
- [x] 36 Admin panel

### Phase 4 — Differentiation
- [x] 37 Fine-tuning studio
- [x] 38 Digital Twin Memory

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
| 2026-06-18 | Cost transparency engine (Item 04) | Pricing library + tRPC estimate router; CostEstimatePanel calls calculateDraft; wizard step 5 gates Approve on estimate loaded + consent + Polar subscription; estimated_cost stored on videos row and copied to jobs row on generate |
| 2026-06-18 | Preview & approval workflow (Item 05) | voices.quality_score + videos.approval_status + videos.approved_at added; voices.validate + avatars.validate simulated scoring; videos.approve tRPC; voice/avatar validate pages; score badges in pickers; wizard gates Approve on preview completed; detail page shows approval badge + gates Generate |
| 2026-06-18 | Consent confirmation gate (Item 06) | videos.consent_confirmed_at added; approve requires consentConfirmed:true and stores timestamp; generate gated on consent_confirmed_at IS NOT NULL; detail page shows consent badge |
| 2026-06-19 | Real-time preview engine (Item 32) | jobs.trigger_run_id added; generate+generatePreview capture RunHandle with compensating rollback; getRealtimeToken tRPC query creates scoped 4h public token; useRealtimeRun wired in detail page with STAGE_LABELS + onComplete invalidation |
| 2026-06-19 | Team features (Item 33) | workspaces.findByEmail added; TeamView with email lookup + member list + role management; /dashboard/team route; Team added to sidebar nav |
| 2026-06-19 | API platform (Item 36) | api_keys table + RLS; lib/api-keys.ts (generate/hash/validate); apiKeysRouter (list/create/revoke); ApiKeysView with show-once key + copy + revoke; /dashboard/api route; API in sidebar nav |
| 2026-06-19 | Audit center (Item 35) | audit_logs table + RLS (admin/owner read only); lib/audit.ts writeAuditLog fire-and-forget; audit writes on 14 mutations across videos/voices/avatars/workspaces/api-keys; auditLogsRouter list; AuditView with action filter + CSV/JSON export; /dashboard/audit route; Audit in sidebar |
| 2026-06-19 | Admin panel (Item 38) | profiles.is_platform_admin BOOLEAN; lib/admin-guard.ts isPlatformAdmin(); (admin) layout with DB-based gate; adminRouter (getStats/listWorkspaces/listJobs) using insforgeAdmin; AdminOverviewView; /admin route |
| 2026-06-19 | A/B testing studio (Item 37) | experiments + experiment_variants tables + RLS; experimentsRouter (list/getById/create/delete/updateStatus/setWinner/addVariant/removeVariant); ExperimentsView library; ExperimentDetailView with variant cards + winner declaration; /dashboard/experiments routes; FlaskConical in sidebar |
| 2026-06-19 | Digital Twin Memory (Item 40) | digital_twins table + RLS (UNIQUE avatar_id); digitalTwinsRouter get+upsert; AvatarTwinView (speaking style/tone/personality/vocabulary); /dashboard/avatars/[id]/twin; Configure Twin in avatar card dropdown; style_instruction passed to TTS in run-job.ts |
| 2026-06-20 | Fine-tuning Studio (Item 39) | model_variants table + jobs model_finetune type + avatar model_variant_id FK; modelVariantsRouter with Polar gate; Replicate Flux LoRA trainer integration in run-job.ts with real/simulated modes; ModelsView training dialog with ZIP upload; avatar create form model selector; avatar cards show style badges; /dashboard/models route with sidebar nav |
| 2026-06-20 | Voice validation pipeline (Item 01) | Enhanced voices table with validation_results JSONB + auto_validated_at; Modal voice_validation.py with librosa for real audio analysis (noise, clarity, consistency); voice_validate job type in pipeline; automatic validation trigger on upload; enhanced VoiceValidateView with detailed metrics; validation gating in TTS workflow preventing poor quality voices |
| 2026-06-20 | Avatar validation pipeline (Item 02) | Enhanced avatars table with validation_results JSONB + auto_validated_at; Modal avatar_validation.py with OpenCV/PIL for face detection, image quality scoring, content safety; avatar_validate job type in pipeline; automatic validation trigger on upload; enhanced AvatarValidateView with detailed metrics breakdown; validation infrastructure ready for video workflow gating |
| 2026-06-20 | Remove content moderation from MVP | Content moderation adds complexity; basic consent gates and validation sufficient for MVP launch; can be added post-launch for enterprise compliance |
| 2026-06-23 | Agent Studio Hardening & Refactoring | Refactored MCP client lifecycles with map cache & timer cleanup; verified cross-workspace ownership for generate_video arguments; checks all tool calls in batch for critical operations; extracted shared SSE streaming logic; decomposed agent-view.tsx monolith into 5 modular views; added AgentErrorBoundary, custom Slider, and AlertDialog thread deletions. |
| 2026-06-23 | In-Place Resumption for Agent Messages | Resumption updates the interrupted assistant message inline (merging content, tool calls, and tool results, and clearing interrupt state) instead of creating a new assistant message, and avoids showing redundant user message bubbles for parameter updates. |
| 2026-06-23 | Custom UI cards for listing avatars/voices | Parses tool outcomes for list_voices and list_avatars, mapping fields to camelCase and wrapping in Suspense boundary, and renders them using VoiceCard and AvatarCard in responsive grid lists inside the assistant chat. |

---

## Notes

- Next.js 16 + Tailwind v4 + shadcn radix-nova; Outfit as the primary UI font
- `sample/` directory contains Resonance AI reference project — do not deploy, use as pattern reference only
- MVP target: 6–8 weeks
- Light mode first; dark mode planned later
