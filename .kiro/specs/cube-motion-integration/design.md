# Design: cube-motion Integration

## Overview

Add tasteful entrance and state-change animations to DevANT using cube-motion. The integration touches six surfaces: the authenticated Dashboard, the Projects page, the Health & Burn dashboard, the Notifications page, the Onboarding flow, and the Projects page's Sync button. Every other surface is left unanimated — motion only earns its place where it reinforces perceived performance or communicates a state change to the user.

The library is zero-dependency and built on the Web Animations API, so no bundler changes are needed beyond the `npm i cube-motion` install.

---

## Architecture

```
npm i cube-motion
        │
        ▼
cube-motion/react  ──►  React components (<Rise>, <Reveal>, <Morph>)
                            │
                ┌───────────┼──────────────┐
                ▼           ▼              ▼
          src/routes/    src/routes/    src/components/
          index.tsx      projects…      (StatCard cleanup)
          health.tsx
          notifications.tsx
          onboarding.tsx
```

There is no wrapper layer, no abstraction file, no re-export. Each route file imports directly from `cube-motion/react` at the call site. This keeps the diff small and readable.

### reduced-motion strategy

cube-motion is built on the Web Animations API. Per the library's documentation, it reads `prefers-reduced-motion` natively and skips animation when the media query matches. No application-level hook is needed.

If a future audit determines the library does not honour the media query, the mitigation is a single `useReducedMotion` hook:

```ts
// ponytail: only create this if library audit fails — see Req 12.2
function useReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}
```

and then pass `as="div"` or bypass the motion component conditionally. That upgrade is isolated to the one hook file.

---

## Components and Interfaces

### cube-motion/react API surface used

| Component | Props used | Purpose |
|-----------|-----------|---------|
| `<Rise>` | `show?: boolean` | Fade-in + 12 px lift on mount; with `show` prop gates leave-then-unmount |
| `<Reveal targets="children">` | — | Scroll-driven Rise when entering viewport |
| `<Morph active={bool} off="…" on="…" />` | `active`, `off`, `on` | Crossfade between two text labels |

No other cube-motion exports are used.

### StatCard change

Remove the `animate-fade-up` Tailwind class from `StatCard`'s root div. The class was added inline in the original component; cube-motion's `<Rise>` wrapper on the stat grid replaces it. Removing it prevents double-animation.

### Sync button state (Projects page)

The Sync button needs a local `syncing` boolean per project id to drive `<Morph active={syncing}>`. The existing `emitSync` call is fire-and-forget (no promise), so the `syncing` state is set to `true` on click and reset via `setTimeout(1500)`.

```ts
// ponytail: emitSync has no return value so we self-time the reset;
// ceiling: if sync ever becomes async, thread the promise here instead.
const [syncingId, setSyncingId] = useState<string | null>(null);

function handleSync(projectId: string) {
  setSyncingId(projectId);
  emitSync(projectId);
  setTimeout(() => setSyncingId(null), 1500);
}
```

---

## Data Models

No new data models. The integration is purely presentational.

The only state additions are:
- `syncingId: string | null` in `Projects` component (drives Morph on Sync button)
- `show` booleans derived from existing `loading` / `scores.length` / `selected !== null` state already present in each component

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Stagger delay is index-proportional

*For any* list of N stat cards (N ≥ 1), card at index `i` must have an `animationDelay` style value equal to `${i * 80}ms`.

This is a universal rule: it holds for 1 card, 4 cards, or 10 cards. It cannot be verified by a single snapshot.

**Validates: Requirements 3.2**

---

### Property 2: Notifications list has exactly one Rise wrapper per non-empty section

*For any* rendered Notifications page state with K GitHub activity items (K ≥ 1) and J invite items (J ≥ 0): the rendered output must contain exactly 1 Rise wrapper enclosing the GitHub items, and exactly 1 Rise wrapper enclosing the invite items (when J ≥ 1). The count of Rise wrappers must not grow with K or J.

**Validates: Requirements 9.3**

---

### Property 3: Onboarding Rise key changes with step

*For any* two distinct step values `a` and `b` (where a ≠ b, both in `{0, 1, 2}`), the `key` prop of the Rise wrapper rendered at step `a` must differ from the key prop rendered at step `b`.

This ensures React unmounts and remounts the Rise component on step change, re-triggering the entrance animation.

**Validates: Requirements 10.2**

---

### Property 4: Reduced-motion hook returns true iff media query matches

*For any* `matchMedia('(prefers-reduced-motion: reduce)').matches` value `m`, the `useReducedMotion` hook (if created per Req 12.2 fallback) must return `m`.

This property only applies if the library fallback hook is implemented. It validates that the bypass logic exactly tracks the OS preference with no inversion or off-by-one.

**Validates: Requirements 12.2**

---

## Error Handling

- If `cube-motion` is not installed, TypeScript will surface a module-not-found error at compile time. No runtime guard needed.
- The `<Rise show={bool}>` component manages its own leave/unmount; callers only need to pass the correct boolean. No error surface.
- The 1 500 ms `setTimeout` for Sync Morph reset is fire-and-forget. If the component unmounts before the timeout fires, React 18+ batching will discard the stale `setState` call silently (no memory leak, no error).

---

## Testing Strategy

### Dual approach

Property tests catch universal correctness rules that single examples cannot exhaust. Unit/example tests catch specific rendering states and structural checks.

No test runner is currently installed in the project. The recommended setup is **Vitest** (already compatible with the existing Vite config — zero additional config needed) with **@testing-library/react** for component rendering.

Install:
```
npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom
```

Add to `vite.config.ts`:
```ts
test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] }
```

### Property-based tests

Use **fast-check** for property generation:
```
npm i -D fast-check
```

Each property test runs minimum 100 iterations.

#### Property 1 — Stagger delay (tag: `Feature: cube-motion-integration, Property 1: stagger delay is index-proportional`)

Generate `N` between 1–10. Render the stat card grid with N mock stat objects. For each rendered card at index `i`, assert `element.style.animationDelay === '${i * 80}ms'`.

#### Property 2 — Notifications Rise count (tag: `Feature: cube-motion-integration, Property 2: notifications list has exactly one Rise wrapper per section`)

Generate K GitHub items (1–20) and J invite items (0–10). Render Notifications with mocked data. Count Rise wrapper instances in the GitHub section and invite section. Assert each count is exactly 1, independent of K and J.

#### Property 3 — Onboarding step key (tag: `Feature: cube-motion-integration, Property 3: onboarding Rise key changes with step`)

For each pair of distinct step values in `{0, 1, 2}`, render Onboarding at step `a` and step `b`. Extract the `key` prop of the Rise wrapper in each render. Assert they differ.

#### Property 4 — Reduced-motion hook (tag: `Feature: cube-motion-integration, Property 4: reduced-motion hook returns true iff media query matches`)

For both `matches = true` and `matches = false`, mock `window.matchMedia` to return the value. Call `useReducedMotion()`. Assert the return value equals `matches`.

### Unit / example tests

- Req 2.1: Dashboard renders a Rise wrapper around the hero section on mount.
- Req 4.1/4.2/4.3: Dashboard renders Reveal (projects), Rise (empty), no-wrapper (loading) in the three project states.
- Req 5.1/5.2/5.3: Same three states for Projects page.
- Req 6.1/6.2/6.3: Health KPI strip shows Rise with correct `show` prop in each of loading/loaded/error states.
- Req 7.1: Health TableBody wrapped in Rise when `!loading && scores.length > 0`.
- Req 8.1: HealthDrawer wraps inner content in Rise when `score !== null`.
- Req 11.1: Sync button Morph `active` prop is true immediately after click and false after 1 500 ms.
- Req 11.2: Onboarding invite Morph `active` tracks `isInviting` state.
- Req 12.3: ScoreBar in health.tsx still has `motion-reduce:transition-none` class.

Unit tests focus on specific states; property tests handle the universal rules above. Together they give comprehensive coverage with minimal duplication.
