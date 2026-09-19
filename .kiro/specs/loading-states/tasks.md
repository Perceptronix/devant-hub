# Implementation Plan: Loading States

## Overview

Replace text-only loading placeholders and missing loading states with shape-matched `Skeleton` UI across 8 route files. Each task is a self-contained diff to one file. No new files, no new dependencies.

## Tasks

- [x] 1. Fix Commits page skeleton
  - In `projects.$projectId.commits.index.tsx`, replace the `"Loading commits…"` text div with 6 skeleton table rows inside the real table structure (thead preserved, 6 `<tr>` skeletons with cells matching SHA/Author/Message/Branch/Changes/When widths)
  - Import `Skeleton` from `@/components/ui/skeleton`
  - _Requirements: 1.1, 1.2, 1.3, 9.1, 9.3_

  - [ ]* 1.1 Write property test for Commits skeleton
    - Render with `loading=true` → assert skeleton rows present, no real table rows
    - Render with `loading=false, rows=[]` → assert empty-state text present, no skeletons
    - Render with `loading=false, rows=[...]` → assert real table rows present, no skeletons
    - `// Feature: loading-states, Property 1: skeleton shown iff loading`
    - `// Feature: loading-states, Property 2: empty state only when !loading && empty`
    - _Requirements: 1.1, 1.2, 1.3_

- [x] 2. Fix Pulls page skeleton
  - In `projects.$projectId.pulls.tsx`, replace the `"Loading…"` text div with 4 skeleton PR card items (icon circle placeholder + two skeleton lines) gated on `loading && pulls.length === 0`
  - Import `Skeleton`
  - Verify the `loading && pulls.length > 0` path renders stale data without skeletons (no change needed, just confirm the condition)
  - _Requirements: 2.1, 2.2, 2.3, 2.4, 9.1_

  - [ ]* 2.1 Write property test for Pulls skeleton
    - Test all four `(loading, pulls.length)` combinations
    - Include edge case: `loading=true, pulls.length > 0` → no skeletons, stale data shown
    - `// Feature: loading-states, Property 1: skeleton shown iff loading`
    - `// Feature: loading-states, Property 2: empty state only when !loading && empty`
    - _Requirements: 2.1, 2.2, 2.3, 2.4_

- [x] 3. Fix Deployments page skeleton
  - In `projects.$projectId.deployments.tsx`, replace the `"Loading…"` text div with: 3 skeleton env summary tiles (matching the `glass rounded-xl p-5` card structure) AND 3 skeleton deployment list items (icon box + two lines + badge)
  - Move the existing env summary card JSX into the `!loading` branch so zeros never flash
  - Import `Skeleton`
  - _Requirements: 3.1, 3.2, 3.3, 3.4, 9.1, 9.4_

  - [ ]* 3.1 Write property test for Deployments skeleton
    - Render with `loading=true` → assert 3 skeleton tiles and 3 skeleton list items, no real env cards
    - Render with `loading=false, items=[]` → assert empty-state, no skeletons
    - `// Feature: loading-states, Property 1: skeleton shown iff loading`
    - _Requirements: 3.1, 3.2, 3.3_

- [x] 4. Fix Team page skeleton
  - In `projects.$projectId.team.tsx`, add a local `SkeletonMemberCard` function (file-local, not exported)
  - Replace the `"Loading team…"` text div with skeleton cards inline per section: 1 in Owner section, 2 in Collaborators grid, 3 in Contributors grid — all gated on `loading && members.length === 0`
  - Import `Skeleton`
  - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 9.1, 9.4_

  - [ ]* 4.1 Write property test for Team skeleton
    - Render with `loading=true, members=[]` → assert skeleton cards in all three sections
    - Render with `loading=false` → assert no skeleton cards regardless of member count
    - `// Feature: loading-states, Property 1: skeleton shown iff loading`
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

- [x] 5. Fix Project Overview page skeleton
  - In `projects.$projectId.index.tsx`, change `useState(false)` to `useState(true)` for `loading`
  - Add `if (loading)` branch before the return that renders 4 skeleton stat card placeholders (matching `glass rounded-xl p-5` with icon box + label + number) and a skeleton info panel
  - The existing `if (!project) return null` guard stays above the loading check
  - _Requirements: 5.1, 5.2, 5.3, 5.4, 9.1, 9.4_

  - [ ]* 5.1 Write property test for Project Overview skeleton
    - Render with `loading=true` → assert 4 skeleton stat cards and skeleton info panel
    - Render with `loading=false` → assert real `StatCard` components, no skeletons
    - Include edge case: initial render (before effect) shows skeletons, not zero-value stats
    - `// Feature: loading-states, Property 1: skeleton shown iff loading`
    - _Requirements: 5.1, 5.2, 5.3, 5.4_

- [x] 6. Checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Add loading state to Notifications page
  - In `notifications.tsx`, add `const [loading, setLoading] = useState(true)` 
  - In the GitHub notifications `useEffect`, set `setLoading(true)` at the start of the async IIFE (after the early-exit guards) and `setLoading(false)` in the `finally` block
  - Add 4 skeleton notification items (icon box `size-9` + two skeleton lines) gated on `loading`, rendered before the GitHub Activity section
  - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 9.1, 9.4_

  - [ ]* 7.1 Write property test for Notifications skeleton
    - Render with `loading=true` → assert 4 skeleton items visible
    - Render with `loading=false, items=[], invites=[], user authenticated` → assert "No notifications yet." text
    - `// Feature: loading-states, Property 1: skeleton shown iff loading`
    - `// Feature: loading-states, Property 2: empty state only when !loading && empty`
    - _Requirements: 6.3, 6.4_

- [x] 8. Add loadingOrgData state to Settings page
  - In `settings.tsx`, add `const [loadingOrgData, setLoadingOrgData] = useState(false)`
  - In the org-data `useEffect` (the one gated on `selectedOrg`), set `setLoadingOrgData(true)` before the `await Promise.all` and `setLoadingOrgData(false)` in a `finally` block
  - Replace the departments list render with: `loadingOrgData ? <3 skeleton rows> : departments.length === 0 ? <empty text> : <real list>`
  - Same pattern for members list
  - Import `Skeleton`
  - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 9.1, 9.4_

  - [ ]* 8.1 Write property test for Settings org-data skeleton
    - Render with `loadingOrgData=true, selectedOrg set` → assert skeleton rows in both departments and members sections
    - Render with `loadingOrgData=false, empty arrays` → assert empty-state text
    - `// Feature: loading-states, Property 1: skeleton shown iff loading`
    - `// Feature: loading-states, Property 2: empty state only when !loading && empty`
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

- [x] 9. Add syncing state to Project Settings Sync button
  - In `projects.$projectId.settings.tsx`, add `const [syncing, setSyncing] = useState(false)`
  - Add `import { Loader2 } from "lucide-react"` (already imported: `RefreshCw`)
  - Extract the inline `onClick` to a named `handleSync` function: sets `syncing=true`, calls `emitSync(project.id)`, sets `syncing=false` after `window.setTimeout(..., 500)`
  - Update the Sync button: `disabled={syncing}`, render `<Loader2 className="size-4 animate-spin" /> Syncing…` when syncing, `<RefreshCw className="size-4" /> Sync now` otherwise
  - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [ ]* 9.1 Write example test for Sync button loading state
    - Use Vitest fake timers
    - Click button → assert disabled + Loader2 visible
    - Advance 500ms → assert enabled + RefreshCw visible
    - `// Feature: loading-states, Property 3: sync button disabled-then-re-enabled`
    - _Requirements: 8.2, 8.3, 8.4_

- [x] 10. Final checkpoint — ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.
