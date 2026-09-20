# DevANT UI Audit — v3 (Final)

Audit Date: September 2026  
Reference: Supabase Dashboard navigation patterns (github.com/supabase/supabase)

---

## 1. Complete Navigation Inventory

### Global Sidebar — NAV items (AppSidebar.tsx)

| # | Label | Route | Status | Action |
|---|-------|-------|--------|--------|
| 1 | Dashboard | `/` | OK | KEEP |
| 2 | Projects | `/projects` | OK | KEEP |
| 3 | Analytics | `/analytics` | OK | KEEP |
| 4 | Health | `/health` | OK | KEEP |
| 5 | Notifications | `/notifications` | OK — single feed destination | KEEP |
| — | Settings | `/settings` | Already removed in v2 | REMOVED ✅ |

### Account Dropdown (bottom-left, AppSidebar.tsx)

| Item | Action | Status |
|------|--------|--------|
| User header (name + email) | Static display | OK |
| Settings | Navigate → `/settings` | OK ✅ |
| Light/Dark mode toggle | Switches theme | OK |
| Sign out / Sign in | Auth action | OK |

### TopBar (TopBar.tsx)

| Item | Action | Duplicate? | Action |
|------|--------|-----------|--------|
| Breadcrumb | Path navigation | — | KEEP |
| OrgSwitcher | Org dropdown | — | KEEP |
| Search (Cmd+K) | CommandPalette | — | KEEP |
| Sync button | emitSync() | — | KEEP |
| Bell → `/notifications` | Navigate to feed | Same destination as sidebar bell — acceptable (topbar pattern) | KEEP |

### OrgSwitcher Dropdown (TopBar → OrgSwitcher.tsx)

| Item | Action | Issue |
|------|--------|-------|
| Org list | Switch active org | OK |
| Create new org | → `/onboarding` | OK |
| Manage organizations | → `/settings` | Acceptable — contextual shortcut to Settings/Organizations tab |

### CommandPalette (CommandPalette.tsx)

| Item | Action | Issue |
|------|--------|-------|
| Notifications | → `/notifications` | OK — command palette should list all nav |
| Settings | → `/settings` | OK |

### Project Sidebar (ProjectSidebar.tsx)

| Item | Route | Scope |
|------|-------|-------|
| Settings | `/projects/$id/settings` | Project-scoped — different page, NOT a duplicate of global /settings |

---

## 2. Settings Page — Tab Inventory (settings.tsx)

| Tab Value | Label | Contents | Issue |
|-----------|-------|----------|-------|
| profile | Profile | Avatar (read-only), username, email, GitHub note | OK |
| organizations | Organizations | Org CRUD, departments, members, invite | OK |
| appearance | Appearance | Light/Dark theme toggle | Duplicate of account dropdown theme toggle — see note below |
| integrations | Integrations | GitHub connected status | OK |
| notifications | **Notifications** | Disabled switches, "Coming soon" badge | **Name collision** with sidebar nav item |

**Issue 1 — Tab label "Notifications" collides with sidebar "Notifications"**  
The Settings → Notifications tab is notification *preferences* (future).  
The sidebar item is the notification *feed*.  
Same word, two different things = user confusion.  
Fix: Rename tab to "Notification Preferences" (display) while keeping internal value as-is.

**Issue 2 — Appearance tab duplicates account dropdown theme toggle**  
The account dropdown already has a light/dark toggle. The Appearance tab in Settings adds a second place.  
Both are intentional (quick access vs full settings page) — this is standard SaaS practice (e.g., Supabase has theme in both).  
Verdict: KEEP BOTH — no structural problem.

**Issue 3 — Tab order not logical**  
Current: Profile → Organizations → Appearance → Integrations → Notifications  
SaaS convention (Supabase/Linear/Vercel): Account → Organization → Integrations → Appearance → Notifications  
Fix: Reorder tabs to match standard SaaS information architecture.

---

## 3. Notifications — Duplicate Analysis

| Location | Type | Destination | Verdict |
|----------|------|-------------|---------|
| Sidebar nav item | Feed navigation | `/notifications` | KEEP — primary nav |
| TopBar bell icon | Feed navigation | `/notifications` | KEEP — topbar is standard placement |
| CommandPalette | Feed navigation | `/notifications` | KEEP — all nav should be in palette |
| Settings → "Notifications" tab | Preferences UI | In-page | RENAME to "Notification Preferences" |

**There is no fake or duplicate notification component.** The Settings tab is preferences (future), not a second feed. The only issue is the naming collision.

---

## 4. Changes to Implement

| # | Change | File | Type |
|---|--------|------|------|
| 1 | Rename Settings tab "Notifications" → "Notification Preferences" | settings.tsx | RENAME |
| 2 | Reorder settings tabs: Profile → Organizations → Integrations → Appearance → Notification Preferences | settings.tsx | REORDER |

---

## 5. Already Correct (No Change Needed)

| Item | Status |
|------|--------|
| Settings removed from sidebar NAV | ✅ Done in v2 |
| Settings in account dropdown | ✅ Done in v2 |
| Single Notifications feed destination | ✅ Correct — /notifications |
| Account dropdown (auth + guest) | ✅ Working |
| Desktop hover sidebar | ✅ Working |
| Mobile drawer | ✅ Working |
| No new dependencies | ✅ |
| Project-scoped settings sidebar item | ✅ Different scope, not a duplicate |
