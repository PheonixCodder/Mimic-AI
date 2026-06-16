# Code Standards

## Styling & Framework Conventions

- **Functional components only** — no class components
- **Tailwind CSS v4** with `@theme inline` CSS variables (reference: `sample/frontend/app/globals.css`)
- **shadcn/ui** components in `components/ui/` — radix-nova style, do not modify generated primitives unless necessary
- **Class merging** via `cn()` from `@/lib/utils` (clsx + tailwind-merge)
- **Tailwind organization:** layout → spacing → typography → colors → states → responsive overrides
- **Icons:** Lucide React exclusively
- **Toasts:** Sonner (`components/ui/sonner.tsx`)
- **Forms:** TanStack Form with shadcn Field components (reference: sample voice-create-form)
- **Data fetching:** TanStack Query via tRPC hooks (`useTRPC()` pattern from sample)
- **Font:** Outfit (body/headings), Geist Mono (code) — loaded via `next/font/google`

## Naming Conventions

| Category | Convention | Example |
|----------|-----------|---------|
| Components | PascalCase | `VoiceCard`, `DashboardSidebar` |
| Files (components) | kebab-case | `voice-card.tsx`, `dashboard-sidebar.tsx` |
| Hooks | camelCase, `use` prefix | `useAudioPlayback`, `useCheckout` |
| Utilities & Actions | camelCase | `formatDuration`, `createVoice` |
| tRPC routers | camelCase | `voices`, `generations`, `billing` |
| tRPC procedures | camelCase verbs | `getAll`, `create`, `getById` |
| DB tables & columns | snake_case | `workspace_members`, `r2_object_key` |
| Trigger tasks | kebab-case | `generate-video`, `clone-voice` |
| Env vars | SCREAMING_SNAKE | `R2_BUCKET_NAME`, `POLAR_ACCESS_TOKEN` |
| Route segments | kebab-case | `/dashboard/voices/validate` |
| Types/Interfaces | PascalCase | `VoiceItem`, `GenerationJob` |

## File Placement Rules

| What | Where |
|------|-------|
| Page routes | `app/(group)/route/page.tsx` — thin, imports view from features |
| Page views | `features/{feature}/views/` |
| Feature components | `features/{feature}/components/` |
| Shared UI | `components/` (PageHeader, voice-avatar, etc.) |
| shadcn primitives | `components/ui/` |
| tRPC routers | `trpc/routers/` |
| Server-only logic | `server/` or tRPC procedure bodies |
| Trigger tasks | `trigger/` |
| InsForge/R2/Polar clients | `lib/` |
| Shared hooks | `hooks/` |
| Constants | `features/{feature}/data/` or `config/` |

## TypeScript Rules

- Strict mode enabled — no `any` unless absolutely necessary with explicit comment
- Use `zod` for input validation in tRPC procedures and Server Actions
- Infer types from tRPC router outputs: `inferRouterOutputs<AppRouter>`
- Prefer `interface` for object shapes, `type` for unions/intersections
- Export types from feature modules when shared across features

## tRPC Conventions

Follow the pattern from `sample/frontend/trpc/`:

```typescript
// Router structure
export const voicesRouter = createTRPCRouter({
  getAll: protectedProcedure.query(async ({ ctx }) => {
    // ctx.user, ctx.workspace — always scope queries
  }),
  create: protectedProcedure
    .input(z.object({ name: z.string(), ... }))
    .mutation(async ({ ctx, input }) => { ... }),
});
```

- **`protectedProcedure`** — requires authenticated user + active workspace
- **`publicProcedure`** — marketing/auth pages only
- **Context:** `{ user, workspace, insforge }` injected in tRPC init
- **Error handling:** throw `TRPCError` with appropriate codes
- **Client:** `useTRPC()` hook + TanStack Query `useQuery`/`useMutation`

## Server Actions

Use for simple form submissions where tRPC is overkill:

- Settings updates
- Non-CRUD form posts
- Always validate with zod
- Always check auth and workspace scope

## Route Handlers

Use for external-facing endpoints:

- `/api/webhooks/*` — Polar, Trigger.dev callbacks
- `/api/media/[id]` — authenticated audio/video proxy
- `/api/upload/*` — presigned URL generation
- Never expose raw R2 URLs

## Error Handling

- **tRPC:** `TRPCError` with code + message; client shows toast via `onError`
- **Trigger tasks:** catch, log, update job status to FAILED, emit webhook
- **UI:** use `ErrorState`, `LoadingState` components from `components/ui/`
- **Validation:** return structured errors with field-level messages, not generic 500s
- **Never swallow errors silently** — log server-side, show user-friendly message client-side

## Logging

- Basic self-hosted logging initially (console + structured JSON in production)
- Log all generation job state transitions with job ID, workspace ID, user ID
- Log all billing events with Polar event IDs for reconciliation
- No PostHog or external analytics in v1

## Testing Approach

- Visual verification first (mock data → real data)
- Manual testing of generation flows with real Modal/Replicate endpoints
- No unit test requirement unless explicitly requested

## Git & Commit Conventions

- Conventional commits: `feat:`, `fix:`, `chore:`, `docs:`
- One feature per commit when possible
- Never commit `.env.local`, secrets, or `sample/frontend/node_modules`

## Package Manager

**Bun** exclusively. Use `bun install`, `bun run dev`, `bun run build`. Do not use npm/yarn/pnpm.
