# Architecture

## Tech Stack

| Layer | Technology |
|-------|------------|
| **Runtime** | Bun |
| **Frontend** | Next.js 16 (App Router), React 19, TypeScript |
| **Styling** | Tailwind CSS v4, shadcn/ui (radix-nova), Lucide icons |
| **API** | tRPC 11, TanStack Query, Server Actions (forms), Route Handlers (webhooks/uploads) |
| **Auth** | InsForge Auth — email/password, Google OAuth, GitHub OAuth (SAML/OIDC later) |
| **Database** | InsForge Database — no Prisma, no Drizzle |
| **Background jobs** | Trigger.dev (async AI workloads + realtime UI progress) |
| **Object storage** | Cloudflare R2 (signed upload URLs, authenticated proxy delivery) |
| **Media transforms** | Cloudinary |
| **Billing** | Polar (metered subscriptions + usage events) |
| **Email** | Resend |
| **AI compute** | Modal (GPU workloads), Replicate (model inference) |
| **Observability** | Basic self-hosted logging initially (no PostHog) |
| **CDN** | Cloudflare |
| **Deploy** | Self-hosted Next.js + InsForge; Docker Compose first; Kubernetes later |

## Folder Structure

Feature-first organization. **No `src/` prefix** — app lives at project root.

```
mimic-ai/
├── app/                    # Next.js App Router (pages, layouts, API routes)
│   ├── (marketing)/        # Public marketing pages
│   ├── (auth)/             # Login, signup
│   ├── (dashboard)/        # Authenticated app shell
│   ├── (admin)/            # Admin shell
│   └── api/                # Route handlers (webhooks, uploads, audio proxy)
├── features/               # Feature modules (domain logic + UI)
│   ├── dashboard/
│   ├── voices/
│   ├── avatars/
│   ├── videos/
│   ├── scripts/
│   ├── templates/
│   ├── billing/
│   ├── jobs/
│   ├── validation/
│   ├── moderation/
│   ├── workspaces/
│   └── ...
├── components/             # Shared UI (shadcn/ui + app-wide components)
├── lib/                    # InsForge client, R2, Polar, env, utils
├── server/                 # Server-only modules (orchestration, validation)
├── trigger/                # Trigger.dev background tasks
├── trpc/                   # tRPC routers, procedures, client setup
├── hooks/                  # Shared React hooks
├── stores/                 # Client state (if needed)
├── config/                 # App configuration
├── types/                  # Shared TypeScript types
├── styles/                 # Additional styles (if needed)
├── utils/                  # Pure utility functions
├── context/                # CDD context files (this directory)
├── sample/                 # Reference project (Resonance AI — do not deploy)
└── modal/                  # Modal GPU services (Python)
```

### Feature Module Convention

Each feature follows the pattern from `sample/frontend/features/`:

```
features/{feature}/
├── components/     # Feature-specific UI components
├── views/          # Page-level view compositions
├── hooks/          # Feature hooks
├── lib/            # Feature utilities
├── data/           # Constants, static data
└── contexts/       # React contexts (if needed)
```

## Data Models (Conceptual)

InsForge manages schema. No ORM — use InsForge query interfaces directly from server code.

### Core Entities

| Entity | Key Fields | Notes |
|--------|-----------|-------|
| **User** | id, email, name, avatar_url | InsForge Auth |
| **Workspace** | id, name, slug, owner_id | Custom — replaces Clerk orgs |
| **WorkspaceMember** | workspace_id, user_id, role | Roles: owner, admin, member, viewer |
| **Project** | id, workspace_id, name, description | Groups videos/assets |
| **Voice** | id, workspace_id, name, r2_object_key, status, quality_score | Clone readiness metadata |
| **Avatar** | id, workspace_id, name, r2_object_key, status, readiness_score | Animation suitability metadata |
| **Script** | id, workspace_id, content, character_count | Linked to pricing estimator |
| **Video** | id, workspace_id, project_id, status, r2_object_key, broll_clips | Generation output |
| **VideoClip** | id, workspace_id, project_id, title, prompt, style, status, r2_object_key | AI clip generation |
| **GenerationJob** | id, workspace_id, type, status, trigger_run_id, metadata | Async job tracking |
| **UsageRecord** | id, workspace_id, type, amount, polar_event_id | Billing audit trail |
| **Webhook** | id, workspace_id, url, events, secret | Callback registration |
| **AuditLog** | id, workspace_id, user_id, action, metadata | P2 compliance |
| **DigitalTwin** | id, avatar_id, speaking_style, personality, vocabulary, tone | P3 long-term moat |
| **Template** | id, workspace_id, name, layout_config, brand_kit | Reusable layouts |
| **ApiKey** | id, workspace_id, key_hash, name, last_used | API access |

### Job Status Enum

```
PENDING → VALIDATING → ESTIMATING → PREVIEWING → APPROVED → PROCESSING → COMPLETED | FAILED
```

## Workspaces (Custom)

InsForge does not provide built-in Organizations/Workspaces like Clerk. We build a custom workspace layer:

- Every user belongs to at least one workspace (personal workspace on signup)
- All data scoped to `workspace_id` (not just `user_id`)
- Team invites via email with role assignment
- Workspace switcher in sidebar (pattern from sample's OrganizationSwitcher)
- Billing scoped per workspace via Polar external ID

## Request Flow: Video Generation (Async)

```
1. User submits script + voice + avatar in generation wizard
2. Validation pipeline runs (voice/avatar quality, moderation)
3. Cost estimation displayed (/estimate)
4. User approves previews (voice, avatar, talking test)
5. tRPC mutation creates GenerationJob (status: APPROVED)
6. Billing check via Polar (credits/subscription)
7. App enqueues Trigger.dev task → returns { jobId, triggerRunId, publicAccessToken }
8. Detail page subscribes via useRealtimeRun for live progress
9. Trigger task orchestrates Modal/Replicate workers
10. Output uploaded to R2 → job status COMPLETED
11. UI streams result via authenticated /api/media/[id] proxy (never public R2 URLs)
12. Polar usage event ingested
```

## Architectural Invariants

**Never break these rules:**

1. **No database calls from client components** — all data access via tRPC or Server Actions on the server
2. **No secrets exposed to the browser** — API keys, R2 credentials, Polar tokens, Modal keys stay server-side
3. **All queries scoped to authenticated user + workspace** — never return cross-tenant data
4. **Heavy AI workloads run outside the request lifecycle** — Trigger.dev tasks only
5. **Validate before billing** — voice/avatar validation + moderation must pass first
6. **Billing before rendering** — Polar credit/subscription check before full generation
7. **Generation tasks must be resumable** — retry strategy: 1m → 5m → 15m → 60m → failed
8. **Store generation metadata for auditing** — every job logged with inputs, costs, outputs
9. **Business logic never lives inside UI components** — keep in `server/`, tRPC routers, Trigger tasks
10. **Signed URLs for uploads only** — R2 presigned upload; delivery via authenticated proxy routes
11. **Self-hosted deployment is the default path** — design for Docker Compose first
12. **Every generation passes validation → estimation → approval** — no bypassing the safety layer
13. **Replicate and Modal invoked exclusively from server workers** — never from client or route handlers directly during user requests
14. **InsForge initialized server-only** — never import InsForge admin client in client components

## Model Fallback Matrix

| Component | Primary | Fallback | Trigger |
|-----------|---------|----------|---------|
| Avatar Images | Flux.1 Schnell | Flux.1 Dev | Quality preference |
| Voice Clone | F5-TTS | CosyVoice | Language unsupported |
| Preview TTS | Kokoro-82M | F5-TTS | Preview failure |
| Avatar Animation | LivePortrait | Halo | Memory limitations |
| Lip Sync | LatentSync | MuseTalk | Sync confidence low |
| Video Generation | Wan2.2 | HunyuanVideo → Mochi 1 | Timeout > 60s |
| Captions | Faster-Whisper | Whisper Large v3 | Accuracy threshold |
| Rendering | Remotion | MoviePy | Headless failure |

## R2 Object Layout

| Path | Contents |
|------|----------|
| `voices/{workspaceId}/{voiceId}` | Voice reference audio |
| `avatars/{workspaceId}/{avatarId}` | Avatar source images |
| `videos/{workspaceId}/{videoId}` | Generated video output |
| `clips/{workspaceId}/{clipId}` | Generated AI video clips |
| `previews/{workspaceId}/{jobId}` | Low-res preview assets |
| `assets/{workspaceId}/{assetId}` | User-uploaded media |

Database stores paths in entity records. Never expose raw R2 URLs to the client.
