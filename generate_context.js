const fs = require('fs');
const path = require('path');

const projectOverview = `# Project Overview

## About the Project
SaaSify is a modern SaaS dashboard application designed specifically for small business owners. It provides a clean, unified interface to track key sales metrics, manage customer invoices, process subscription payments, and analyze business performance.

## The Problem It Solves
Small business owners often struggle to manage multiple disjointed tools for invoicing, payment tracking, and business analytics. SaaSify consolidates these features into a single, intuitive platform, reducing administrative overhead, accelerating payment collection via Stripe, and offering real-time insights with PostHog analytics.

## Pages
\`\`\`
/ -> Landing page presenting value propositions, pricing tiers, and call-to-actions.
/login -> Authentication page for user login and signup.
/dashboard -> Main dashboard home exhibiting high-level sales metrics, recent invoice status, and quick links.
/dashboard/invoices -> Invoice management page containing list/search of invoices, invoice creation drawer, and statuses.
/dashboard/billing -> Subscription and Stripe billing dashboard showing plan details, billing history, and portal link.
/dashboard/analytics -> Real-time business metrics charts, sales trends, and customer breakdowns.
\`\`\`

## Navigation
- **Public Layout**: A clean top navbar with Logo, Features, Pricing, and a "Sign In" button.
- **App Layout**: A persistent left sidebar for desktop and a bottom bar/hamburger menu for mobile.
  - Sidebar links: Dashboard, Invoices, Analytics, Billing.
  - User profile menu: Located at the bottom of the sidebar with Logout and Account settings.

## Core User Flow
1. **Discovery & Onboarding**: A small business owner visits \`/\`, reads the value proposition, and signs up via \`/login\`.
2. **Setup**: The owner is guided to \`/dashboard/billing\` to choose a plan and set up payment details (Stripe), and then completes workspace initialization (Prisma / PostgreSQL database record created).
3. **Invoicing**: The owner navigates to \`/dashboard/invoices\`, clicks "Create Invoice", inputs customer details and line items, and sends it.
4. **Tracking & Analytics**: The owner tracks payment status (Sent, Paid, Overdue) on \`/dashboard\`, views detailed sales trend charts on \`/dashboard/analytics\`, and monitors event engagement sent to PostHog.
`;

const architecture = `# Architecture

## Tech Stack
- **Framework**: Next.js (App Router, React 19)
- **Database ORM**: Prisma ORM
- **Database**: PostgreSQL (hosted/local)
- **Styling**: Tailwind CSS
- **Payments**: Stripe (Stripe Checkout, Customer Portal, Webhooks)
- **Analytics**: PostHog (client-side tracking and server-side events)

## Folder Structure
\`\`\`
saasify/
├── app/                  # Next.js App Router
│   ├── (auth)/           # Authentication route group (/login)
│   ├── (dashboard)/      # Protected dashboard route group (/dashboard)
│   │   ├── invoices/     # Invoice management (/dashboard/invoices)
│   │   ├── billing/      # Subscription & billing (/dashboard/billing)
│   │   ├── analytics/    # Analytics dashboard (/dashboard/analytics)
│   │   └── layout.tsx    # Dashboard sidebar/shell layout
│   ├── api/              # API routes (e.g. Stripe webhooks)
│   ├── layout.tsx        # Root HTML and font layout
│   └── page.tsx          # Public landing page
├── components/           # Reusable UI & Layout components
│   ├── ui/               # Base UI elements (buttons, inputs, dialogs)
│   └── dashboard/        # Dashboard-specific elements (charts, tables)
├── lib/                  # Shared library clients and utility scripts
│   ├── db.ts             # Prisma Client singleton
│   ├── stripe.ts         # Stripe client and helper functions
│   └── posthog.ts        # PostHog client configuration
├── prisma/               # Prisma Database configuration
│   └── schema.prisma     # DB tables and relations
├── hooks/                # Custom React hooks
└── types/                # TypeScript interfaces & declarations
\`\`\`

## Data Models
- **User**: Represents users who own small businesses.
  - \`id\`: String (PK)
  - \`email\`: String (Unique)
  - \`name\`: String?
  - \`stripeCustomerId\`: String? (Unique)
  - \`stripeSubscriptionId\`: String?
  - \`createdAt\`: DateTime
  - \`updatedAt\`: DateTime
- **Invoice**: Represents invoices sent by a User to their customers.
  - \`id\`: String (PK)
  - \`userId\`: String (FK to User.id)
  - \`customerName\`: String
  - \`customerEmail\`: String
  - \`amount\`: Int (in cents)
  - \`status\`: Enum (DRAFT, SENT, PAID, OVERDUE)
  - \`dueDate\`: DateTime
  - \`createdAt\`: DateTime
  - \`updatedAt\`: DateTime
- **InvoiceItem**: Represents line items inside an Invoice.
  - \`id\`: String (PK)
  - \`invoiceId\`: String (FK to Invoice.id)
  - \`description\`: String
  - \`quantity\`: Int
  - \`unitAmount\`: Int (in cents)
  - \`createdAt\`: DateTime
  - \`updatedAt\`: DateTime

## Architectural Invariants
- **Database Safety**: Never query the database directly from Client Components. Always use React Server Actions or Server Components.
- **Data Isolation**: Always filter database queries by the authenticated user's \`userId\` to prevent cross-tenant data leaks.
- **Payment Verification**: Stripe webhooks must verify signatures using the webhook secret before acting on any payload.
- **Connection Limits**: The Prisma Client must be initialized as a global singleton to avoid exhausting database connections in Next.js hot-reloads.
`;

const buildPlan = `# Build Plan

## Core Principle
Full page UI built with mock data first — verified visually before any logic is written. Then functionality is built and wired to the UI step by step. Every feature must be visible and testable before moving to the next. No invisible backend phases.

---

## Development Phases

### Phase 1 — Foundation
- [ ] 01 Database Schema & Migration: Set up schema.prisma with User, Invoice, and InvoiceItem models, and run the initial migration.
- [ ] 02 Authentication Setup: Integrate Auth (Next-Auth or similar) with credentials/OAuth provider and configure route protection.
- [ ] 03 Navigation & Shell Layout: Create the main dashboard sidebar, desktop/mobile responsive header, and page container layouts.
- [ ] 04 Home Dashboard Layout: Build the main \`/dashboard\` page with mock statistics cards, recent invoice table, and empty states.

### Phase 2 — Billing & Invoices
- [ ] 05 Invoice Creation Form & Drawer UI: Build the Slide-over/Drawer interface with forms to add line items and customer details.
- [ ] 06 Invoice List & Status Filter Wiring: Build invoice list rendering, sorting, pagination, and status filters wired to real DB queries.
- [ ] 07 Stripe Checkout Integration: Implement plan comparison cards and redirect users to Stripe Checkout Session for subscription plans.
- [ ] 08 Stripe Webhook & Customer Portal: Configure signature-verified webhook endpoints to sync subscriptions and redirect users to Stripe Customer Portal.
- [ ] 09 Billing Dashboard View: Show current subscription details, status, next billing date, and list historical invoice receipts.

### Phase 3 — Analytics
- [ ] 10 Analytics Dashboard Layout: Create the UI skeleton for \`/dashboard/analytics\` featuring placeholder charts and KPI summary widgets.
- [ ] 11 Recharts / Chart.js Integration: Connect charting widgets to database aggregations for revenue tracking, payment collection speed, and trends.
- [ ] 12 PostHog Analytics Event Tracking: Initialize client-side PostHog tracking and capture key events: user signup, invoice created, invoice paid.
- [ ] 13 Final Polish: Perform full visual audit, optimize responsive behavior, clean up console warnings, and write end-to-end user path tests.

---

## Feature Count
- **Phase 1**: 4 features
- **Phase 2**: 5 features
- **Phase 3**: 4 features
- **Total Features**: 13
`;

const codeStandards = `# Code Standards

## Styling & Framework Conventions
- **Component Pattern**: Use functional components with TypeScript and explicit return types.
- **Client/Server Boundary**: Explicitly mark files with \`"use client"\` only when state, effects, or browser APIs are required. Otherwise, default to Server Components.
- **CSS utility organization**: Keep Tailwind CSS classes organized logically (Layout, Spacing, Typography, Borders, Interactive/States).

## Naming Conventions
- **Components**: PascalCase (e.g. \`InvoiceList.tsx\`, \`StatCard.tsx\`).
- **Utilities & Actions**: camelCase (e.g. \`db.ts\`, \`createInvoiceAction.ts\`).
- **DB Tables & Columns**: PascalCase for Prisma models (mapped to snake_case in the database).
- **Environment Variables**: UPPER_SNAKE_CASE (e.g. \`STRIPE_SECRET_KEY\`).

## Rules & Patterns
- **Error Handling**: Standardize Server Action responses using a result object:
  \`\`\`typescript
  type ActionResponse<T> = { success: true; data: T } | { success: false; error: string };
  \`\`\`
- **Database Safety**: Enforce explicit selection of fields or sanitize output objects to avoid leaking hash passwords or internal identifiers.
- **Strict TypeScript**: Do not use \`any\`. Use custom interfaces or Prisma-generated types for query returns.
`;

const libraryDocs = `# Library Docs

Project-specific usage patterns for every third-party library in this project. This file only covers how we use each library in this specific project — rules, patterns, and constraints.

Read the relevant section before implementing any feature that touches these libraries.

---

## Prisma ORM
- **Client Instance**: Always import the singleton instance from \`@/lib/db\`. Do not instantiate \`new PrismaClient()\` elsewhere.
- **Filtering**: Always apply \`where: { userId: currentUserId }\` in user-specific tables.
- **Example Usage**:
  \`\`\`typescript
  import { db } from "@/lib/db";
  
  export async function getInvoices(userId: string) {
    return await db.invoice.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" }
    });
  }
  \`\`\`

## Stripe
- **Client Initialization**: Import Stripe from \`@/lib/stripe\` using the secret API key.
- **Webhook Signature Validation**: Use \`stripe.webhooks.constructEvent\` inside the API route handler and read raw request body:
  \`\`\`typescript
  const payload = await req.text();
  const signature = req.headers.get("stripe-signature");
  const event = stripe.webhooks.constructEvent(payload, signature, process.env.STRIPE_WEBHOOK_SECRET);
  \`\`\`
- **Unit Amounts**: Remember Stripe processes amounts in cents. Divide by 100 for display, multiply by 100 before sending requests.

## PostHog
- **Provider setup**: Wrap the application with the client-side provider client inside a layout component.
- **Tracking helper**: Use PostHog capture function to record user events:
  \`\`\`typescript
  import posthog from "posthog-js";
  
  export function trackInvoiceCreated(invoiceId: string, amount: number) {
    posthog.capture("invoice_created", {
      invoiceId,
      amount
    });
  }
  \`\`\`
`;

const uiTokens = `# UI Tokens

## Colors
SaaSify uses a curated, sleek dark theme with tailwind configurations:
- **Background**: \`hsl(224, 71%, 4%)\` (Deep slate background)
- **Foreground**: \`hsl(210, 40%, 98%)\` (Crisp off-white)
- **Card / Surface**: \`hsl(224, 71%, 7%)\` (Slightly lighter navy card background)
- **Border**: \`hsl(217.2, 32.6%, 17.5%)\` (Subtle dark border)
- **Primary / Accent**: \`hsl(263, 70%, 50%)\` (Deep electric violet)
- **Primary Foreground**: \`hsl(210, 40%, 98%)\`
- **Muted**: \`hsl(215, 20.2%, 65.1%)\` (Muted gray text)
- **Status Colors**:
  - **Paid (Success)**: \`hsl(142, 72%, 29%)\` (Emerald green) / Text: \`hsl(142, 76%, 80%)\`
  - **Sent / Pending (Warning)**: \`hsl(38, 92%, 50%)\` (Warm amber) / Text: \`hsl(38, 92%, 85%)\`
  - **Overdue (Danger)**: \`hsl(346, 84%, 50%)\` (Crimson red) / Text: \`hsl(346, 84%, 85%)\`
  - **Draft**: \`hsl(215, 20.2%, 65.1%)\` / Text: \`hsl(210, 40%, 98%)\`

## Typography
- **Fonts**:
  - Headings: **Outfit** (Modern geometric sans-serif)
  - Body / Code: **Inter** / Standard system sans-serif font family
- **Weights**:
  - Regular: \`font-normal\` (400)
  - Medium: \`font-medium\` (500)
  - Semibold: \`font-semibold\` (600)
  - Bold: \`font-bold\` (700)

## Spacing & Layout
- **Container widths**: Standardized page width at \`max-w-7xl px-4 sm:px-6 lg:px-8\`.
- **Card padding**: Standard \`p-6\` for standard information cards, \`p-4\` for smaller stats cards.
- **Section gaps**: \`gap-6\` or \`gap-8\` for grids and major content layout offsets.

## Borders & Radius
- **Border Radius**:
  - Cards, panels, modals: \`rounded-xl\` (12px)
  - Buttons, inputs, badges: \`rounded-lg\` (8px)
- **Border Width**: \`1px\` (using custom border HSL color).
`;

const uiRules = `# UI Rules

## Global Layout Rules
- **Responsive Layout**: Mobile-first grid layouts. Desktop displays sidebar (260px width) next to content scroll. On mobile, use responsive header navbar with collapsible sheet.
- **Flexibility**: Never use fixed height units on parent layout containers; let layout grow dynamically with child components.

## Interaction & States
- **Hover Transitions**: Add transition properties to all interactive components:
  \`\`\`tailwind
  transition-all duration-200 ease-in-out
  \`\`\`
- **Hover Scale**: Highlight major interactive dashboard cards with scale shifts:
  \`\`\`tailwind
  hover:scale-[1.01] hover:shadow-md
  \`\`\`
- **Button Feedback**: Standardize focus ring and active button scaling:
  \`\`\`tailwind
  focus:outline-none focus:ring-2 focus:ring-accent focus:ring-offset-2 active:scale-[0.98]
  \`\`\`

## Animations & Transitions
- **Page Entry**: Use simple keyframes for page level entries:
  \`\`\`tailwind
  animate-fade-in-up (slide up by 4px and fade in)
  \`\`\`
- **Drawer Slide-over**: Sliding in transition from right side using Tailwind ease-in-out with 300ms duration.
`;

const uiRegistry = `# UI Registry

Living document. Updated after every component is built. Read this before building any new component — match existing patterns exactly before inventing new ones.

---

## How to Use
Before building any component:
1. Check if a similar component already exists here
2. If yes — match its exact classes
3. If no — build it following ui-rules.md and ui-tokens.md, then add it here

After building any component — update this file with the component name, file path, and exact classes used.

---

## Components

### 1. Dashboard Sidebar Shell
- **File**: \`components/dashboard/Sidebar.tsx\`
- **Description**: Desktop sidebar containing navigation routes and bottom user profile popup.
- **Classes**: \`w-64 bg-card border-r border-border h-screen flex flex-col justify-between p-6\`

### 2. Metric Stat Card
- **File**: \`components/dashboard/StatCard.tsx\`
- **Description**: Simple KPI block showing metric total and percentage change.
- **Classes**: \`bg-card border border-border p-6 rounded-xl hover:scale-[1.01] transition-all duration-200\`

### 3. Invoice Status Badge
- **File**: \`components/dashboard/InvoiceStatusBadge.tsx\`
- **Description**: Colored pill reflecting status of invoice (Paid, Sent, Overdue).
- **Classes**: \`px-2.5 py-1 rounded-lg text-xs font-semibold\`
  - *Paid*: \`bg-[hsl(142,72%,29%)]/10 text-[hsl(142,76%,80%)]\`
  - *Sent*: \`bg-[hsl(38,92%,50%)]/10 text-[hsl(38,92%,85%)]\`
  - *Overdue*: \`bg-[hsl(346,84%,50%)]/10 text-[hsl(346,84%,85%)]\`
`;

const progressTracker = `# Progress Tracker

Update this file after every completed feature. Any AI agent reading this should immediately know what is done, what is in progress, and what is next.

---

## Current Status
**Phase:** Phase 1 — Foundation
**Last completed:** Project initialized & Context files generated
**Next:** Phase 1 Checklist (01 Database Schema & Migration)

---

## Progress

### Phase 1 — Foundation
- [ ] 01 Database Schema & Migration
- [ ] 02 Authentication Setup
- [ ] 03 Navigation & Shell Layout
- [ ] 04 Home Dashboard Layout

### Phase 2 — Billing & Invoices
- [ ] 05 Invoice Creation Form & Drawer UI
- [ ] 06 Invoice List & Status Filter Wiring
- [ ] 07 Stripe Checkout Integration
- [ ] 08 Stripe Webhook & Customer Portal
- [ ] 09 Billing Dashboard View

### Phase 3 — Analytics
- [ ] 10 Analytics Dashboard Layout
- [ ] 11 Recharts / Chart.js Integration
- [ ] 12 PostHog Analytics Event Tracking
- [ ] 13 Final Polish

---

## Decisions Made During Build
- **Tech Stack Selection**: Opted for PostgreSQL and Prisma ORM to guarantee type safety and structured relations.
- **Sleek Dark Theme**: Configured dark theme as default to fit modern design system guidelines.

---

## Notes
- Stripe API client requires \`STRIPE_SECRET_KEY\` and \`STRIPE_WEBHOOK_SECRET\` environment variables.
- PostHog tracking requires client-side environment variable initialization.
`;

const agentRules = `<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in \`node_modules/next/dist/docs/\` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

<!-- BEGIN:context-rules -->
# Context & Workspace Rules

This workspace uses a Context-Driven Development (CDD) system. Before executing any task:
1. **Always read the context files** in the \`/context\` directory to understand the project architecture, design tokens, code standards, and current progress.
2. **Restore memory** at the start of every session using \`/remember restore\` (which reads \`memory.md\` in the root).
3. **Save memory** at the end of every session using \`/remember save\` to ensure the next session picks up exactly where we left off.
4. **Follow the plan** outlined in \`context/build-plan.md\` and update \`context/progress-tracker.md\` and \`context/ui-registry.md\` as files are built/modified.
<!-- END:context-rules -->
`;

const claudeRules = `@AGENTS.md

<!-- BEGIN:context-rules -->
# Context & Workspace Rules

This workspace uses a Context-Driven Development (CDD) system. Before executing any task:
1. **Always read the context files** in the \`/context\` directory to understand the project architecture, design tokens, code standards, and current progress.
2. **Restore memory** at the start of every session using \`/remember restore\` (which reads \`memory.md\` in the root).
3. **Save memory** at the end of every session using \`/remember save\` to ensure the next session picks up exactly where we left off.
4. **Follow the plan** outlined in \`context/build-plan.md\` and update \`context/progress-tracker.md\` and \`context/ui-registry.md\` as files are built/modified.
<!-- END:context-rules -->
`;

function writeFiles(targetDir) {
  const contextDir = path.join(targetDir, 'context');
  if (!fs.existsSync(contextDir)) {
    fs.mkdirSync(contextDir, { recursive: true });
  }
  
  fs.writeFileSync(path.join(contextDir, 'project-overview.md'), projectOverview);
  fs.writeFileSync(path.join(contextDir, 'architecture.md'), architecture);
  fs.writeFileSync(path.join(contextDir, 'build-plan.md'), buildPlan);
  fs.writeFileSync(path.join(contextDir, 'code-standards.md'), codeStandards);
  fs.writeFileSync(path.join(contextDir, 'library-docs.md'), libraryDocs);
  fs.writeFileSync(path.join(contextDir, 'ui-tokens.md'), uiTokens);
  fs.writeFileSync(path.join(contextDir, 'ui-rules.md'), uiRules);
  fs.writeFileSync(path.join(contextDir, 'ui-registry.md'), uiRegistry);
  fs.writeFileSync(path.join(contextDir, 'progress-tracker.md'), progressTracker);
  
  fs.writeFileSync(path.join(targetDir, 'AGENTS.md'), agentRules);
  fs.writeFileSync(path.join(targetDir, 'CLAUDE.md'), claudeRules);
  
  console.log('Successfully wrote CDD files to ' + targetDir);
}

const arg = process.argv[2];
if (arg) {
  writeFiles(arg);
} else {
  console.error('Please specify target directory');
}
