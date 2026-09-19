# Design Document: Loading States

## Overview

Eight surfaces in the DevANT dashboard have inadequate or missing loading UI. This design describes the minimal, consistent changes needed to replace text placeholders and missing states with shape-matched `Skeleton` placeholders and, where missing, correct `loading` boolean state initialisation.

No new abstractions, no new dependencies, no new files. Every change is a localised diff to the affected route component.

---

## Architecture

All affected pages follow the same existing pattern:

```
useState(loading = true/false)  →  useEffect async fetch  →  finally { setLoading(false) }
```

The fix is identical across all pages: swap the text-only loading branch for `Skeleton` JSX that mirrors the real content structure, and initialise `loading` to `true` where it was missing entirely.

The existing `Skeleton` component (`src/components/ui/skeleton.tsx`) is a single `animate-pulse` div that accepts `className`. That is everything we need.

---

## Components and Interfaces

No new components are introduced. All changes are inline JSX within the existing route components.

### Affected files

| File | Change |
|---|---|
| `src/routes/projects.$projectId.commits.index.tsx` | Replace `"Loading commits…"` text with 6 skeleton table rows |
| `src/routes/projects.$projectId.pulls.tsx` | Replace `"Loading…"` text with 4 skeleton PR card items |
| `src/routes/projects.$projectId.deployments.tsx` | Replace `"Loading…"` text with 3 skeleton env tiles + 3 skeleton list items |
| `src/routes/projects.$projectId.team.tsx` | Replace `"Loading team…"` text with skeleton cards per section |
| `src/routes/projects.$projectId.index.tsx` | Replace nothing (no loading UI existed) with skeleton stat cards + skeleton info panel; initialise `loading` to `true` |
| `src/routes/notifications.tsx` | Add `loading` state (was missing entirely); add 4 skeleton notification items |
| `src/routes/settings.tsx` | Add `loadingOrgData` state to org-data fetch; add skeleton rows for departments + members lists |
| `src/routes/projects.$projectId.settings.tsx` | Add `syncing` state to Sync button; 500 ms timeout pattern matching `projects.index.tsx` |

---

## Data Models

No new data models. All state is `boolean` — either the existing `loading` variable already present in the component or a new one following the same naming convention.

New state variables added:

- `notifications.tsx`: `const [loading, setLoading] = useState(true)`
- `settings.tsx`: `const [loadingOrgData, setLoadingOrgData] = useState(false)` — starts `false` because no org is selected on mount; set to `true` when `selectedOrg` changes and queries begin.
- `projects.$projectId.settings.tsx`: `const [syncing, setSyncing] = useState(false)`

---

## Skeleton Shapes

Each skeleton is designed to match the real layout it replaces.

### Commits — skeleton table row (6 columns)

```tsx
{loading ? (
  <div className="glass rounded-xl overflow-hidden">
    <div className="overflow-x-auto scrollbar-thin">
      <table className="w-full text-sm">
        <thead className="bg-surface">
          <tr className="text-left text-xs text-muted-foreground uppercase tracking-wider">
            <th className="px-4 py-3">SHA</th><th className="px-4 py-3">Author</th>
            <th className="px-4 py-3">Message</th><th className="px-4 py-3">Branch</th>
            <th className="px-4 py-3 text-right">Changes</th><th className="px-4 py-3">When</th>
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: 6 }).map((_, i) => (
            <tr key={i} className="border-t border-border">
              <td className="px-4 py-3"><Skeleton className="h-4 w-14" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-24" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-48" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-16" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-16 ml-auto" /></td>
              <td className="px-4 py-3"><Skeleton className="h-4 w-20" /></td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  </div>
) : /* existing rows JSX */ }
```

### Pulls — skeleton PR card (icon + title + meta)

```tsx
{loading && pulls.length === 0 ? (
  <div className="space-y-2 mt-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="glass rounded-xl p-4 flex items-start gap-4">
        <Skeleton className="size-5 mt-0.5 shrink-0 rounded-full" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/2" />
        </div>
      </div>
    ))}
  </div>
) : null}
```

### Deployments — skeleton env tiles + list rows

```tsx
{/* env tiles */}
{loading ? (
  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="glass rounded-xl p-5 space-y-3">
        <Skeleton className="h-3 w-20" />
        <Skeleton className="h-2 w-full" />
      </div>
    ))}
  </div>
) : /* real env tiles */}

{/* deployment list items */}
{loading ? (
  <div className="space-y-2">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="glass rounded-xl p-4 flex items-center gap-4">
        <Skeleton className="size-10 rounded-lg shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-40" />
          <Skeleton className="h-3 w-28" />
        </div>
        <Skeleton className="h-5 w-16 rounded-full" />
      </div>
    ))}
  </div>
) : /* real list */}
```

### Team — skeleton member cards per section

One skeleton card for Owner, two for Collaborators, three for Contributors (matches the typical distribution and the grid layout used by real `MemberCard` components).

```tsx
function SkeletonMemberCard() {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-start gap-3">
        <Skeleton className="size-12 rounded-full shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-3 w-20" />
          <Skeleton className="h-3 w-36" />
        </div>
      </div>
    </div>
  );
}
```

This is a local (non-exported) helper function inside `team.tsx` to avoid repetition across 3 sections — the only abstraction justified by the 3× reuse within the same file.

### Project Overview — skeleton stat cards + info panel

StatCard is `p-5 rounded-xl glass` with an icon box, label, and large number. Skeleton approximates that:

```tsx
{loading ? (
  <>
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="glass rounded-xl p-5 space-y-3">
          <div className="flex items-start justify-between">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="size-8 rounded-lg" />
          </div>
          <Skeleton className="h-8 w-16" />
        </div>
      ))}
    </div>
    <div className="glass rounded-xl p-5">
      <Skeleton className="h-4 w-48 mb-3" />
      <div className="flex gap-3">
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-24" />
        <Skeleton className="h-3 w-16" />
      </div>
    </div>
  </>
) : /* real content */}
```

`loading` must be initialised to `true` (currently `false`) so no zero-value `StatCard` renders before the fetch completes.

### Notifications — skeleton notification items

```tsx
{loading ? (
  <div className="space-y-2">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="glass rounded-xl p-4 flex items-start gap-3">
        <Skeleton className="size-9 rounded-lg shrink-0" />
        <div className="flex-1 space-y-2">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-3 w-1/3" />
        </div>
      </div>
    ))}
  </div>
) : /* real list */}
```

`loading` is initialised `true` and set `false` in the `finally` block of the GitHub notifications effect. The org invites effect is a separate `useEffect` with its own error handling and does not need a loading state (it populates a separate list that appears above the skeleton).

### Settings — skeleton department and member rows

```tsx
{loadingOrgData ? (
  <div className="space-y-2">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="flex items-center justify-between p-3 bg-surface rounded-lg border border-border">
        <div className="space-y-1.5">
          <Skeleton className="h-4 w-32" />
          <Skeleton className="h-3 w-24" />
        </div>
      </div>
    ))}
  </div>
) : departments.length === 0 ? (
  <div className="text-sm text-muted-foreground">No departments yet</div>
) : /* real list */}
```

Same pattern for Members list.

### Project Settings — Sync button

```tsx
const [syncing, setSyncing] = useState(false);

function handleSync() {
  setSyncing(true);
  emitSync(project.id);
  window.setTimeout(() => setSyncing(false), 500);
}

<Button variant="outline" className="gap-1.5" onClick={handleSync} disabled={syncing}>
  {syncing
    ? <><Loader2 className="size-4 animate-spin" /> Syncing…</>
    : <><RefreshCw className="size-4" /> Sync now</>
  }
</Button>
```

500 ms is the same timeout used for the `syncingId` pattern in `projects.index.tsx`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Skeleton shown iff loading

*For any* affected page component, when its `loading` state is `true`, the rendered output should contain `Skeleton` elements and should not contain real data items; when `loading` is `false`, the output should not contain any skeleton placeholders.

**Validates: Requirements 1.1, 2.1, 3.1, 3.2, 4.1, 4.2, 4.3, 5.1, 5.2, 6.3**

### Property 2: Empty state only shown when not loading and data is empty

*For any* affected page, the empty-state message (e.g. "No commits.", "Nothing here.", "No notifications yet.") should only appear when `loading === false` AND the relevant data array has length 0.

**Validates: Requirements 1.2, 2.2, 3.3, 4.4, 5.3, 6.4, 7.4, 7.5**

### Property 3: Sync button disabled-then-re-enabled

*For any* invocation of the Sync button handler, the button should be disabled for exactly the 500 ms timeout window, then re-enabled — meaning two rapid clicks cannot double-fire `emitSync`.

**Validates: Requirements 8.2, 8.3, 8.4**

---

## Error Handling

- All affected fetches already have `try/finally` blocks. The `finally` block is where `setLoading(false)` is placed — this is unchanged. Errors surface as empty lists (the existing behaviour), which then show the empty-state UI after `loading` resolves to `false`.
- The `syncing` state uses `window.setTimeout` — if the component unmounts before the timeout fires, the `setSyncing(false)` call on an unmounted component is benign in React 19 (no warning).

---

## Testing Strategy

**Unit tests** verify specific examples: render a component with `loading={true}` and assert skeletons are present; render with `loading={false}` and empty data and assert the empty-state message is present.

**Property tests** validate universal correctness:

- **Property 1** — Generate random `loading` boolean and data array; assert skeleton presence is exactly `loading === true`.
- **Property 2** — Generate all combinations of `(loading, data.length)`; assert empty state appears iff `!loading && data.length === 0`.
- **Property 3** — Simulate rapid Sync button clicks; assert `emitSync` is called at most once per click sequence within the 500 ms window.

Use **Vitest** (already installed) for both unit and property tests. For property-like coverage without a full PBT library, parameterised `test.each` over the finite boolean/length combinations is sufficient — there are only 4 meaningful cases per page (`loading×hasData`).

Each test file should be colocated with the route file it tests (e.g. `projects.$projectId.commits.index.test.tsx`).

Tag format for traceability: `// Feature: loading-states, Property {N}: {property_text}`
