# Project Overview

## About the Project

**mimic-ai** is a self-hosted, open-source AI video studio that lets users clone voices, create digital avatars, and generate complete videos using open-source AI models.

**Tagline:** Your AI Twin. Your Infrastructure. Your Content.

It is essentially HeyGen + ElevenLabs + Synthesia built on infrastructure users fully control — not a vendor-locked SaaS.

**Long-term vision:** mimic-ai is not simply an open-source HeyGen clone. It evolves into a transparent, self-hosted **AI media operating system** where users control infrastructure, understand exactly what they pay for, preview before committing GPU resources, and progressively customize models to their brand and identity via Digital Twin Memory.

## The Problem It Solves

Creating professional videos traditionally requires cameras, editing software, voice recording, actors, video editors, and significant time investment.

mimic-ai enables users to:

- Clone themselves once (voice + avatar)
- Generate unlimited videos from prompts
- Produce content consistently
- Maintain full ownership of data and infrastructure

**Core value proposition:** Turn anyone into a scalable AI creator while maintaining full control of their stack.

## Target Users

| Segment | Examples |
|---------|----------|
| **Creators** | YouTubers, TikTok/Instagram creators, faceless channel operators |
| **Professionals** | Agencies, marketing teams, course creators, consultants, small businesses |
| **Technical** | Developers, AI enthusiasts, solopreneurs, self-hosting advocates |

## Core Philosophy

**Rejected flow:** Upload → Generate → Download

**Guiding principle (mandatory for all generations):**

> Validate → Preview → Estimate → Approve → Generate → Export → Optimize

Every generation passes through validation, cost estimation, and user approval **before credits are charged**. This reduces failed generations, refund requests, wasted GPU time, and churn.

## Pages

### Public (Marketing Layout)

```
/           -> Landing page
/features   -> Feature showcase
/pricing    -> Metered pricing tiers
/examples   -> Example videos and use cases
/login      -> Sign in (InsForge Auth)
/signup     -> Create account
/privacy    -> Privacy policy
/terms      -> Terms of service
```

### Authenticated App (App Layout)

```
/dashboard                      -> Overview and quick actions
/dashboard/agent                 -> Co-Producer AI Agent (NEW!)
/dashboard/agent/[threadId]      -> Individual conversation thread
/dashboard/projects             -> Project management
/dashboard/videos               -> Video library
/dashboard/videos/new           -> Generate video wizard
/dashboard/clips                -> AI Clip library
/dashboard/clips/generate       -> Generate AI clip
/dashboard/voices               -> Voice library
/dashboard/voices/new           -> Clone voice
/dashboard/voices/validate        -> Voice quality validation pipeline
/dashboard/avatars              -> Avatar library
/dashboard/avatars/new          -> Create avatar
/dashboard/avatars/validate       -> Avatar quality validation pipeline
/dashboard/scripts              -> Script studio
/dashboard/templates            -> Reusable layouts and brand kits
/dashboard/experiments          -> A/B testing studio (P2)
/dashboard/assets               -> Media library
/dashboard/jobs                 -> Generation queue and status
/dashboard/webhooks             -> Webhook registration and logs
/dashboard/billing              -> Usage, credits, invoices
/dashboard/audit                -> Audit logs (P2)
/dashboard/settings             -> Account preferences and security
/dashboard/team                 -> Workspace members and roles
/dashboard/api                  -> API keys
/dashboard/models               -> Fine-tuning studio (P3)
```

### Admin (Admin Layout)

```
/admin -> User management, usage oversight, system controls
```

### Integrated Routes

```
/estimate -> Cost estimation (integrated into generation wizard)
```

## Navigation

### Marketing
- Top navbar with logo, feature/pricing links, sign-in/sign-up CTAs
- Footer with legal links and product links

### Application — Desktop
- Left collapsible sidebar (reference: `sample/frontend/features/dashboard/components/dashboard-sidebar.tsx`)
- Sticky top header with breadcrumbs
- Usage/credits widget in sidebar footer

### Application — Mobile
- Bottom navigation for primary routes
- Drawer menu for secondary routes

## Auth Gates

| Protected | Public |
|-----------|--------|
| `/dashboard/*` | Everything else |
| `/admin/*` | |

## Layouts

| Layout | Used For |
|--------|----------|
| **Marketing** | Landing, features, pricing, examples, auth pages |
| **App** | All `/dashboard/*` routes — sidebar + header + breadcrumbs |
| **Admin** | `/admin/*` — separate administration shell |

## Core User Flow (Activation)

```
Land
  ↓
Sign Up
  ↓
Onboarding (profile, tutorials, sample project)
  ↓
Clone Voice
  ↓
Validate Voice (/dashboard/voices/validate)
  ↓
Create Avatar
  ↓
Validate Avatar (/dashboard/avatars/validate)
  ↓
Write Script (/dashboard/scripts)
  ↓
Cost Estimation (/estimate)
  ↓
Voice Preview (30s, retry allowed)
  ↓
Avatar Preview (static, retry allowed)
  ↓
Talking Preview (5s low-res, retry allowed)
  ↓
Approve (quality score + consent confirmation)
  ↓
Full Render (async via Trigger.dev)
  ↓
Export (resolution, format, aspect ratio options)
  ↓
Analyze
  ↓
Reuse via Templates
```

**Activation event:** User generates and downloads their first AI-generated video.

## Secondary Flows

- **Onboarding:** Profile setup, tutorials, sample project
- **Co-Producer:** AI-assisted video creation, natural language interface, tool orchestration
- **Billing:** Metered Polar pricing, invoices, usage tracking, credit warnings
- **Settings:** Security, API keys, preferences, agent configuration
- **Team:** Workspace invites, roles, permissions (custom InsForge-backed workspaces)
- **Administration:** User management, usage oversight
- **Webhooks:** Completion, failure, and retry callbacks for async jobs

### Co-Producer AI Agent

The **Co-Producer** is a domain-specific AI assistant that acts as your video production partner. Accessible at `/dashboard/agent`, it provides:

- **Natural Language Interface:** Describe your video idea in plain English
- **Intelligent Guidance:** Walks you through the entire creation pipeline
- **Tool Orchestration:** Uses 35+ specialized tools to accomplish tasks
- **Real-Time Collaboration:** Streaming responses with visible reasoning
- **Memory:** Remembers your preferences and workspace context
- **Human-in-the-Loop:** Approval gates for important decisions

**Example Usage:**
- "Create a tutorial video about React hooks with my voice"
- "List all my voices and show me the best one for tutorials"
- "Generate a script for a product demo"
- "What's my remaining credit balance?"

See `context/agent-system.md` for detailed documentation.

## MVP Scope (6–8 weeks)

**Must ship:**
1. Authentication
2. Voice cloning (F5-TTS)
3. Avatar generation (Flux)
4. Talking avatar videos (LivePortrait + lip sync)
5. Video downloads
6. Metered billing (Polar)

**Nice to have (post-MVP):** Team workspaces, API access, SAML, advanced admin, Kubernetes, enterprise controls

## Design Reference

UI/UX patterns, component structure, and async job UX are modeled after the reference project at `sample/frontend/` (Resonance AI — voice cloning + TTS with Trigger.dev, Modal, Polar, R2, shadcn/ui). Adapt patterns to mimic-ai's green brand and expanded video feature set.
