# Build Plan

## Core Principle

Full page UI built with mock data first — verified visually before any logic is written. Then functionality is built and wired to the UI step by step. Every feature must be visible and testable before moving to the next. No invisible backend phases.

Reference UI patterns from `sample/frontend/` for sidebar, cards, forms, async progress, and billing widgets.

---

## Development Phases

### Phase 0 — Generation Safety Layer (P0)

- [ ] 01 Voice validation pipeline (`/dashboard/voices/validate`)
- [ ] 02 Avatar validation pipeline (`/dashboard/avatars/validate`)
- [ ] 03 Content moderation checks (NSFW, copyright, consent, impersonation)
- [ ] 04 Cost transparency engine (`/estimate` integrated in wizard)
- [ ] 05 Preview & approval workflow (voice, avatar, talking previews)
- [ ] 06 Consent confirmation gate ("I confirm I have rights to use these assets")

### Phase 1 — Foundation & Core Studios

- [x] 07 InsForge Auth setup (email/password, Google, GitHub)
- [x] 08 Custom workspace system (create, switch, invite, roles)
- [x] 09 Dashboard shell (sidebar, header, breadcrumbs — reference sample)
- [x] 10 shadcn/ui init (radix-nova, green palette)
- [x] 11 Marketing layout (landing, features, pricing, examples)
- [x] 12 Projects CRUD
- [x] 13 Voice library UI + clone flow (F5-TTS via Replicate)
- [x] 14 Avatar library UI + create flow (Flux via Replicate)
- [x] 15 Video library UI + generation wizard shell
- [x] 16 Script studio (`/dashboard/scripts`)
- [x] 17 Templates & brand kits (`/dashboard/templates`)
- [x] 18 Export studio (resolution, format, aspect ratio options)
- [x] 19 Job queue UI (`/dashboard/jobs`)
- [x] 20 Webhooks UI + API (`/dashboard/webhooks`)
- [x] 21 Cloudflare R2 integration (signed uploads, proxy delivery)
- [x] 22 Cloudinary integration (media transforms)
- [x] 23 Polar billing foundations (metered pricing, usage widget)
- [x] 24 Settings page
- [x] 25 Trigger.dev setup (task infrastructure, realtime progress)

### Phase 2 — AI Generation Pipeline

- [x] 26 Talking avatars (LivePortrait/Halo + LatentSync/MuseTalk on Modal)
- [x] 27 Video generation (Wan2.2/HunyuanVideo/Mochi on Modal)
- [x] 28 Caption generation (Faster-Whisper on Replicate)
- [x] 29 Final rendering pipeline (Remotion/MoviePy on Modal)
- [x] 30 B-roll integration (Pexels + Pixabay APIs)
- [x] 31 Watermark engine (free tier forced system watermark, premium customization, brand kit defaults, clip + export pipelines)
- [ ] 32 Real-time preview engine (15fps stream during generation)
- [ ] 33 Team features (`/dashboard/team` — invites, roles)

### Phase 3 — Enterprise

- [ ] 34 SSO (SAML, OIDC, Google Workspace, Azure AD, Okta)
- [ ] 35 Audit center (`/dashboard/audit` — CSV/JSON exports)
- [ ] 36 API platform (`/dashboard/api` — key management)
- [ ] 37 A/B testing studio (`/dashboard/experiments`)
- [ ] 38 Admin panel (`/admin`)

### Phase 4 — Differentiation

- [ ] 39 Fine-tuning studio (`/dashboard/models` — Flux styles, F5 variants)
- [ ] 40 Digital Twin Memory (speaking style, personality, brand voice per avatar)
- [ ] 41 Advanced enterprise controls
- [ ] 42 Kubernetes deployment support

---

## Priority Tiers

| Tier | Features |
|------|----------|
| **P0 (Must Have)** | Cost transparency, voice validation, avatar validation, moderation, preview approval |
| **P1 (Strongly Recommended)** | Templates, export studio, real-time previews, script studio, webhooks |
| **P2 (Enterprise)** | Audit logs, SSO, A/B testing |
| **P3 (Differentiation)** | Fine-tuning studio, Digital Twin Memory, custom models |

---

## Feature Count

| Phase | Items |
|-------|-------|
| Phase 0 | 6 |
| Phase 1 | 19 |
| Phase 2 | 8 |
| Phase 3 | 5 |
| Phase 4 | 4 |
| **Total** | **42** |

---

## Phase 1 Deliverables (Usable Skeleton)

Phase 1 produces a production-ready skeleton without waiting for full AI integrations:

- Authentication + workspace system
- Dashboard shell with sidebar navigation
- All library UIs (avatars, voices, videos) with mock data
- Job queue UI
- Script studio, templates, export studio shells
- R2 + Cloudinary + Polar + Trigger.dev wired
- Validation and cost estimation UI flows

AI model integrations begin in Phase 2 but UI shells exist from Phase 1.
