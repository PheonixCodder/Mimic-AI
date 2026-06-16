# UI Tokens

Design system values for mimic-ai. Reference implementation: `sample/frontend/app/globals.css` and `sample/frontend/components.json` — remapped to green brand palette.

**Style:** shadcn/ui radix-nova | **Theme:** Light-first | **Font:** Outfit + Geist Mono

---

## Colors

### Brand Palette

| Token | Hex | Usage |
|-------|-----|-------|
| **Primary** | `#16A34A` | Primary buttons, active states, links, sidebar accent |
| **Primary Foreground** | `#FFFFFF` | Text on primary backgrounds |
| **Secondary** | `#22C55E` | Secondary actions, highlights |
| **Secondary Foreground** | `#0F172A` | Text on secondary backgrounds |
| **Accent** | `#DCFCE7` | Hover backgrounds, selected items, badges |
| **Accent Foreground** | `#15803D` | Text on accent backgrounds |
| **Success** | `#15803D` | Success states, quality scores, confirmations |
| **Destructive** | `#DC2626` | Errors, delete actions, validation failures |
| **Background** | `#FFFFFF` | Page background |
| **Foreground** | `#0F172A` | Primary text |
| **Surface** | `#F8FAFC` | Card backgrounds, elevated surfaces |
| **Card** | `#FFFFFF` | Card component background |
| **Muted** | `#F1F5F9` | Subtle backgrounds, disabled states |
| **Muted Foreground** | `#64748B` | Secondary text, placeholders, labels |
| **Border** | `#E2E8F0` | Borders, dividers, input outlines |
| **Input** | `#E2E8F0` | Input field borders |
| **Ring** | `#16A34A` | Focus rings (primary green) |

### Sidebar Tokens

| Token | Value | Usage |
|-------|-------|-------|
| **Sidebar** | `#FFFFFF` | Sidebar background |
| **Sidebar Foreground** | `#64748B` | Inactive nav items |
| **Sidebar Primary** | `#16A34A` | Active nav indicator |
| **Sidebar Primary Foreground** | `#FFFFFF` | Active nav text |
| **Sidebar Accent** | `#F0FDF4` | Hover/active nav background |
| **Sidebar Accent Foreground** | `#0F172A` | Active nav label |
| **Sidebar Border** | `#E2E8F0` | Sidebar dividers |

### Chart Colors

| Token | Value |
|-------|-------|
| Chart 1 | `#16A34A` |
| Chart 2 | `#22C55E` |
| Chart 3 | `#15803D` |
| Chart 4 | `#DCFCE7` |
| Chart 5 | `#64748B` |

### CSS Variable Mapping

Map to shadcn CSS variables in `app/globals.css` using oklch or hex. Base radius: `0.75rem` (reference sample).

```css
:root {
  --radius: 0.75rem;
  --primary: /* #16A34A in oklch */;
  --primary-foreground: /* #FFFFFF */;
  /* ... map all tokens above */
}
```

Dark mode tokens planned for later — define structure now, implement in Phase 3+.

---

## Typography

| Element | Font | Weight | Size | Tracking |
|---------|------|--------|------|----------|
| **H1 (page title)** | Outfit | 600 (semibold) | `text-lg` (18px) | `tracking-tight` |
| **H2 (section)** | Outfit | 600 | `text-base` (16px) | `tracking-tight` |
| **Body** | Outfit | 400 (regular) | `text-sm` (14px) | normal |
| **Small/Label** | Outfit | 500 (medium) | `text-xs` (12px) | normal |
| **Nav items** | Outfit | 500 | `text-[13px]` | `tracking-tight` |
| **Nav section labels** | Outfit | 400 | `text-[13px]` uppercase | normal |
| **Code/Mono** | Geist Mono | 400 | `text-sm` | normal |
| **Stats/Numbers** | Outfit | 700 (bold) | `text-3xl` (30px) | normal |

---

## Spacing & Layout

**Philosophy:** Airy, comfortable whitespace. Reference sample's generous padding.

| Context | Value |
|---------|-------|
| Page padding (desktop) | `p-4 lg:p-16` |
| Page padding (mobile) | `p-4` |
| Card padding | `p-6` |
| Section gap | `space-y-8` |
| Component gap (inline) | `gap-2` to `gap-4` |
| Sidebar width (expanded) | shadcn default (~16rem) |
| Sidebar width (collapsed) | shadcn icon mode (~3rem) |
| Container max-width | Full width within sidebar inset |
| Header height | `py-4` with border-b |

---

## Borders & Radius

| Element | Radius | Border |
|---------|--------|--------|
| **Cards** | `rounded-2xl` | `border border-border` |
| **Buttons** | `rounded-xl` | `border border-border` (outline variant) |
| **Inputs** | `rounded-xl` | `border border-input` |
| **Voice/Avatar cards** | `rounded-xl` | `border pr-3 lg:pr-6` |
| **Nav active item** | default + `border border-border shadow-sm` | subtle inset shadow |
| **Avatars (round)** | `rounded-full` | `border-[1.5px] border-white shadow-xs` |
| **Play/action buttons** | `rounded-full` | outline variant |
| **Dialogs/Sheets** | shadcn default | — |
| **Badges** | `rounded-md` | — |
| **Stats cards** | `rounded-xl` | `border p-6` |

### Shadows

| Context | Class |
|---------|-------|
| Nav active item | `shadow-[0px_1px_1px_0px_rgba(44,54,53,0.03),inset_0px_0px_0px_2px_white]` |
| Sidebar footer items | `shadow-[0px_1px_1.5px_0px_rgba(44,54,53,0.03)]` |
| Cards | default border, no heavy shadow |

---

## Visual Style

**Aesthetic:** Apple × Linear × HeyGen — premium, clean, enterprise, minimal, fast.

**Do:**
- Clean white backgrounds with subtle borders
- Green accents for primary actions and success states
- Dashed dividers in sidebar (`border-dashed`)
- Generous whitespace
- Subtle hover transitions

**Don't:**
- Excessive glassmorphism
- Neon effects or gradients
- Playful/childish aesthetics
- Heavy drop shadows
- Dark mode as default (light-first)

---

## Reference Products

HeyGen, ElevenLabs, Synthesia, Linear, Notion, Vercel Dashboard.

Primary code reference: `sample/frontend/` (Resonance AI).
