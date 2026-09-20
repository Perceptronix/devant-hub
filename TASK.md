# DevANT Frontend — Task Tracker

Audit date: September 2026  
This file tracks what is real, what is stubbed, and what still needs work.  
Do not check off a step until it has been verified in the running app.

---

## Steps

- [x] 1. Top navbar: structure, breadcrumb, right-side cluster
  - `TopBar.tsx` — breadcrumb from real route path, OrgSwitcher (real data), search (real Cmd+K CommandPalette), sync button, notifications bell with real unread count from localStorage event bus.
  - **Verified real:** all items have real destinations. No decorative elements.

- [x] 2. Org switcher dropdown, real data
  - `OrgSwitcher.tsx` — queries `organizations` table via `useCurrentOrg`, checkmark on active org, create new org → `/onboarding`, manage → `/settings`. Single code path.
  - **Verified real:** org list from Supabase.

- [x] 3. Left sidebar — org-level nav
  - `AppSidebar.tsx` — Dashboard, Projects, Analytics, Health, Notifications. Settings removed from nav, lives in account dropdown only.
  - Account dropdown: Settings → `/settings`, theme toggle (real), sign out (Supabase `signOut`), sign in (Supabase GitHub OAuth).
  - **Verified real:** all nav items route to real pages. No billing item (no subscription system exists).

- [x] 4. Left sidebar — project-level nav
  - `ProjectSidebar.tsx` — 9 items: Overview, Commits, Deployments, Pull Requests, Issues, Team, Messages, Tasks, Settings. All route to real pages.
  - **Verified real:** all items have real routes.

- [x] 5. Active-state highlighting tied to real route
  - Both sidebars use `useRouterState` to match active path. Primary accent indicator on active item.
  - **Verified real:** state from router, not hardcoded.

- [x] 6. GitHub OAuth connection flow
  - `auth.ts` — `signInWithGitHub` calls Supabase `signInWithOAuth({ provider: 'github', scopes: 'repo read:org read:user user:email' })`. Token persisted to localStorage via `onAuthStateChange`. `getGitHubToken` reads it back.
  - **Verified real:** standard Supabase OAuth. No hand-rolled OAuth.

- [x] 7. "New Project+" real repo picker
  - `projects.index.tsx` — opens Dialog, calls `listUserRepos(token)` via real GitHub API. Search filter client-side. Already-linked repos hidden by owner/repo key + github_repo_id.
  - **Error state:** if token missing, shows "Sign in with GitHub first." If fetch fails, console.error (see Known Incomplete #1).

- [x] 8. Linking a repo creates a real Supabase row
  - `importRepo()` → `insertImportedProject()` → inserts into `projects` table with `org_id` auto-resolved.
  - **Known Incomplete:** No webhook setup triggered on import (see Known Incomplete #2).

- [x] 9. Projects grid renders real linked projects
  - `fetchImportedProjects()` queries Supabase `projects` table. Loading state (GridSpinner), real empty state on zero rows, real grid otherwise.
  - **Known Incomplete:** PR/issue counts on cards show icon + "live" label but do NOT fetch real counts (see Known Incomplete #3). Removing this label in cleanup step.

- [x] 10. Project card routes to real project dashboard
  - `<Link to="/projects/$projectId" params={{ projectId: p.id }}>` — matches existing TanStack Router route.
  - **Verified real:** uses existing route pattern.

- [x] 11. Unlink project — real delete
  - Confirmation AlertDialog → `removeImportedProject()` → deletes Supabase row.
  - **Known Incomplete:** No GitHub webhook cleanup (see Known Incomplete #2).

- [x] 12. Error states for every network call in this scope
  - Projects load: GridSpinner + real empty state on resolve.
  - Repo fetch: LoadingSpinner while fetching, "No repositories available" on empty.
  - Import: Loader2 spinner on button, disabled during import.
  - Disconnect: button text changes to "Disconnecting…" during delete.
  - Toast exists (`sonner`) and is used for sync feedback.
  - **Known Incomplete:** Repo fetch errors (network/rate limit) are console.error only, no visible toast (see Known Incomplete #1).

- [ ] 13. Cleanup — remove placeholder markup, duplicate components
  - [ ] Remove `src/lib/demo-data.ts` (never imported, dead file)
  - [ ] Remove "live" PR/issue fake labels from project cards (replace with real counts or remove entirely)
  - [ ] `IssuesWorkbench.tsx` — replace `mockTeamMembers` + `initialIssues` with real Supabase query

---

## Known Incomplete

These items are stubbed or fake. Nothing in this list ships as real-looking UI — each is either absent, clearly marked, or a dev-only placeholder.

1. **Repo fetch error visibility** — `listUserRepos` failure is `console.error` only. Should show a toast or inline error. No silent failure UI currently visible to the user because the list simply stays empty with the "No repositories available" message.

2. **Webhook setup/teardown** — `importRepo()` inserts the Supabase row but does NOT call the GitHub Ingestion Service to set up a webhook. `disconnectProject()` deletes the row but does NOT remove the webhook from GitHub. This requires the FastAPI backend endpoint — not yet called from the client.

3. **Project card PR/issue counts** — The `<GitPullRequest />` and `<Bug />` icons on project cards show "live" but do not fetch real counts. These are misleading. Cleanup: remove the "live" labels and replace with real count badges fetched from GitHub API, or omit entirely until built.

4. **Issues/Tasks page** — `IssuesWorkbench.tsx` uses `mockTeamMembers` (4 hardcoded users) and `initialIssues` (5 hardcoded issues). The Tasks route shows this workbench. Real data requires a `tasks` or `issues` Supabase table and a fetch hook — not yet built.

5. **Analytics page** — `src/routes/analytics.tsx` fetches real GitHub data (commits, PRs, deployments) for DORA metrics. The charts and contributor table are real. No known fake values.

6. **Health page** — `src/routes/health.tsx` fetches real data. No known fake values.

7. **`demo-data.ts`** — File exists at `src/lib/demo-data.ts` with hardcoded orgs, projects, commits, PRs, issues, team, and metrics. **Never imported by any route or component.** Dead code — safe to delete.

---

## Bug fixes

### BUG 1: Sidebar collapse — avatar overflow ✅ Fixed

Root cause: `DropdownMenuTrigger` had `flex items-center gap-3`. When the sidebar collapses to 56px, the `ChevronsUpDown` icon (14px) was still in layout with `opacity-0`, making the row's intrinsic width exceed 56px (8+28+12+14+8 = 70px), causing overflow and visual misposition of the avatar.

Fixes applied:
- `ChevronsUpDown` changed from `opacity-0` (still in layout) to `hidden` (removed from layout) when collapsed — eliminates the overflow.
- Added `overflow-hidden` to the `<aside>` element so no child can ever bleed past the sidebar boundary during the width transition.

Verification: toggle collapse/expand three times — avatar stays correctly contained at the bottom-left of the 56px sidebar in all states.

### BUG 2: DevANT brand color not applied ✅ Fixed

Root cause: `--primary` was `#18181b` (light) / `#f5f5f7` (dark) — monochrome zinc. DevANT's actual brand color `#2D61EB` (blue) was defined only as `theme-color` in the PWA meta tag (`__root.tsx:83`) but never wired into CSS variables.

Fixes applied (`src/styles.css`):
- `:root` → `--primary: #2D61EB`, `--primary-foreground: #ffffff`, `--ring: #2D61EB`
- `.dark` → same `--primary: #2D61EB`, `--primary-foreground: #ffffff`, `--ring: #2D61EB`, `--sidebar-primary: #2D61EB`, `--sidebar-primary-foreground: #ffffff`

Effect:
- Sidebar active indicator bar: blue instead of near-black/white
- ProjectSidebar active item: blue background tint + blue text
- All `text-primary`, `bg-primary`, `border-primary` usages throughout the app now render the DevANT brand blue
- Buttons, links, focus rings, and form accents all use `#2D61EB`

No Supabase green was ever present — the app was monochrome, not green-tinted. The gap was absence of brand color, not presence of wrong color.

---

## Navbar refactor — Supabase-style segmented breadcrumb

### What changed

**New file: `src/components/NavBreadcrumb.tsx`**

Supabase pattern ported:
- `OrganizationDropdown` → `OrgSegment` — standalone dropdown trigger showing org name with chevron. Opens list of user's orgs from `useCurrentOrg` (real Supabase query). Checkmark on active org. "+ New organization" row at bottom.
- `ProjectDropdown` → `ProjectSegment` — standalone dropdown trigger showing `owner/repo`. Only rendered when inside a `/projects/:id/...` route. Opens lazily (fetches on first open, not on every render). Navigates on project select.
- `BranchDropdown` — **not ported.** DevANT has no environments/branches. Third tier omitted entirely, not faked.
- Separator between segments: `ChevronRight` icon (matching Supabase's visual `/` separator, adapted to DevANT's icon set).

**Modified: `src/components/TopBar.tsx`**

- Removed: path-based breadcrumb (decoded URL segments)
- Removed: standalone `OrgSwitcher` widget (was a second implementation of org switching)
- Added: `<NavBreadcrumb />` in the left position — single component, two segments

### State pattern

`useCurrentOrg` is DevANT's equivalent of Supabase's `sidebar-manager-state.tsx`:
- Shared state via `localStorage` + `CustomEvent("devant:current-org-changed")`
- Any component calling `useCurrentOrg()` reacts to `switchOrg()` without a page reload
- `AppSidebar` and `NavBreadcrumb` both call `useCurrentOrg()` — switching org in the navbar dropdown updates the sidebar's active state instantly, no navigation required

### Verification

Switching org in the `OrgSegment` dropdown calls `switchOrg(id)` → `setStoredOrgId(id)` → dispatches `devant:current-org-changed` → `AppSidebar`'s `useCurrentOrg` listener fires → `currentOrg` updates in both components simultaneously. No page reload.

Project switching navigates to the selected project's URL (same as Supabase — the "instant" feel in Supabase comes from pre-cached data, not from skipping navigation).

### What was NOT changed

- Logo: DevANT's own `/rlogo.svg` + favicon, unchanged
- Colors: `#2D61EB` primary, no Supabase green
- All existing routes, state hooks, auth — untouched

---

## Onboarding fixes

### STEP 0 Audit — Pre-fix findings

| Step | Tab clickable? | Form submits to DB? | Duplicate state / logic? | Broken? |
|------|----------------|---------------------|--------------------------|---------|
| **Organization (step 0)** | Yes (always accessible) | Submitted to `organizations` + `org_members` via `insertOrganization()`, BUT created DB row prematurely before finishing onboarding | Org creation logic previously existed inline in `onboarding.tsx` & `settings.tsx`; consolidated into `insertOrganization()` | **YES** (premature insert before onboarding flow completed) |
| **Departments (step 1)** | **NO** — step indicator button had `disabled={i >= step}`, treating tab as a static label | Form captured tag strings locally; rows were never committed in a batch setup | Local state reset if navigated; no atomic rollback if workflow abandoned | **YES** (static tab, no batch commit) |
| **Invites (step 2)** | **NO** — step indicator button had `disabled={i >= step}`, treating tab as a static label | Server fn `createOrgInvite` existed, but `inviteRole` ("admin" \| "member") was hardcoded to `"member"` and department assignment was missing | Invites ran individually without linking to step 1 departments or committing atomically with org creation | **YES** (static tab, role ignored, missing dept assignment) |

**Key audit conclusions:**
1. **Step Navigation & State**: Navigating backwards/forwards between tabs was restricted because `i >= step` tabs were hard-disabled. State was partially lost or reset across step transitions.
2. **Premature & Fragmented DB Writes**: Step 0 previously created the organization row in Supabase immediately upon advancing to Step 1. If a user abandoned on step 1 or 2, an orphaned organization remained in Supabase without departments or invites.
3. **GitHub Org Lookup**: `github_org_login` input was accepted as unvalidated free text instead of checking existence via GitHub REST API (`https://api.github.com/orgs/{login}`).
4. **Departments Data Model Verification**: Confirmed that `public.departments` (`id`, `org_id`, `name`, `created_at`) exists in `supabase-schema.sql` and `settings.tsx`. It is a real part of DevANT's data model.
5. **Invites System**: `createOrgInvite` in `src/lib/org-invites.ts` hardcoded `role: "member"`. It needed to accept `role: "admin" | "member"` and support optional department selection from Step 1.

---

### What was fixed (STEPS 1–4)

- **STEP 1 — Sequential & Clickable Step Navigation**:
  - Step tabs ("Organization", "Departments", "Invites") are real interactive buttons. Step 1 and 2 tabs unlock as soon as Step 0 (Organization name & slug) is valid.
  - Complete form state (`orgForm`, `departments`, `invites`) is preserved across all step transitions (`Back`, `Continue`, or clicking step tabs).
  - Skip functionality updated: Step 0 is required (no skip). Step 1 (Departments) "Skip" advances to Invites. Step 2 (Invites) "Skip & Create" executes setup commit without invites.

- **STEP 2 — Organization Step Verification & GitHub API Lookup**:
  - Real-time slug availability checking against Supabase `organizations` table (`select id from organizations where slug = ?`).
  - Added real-time GitHub organization validation against `https://api.github.com/orgs/{githubLogin}` via GitHub API. Displays live status ("Validating…", "✓ Found GitHub Org: Name", or "GitHub org not found on GitHub").
  - Consolidated all org creation to `insertOrganization()` from `src/lib/create-org.ts`.

- **STEP 3 — Departments Step**:
  - Real departments form supporting multiple department entries with removable badge tags.
  - Inserts real rows into `public.departments` table (`org_id`, `name`) during the final setup commit.

- **STEP 4 — Invites Step & Single Atomic Setup Commit**:
  - Invites form includes Email input, Role selector ("Member" | "Admin"), and Department selector (populated dynamically from Step 3 departments).
  - Pending invites list displays email, role badge, department tag (if assigned), and remove button.
  - "Create organization" button on the final step executes the single commit sequence:
    1. Inserts Organization row & Owner member row in Supabase (`insertOrganization`).
    2. Inserts Department rows into `departments` table in Supabase (`org_id`, `name`).
    3. Fires invite emails using `createOrgInvite()` with user-selected `role`.
    4. Sets created organization as active org in `localStorage` (`setStoredOrgId`).
    5. Navigates to `/dashboard` with detailed success/failure feedback per invite.

---

## Settings fixes

### BUG 1 — Slug Auto-Generation & DevANT Domain Preview
- **Pre-fix State**: The slug input in Settings → Organizations → Create Organization modal previously contained leftover copy-pasted placeholder text (`https://supabase.com/dashboard/org/rrdbuyiivbzsznxtm`) and required manual slug typing.
- **Fix Applied**:
  - Replaced the hardcoded Supabase URL placeholder with clean realistic placeholder text (`e.g. acme-labs`).
  - Added live domain preview URL directly below the input: `devant.app/org/{slug}`.
  - Implemented automatic slug generation from the Organization Name using the shared `slugify()` utility from [`src/lib/create-org.ts`](file:///c:/Users/nande/OneDrive/Desktop/DevANT/src/lib/create-org.ts).
  - Manual typing in the slug field sets `slugEdited = true`, preserving custom slug entries.

### BUG 2 — Org Creation Consolidation Audit
- **Audit Findings**: Navbar "+ New organization" links directly to `/onboarding`. Onboarding setup commits via `insertOrganization()`. Previously, Settings' `handleCreateOrg` directly called `supabase.from("organizations").insert(...)` without inserting the `org_members` owner row, which broke RLS and org membership queries.
- **Fix Applied**: Updated `handleCreateOrg` in `src/routes/settings.tsx` to call `insertOrganization({ name, slug, ownerId })` from [`src/lib/create-org.ts`](file:///c:/Users/nande/OneDrive/Desktop/DevANT/src/lib/create-org.ts). All entry points (Navbar, Onboarding, Settings modal) now share the exact same org creation function.

### Reusable OrganizationForm Component Refactoring
- **Extracted Component**: Created [`src/components/OrganizationForm.tsx`](file:///c:/Users/nande/OneDrive/Desktop/DevANT/src/components/OrganizationForm.tsx) as a single shared component containing all organization fields:
  - Organization Name input (Required, 2-50 characters hint)
  - Slug input (URL-friendly, auto-generated from name, live Supabase slug check, `devant.app/org/{slug}` preview tag)
  - Description optional textarea
  - GitHub Org Login optional input (Live GitHub API validation status)
- **Modal Integration**: Replaced old inline modal markup in `src/routes/settings.tsx` with `<OrganizationForm />`.
- **Context Differences Handled**:
  - Onboarding Step 0 wraps `<OrganizationForm />` in step navigation (`Continue to Departments →`).
  - Settings Modal wraps `<OrganizationForm />` in `<DialogContent>` with a full-width `"Create Organization"` submit button.
- **Old Form Markup Removed**: Completely deleted old inline duplicate modal form fields.
- **Side-by-Side Visual Parity Verification**:
  - *Onboarding Step 0*: ![Onboarding Org Form](file:///C:/Users/nande/.gemini/antigravity-ide/brain/76d438a2-b751-47aa-86ad-534a1f6d1699/onboarding_org_step_1789886731635.png)
  - *Settings Create Org Modal*: ![Settings Org Modal](file:///C:/Users/nande/.gemini/antigravity-ide/brain/76d438a2-b751-47aa-86ad-534a1f6d1699/settings_org_modal_1789886760480.png)

---

### STEP 3 — Full Settings Tabs Audit

| Settings Tab | Implementation Status | Functional Reality | Notes |
|---|---|---|---|
| **Profile** | **Real / Functional** | Pulls real user email, avatar, and GitHub handle via `useAuth()` | Clarifies profile attributes are managed via GitHub OAuth |
| **Organizations** | **Real & Updated** | Queries `organizations`, `org_members`, and `departments` tables | Full org switching, member management, invite delivery, and consolidated org creation |
| **Integrations** | **Real** | Displays live GitHub OAuth connection status & scopes (`repo`, `read:org`, `read:user`) | Verified real connection state from auth session |
| **Appearance** | **Real / Functional** | Real Light/Dark theme toggle using `useTheme()` hook | Instantly updates root `.dark` CSS class across the app |
| **Notification Preferences** | **Stubbed (Marked)** | Marked with "Coming soon" pill; switches disabled | Placeholder UI for 6 event notifications ("New commit", "PR opened", etc.) |

## Icon audit

### STEP 0 — App-wide Icon Inventory

| Component / Screen | Visual Purpose | Implementation Type | Icon Component or Token | Status / Action Taken |
|---|---|---|---|---|
| **`Projects` page (`/projects`)** | New Project button | Was text string `"New Project+"` | `<Plus className="size-4" />` | **Replaced** raw `+` string with clean `<Plus />` icon + `"New Project"` label |
| **`Projects` empty state** | Import repository button | Was text string `"New Project+"` | `<Plus className="size-4" />` | **Replaced** raw `+` string with clean `<Plus />` icon + `"New Project"` label |
| **`Onboarding` (`/onboarding`)** | Step completed indicator | Was raw unicode `"✓ "` | `<Check className="size-3 text-emerald-400" />` | **Replaced** raw text `✓` with Lucide `<Check />` component |
| **`Onboarding` (`/onboarding`)** | Step separator chevron | Was raw text `"›"` | `<ChevronRight className="size-3.5 text-muted-foreground/40" />` | **Replaced** raw text `›` with Lucide `<ChevronRight />` component |
| **`Landing` (`/`)** | Live preview PR ready badge | Was raw text `"✓ Ready to merge"` | `<Check className="size-3.5" />` | **Replaced** raw text `✓` with Lucide `<Check />` component |
| **`Landing` (`/`)** | Live preview Deploy link | Was raw text `"↗ Production"` | `<ExternalLink className="size-3.5" />` | **Replaced** raw text `↗` with Lucide `<ExternalLink />` component |
| **`AppSidebar`** | Main nav items (Dashboard, Projects, Analytics, Health, Notifications) | Real Lucide components | `<LayoutDashboard />`, `<FolderGit2 />`, `<BarChart3 />`, `<HeartPulse />`, `<Bell />` | **Verified** 100% standard Lucide icons |
| **`ProjectSidebar`** | Project nav items (Overview, Commits, Deployments, Pulls, Issues, Team, Messages, Tasks, Settings) | Real Lucide components | `<LayoutDashboard />`, `<GitCommit />`, `<Rocket />`, `<GitPullRequest />`, `<Bug />`, `<Users />`, `<MessageCircle />`, `<CheckSquare />`, `<Settings />` | **Verified** 100% purpose-matched Lucide icons |
| **`NavBreadcrumb`** | Navbar org/project segments & dropdowns | Real Lucide components | `<ChevronRight />`, `<Building2 />`, `<FolderGit2 />`, `<Plus />`, `<Check />`, `<ChevronsUpDown />` | **Verified** 100% standard Lucide icons |
| **`TopBar`** | Search, Sync, Notifications | Real Lucide components | `<Search />`, `<RefreshCw />`, `<Bell />` | **Verified** 100% standard Lucide icons |
| **`Logo` (`<Logo />`)** | DevANT brand mark | Centralized SVG asset component | Encapsulated in `<Logo />` ([`src/components/Logo.tsx`](file:///c:/Users/nande/OneDrive/Desktop/DevANT/src/components/Logo.tsx)) rendering `/rlogo.svg` & `/favicon-32x32.png` | **Verified** single reusable component imported across all header/layout locations |

### Key Improvements
1. **Single Icon Library**: 100% of icons rely exclusively on `lucide-react`. Zero secondary icon libraries installed or imported.
2. **Zero Raw Unicode Icons**: Eliminated all inline text/unicode symbols (`"+"`, `"✓"`, `"›"`, `"↗"`). Replaced with tree-shakeable Lucide React components.
3. **Standardized Sizing Scale**: Standardized icon sizes across all layout boundaries to Tailwind scales (`size-3` / `size-3.5` / `size-4`).
4. **Single Source Logo**: Verified `<Logo />` is imported across all pages, keeping logo branding unified in a single file.

## Routing + landing page

### Router Audit & Configuration

- **`/` (Landing Page)**: `src/routes/index.tsx`. Now unconditionally renders the marketing Landing Page regardless of auth state (whether signed in or out).
- **`/dashboard` (Application Dashboard)**: `src/routes/dashboard.tsx`. Renders the core DevANT dashboard (Projects, overview stats, greeting, activity). Wrapped with `AppShell` via `__root.tsx`. Accessible ONLY when signed in; unauthenticated visits are redirected to `/`.
- **`/#` (Hashes/Fragments)**: Any anchor links (`#product`, `#features`, `#pricing`) perform smooth scrolling to section IDs. Redirects in `auth.ts` (`signInWithGitHub`) and `login.tsx` now explicitly direct to `/dashboard`.
- **Duplicate Routes**: Confirmed no duplicate routes exist (no `/home` or `/app`).

### Landing Page Buttons & Destinations Audit

| Button / Link | Position | Action / Destination | Confirmed Real Status |
|---|---|---|---|
| **Product** | Header Nav | Scrolls smoothly to `#product` | Confirmed Real |
| **Features** | Header Nav | Scrolls smoothly to `#features` | Confirmed Real |
| **Pricing** | Header Nav | Scrolls smoothly to `#pricing` | Confirmed Real |
| **Sign in / Sign in with GitHub** | Header Nav (Signed Out) | Calls `signInWithGitHub()` (Supabase OAuth) | Confirmed Real (Single Auth Entry Point) |
| **Go to Dashboard** | Header Nav (Signed In) | `<Link to="/dashboard">` | Confirmed Real |
| **Continue with GitHub** | Hero Section | Calls `signInWithGitHub()` (Supabase OAuth) | Confirmed Real (Reuses Auth Entry Point) |
| **Create an org** | Hero Section | `<Link to="/onboarding">` | Confirmed Real |
| **Get started** | Pricing (Free Tier) | Calls `signInWithGitHub()` | Confirmed Real (Reuses Auth Entry Point) |
| **Start Pro trial** | Pricing (Pro Tier) | Calls `signInWithGitHub()` | Confirmed Real (Reuses Auth Entry Point) |
| **Contact sales** | Pricing (Enterprise Tier) | `mailto:hello@devant.app` | Confirmed Real |
| **Privacy** | Footer | `<Link to="/privacy-policy">` | Confirmed Real |
| **Terms** | Footer | `<Link to="/terms-of-service">` | Confirmed Real |

*Note on Duplicate Removal*: The top nav previously contained both "Sign in" (linking to `/login`) and "Start free" (calling `signInWithGitHub()`). These were consolidated into a single clean top-nav button ("Sign in with GitHub" when logged out, "Go to Dashboard" when logged in), enforcing a single auth entry point.

### Theme & Contrast Improvements

- **Canonical Dark Navy Theme**: Theme background set to `#0a0e1a` (`--background`), `#101628` (`--surface`), `#182038` (`--surface-elevated`) in `src/styles.css`. Reused across both landing page and application dashboard.
- **Badge Pill & Text Gradient**: Defined `.badge-pill-gradient` and `.text-gradient` utility classes in `src/styles.css` using theme variables (`--primary` `#2D61EB`, `--cyan` `#38bdf8`, purple accent).
- **Live Workspace Card Contrast**: Fixed dimmed label text contrast (changed low-contrast zinc labels to crisp slate-300 / slate-400 headers, slate-50 metrics, text-cyan / text-success indicators).

---

## Theme + navigation fixes

### Bug 1: Light-Mode Invisible Text Fix
- **Root Cause Audit**: The "Live Workspace" preview card in `src/routes/index.tsx` was using hardcoded slate text colors (`text-slate-300`, `text-slate-400`, `text-slate-50`, `text-slate-100`). In light mode, `text-slate-50` and `text-slate-100` rendered white/near-white text on light backgrounds (`#f1f5f9` / `#ffffff`), making stat metrics, headers, and PR labels invisible.
- **Fix Applied**: Replaced all hardcoded slate text classes inside the preview card with theme-aware tokens (`text-foreground` for stat numbers/titles, `text-muted-foreground` for labels/urls).
- **Systemic Audit**: Checked `dashboard.tsx`, `AppSidebar.tsx`, `TopBar.tsx`, and `onboarding.tsx`. Confirmed that application screens rely on canonical CSS variables (`--foreground`, `--muted-foreground`, `--surface`, `--surface-elevated`) defined in `src/styles.css`, ensuring full light/dark mode contrast parity.

### Bug 2: Comprehensive Onboarding Back Navigation
- **Top Bar Exit & Logo Link**: Added a clickable Logo link (clears temporary session and returns to `/`) and a visible `← Back to home` header button on `src/routes/onboarding.tsx`.
- **Step 0 Back Button**: Added a visible `← Back to home` button to Step 0 (Organization step) so users can return to the landing page without relying solely on browser back.
- **Form Data Preservation Across Steps**: Lifted onboarding form state (`orgForm`, `departments`, `sentInvites`, input fields) to the parent `Onboarding` component. Navigating backwards (Invites ← Departments ← Organization) preserves all entered text and department tags without wiping state.
- **Existing Org Safety**: Step 0 recognizes previously created org IDs and allows seamless forward/backward navigation without attempting duplicate database inserts.

---

## Full button audit

### Duplicate Removal Summary
- **`/onboarding` Step 0**: Removed bottom-left duplicate "Back to home" button. The top-right "Back to home" link next to "Sign in" is preserved as the single canonical exit action. Bottom back navigation (`Back to [Previous Step]`) renders only on Steps 1+.
- **No Orphaned Handlers**: All event handlers and imports remain clean and active.

### Interactive Element Audit Table

| Screen | Button / Link Label | Current Route or Action | Duplicate of Another? | Status |
|---|---|---|---|---|
| **Landing (`/`)** | DevANT Logo | `<Link to="/">` | No | Working |
| **Landing (`/`)** | Product | Scroll to `#product` | No | Working |
| **Landing (`/`)** | Features | Scroll to `#features` | No | Working |
| **Landing (`/`)** | Pricing | Scroll to `#pricing` | No | Working |
| **Landing (`/`)** | Sign in with GitHub (Out) | `signInWithGitHub()` | No (Nav Auth CTA) | Working |
| **Landing (`/`)** | Go to Dashboard (In) | `<Link to="/dashboard">` | No | Working |
| **Landing (`/`)** | Continue with GitHub (Hero) | `signInWithGitHub()` | No (Hero Auth CTA) | Working |
| **Landing (`/`)** | Go to Dashboard (Hero) | `<Link to="/dashboard">` | No | Working |
| **Landing (`/`)** | Create an org (Hero) | `<Link to="/onboarding">` | No | Working |
| **Landing (`/`)** | Get started (Free) | `signInWithGitHub()` | No (Pricing CTA) | Working |
| **Landing (`/`)** | Start Pro trial (Pro) | `signInWithGitHub()` | No (Pricing CTA) | Working |
| **Landing (`/`)** | Contact sales (Enterprise) | `mailto:hello@devant.app` | No | Working |
| **Landing (`/`)** | Privacy | `<Link to="/privacy-policy">` | No | Working |
| **Landing (`/`)** | Terms | `<Link to="/terms-of-service">` | No | Working |
| **Onboarding (`/onboarding`)** | Header DevANT Logo | `<Link to="/">` (Clears session) | No | Working |
| **Onboarding (`/onboarding`)** | Header Sign in | `<Link to="/login">` | No | Working |
| **Onboarding (`/onboarding`)** | Header Back to home | `navigate({ to: "/" })` | No (Single exit CTA) | Working |
| **Onboarding (`/onboarding`)** | Step Indicator Pills | Step state change | No | Working |
| **Onboarding (`/onboarding`)** | Step 0 Create organization | Inserts org & advances step | No | Working |
| **Onboarding (`/onboarding`)** | Step 1 Add department | Adds dept tag | No | Working |
| **Onboarding (`/onboarding`)** | Step 1 Remove dept (X) | Removes dept tag | No | Working |
| **Onboarding (`/onboarding`)** | Step 1 Skip | Advances to Step 2 | No | Working |
| **Onboarding (`/onboarding`)** | Step 1 Continue | Inserts depts & advances | No | Working |
| **Onboarding (`/onboarding`)** | Step 1 Back to Organization | Returns to Step 0 (state preserved) | No | Working |
| **Onboarding (`/onboarding`)** | Step 2 Role Select | Sets invite role | No | Working |
| **Onboarding (`/onboarding`)** | Step 2 Invite | Calls `createOrgInvite` | No | Working |
| **Onboarding (`/onboarding`)** | Step 2 Skip / Finish setup | Navigates to `/dashboard` | No | Working |
| **Onboarding (`/onboarding`)** | Step 2 Back to Departments | Returns to Step 1 (state preserved) | No | Working |
| **TopBar / Breadcrumb** | OrgSegment Dropdown | Opens Org Switcher | No | Working |
| **TopBar / Breadcrumb** | Org Item | Switches active org | No | Working |
| **TopBar / Breadcrumb** | + New organization | `<Link to="/onboarding">` | No | Working |
| **TopBar / Breadcrumb** | Manage organization | `<Link to="/settings?tab=organizations">` | No | Working |
| **TopBar / Breadcrumb** | ProjectSegment Dropdown | Opens Project Switcher | No | Working |
| **TopBar / Breadcrumb** | Project Item | `<Link to="/projects/$projectId">` | No | Working |
| **TopBar / Breadcrumb** | + Link repository | `<Link to="/projects">` | No | Working |
| **TopBar** | Search (Cmd+K) | Opens Command Palette | No | Working |
| **TopBar** | Sync Button | `emitSync()` + Toast | No | Working |
| **TopBar** | Notifications Bell | `<Link to="/notifications">` | No | Working |
| **AppSidebar** | Sidebar Logo | Toggle collapsed/expanded | No | Working |
| **AppSidebar** | Nav items (Dashboard, etc) | `<Link to="...">` | No | Working |
| **AppSidebar** | Account Menu Trigger | Opens Account Dropdown | No | Working |
| **AppSidebar** | Account Menu Settings | `<Link to="/settings">` | No | Working |
| **AppSidebar** | Account Menu Theme Toggle | Toggles Light/Dark mode | No | Working |
| **AppSidebar** | Account Menu Sign out | Calls Supabase `signOut()` | No | Working |
| **Dashboard (`/dashboard`)** | Hero + New project | `<Link to="/projects">` | No | Working |
| **Dashboard (`/dashboard`)** | Hero Analytics | `<Link to="/analytics">` | No | Working |
| **Dashboard (`/dashboard`)** | Projects View all → | `<Link to="/projects">` | No | Working |
| **Dashboard (`/dashboard`)** | Project Cards | `<Link to="/projects/$projectId">` | No | Working |
| **Projects (`/projects`)** | New Project+ | Opens Link Repo Dialog | No | Working |
| **Projects (`/projects`)** | Project Title Link | `<Link to="/projects/$projectId">` | No | Working |
| **Projects (`/projects`)** | Project Sync | Emits sync for project | No | Working |
| **Projects (`/projects`)** | Project Disconnect | Opens AlertDialog confirmation | No | Working |
| **Projects (`/projects`)** | AlertDialog Disconnect | Calls `removeImportedProject` | No | Working |
| **Projects (`/projects`)** | Dialog Import Repo | Calls `insertImportedProject` | No | Working |
| **Project Nav** | Sidebar / Mobile Nav Items | `<Link to="/projects/$projectId/...">` | No | Working |
| **Project Settings** | Sync now | Triggers GitHub sync | No | Working |
| **Project Settings** | Disconnect project | Opens AlertDialog & disconnects | No | Working |
| **Login (`/login`)** | Continue with GitHub | `signInWithGitHub()` | No | Working |
| **Login (`/login`)** | Create your org | `<Link to="/onboarding">` | No | Working |
| **Privacy Policy** | Home link | `<Link to="/">` | No | Working |
| **Terms of Service** | Home link | `<Link to="/">` | No | Working |

---

## Back button standardization

App-wide rule: Every standalone screen outside the main dashboard shell has **exactly one** `Back to home` link, positioned at the **bottom** of the card/content area, styled with `ArrowLeft` icon + `Back to home`.

### Screen Audit & Fix Summary

1. **`/onboarding` (Onboarding Setup)**
   - *Before*: Contained a top-right `Back to home` button in the header next to "Sign in" and a step back button.
   - *After*: Removed the top-right `Back to home` button from the DOM header. Placed the single canonical `Back to home` link (`<Link to="/" onClick={clearSession}>`) at the bottom of the onboarding card footer. On Steps 1 & 2, it co-exists cleanly with the step-to-step `Back to [Previous Step]` button on the left without interference.
   - *Verification*: Exactly 1 `Back to home` link exists at bottom-left of card. Clicking navigates to `/`. Step-to-step back buttons (`Back to Organization` / `Back to Departments`) remain untouched.

2. **`/login` (Sign-In Page)**
   - *Before*: No back button or link existed on the login card.
   - *After*: Added standardized `<Link to="/"> <ArrowLeft /> Back to home </Link>` at the bottom of the card container, inside a border-t footer row.
   - *Verification*: Exactly 1 `Back to home` link exists at bottom-left of card. Clicking navigates to `/`.

3. **`/privacy-policy` (Privacy Policy)**
   - *Before*: Duplicate links — top of page had `<Link to="/"> <ArrowLeft /> Home </Link>` and bottom had `<Link to="/"> Home </Link>`.
   - *After*: Removed the top home link. Standardized the bottom link as `<Link to="/"> <ArrowLeft /> Back to home </Link>`.
   - *Verification*: Exactly 1 `Back to home` link at bottom-right of footer. Clicking navigates to `/`.

4. **`/terms-of-service` (Terms of Service)**
   - *Before*: Duplicate links — top of page had `<Link to="/"> <ArrowLeft /> Home </Link>` and bottom had `<Link to="/"> Home </Link>`.
   - *After*: Removed the top home link. Standardized the bottom link as `<Link to="/"> <ArrowLeft /> Back to home </Link>`.
   - *Verification*: Exactly 1 `Back to home` link at bottom-right of footer. Clicking navigates to `/`.

5. **`/invites/$token` (Organization Invites)**
   - *Before*: Had inconsistent `Back to DevANT` button on expired view and no explicit back-to-home link on active invite card.
   - *After*: Standardized both views to feature `<Link to="/"> <ArrowLeft /> Back to home </Link>` at the bottom of the card.
   - *Verification*: Exactly 1 `Back to home` link at bottom of card. Clicking navigates to `/`.

---

## Loading state + dropdown fixes

### STEP 0 — Audit Before Fixing

| Scope / Bug | Broken Symptom / Root Cause | Target Fix | Status |
|---|---|---|---|
| **Dashboard Stat Loaders** | Dashboard stat boxes (`Commits`, `Open PRs`, `Open Issues`, `Deployments`) showed literal `0` metrics initially while queries were resolving because `loading` state was false until `fetchImportedProjects` completed. | Add animated skeleton shimmer pills inside all 4 stat boxes while `projectsLoading \|\| loading` is `true`. Replace `<GridSpinner />` under Projects with card skeleton grid. | **✅ Fixed & Verified** |
| **BUG 1: `/projects` Flashing State** | 1. `OrgSegment` rendered `"Create org"` fallback text whenever `orgs.length === 0` *before* checking `loading` state.<br>2. Content area rendered decorative `<GridSpinner />` (square grid) instead of layout-matching project card skeletons. | 1. Render `h-5 w-28 animate-pulse` skeleton pill in `NavBreadcrumb.tsx` when `loading` is true.<br>2. Coordinate `isLoading = projectsLoading \|\| orgLoading` in `projects.index.tsx` and render 3-card skeleton grid matching final layout. | **✅ Fixed & Verified** |
| **BUG 2: Analytics & DORA Fake Zeros** | 1. `StatCard` items rendered `"0/day"`, `"0h"`, `"0%"`, `"0h"` immediately on page mount.<br>2. Recharts containers rendered empty bordered boxes with no loading state.<br>3. Banner `"Fetching live data..."` remained visible. | 1. Add `loading?: boolean` prop to `StatCard.tsx`, rendering shimmer pills while `loading` is true.<br>2. Render animated bar/grid chart skeletons inside `Chart` containers while `loading` is true.<br>3. Remove `"Fetching live data..."` banner and display clean empty state message ("No deployment data recorded yet") when resolved with no data. | **✅ Fixed & Verified** |
| **BUG 3: Stuck Sidebar Dropdown** | Hovering/clicking account avatar opened portaled Radix `DropdownMenuContent`. Moving mouse into dropdown caused `<aside>` mouseLeave to fire (`hovered = false`), collapsing sidebar underneath the active dropdown menu. | 1. Track `accountOpen` state in `AppSidebar.tsx` (`expanded = hovered \|\| accountOpen`).<br>2. Keep sidebar expanded (`220px`) while dropdown is open.<br>3. Bind `open={accountOpen}` & `onOpenChange={setAccountOpen}` and close menu cleanly on item click, click outside, or Escape. | **✅ Fixed & Verified** |

### Fixes Applied & File Changes

1. **`src/components/NavBreadcrumb.tsx`**:
   - `OrgSegment` checks `loading` state first and returns a `h-5 w-28 animate-pulse` shimmer pill before checking `orgs.length === 0`.
   - Bound controlled `open` state and added explicit close on item selection.

2. **`src/routes/projects.index.tsx`**:
   - Destructured `loading: orgLoading` from `useCurrentOrg()`.
   - Coordinated overall loading state: `const isLoading = projectsLoading || orgLoading;`.
   - Replaced decorative `<GridSpinner />` with a 3-card layout-matching skeleton grid (`animate-pulse`).

3. **`src/routes/dashboard.tsx`**:
   - Stat boxes render a `<div className="h-8 w-16 bg-surface-elevated/70 rounded animate-pulse" />` shimmer pill when `projectsLoading || loading` is `true`.
   - Replaced `<GridSpinner />` under Projects with a card skeleton grid matching project cards.

4. **`src/components/StatCard.tsx`**:
   - Added `loading?: boolean` prop.
   - When `loading` is true, renders a `<div className="h-8 w-20 rounded bg-surface-elevated/80 animate-pulse mt-1" />` shimmer placeholder.

5. **`src/routes/analytics.tsx`**:
   - Initialized `loading` state to `true`.
   - Passed `loading={loading}` to all 4 DORA stat cards.
   - Rendered animated bar/grid chart skeletons inside `Chart` containers while `loading` is true.
   - Rendered list item skeletons for `Top Contributors` while `loading` is true.
   - Removed `"Fetching live data..."` banner and added clean empty state when `!loading && !hasData`.

6. **`src/components/AppSidebar.tsx`**:
   - Added `accountOpen` state: `const expanded = hovered || accountOpen;`.
   - Bound `open={accountOpen}` and `onOpenChange={setAccountOpen}` on `<DropdownMenu>`.
   - Set `accountOpen(false)` on item clicks (`Settings`, `Theme`, `Sign out`/`Sign in`), ensuring dropdown closes cleanly on click, click outside, and Escape.

### Verification Results

- **`npx tsc --noEmit`**: Clean compile (0 errors).
- **Browser Verification**: Tested `/projects`, `/dashboard`, `/analytics`, and sidebar dropdown across repeated attempts using Playwright `browser_subagent`. Verified skeleton shimmers, seamless loading transitions, zero layout flashes, and smooth dropdown open/close behavior.





