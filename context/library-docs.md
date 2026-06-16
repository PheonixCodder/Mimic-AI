# Library Docs

Project-specific usage patterns for every third-party library. Read the relevant section before implementing any feature that touches these libraries.

---

## InsForge

**Role:** Complete backend layer — database, auth, API, storage abstraction.

**Usage:** Server-only. Never import InsForge admin/client in client components.

```typescript
// lib/insforge.ts — server-only initialization
import { createInsForgeClient } from '@insforge/sdk';

export const insforge = createInsForgeClient({
  url: process.env.INSFORGE_URL!,
  serviceKey: process.env.INSFORGE_SERVICE_KEY!,
});
```

**Auth providers:** Email/password, Google OAuth, GitHub OAuth.

**Rules:**
- All DB queries through InsForge SDK from tRPC procedures or Trigger tasks
- No Prisma, no Drizzle, no raw SQL unless InsForge requires it
- Scope every query by `workspace_id` and authenticated `user_id`
- Workspaces are custom-built on top of InsForge (not a built-in feature)
- Session validation in tRPC middleware via InsForge Auth

---

## tRPC

**Role:** Type-safe API layer between frontend and server.

**Pattern:** Follow `sample/frontend/trpc/` exactly.

**Client setup:**
```typescript
// trpc/client.tsx — TRPCReactProvider wrapping app
// hooks: useTRPC(), useQuery(), useMutation()
```

**Server setup:**
```typescript
// trpc/init.ts — createTRPCContext with { user, workspace, insforge }
// trpc/routers/_app.ts — merge all routers
// app/api/trpc/[trpc]/route.ts — Next.js handler
```

**Rules:**
- Protected procedures require auth + workspace context
- Input validation with zod on every mutation
- Never call InsForge directly from client — always through tRPC

---

## Trigger.dev

**Role:** Async background jobs for all AI workloads + realtime UI progress.

**Pattern:** Follow `sample/frontend/trigger/` and `trigger.config.ts`.

```typescript
// trigger/generate-video.ts
import { task } from "@trigger.dev/sdk/v3";

export const generateVideo = task({
  id: "generate-video",
  run: async (payload) => {
    // 1. Update job status → PROCESSING
    // 2. Call Modal/Replicate workers
    // 3. Upload result to R2
    // 4. Update job status → COMPLETED
    // 5. Ingest Polar usage event
  },
});
```

**Dev:** `bun run dev` starts Next.js + Trigger.dev worker concurrently.

**Deploy:** `bun run trigger:deploy` — syncs env vars via `trigger.config.ts`.

**Realtime UI:** Use `useRealtimeRun` on detail pages (reference: sample generation detail view).

**Retry strategy:** 1 min → 5 min → 15 min → 60 min → failed.

**Rules:**
- All Modal/Replicate calls happen inside Trigger tasks, never in tRPC mutations directly
- Task env vars synced from `.env.local` on deploy
- Return `{ jobId, triggerRunId, publicAccessToken }` immediately from tRPC mutation
- Metadata stages for progress UI (e.g., "validating", "generating", "rendering")

---

## Cloudflare R2

**Role:** Object storage for voices, avatars, videos, previews, assets.

**Pattern:** Follow `sample/frontend/lib/r2.ts`.

```typescript
// lib/r2.ts — S3-compatible client
// Endpoint: https://{R2_ACCOUNT_ID}.r2.cloudflarestorage.com
```

**Upload flow:**
1. Client requests presigned URL via tRPC
2. Client uploads directly to R2
3. Server stores `r2_object_key` in InsForge

**Delivery flow:**
1. Client requests media via `/api/media/[id]`
2. Server validates auth + workspace scope
3. Server streams from R2 (never expose public bucket URLs)

**Object paths:** See `context/architecture.md` R2 layout section.

---

## Cloudinary

**Role:** Media transformations only (resize, crop, format conversion, background removal).

**Rules:**
- Server-side transformation URLs only
- Used for avatar preview thumbnails, video poster frames
- Not primary storage — R2 is source of truth

---

## Polar

**Role:** Metered billing — subscriptions + usage events.

**Pattern:** Follow `sample/frontend/features/billing/`.

**Pricing units:**
| Meter | Aggregation | Rate | Metadata key (Sum) |
|-------|-------------|------|-------------------|
| `voice_clone` | Count | $0.30 per clone | — |
| `avatar_generation` | Count | $0.50 per generation | — |
| `script_generation` | Sum | $0.003 per character | `characters` |
| `video_generation` | Sum | Compute-based | `compute_units` |

**Rules:**
- Server-only — `POLAR_ACCESS_TOKEN` never in browser
- Check subscription/credits before generation (in tRPC mutation, before enqueuing Trigger task)
- Ingest usage events after successful operations only (not previews or failed jobs)
- External ID = workspace ID for multi-tenant billing
- `UsageContainer` in sidebar footer shows credits/usage (reference: sample)
- Use `getPolarMeterConfig()` from `lib/polar-meters.ts` for meter slugs and Sum property keys

**Env vars:**
```
POLAR_ACCESS_TOKEN, POLAR_SERVER (sandbox|production), POLAR_PRODUCT_ID,
POLAR_METER_VOICE_CLONE, POLAR_METER_AVATAR,
POLAR_METER_SCRIPT, POLAR_METER_SCRIPT_PROPERTY,
POLAR_METER_VIDEO, POLAR_METER_VIDEO_PROPERTY
```

**Ingest examples:**
```typescript
const meters = getPolarMeterConfig();

// Count — voice clone
polar.events.ingest({ events: [{ name: meters.voiceClone, externalCustomerId: workspaceId, metadata: {} }] });

// Count — avatar
polar.events.ingest({ events: [{ name: meters.avatar, externalCustomerId: workspaceId, metadata: {} }] });

// Sum — script characters
polar.events.ingest({ events: [{ name: meters.script, externalCustomerId: workspaceId, metadata: { [meters.scriptProperty]: characterCount } }] });

// Sum — video compute
polar.events.ingest({ events: [{ name: meters.video, externalCustomerId: workspaceId, metadata: { [meters.videoProperty]: computeUnits } }] });
```

---

## Modal

**Role:** GPU compute for AI inference workloads.

**Services (Python in `modal/`):**
- Avatar animation (LivePortrait, Halo)
- Lip sync (LatentSync, MuseTalk)
- Preview TTS (Kokoro-82M)
- Video generation (Wan2.2, HunyuanVideo, Mochi 1)
- Final rendering (Remotion, MoviePy)

**Rules:**
- Invoked exclusively from Trigger.dev tasks
- FastAPI endpoints with `X-Api-Key` auth
- Modal secrets for R2 credentials and HF tokens
- Cold start: 2–4 min; warm: 10–60s — design UI for async wait
- Reference: `sample/modal/chatterbox_tts.py` for deployment pattern

---

## Replicate

**Role:** Model inference for models hosted on Replicate.

**Services:**
- Avatar images (Flux.1 Schnell / Flux.1 Dev)
- Voice cloning (F5-TTS / CosyVoice)
- Captions (Faster-Whisper / Whisper Large v3)

**Rules:**
- Invoked exclusively from Trigger.dev tasks
- Server-only API token
- Implement fallback matrix (see architecture.md)

---

## Resend

**Role:** Transactional email delivery.

**Use cases:** Team invites, job completion notifications, billing alerts, webhook failure alerts.

**Rules:** Server-side only. Templates in `lib/email/`.

---

## OpenRouter (Optional — Script Studio)

**Role:** AI-assisted script writing — hooks, CTAs, translations, improvements.

**Rules:**
- Server-side only, invoked from Script Studio features
- Optional — not required for MVP
- Usage metered separately if enabled

---

## shadcn/ui

**Role:** UI component library.

**Setup:** radix-nova style, reference `sample/frontend/components.json`.

```bash
bunx shadcn@latest init  # match sample config
bunx shadcn@latest add button card sidebar ...
```

**Rules:**
- Components live in `components/ui/`
- Do not modify shadcn primitives unless fixing a bug
- Custom app components in `components/` (PageHeader, etc.)
- Green palette via CSS variables in `app/globals.css`

---

## Pexels & Pixabay APIs

**Role:** Stock B-roll footage retrieval.

**Rules:** Server-side API calls from Trigger tasks during video composition. Cache results in R2.

---

## pyannote.audio & Whisper (Validation)

**Role:** Voice validation — speaker diarization, noise detection.

**Hosting:** Modal or Replicate worker called during validation pipeline.

**Rules:** Runs during Phase 0 validation, before voice clone billing.

---

## Remotion

**Role:** Programmatic video composition — subtitle overlay, scene assembly, final render.

**Hosting:** Modal worker.

**Fallback:** MoviePy if Remotion headless fails.

---

## Bun

**Role:** Package manager and runtime.

**Commands:**
```bash
bun install          # Install dependencies
bun run dev          # Next.js + Trigger.dev dev
bun run build        # Production build
bun run start        # Production server
bun run trigger:deploy  # Deploy Trigger.dev tasks
bun run lint         # ESLint
```

Do not use npm, yarn, or pnpm.
