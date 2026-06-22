# MASTER DIRECTIVE: AURUM SOVEREIGN CAPITAL UI/UX GENERATION
## SYSTEM CONTEXT, TECH STACK, & PHASED FRONTEND IMPLEMENTATION

This document serves as the absolute source of truth for Cursor Composer/Chat to interpret, plan, and construct the frontend layer of the Aurum Sovereign Capital application. 

---

## 1. MISSION CRITICAL CONTEXT & FUTURE ECOSYSTEM MATRIX

*   **What Aurum Is:** An institutional, multi-tenant investment management web platform. It features two entirely separate, visually contrasted spaces: an **Investor Portal** characterized by a dark, high-end glassmorphic portfolio layout, and an **Admin Workstation Terminal** featuring a clinical, high-density light-mode interface.
*   **The Velocity Architecture Strategy:** We are utilizing **Supabase (Auth, Storage, Database)** directly from the client application right now for maximum development velocity. However, the entire data-fetching tier **MUST** be written via decoupled abstract services (`src/services/api/*`). We will migrate to a **Nest.js** backend layer in a subsequent development phase. 
*   **The Core Strict Engineering Rule:** **NO PAGE OR WRAPPER IS ALLOWED TO CONTAIN HARDCODED JASON MOCK ARRAYS.** Every component must cleanly call a dedicated frontend service function (e.g., `getWallet()`). For this phase, these api service files will return static mock states wrapped in asynchronous promises, making future Nest.js/Supabase migration as simple as updating the service wrapper.
*   **The Workflow Engine Strategy:** For each individual page implementation, you will be provided a **Figma screenshot** showing localized visual modifications alongside raw **Stitch-generated HTML/CSS source code**. You must combine the structural DOM accuracy of the HTML with the refined visual updates from the screenshot to generate pixel-perfect TypeScript Next.js layout configurations.

---

## 2. THE SYSTEM STACK DEFINITION

*   **Frontend Core:** Next.js 14+ (App Router, Strict TypeScript)
*   **Styling & UI:** Tailwind CSS v3 + Shadcn/ui Primitive Sub-components
*   **Animation Layer:** Framer Motion (State-driven transitions, toast queues, and slide panels)
*   **State Engines:** Zustand (Separated lightweight client feature state modules)
*   **Data Visualization:** Recharts (SVG gradient fills, responsive tracking paths)
*   **Backend Interface:** Supabase Client SDK (Decoupled behind service adapters)

---

## 3. COMPREHENSIVE DIRECTORY MAP (`src/`)

Cursor, you must implement code files strictly adhering to this structural architecture. Do not create unmapped or trailing directory folders:

```text
src/
├── app/
│   ├── (public)/
│   │   ├── login/page.tsx
│   │   ├── onboarding/page.tsx
│   │   └── layout.tsx
│   ├── (investor)/
│   │   ├── dashboard/page.tsx
│   │   ├── funding/
│   │   │   ├── page.tsx
│   │   │   └── upload/page.tsx
│   │   ├── wallet/page.tsx
│   │   ├── orders/page.tsx
│   │   ├── legal/page.tsx
│   │   ├── concierge/page.tsx
│   │   ├── support/page.tsx
│   │   ├── profile/page.tsx
│   │   └── layout.tsx
│   ├── (admin)/
│   │   ├── admin/
│   │   │   ├── page.tsx
│   │   │   ├── users/page.tsx
│   │   │   ├── deposits/page.tsx
│   │   │   ├── liquidity/page.tsx
│   │   │   ├── settings/page.tsx
│   │   │   ├── console/page.tsx
│   │   │   └── inbox/page.tsx
│   │   └── layout.tsx
│   ├── layout.tsx
│   └── globals.css
├── features/
│   ├── auth/components/ hooks/ services/ schemas/ types/ store/
│   ├── onboarding/components/ services/ schemas/ types/
│   ├── dashboard/components/ services/ hooks/ types/
│   ├── funding/components/ services/ hooks/ types/
│   ├── wallet/components/ services/ hooks/ types/
│   ├── orders/components/ services/ hooks/ types/
│   ├── legal/components/ services/ types/
│   ├── concierge/components/ services/ types/
│   ├── support/components/ services/ hooks/ store/ types/
│   ├── profile/components/ services/ types/
│   ├── admin-dashboard/components/ services/ types/
│   ├── users/components/ services/ types/
│   ├── deposits/components/ services/ types/
│   ├── liquidity/components/ services/ types/
│   ├── console/components/ services/ types/
│   ├── inbox/components/ services/ store/ types/
│   └── settings/components/ services/ types/
├── shared/
│   ├── ui/ (buttons/, forms/, dialogs/, tables/, shadcn/)
│   ├── charts/ (PerformanceChart.tsx, AreaChart.tsx, LineChart.tsx, AumChart.tsx)
│   ├── layouts/ (InvestorSidebar.tsx, InvestorNavbar.tsx, AdminSidebar.tsx, AdminNavbar.tsx, PageContainer.tsx)
│   ├── feedback/ (Toast.tsx, AlertStack.tsx, LoadingScreen.tsx, EmptyState.tsx)
│   ├── cards/ (GlassCard.tsx, StatCard.tsx, MetricCard.tsx)
│   └── animations/ (FadeIn.tsx, SlideUp.tsx, PageTransition.tsx)
├── services/
│   ├── api/ (client.ts, auth.api.ts, users.api.ts, wallet.api.ts, funding.api.ts, orders.api.ts, chat.api.ts, admin.api.ts)
│   ├── realtime/ (websocket.ts, subscriptions.ts)
│   └── storage/ (upload.ts)
├── store/ (auth.store.ts, ui.store.ts, notification.store.ts, theme.store.ts, app.store.ts)
├── hooks/ (useAuth.ts, usePermissions.ts, useRealtime.ts, useDebounce.ts, useLocalStorage.ts)
├── lib/ (supabase/client.ts, query/queryClient.ts, constants/, utils/, formatters/, validators/)
├── types/ (auth.types.ts, user.types.ts, wallet.types.ts, funding.types.ts, trade.types.ts, chat.types.ts, api.types.ts)
├── assets/ (logos/, icons/, illustrations/, images/, fonts/)
└── middleware.ts


4. DESIGN SYSTEM SPECIFICATION & THEME TOKENS
Theme A: Investor Portal (Dark-Mode Premium Glassmorphism)
Backdrop Background Layer: Deep obsidian slate (#0A0E17 expanding dynamically into #121824).

Glass Containers: bg-[#ffffff]/[0.03] with a strict backdrop-blur value of backdrop-blur-md or backdrop-blur-xl.

Borders: Fine, high-transparency constraints using border-[#ffffff]/[0.08].

Brand Accent Colors: Metallic Brand Gold (#D4AF37) utilizing soft outer box-shadow glows.

Theme B: Admin Workstation Terminal (High-Density Clinical Light-Mode)
Backdrop Background Layer: Flat, low-fatigue off-white canvas grid (#F8F9FA scaling into #FFFFFF).

Typography & Structural Framework: Solid institutional Deep Navy (#0C1017).

Interactive Dividers: Light gray grid line separators (#E2E8F0).

Universal Status Anchors
Positive Analytics Metrics / Verified State Tags: Emerald Green (#10B981).

System Latency / Network Warnings / Verification Failures: Crimson Red (#EF4444).

5. SEQUENTIAL FRONTEND CONVERSION RUNBOOK
Cursor, you must enforce the following sequence step-by-step. Do not generate or write individual routing page nodes until Phases 1, 2, and 3 are finalized and fully implemented.

PHASE 1: GENERATE THE DETAILED BLUEPRINT
Analyze this framework directive. Provide a file-by-file configuration chart mapping out the design tokens, layout interfaces, type definitions, and asynchronous mock data contracts across every structural directory target inside the src/ hierarchy. Await user confirmation before writing files.

PHASE 2: INITIALIZE CORE TOKENS & ATOMIC SHADCN PRIMITIVES
Generate src/app/globals.css containing custom glassmorphic utility classes, box-shadow glow systems, and twin configuration setups tracking the light/dark root constraints.

Provision atomic custom abstractions under src/shared/ui/ (Inputs, Select boxes, ScrollAreas, Dialog overlays).

PHASE 3: ESTABLISH SYSTEM WRAPPERS & COHERENT APP LAYOUTS
Investor Shell Layout (src/shared/layouts/InvestorSidebar.tsx & Navbar.tsx): Build the sidebar configuration using deep translucent panels and gold accent triggers.

Admin Shell Layout (src/shared/layouts/AdminSidebar.tsx & Navbar.tsx): High-density design prioritizing row compactness for large desktop workstation environments.

PHASE 4: REPLICATE & MAP LOCALIZED SCREEN TRANSLATIONS
Once the infrastructure layout shell is locked, execute page conversion iteratively as instructed by the user. For each page request:

Wait for the user to provide the Figma screen asset and raw Stitch HTML layout code.

Construct the corresponding types/*.types.ts representation matching the data schema.

Write the decoupled mock data layer file inside src/services/api/ returning an async promise wrapping the layout metrics.

Implement the core page node (page.tsx) mapping presentation sub-widgets. Combine structural grid layouts from the HTML with styling overrides from the image. Ensure the page calls your service helper exclusively.

6. SYSTEM COMPONENT INVENTORY & INTER-ROUTING FLOW EXPECTATIONS
When building screen components, ensure the following layout parameters are fully addressed:

The Investor Viewports:
Dashboard (/dashboard): Central landing layout assembling quick metrics, summary balance tokens, and running positions.

Deposit Channel Gateway (/funding): Method grid (Bank Transfer, Crypto, E-Wallets). Clicking any options automatically triggers a router forward directly to the payment proof view.

Payment Proof Upload (/funding/upload): Houses a high-contrast drag-and-drop cloud file dropzone tied to mock data loading states.

Live Performance Center (/dashboard analytics subset): Deep visual tracking space utilizing Recharts Area curves with smooth SVG gold-to-transparent gradient fills.

Wallet Vault Ledger (/wallet): Clear accounting columns parsing available, total, and withdrawn liquid assets alongside an interactive withdrawal request dialog layout.

My Account Manager Card (/concierge): Renders profile photos, live connectivity badges, and quick links triggering chat view router movements.

My Contract Locker (/legal): File matrix layout with download actions.

AI Support Portal (/support): Chat panel matching user speech indicators with a localized text engine alongside an escalation mechanism to a human representative.

Profile Configuration (/profile): Grid layout of input forms tracking user metrics.

The Admin Terminal Viewports:
Executive Dashboard (/admin): Global metrics alongside a stacked, absolute layout containing real-time floating overlay alerts for network status logs.

Trading Console (/admin/console): Structured broadcast form allowing operators to feed inputs (Assets, Directions, Entry values) straight into the system stream.

Asset Liquidity Center (/admin/liquidity): Management dashboards featuring rebalancing layout sliders to distribute reserves across trading pools.

Deposit Verification Desk (/admin/deposits): 35/65 split-pane view (Left side: incoming user transaction claims; Right side: interactive viewer displaying uploaded transfer check documents).

User Management Matrix (/admin/users): High-density table implementing custom lookup string parsers and dropdown action menus to route users to manager profiles.

Client Messages Inbox (/admin/inbox): 3-panel message system (Channel selection queue, active thread window, contextual investor info panel tracking their portfolio metrics).

System Settings Terminal (/admin/settings): Config rows tracking external webhook URLs and infrastructure security parameters.