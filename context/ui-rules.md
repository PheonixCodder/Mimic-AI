# UI Rules

Layout behaviors, interaction patterns, and component guidelines. Reference implementation: `sample/frontend/`.

Read `context/ui-tokens.md` for colors/spacing and `context/ui-registry.md` for built component classes.

---

## Global Layout Rules

### Marketing Layout
- Top navbar: logo left, nav links center, auth CTAs right
- Full-width hero sections with comfortable vertical padding
- Footer with product links, legal links, social links
- Mobile: hamburger menu → drawer

### App Layout (Dashboard)
- **Desktop:** `SidebarProvider` + collapsible left sidebar + `SidebarInset` main content
- **Sidebar:** Logo + workspace switcher (header) → nav sections → usage widget + user menu (footer)
- **Main content:** Sticky `PageHeader` (border-b) → scrollable content area
- **Mobile:** Sidebar hidden; bottom nav for primary routes; `PageHeader` visible
- **Height:** `h-svh` on SidebarProvider; main content `min-h-0 flex-1 flex-col`

Pattern reference:
```
sample/frontend/app/(dashboard)/layout.tsx
sample/frontend/features/dashboard/components/dashboard-sidebar.tsx
sample/frontend/components/page-header.tsx
```

### Admin Layout
- Separate shell from dashboard — no shared sidebar
- Minimal navigation focused on admin tasks

### Responsive Breakpoints
- Mobile-first Tailwind defaults
- Sidebar collapses to icon mode on smaller screens
- `lg:` prefix for desktop-specific layouts (e.g., `lg:p-16`, `lg:hidden`)
- Bottom nav visible below `lg` breakpoint

---

## Navigation Patterns

### Sidebar Navigation
- Group items into sections with optional uppercase labels ("Others", "Studio", etc.)
- Active state: border + subtle shadow + green accent (reference sample NavSection)
- Icon + label for each item; icon-only when collapsed with tooltip
- Logo transforms to sidebar trigger when collapsed (reference sample logo/trigger swap)

### Breadcrumbs
- Show on nested routes (e.g., Dashboard > Videos > New)
- Use shadcn Breadcrumb component

### Workspace Switcher
- Dropdown in sidebar header (replaces sample's OrganizationSwitcher)
- Shows workspace name + avatar
- "Create workspace" option at bottom

---

## Component Patterns

### Page Structure
```tsx
// Standard dashboard page
<div className="relative">
  <PageHeader title="Page Title" className="lg:hidden" />
  <div className="relative space-y-8 p-4 lg:p-16">
    {/* Page content */}
  </div>
</div>
```

### Cards (Voice, Avatar, Video)
- Horizontal layout: thumbnail/avatar left → info center → actions right
- Border + rounded-xl, no heavy shadow
- Play/preview button: outline, rounded-full, icon-sm
- More actions: dropdown menu with icon-sm rounded-full trigger
- Reference: `sample/frontend/features/voices/components/voice-card.tsx`

### Stats Cards
- White background, rounded-xl, border, p-6
- Icon + label top row, large bold number below
- Optional trend indicator (green up / red down)
- Reference: `sample/frontend/components/ui/stats-card.tsx`

### Forms
- TanStack Form + shadcn Field components
- Labels above inputs, helper text below
- Submit button: primary green, rounded-xl
- Validation errors inline below fields in destructive color

### Empty States
- Use shadcn `Empty` component
- Icon + message + CTA button
- Centered in content area

### Loading States
- Skeleton components for lists and cards
- Spinner for button actions
- Full-page loading via Next.js `loading.tsx`

### Error States
- Use `ErrorState` component with retry action
- Toast notifications via Sonner for mutation errors

---

## Interaction & States

### Buttons
| Variant | Usage |
|---------|-------|
| `default` (primary green) | Primary actions: Generate, Approve, Create |
| `outline` | Secondary actions: Feedback, Help, Preview |
| `destructive` | Delete, Cancel generation |
| `ghost` | Tertiary/icon actions |

Size: `sm` for header/toolbar, default for forms, `icon-sm` for card actions.

### Hover States
- Buttons: subtle background shift
- Nav items: accent background (`sidebar-accent`)
- Cards: no hover effect (static)

### Focus Rings
- Green ring (`ring-primary`) on all interactive elements
- Visible keyboard focus — never remove outlines

### Disabled States
- Reduced opacity (50%)
- `cursor-not-allowed`
- No pointer events

### Active Nav Item
```tsx
className="border border-border shadow-[0px_1px_1px_0px_rgba(44,54,53,0.03),inset_0px_0px_0px_2px_white]"
```

---

## Generation Flow UI

### Validation Screens
- Upload zone → analysis progress → readiness score card
- Score breakdown: individual metrics with labels (Excellent/Good/Acceptable/Poor)
- Pass/fail with clear action (retry upload or proceed)

### Cost Estimation
- Itemized breakdown table before generation
- Credits remaining + balance after prominently displayed
- Warning banners for insufficient balance, long renders, 4K surcharge

### Preview & Approval
- Three preview panels: Voice (30s audio player), Avatar (static image), Talking (5s video)
- Each with independent retry button
- Final approval screen: quality score + total cost + consent checkbox + Approve/Regenerate buttons

### Job Progress
- Realtime progress via Trigger.dev `useRealtimeRun`
- Stage indicators: Validating → Generating → Rendering → Complete
- Progress bar + stage label + estimated time
- Reference: `sample/frontend/features/text-to-speech/components/generation-progress.tsx`

### Job Queue
- Table view: job name, type, status badge, created, duration, actions
- Status badges: color-coded (pending=muted, processing=primary, completed=success, failed=destructive)
- Retry button on failed jobs

---

## Animations & Transitions

- **Sidebar collapse:** `transition-all duration-300 ease-in-out` (reference sample logo/trigger)
- **Page transitions:** none (keep snappy)
- **Toast notifications:** Sonner default slide-in
- **Skeleton loading:** shadcn default pulse
- **No** elaborate page animations, parallax, or scroll effects

---

## Accessibility

- All interactive elements keyboard accessible
- ARIA labels on icon-only buttons
- Color contrast meets WCAG AA (green on white passes)
- Form fields associated with labels
- Error messages linked to fields via `aria-describedby`

---

## Media Playback

- Audio preview: play/pause toggle with Spinner during load
- Waveform visualization for voice previews (reference: sample wavesurfer hook)
- Video preview: native `<video>` with controls
- All media served via authenticated proxy routes, never direct R2 URLs

---

## Billing UI

- `UsageContainer` in sidebar footer (reference: sample)
- Shows credits remaining or usage percentage
- Upgrade CTA when subscription inactive
- Billing page: usage breakdown, invoice history, plan details

---

## Mobile Considerations

- Bottom nav: 4–5 primary icons (Dashboard, Voices, Avatars, Videos, More)
- Drawers for settings and secondary navigation
- Full-width cards, stacked layout
- Touch-friendly button sizes (min 44px tap target)
