# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

**Design reference:** `sample/frontend/` (Resonance AI) — adapt classes to mimic-ai green palette per `context/ui-tokens.md`.

---

## How to Use

Before building any component:
1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following `ui-rules.md` and `ui-tokens.md`, then add it here

After building any component — update this file with the component name, file path, and exact classes used. Invoke `/imprint` after each UI component.

---

## Reference Components (from sample — adapt, don't copy verbatim)

These exist in `sample/frontend/` and should be reimplemented for mimic-ai with green tokens:

| Component | Sample Path | mimic-ai Target |
|-----------|------------|-----------------|
| DashboardSidebar | `features/dashboard/components/dashboard-sidebar.tsx` | `features/dashboard/components/dashboard-sidebar.tsx` |
| PageHeader | `components/page-header.tsx` | `components/page-header.tsx` |
| VoiceCard | `features/voices/components/voice-card.tsx` | `features/voices/components/voice-card.tsx` |
| StatsCard | `components/ui/stats-card.tsx` | `components/ui/stats-card.tsx` |
| UsageContainer | `features/billing/components/usage-container.tsx` | `features/billing/components/usage-container.tsx` |
| GenerationProgress | `features/text-to-speech/components/generation-progress.tsx` | `features/jobs/components/generation-progress.tsx` |
| VoiceAvatar | `components/voice-avatar/voice-avatar.tsx` | `components/voice-avatar/voice-avatar.tsx` |
| QuickActionCard | `features/dashboard/components/quick-action-card.tsx` | `features/dashboard/components/quick-action-card.tsx` |
| HeroPattern | `features/dashboard/components/hero-pattern.tsx` | `features/dashboard/components/hero-pattern.tsx` |

---

## Components

### DashboardSidebar
**Path:** `features/dashboard/components/dashboard-sidebar.tsx`
**Classes:**
- Nav active item: `h-9 border border-transparent ... data-[active=true]:border-border data-[active=true]:shadow-[0px_1px_1px_0px_rgba(44,54,53,0.03),inset_0px_0px_0px_2px_white]`
- Section labels: `text-[13px] uppercase text-muted-foreground`
- Dividers: `border-b border-dashed border-border`

### PageHeader
**Path:** `components/page-header.tsx`
**Classes:**
- Container: `flex items-center justify-between border-b px-4 py-4`
- Title: `text-lg font-semibold tracking-tight`

### DashboardPageShell
**Path:** `features/dashboard/components/dashboard-page-shell.tsx`
**Classes:**
- Page padding: `p-4 lg:p-8`
- Desktop title: `text-2xl font-semibold tracking-tight`
- Empty state: shadcn `Empty` with `border`

### QuickActionCard
**Path:** `features/dashboard/components/quick-action-card.tsx`
**Classes:**
- Card: `flex gap-4 rounded-xl border bg-card p-3`
- Gradient placeholder: `h-31 w-41 rounded-xl bg-linear-to-br`

### ProjectCard
**Path:** `features/projects/components/project-card.tsx`
**Classes:**
- Card: `rounded-2xl`
- Title link: `hover:text-primary`
- Description: `line-clamp-3 text-sm text-muted-foreground`
- Actions: ghost icon dropdown with `DropdownMenuGroup` wrapper

### ProjectsToolbar
**Path:** `features/projects/components/projects-toolbar.tsx`
**Classes:**
- Section title: `text-lg font-semibold tracking-tight`
- Layout: `flex items-center justify-between gap-4`

### VoiceCard
**Path:** `features/voices/components/voice-card.tsx`
**Classes:**
- Card row: `flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-6`
- Avatar slot: `relative h-24 w-20 shrink-0 lg:h-30 lg:w-24`
- Category accent: `text-primary`
- Play button: `variant="outline" size="icon-sm" className="rounded-full"`

### VoicesToolbar
**Path:** `features/voices/components/voices-toolbar.tsx`
**Classes:**
- Section title: `text-lg font-semibold tracking-tight lg:text-xl`
- Search: `InputGroup` with `sm:max-w-sm`

### AvatarCard
**Path:** `features/avatars/components/avatar-card.tsx`
**Classes:**
- Card row: `flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-6`
- Portrait thumbnail: `h-24 w-20 lg:h-30 lg:w-24 object-cover`
- Style accent: `text-primary`
- View button: `variant="outline" size="icon-sm" className="rounded-full"`

### AvatarsToolbar
**Path:** `features/avatars/components/avatars-toolbar.tsx`
**Classes:**
- Section title: `text-lg font-semibold tracking-tight lg:text-xl`
- Search: `InputGroup` with `sm:max-w-sm`

### VideoCard
**Path:** `features/videos/components/video-card.tsx`
**Classes:**
- Card row: `flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-6`
- Thumbnail slot: `relative h-24 w-28 shrink-0 overflow-hidden bg-muted lg:h-30 lg:w-32`
- Title link: `line-clamp-1 text-sm font-medium tracking-tight hover:text-primary`
- Meta line: `text-xs text-muted-foreground`
- Open button: `variant="outline" size="icon-sm" className="rounded-full"`

### VideosToolbar
**Path:** `features/videos/components/videos-toolbar.tsx`
**Classes:**
- Section title: `text-lg font-semibold tracking-tight lg:text-xl`
- Search: `InputGroup` with `sm:max-w-sm`
- Primary CTA: `Generate video` → `/dashboard/videos/new`

### VideoStatusBadge
**Path:** `features/videos/components/video-status-badge.tsx`
**Classes:**
- draft: `Badge variant="secondary"`
- pending: `Badge variant="outline"`
- processing / completed: `Badge variant="default"`
- failed: `Badge variant="destructive"`

### VideoWizardSteps
**Path:** `features/videos/components/video-wizard-steps.tsx`
**Classes:**
- Progress bar: shadcn `Progress` with step fraction
- Step pill: `flex items-center gap-2 rounded-full border px-3 py-1 text-xs font-medium`
- Active step: `border-primary bg-primary/5 text-primary`

### VoicePicker / AvatarPicker
**Path:** `features/videos/components/voice-picker.tsx`, `features/videos/components/avatar-picker.tsx`
**Classes:**
- Selectable row: `flex w-full items-center gap-3 rounded-xl border p-3 text-left transition-colors`
- Selected: `border-primary bg-primary/5`
- Avatar thumbnail: `size-12 rounded-lg object-cover`

### CostEstimatePanel
**Path:** `features/videos/components/cost-estimate-panel.tsx`
**Classes:**
- Table rows: static mock line items in `Card` with `rounded-2xl`
- Preview placeholders: disabled panels with muted helper text

### VideoDetailView
**Path:** `features/videos/views/video-detail-view.tsx`
**Classes:**
- Summary cards: `Card className="rounded-2xl"`
- Draft video area: `aspect-video ... border-dashed bg-muted/30`
- Completed video: native `<video>` via `/api/videos/{id}`
- Active progress loader: `flex aspect-video w-full max-w-3xl flex-col items-center justify-center gap-4 rounded-xl border bg-muted/10 p-8 text-center` with state status badges and custom progress bars
- Failed video area: `flex aspect-video w-full max-w-3xl flex-col items-center justify-center gap-3 rounded-xl border border-destructive/20 bg-destructive/5 p-8 text-center`
- Generate trigger: `Button variant="default" size="sm" className="gap-1.5 ml-auto bg-primary text-primary-foreground hover:bg-primary/80"`

### ScriptCard
**Path:** `features/scripts/components/script-card.tsx`
**Classes:**
- Card row: `flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-6`
- Icon slot: `relative flex h-24 w-20 ... bg-muted/50 lg:h-30 lg:w-24`
- Title link: `line-clamp-1 text-sm font-medium tracking-tight hover:text-primary`
- Meta line: `text-xs text-muted-foreground` with character count + updated date
- Use in video: `Button variant="outline" size="sm"` with Link to wizard

### ScriptsToolbar
**Path:** `features/scripts/components/scripts-toolbar.tsx`
**Classes:**
- Search: `InputGroup` with `sm:max-w-sm`
- Primary CTA: `New script` → `/dashboard/scripts/new`

### ScriptEditorForm
**Path:** `features/scripts/components/script-editor-form.tsx`
**Classes:**
- Main editor: `Card className="rounded-2xl"` with `Textarea rows={16}`
- Character count: `text-xs text-muted-foreground` below textarea
- AI assist sidebar: `Card className="h-fit rounded-2xl"` with disabled `Generate suggestions` button
- Layout: `grid gap-6 lg:grid-cols-[1fr_280px]`

### ScriptForm
**Path:** `features/scripts/components/script-form.tsx`
**Classes:**
- Shared fields: title input, project select, content textarea
- Character count: `text-xs text-muted-foreground`

### ScriptCreateDialog / ScriptEditDialog
**Path:** `features/scripts/components/script-create-dialog.tsx`, `script-edit-dialog.tsx`
**Classes:**
- Dialog: `sm:max-w-lg`, `DialogTrigger nativeButton` when using Button trigger
- Mobile: Drawer with scrollable form body

### ScriptPicker
**Path:** `features/videos/components/script-picker.tsx`
**Classes:**
- Selectable row: `flex w-full items-start gap-3 rounded-xl border p-3`
- Selected: `border-primary bg-primary/5`
- Icon slot: `size-10 rounded-lg bg-muted/50`
- Edit button: `variant="outline" size="icon-sm" rounded-full`

### BrandKitCard
**Path:** `features/templates/components/brand-kit-card.tsx`
**Classes:**
- Card row: `flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-4`
- Monogram: `flex size-10 items-center justify-center rounded-xl text-white text-sm font-bold`
- Color swatches: `size-5 rounded-md border shadow-sm`

### TemplateCard
**Path:** `features/templates/components/template-card.tsx`
**Classes:**
- Card row: `flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-4`
- Visual slot: `relative flex h-24 w-20 shrink-0 items-center justify-center bg-muted lg:h-28 lg:w-24`
- Use button: `Button render={<Link />} variant="outline" size="sm" className="text-xs"`

### TemplatesView
**Path:** `features/templates/views/templates-view.tsx`
**Classes:**
- Container: standard page shell with tabs switcher
- Tabs header: border, flex gap, and clean layout
- Role gating: Workspace owner/admin CTA buttons
- Dialogs: integrated delete confirmations and create/edit trigger sheets

### ExportDialog
**Path:** `features/videos/components/export-dialog.tsx`
**Classes:**
- Dialog: custom responsive dialog/drawer
- Alerts: `rounded-xl border border-amber-200/50 bg-amber-50/50 p-3` (warning/info style)
- Buttons: premium actions simulation triggers

### ExportsList
**Path:** `features/videos/components/exports-list.tsx`
**Classes:**
- Card: `rounded-2xl divide-y` list layout
- Indicators: custom colors for status: `text-amber-600` (queued), `text-blue-600` (rendering), `text-emerald-600` (ready), `text-destructive` (failed)
- Actions: inline ghost delete icon button, custom anchor tag wrap download button

### JobStatusBadge
**Path:** `features/jobs/components/job-status-badge.tsx`
**Classes:**
- Badge container: `inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-medium` with status-based colors (e.g. `bg-amber-50 text-amber-600`, `bg-blue-50 text-blue-600`, etc.)

### JobCard
**Path:** `features/jobs/components/job-card.tsx`
**Classes:**
- Row wrapper: `flex items-center gap-1 overflow-hidden rounded-xl border pr-3 lg:pr-6`
- Icon slot: `relative flex h-20 w-16 shrink-0 items-center justify-center lg:h-24 lg:w-20`
- Active states: Animated progress bar (`Progress value={progress} className="h-1.5 flex-1"`) visible only when `status === "running"`

### JobsToolbar
**Path:** `features/jobs/components/jobs-toolbar.tsx`
**Classes:**
- Search: `InputGroup className="sm:max-w-[220px]"` wrapping `InputGroupAddon` and `InputGroupInput`
- Filter layout: `flex flex-wrap items-center gap-2` with `Select` components

### JobsView
**Path:** `features/jobs/views/jobs-view.tsx`
**Classes:**
- Page shell: wraps layout in `DashboardPageShell`
- Stats Grid: `grid grid-cols-2 gap-3 lg:grid-cols-4` with unified `StatCard` blocks
- Sim trigger: `Button variant="default" size="sm" className="gap-1.5 shrink-0"`
- Empty state: `Empty className="border"` with `EmptyMedia`, `EmptyTitle`, and `EmptyDescription`

### WebhooksView
**Path:** `features/webhooks/views/webhooks-view.tsx`
**Classes:**
- Page layout: Master-Detail grid `grid grid-cols-1 gap-6 lg:grid-cols-3`
- Left sidebar list: Scrollable `space-y-2 max-h-[70vh] overflow-y-auto`
- Sidebar items: `w-full text-left rounded-xl p-4 border` (active/selected highlights primary border and color)
- Metrics Overview: `grid grid-cols-3 gap-4` using stats cards
- Deliveries table list: `divide-y divide-border font-mono text-xs overflow-hidden rounded-xl border`

### WebhookDialog
**Path:** `features/webhooks/components/webhook-dialog.tsx`
**Classes:**
- Form Layout: `form className="flex flex-col gap-5"` wrapping `FieldGroup` and `Field`
- Events checklist wrapper: `grid gap-3 rounded-lg border border-border p-4`
- Event list label: `flex items-start gap-3 text-sm cursor-pointer select-none group`

### DeliveryDetails
**Path:** `features/webhooks/components/delivery-details.tsx`
**Classes:**
- Badge status variant: `Badge variant={success ? "outline" : "destructive"}` (uses custom background and border classes for success emerald styling)
- Metadata info grid: `grid grid-cols-2 gap-3 border border-border rounded-lg p-3 bg-muted/30 text-xs`
- Tabs component: `Tabs defaultValue="request" className="flex-1 overflow-hidden flex flex-col"` wrapping code blocks in `<pre className="rounded-md border border-border bg-muted/50 p-3 font-mono text-xs select-text">`

### BRollPanel
**Path:** `features/videos/components/broll-panel.tsx`
**Classes:**
- Search: `Input className="pl-8 h-9 text-xs"`
- Card grid: `grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3`
- Selected tray: `flex gap-2 overflow-x-auto pb-1 scrollbar-thin`
- Thumbnail badges: `Badge variant="secondary" className="text-[9px] py-0 px-1.5 bg-black/60 text-white border-none backdrop-blur-sm"`

### WatermarkSettingsFields
**Path:** `features/watermark/components/watermark-settings-fields.tsx`
**Classes:**
- Container: `space-y-4 rounded-xl border p-4`
- Free tier alert: `rounded-xl border border-amber-200/50 bg-amber-50/50 p-3 text-xs text-amber-800`
- Premium badge: `rounded-xl border border-green-200/50 bg-green-50/50 p-3 text-xs text-green-800`
- Opacity slider: `w-full accent-primary`

### Slider
**Path:** `components/ui/slider.tsx`
**Classes:**
- Track/thumb wrapper: `relative flex w-full touch-none select-none items-center py-2`
- Track: `relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted`
- Range filling: `absolute h-full bg-primary`
- Thumb: `absolute top-1/2 -translate-y-1/2 size-4 rounded-full border border-primary/50 bg-background shadow`

### AgentView
**Path:** `features/agent/views/agent-view.tsx`
**Classes:**
- Shell: `flex h-[calc(100vh-0rem)] w-full overflow-hidden bg-background`

### ThreadSidebar
**Path:** `features/agent/views/thread-sidebar.tsx`
**Classes:**
- Sidebar container: `flex w-80 shrink-0 flex-col border-r bg-muted/20`
- Section labels: `font-semibold text-sm tracking-tight font-outfit`
- Thread item active: `bg-emerald-500/10 border-emerald-500/30 text-foreground font-medium`

### SettingsPanel
**Path:** `features/agent/views/settings-panel.tsx`
**Classes:**
- Form card: `mt-3 p-3 rounded-lg border bg-background space-y-4 text-xs font-outfit`
- Warnings: `text-[10px] text-amber-500 mt-1 leading-normal font-outfit`

### MessageList
**Path:** `features/agent/views/message-list.tsx`
**Classes:**
- Message wrapper: `Message key={m.id} from={m.role}`
- Message contents: `text-sm leading-relaxed prose prose-emerald dark:prose-invert`

### InterruptWizard
**Path:** `features/agent/views/interrupt-wizard.tsx`
**Classes:**
- Dialog block: `mt-4 border-amber-500/30 bg-amber-500/5 p-4 shadow-sm rounded-xl font-outfit`
- Header: `flex items-center gap-2 text-amber-600 font-semibold text-xs uppercase tracking-wider mb-2`


