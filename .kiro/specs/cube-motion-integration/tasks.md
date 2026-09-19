# Implementation Plan: cube-motion Integration

## Overview

Install cube-motion, then wire its React components into six surfaces in sequence. Each task is a focused diff; tasks build left-to-right so nothing is left dangling.

## Tasks

- [ ] 1. Install cube-motion and set up test infrastructure
  - Run `npm i cube-motion` to add the library as a production dependency
  - Run `npm i -D vitest @testing-library/react @testing-library/jest-dom jsdom fast-check` for testing
  - Add `test: { environment: 'jsdom', setupFiles: ['./src/test-setup.ts'] }` to `vite.config.ts`
  - Create `src/test-setup.ts` that imports `@testing-library/jest-dom`
  - Add `"test": "vitest --run"` to `package.json` scripts
  - Verify `import { Rise, Reveal, Morph } from 'cube-motion/react'` resolves without TypeScript errors
  - _Requirements: 1.1, 1.2, 1.3_

- [ ] 2. Clean up StatCard — remove conflicting animate-fade-up class
  - In `src/components/StatCard.tsx`, remove `animate-fade-up` from the root div className
  - This prevents double-animation when cube-motion wraps the stat grid
  - _Requirements: 3.3_

  - [ ]* 2.1 Write example test confirming animate-fade-up is absent from StatCard root
    - Render `<StatCard label="X" value={0} />` and assert the root element does not have the `animate-fade-up` class
    - _Requirements: 3.3_

- [ ] 3. Implement Dashboard animations (`src/routes/index.tsx`)
  - Import `Rise` and `Reveal` from `cube-motion/react`
  - Wrap the greeting hero `<div>` in `<Rise>` (no show prop — mount-only)
  - Wrap the stat card grid items with `<Rise>` and add `style={{ animationDelay: \`${i * 80}ms\` }}` to each card wrapper at index `i`
  - Wrap the project card grid in `<Reveal targets="children">` when `projects.length > 0`
  - Wrap the empty-state block in `<Rise>` when `projects.length === 0 && !projectsLoading`
  - Do not animate skeleton elements
  - _Requirements: 2.1, 2.2, 2.3, 3.1, 3.2, 4.1, 4.2, 4.3_

  - [ ]* 3.1 Write property test for stagger delay — Property 1
    - **Property 1: Stagger delay is index-proportional**
    - Use fast-check to generate N ∈ [1, 10]; render Dashboard stat grid with N mock stats; assert card at index i has `animationDelay === '${i * 80}ms'`
    - Tag: `Feature: cube-motion-integration, Property 1: stagger delay is index-proportional`
    - **Validates: Requirements 3.2**

  - [ ]* 3.2 Write example tests for Dashboard animation states
    - Test: hero section has Rise wrapper on mount
    - Test: project grid has Reveal wrapper when projects.length > 0
    - Test: empty state has Rise wrapper when projects.length === 0 and not loading
    - Test: skeletons have no Rise/Reveal wrapper when projectsLoading === true
    - _Requirements: 2.1, 4.1, 4.2, 4.3_

- [ ] 4. Checkpoint — ensure all tests pass
  - Run `npm test` and confirm all tests pass before continuing.

- [ ] 5. Implement Projects page animations (`src/routes/projects.index.tsx`)
  - Import `Rise`, `Reveal`, `Morph` from `cube-motion/react`
  - Wrap the project card grid in `<Reveal targets="children">` when `linkedProjects.length > 0`
  - Wrap the empty-state block in `<Rise>` when `linkedProjects.length === 0 && !projectsLoading`
  - Do not animate skeleton elements
  - Add `syncingId: string | null` state (initially `null`)
  - Replace the Sync button's `onClick` to call `setSyncingId(p.id); emitSync(p.id); setTimeout(() => setSyncingId(null), 1500)`
  - Replace the Sync button label `Sync` with `<Morph active={syncingId === p.id} off="Sync" on="Synced" />`
  - Remove the `<RefreshCw>` icon from the Sync button (Morph provides the state feedback)
  - _Requirements: 5.1, 5.2, 5.3, 11.1_

  - [ ]* 5.1 Write example tests for Projects page animation states
    - Test: card grid has Reveal wrapper when projects present
    - Test: empty state has Rise wrapper
    - Test: skeletons have no wrapper
    - Test: Sync button Morph `active` is true immediately after click and false after 1 500 ms (use fake timers)
    - _Requirements: 5.1, 5.2, 5.3, 11.1_

- [ ] 6. Implement Health & Burn dashboard animations (`src/routes/health.tsx`)
  - Import `Rise` from `cube-motion/react`
  - Wrap the KPI strip `<div>` in `<Rise show={!loading}>` — the show prop drives leave-on-hide/rise-on-show
  - Wrap `<TableBody>` content in `<Rise show={!loading && scores.length > 0}>`
  - In `HealthDrawer`, wrap the inner content block (the fragment inside `{score && (...)}`) in `<Rise>` (no show prop — mount-only, Radix Sheet handles exit)
  - Do not animate the error state div or skeleton rows
  - _Requirements: 6.1, 6.2, 6.3, 7.1, 8.1, 8.2_

  - [ ]* 6.1 Write example tests for Health dashboard animation states
    - Test: KPI strip Rise `show` prop is false when loading, true when loaded with scores
    - Test: TableBody Rise `show` prop is false when loading, true when scores.length > 0
    - Test: error state div has no Rise wrapper
    - Test: HealthDrawer wraps content in Rise when score is not null
    - Test: ScoreBar root still has `motion-reduce:transition-none` class (Req 12.3)
    - _Requirements: 6.1, 6.2, 6.3, 7.1, 8.1, 12.3_

- [ ] 7. Implement Notifications page animations (`src/routes/notifications.tsx`)
  - Import `Rise` from `cube-motion/react`
  - Wrap the org invite items section (the `{invites.length > 0 && ...}` block) in a single `<Rise>`
  - Wrap the GitHub activity items list (the `{items.map(...)}` block) in a single `<Rise>`
  - Apply Rise to the container, not to individual items
  - _Requirements: 9.1, 9.2, 9.3_

  - [ ]* 7.1 Write property test for Notifications Rise count — Property 2
    - **Property 2: Notifications list has exactly one Rise wrapper per non-empty section**
    - Use fast-check to generate K GitHub items (1–20) and J invite items (0–10); render Notifications with mocked data; count Rise wrappers per section; assert each section has exactly 1 regardless of K/J
    - Tag: `Feature: cube-motion-integration, Property 2: notifications list has exactly one Rise wrapper per section`
    - **Validates: Requirements 9.3**

- [ ] 8. Implement Onboarding step transition animations (`src/routes/onboarding.tsx`)
  - Import `Rise` and `Morph` from `cube-motion/react`
  - Wrap each step panel content block (the three `{step === N && (...)}` branches) in `<Rise key={step}>`
  - The `key={step}` prop ensures React unmounts and remounts Rise on step change, re-triggering the entrance animation
  - Do not wrap the step indicator row or the navigation footer
  - Replace the "Send invite" button label with `<Morph active={isInviting} off="Send invite" on="Sending…" />`
  - Remove the existing inline `{isInviting ? "Sending…" : "Send invite"}` ternary (Morph replaces it)
  - _Requirements: 10.1, 10.2, 10.3, 11.2_

  - [ ]* 8.1 Write property test for Onboarding step key — Property 3
    - **Property 3: Onboarding Rise key changes with step**
    - For each pair of distinct step values in {0, 1, 2}, render Onboarding at step a and step b; extract Rise wrapper key props; assert they differ
    - Tag: `Feature: cube-motion-integration, Property 3: onboarding Rise key changes with step`
    - **Validates: Requirements 10.2**

  - [ ]* 8.2 Write example tests for Onboarding animations
    - Test: step indicator row has no Rise wrapper
    - Test: navigation footer has no Rise wrapper
    - Test: invite Morph `active` prop tracks `isInviting` state
    - _Requirements: 10.3, 11.2_

- [ ] 9. Final checkpoint — ensure all tests pass
  - Run `npm test` and confirm all tests pass, ask the user if any questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for a faster MVP
- Property tests (3.1, 7.1, 8.1) run 100 iterations each via fast-check
- Stagger delay arithmetic for the stat grid: card at index `i` gets `style={{ animationDelay: \`${i * 80}ms\` }}`
- The Sync Morph reset uses `setTimeout(1500)` — see the design doc for the ponytail note on the ceiling
- cube-motion respects `prefers-reduced-motion` natively; no application-level hook needed unless a future library audit proves otherwise
