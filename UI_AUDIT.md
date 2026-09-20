# DevANT UI Audit

## Audit Date: September 2026

---

## Section 1 — Complete Inventory

### Global Navigation (AppSidebar)

| # | Label | Route | Icon | Action |
|---|-------|-------|------|--------|
| 1 | Dashboard | `/` | LayoutDashboard | KEEP |
| 2 | Projects | `/projects` | FolderGit2 | KEEP |
| 3 | Analytics | `/analytics` | BarChart3 | KEEP |
| 4 | Health | `/health` | HeartPulse | KEEP |
| 5 | Notifications | `/notifications` | Bell | KEEP |
| 6 | Settings | `/settings` | Settings | KEEP |

**Profile block (expanded/mobile only):**
- "Profile & Settings" → `/settings` — duplicates sidebar item 6 exactly. REMOVE label, KEEP sign-out/sign-in.

---

### Settings Page — 5 Tabs

| Tab | Sections | Issues | Action |
|-----|----------|--------|--------|
| Profile | Avatar display, Display name field, Email field | Fields have no Save button — view-only with no persistence. | FIX: add Save button wired to Supabase |
| Organizations | Org selector, Create org dialog, Org header, Departments section, Members section | Works. Loading states correct. | KEEP |
| Appearance | Light/Dark theme toggle | Works. | KEEP |
| Integrations | GitHub "Connected" button | Button has no onClick — decorative. Misleading if it looks clickable. | FIX: make it a `<div>` or disabled button with `aria-disabled` + tooltip |
| Notifications | Email/In-app switches for 6 event types | Switches have no state management — `defaultChecked` is uncontrolled, no persistence, no onChange handler. Purely decorative. | FIX: either wire them up OR clearly mark as "coming soon" |

**Duplicate: Settings → Notifications tab vs /notifications page**
- `/settings` → Notifications tab = notification *preferences* (which events to be notified about)
- `/notifications` page = notification *feed* (actual items to read)
- These are conceptually distinct. **NO REMOVAL NEEDED** — but the tab label is ambiguous.
- RENAME tab: "Notification Preferences" → still "Notifications" (fine, context makes it clear)
- VERDICT: KEEP BOTH, they serve different purposes.

---

### Notifications Page

| Element | Purpose | Issues | Action |
|---------|---------|--------|--------|
| PageHeader "Notifications" | Page title | OK | KEEP |
| "Mark all read" button | Marks all items read in localStorage | Works | KEEP |
| Organization Invites section | Accept/decline pending org invitations | Works, loads correctly | KEEP |
| GitHub Activity section | Feed of PRs/issues/deploys across all projects | Works | KEEP |
| Loading state | GridSpinner while fetching | Works | KEEP |

---

### Project Sidebar (9 items)

| # | Label | Route | Action |
|---|-------|-------|--------|
| 1 | Overview | `/$id/` | KEEP |
| 2 | Commits | `/$id/commits` | KEEP |
| 3 | Deployments | `/$id/deployments` | KEEP |
| 4 | Pull Requests | `/$id/pulls` | KEEP |
| 5 | Issues | `/$id/issues` | KEEP |
| 6 | Team | `/$id/team` | KEEP |
| 7 | Messages | `/$id/messaging` | KEEP |
| 8 | Tasks | `/$id/tasks` | KEEP |
| 9 | Settings | `/$id/settings` | KEEP — project-scoped, not global |

---

### TopBar

| Element | Purpose | Issues | Action |
|---------|---------|--------|--------|
| Breadcrumb | Path navigation | Works | KEEP |
| OrgSwitcher | Switch active org | Works | KEEP |
| Search / Cmd+K | Opens CommandPalette | Works | KEEP |
| Sync (RefreshCw) button | `emitSync()` global | Works | KEEP |
| Bell icon with unread badge | Navigates to `/notifications` | Works | KEEP |

---

## Section 2 — Identified Issues

### Issue 1 — Profile tab: No Save button
**File**: `src/routes/settings.tsx`, Profile TabsContent (~line 550)
**Problem**: Display name and email inputs are rendered but have no `onChange`, no state, no save button. They appear editable but do nothing.
**Fix**: Make fields explicitly read-only (GitHub OAuth — name/email come from GitHub metadata, not editable in-app). Show a note explaining this. Remove misleading `Input` components, replace with read-only display values.

### Issue 2 — Integrations tab: Fake-interactive button
**File**: `src/routes/settings.tsx`, Integrations TabsContent (~line 890)
**Problem**: `<Button variant="outline">{user ? "Connected" : "Connect"}</Button>` has no `onClick`. When not connected, "Connect" implies action but does nothing.
**Fix**: When user is authenticated (always true in app shell), show a proper connected state badge. When not authenticated, this page isn't reachable. Make it a non-interactive status display.

### Issue 3 — Notifications tab: Uncontrolled switches with no persistence
**File**: `src/routes/settings.tsx`, Notifications TabsContent (~line 910)
**Problem**: `<Switch defaultChecked />` and `<Switch />` — no state, no onChange, no backend call. User toggles them and nothing persists.
**Fix**: Mark clearly as "Coming soon" or wire to actual state. Given no backend table exists for preferences, mark as coming soon.

### Issue 4 — AppSidebar ProfileBlock: Duplicate "Profile & Settings" link
**File**: `src/components/AppSidebar.tsx`, line ~88
**Problem**: The profile block (visible on hover/mobile) shows a "Profile & Settings" link to `/settings` — same destination as the Settings item already in the nav list. Two nav paths to the same place.
**Fix**: Remove the "Profile & Settings" link from the profile block. Keep Sign Out / Sign In only. The user already has Settings in the sidebar.

### Issue 5 — Settings Profile tab: `Textarea` imported but unused
**File**: `src/routes/settings.tsx`, line 10
**Problem**: `Textarea` is imported but never used in the file.
**Fix**: Remove unused import.

### Issue 6 — Settings: `Copy`, `Check`, `X` icons imported but unused
**File**: `src/routes/settings.tsx`, line 14
**Problem**: `Copy`, `Check`, `X` are imported from lucide-react but not used anywhere in the file.
**Fix**: Remove unused imports.

### Issue 7 — Settings Organizations: "Create Organization" button always visible even when user already owns one
**File**: `src/routes/settings.tsx`, ~line 620
**Problem**: The "You already own an organization" message renders inside the `<Card>` but the card itself still renders (just showing the message text). The layout is confusing — the card appears but its normal content (the dialog trigger button) is replaced by a paragraph.
**Fix**: This is actually fine logic-wise. Clean up the layout slightly so the restriction message has better visual hierarchy.

---

## Section 3 — Duplicate Functionality Analysis

| Item | Location A | Location B | Verdict |
|------|-----------|-----------|---------|
| Settings navigation | AppSidebar nav item #6 | ProfileBlock "Profile & Settings" link | **DUPLICATE** — remove from ProfileBlock |
| Notification feed | `/notifications` page | — | No duplicate |
| Notification preferences | Settings → Notifications tab | — | No duplicate |
| Project settings | Global `/settings` | `/projects/$id/settings` | NOT duplicate — different scopes |
| Org invites response | `/notifications` page | — | No duplicate |

---

## Section 4 — Implementation Plan

### Changes to implement (smallest clean diff):

1. **`src/components/AppSidebar.tsx`** — Remove "Profile & Settings" link from ProfileBlock. Keep Sign Out / Sign In.

2. **`src/routes/settings.tsx`**:
   - Remove unused imports: `Textarea`, `Copy`, `Check`, `X`
   - Profile tab: replace editable `Input` fields with read-only display (GitHub OAuth data, not editable). Add explanatory note.
   - Integrations tab: replace `<Button>` with a proper status badge (not interactive).
   - Notifications tab: add "Coming soon" badge next to section header; make switches `disabled` with `opacity-50 cursor-not-allowed` wrapper to signal non-functional state.

---

## Section 5 — Final State (Post-Implementation)

| Change | Type | File |
|--------|------|------|
| Removed "Profile & Settings" link from sidebar ProfileBlock | REMOVE | AppSidebar.tsx |
| Removed unused imports (Textarea, Copy, Check, X) | REMOVE | settings.tsx |
| Profile tab fields made read-only with GitHub note | FIX | settings.tsx |
| Integrations tab "Connected" made non-interactive status badge | FIX | settings.tsx |
| Notifications tab switches disabled + "Coming soon" badge | FIX | settings.tsx |
