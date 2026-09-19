# Requirements Document

## Introduction

Integrate cube-motion (a zero-dependency Web Animations API library) into the DevANT dashboard. The goal is tasteful, professional motion that reinforces perceived performance and polish — entrance animations when content loads, scroll-driven reveals for card grids, and micro-interactions on state-changing controls. Surfaces that have no natural entry/exit lifecycle or no user-facing state change are left unanimated.

## Glossary

- **cube-motion**: The JS animation library being integrated; exposes `rise`, `leave`, `morph`, and `reveal` primitives and corresponding React components via `cube-motion/react`.
- **Rise**: Fade-in + 12 px upward lift over 640 ms; used for content appearing on mount or route load.
- **Leave**: Fade-out + 12 px downward drop over 320 ms; runs before a controlled element unmounts.
- **Morph**: Grapheme-diff or crossfade text transition (180–220 ms); used when a label changes state in place.
- **Reveal**: Scroll-driven entrance that hides an element then runs Rise when it enters the viewport.
- **`<Rise show={bool}>`**: React component; with `show` prop, leave-then-unmount gate; without `show`, animates on mount only.
- **`<Reveal targets="children">`**: React component; wraps children and triggers Reveal on scroll.
- **`<Morph active={bool} off="…" on="…" />`**: React component; crossfades between two labels based on `active`.
- **Dashboard**: The authenticated home route (`/`) that shows the greeting hero, stat grid, and project cards.
- **Projects_Page**: The `/projects` route showing the linked-repository card grid.
- **Health_Dashboard**: The `/health` route with the KPI strip, sortable table, and Sheet drawer.
- **Notifications_Page**: The `/notifications` route with notification and invite item lists.
- **Onboarding_Flow**: The `/onboarding` multi-step form.
- **StatCard**: The reusable `src/components/StatCard.tsx` component used in project overview.
- **AppSidebar**: The collapsible navigation sidebar component.

---

## Requirements

### Requirement 1: Install and wire the library

**User Story:** As a developer, I want cube-motion installed and importable, so that I can use its React components across DevANT without additional bundler configuration.

#### Acceptance Criteria

1. THE System SHALL add `cube-motion` as a production dependency via `npm i cube-motion`.
2. WHEN a component imports from `cube-motion/react`, THE Bundler SHALL resolve the import without errors or additional Vite aliases.
3. THE System SHALL not introduce any additional runtime dependencies beyond `cube-motion` itself.

---

### Requirement 2: Dashboard — greeting hero entrance

**User Story:** As an authenticated user, I want the dashboard greeting section to animate in on load, so that the page feels responsive and polished when I first land.

#### Acceptance Criteria

1. WHEN the `Dashboard` component mounts, THE Dashboard SHALL wrap its greeting hero section in a `<Rise>` component so the hero fades and lifts into view.
2. THE Dashboard SHALL animate only the hero section; the stat grid and project cards are handled by separate requirements.
3. WHILE the projects data is loading (skeleton state), THE Dashboard SHALL not block or delay the hero Rise animation.

---

### Requirement 3: Dashboard — stat grid entrance

**User Story:** As an authenticated user, I want the stat cards on the dashboard to animate in sequentially, so that the eye is guided across the metrics naturally.

#### Acceptance Criteria

1. WHEN the `Dashboard` component mounts, THE Dashboard SHALL wrap the stat card grid in a `<Rise>` component.
2. THE Dashboard SHALL apply a staggered CSS delay (e.g. `style={{ animationDelay: '...' }}` or equivalent) of 80 ms per card so cards animate in left-to-right.
3. THE existing `animate-fade-up` class already on `StatCard` SHALL be removed to avoid double-animating when cube-motion is wrapping it.

---

### Requirement 4: Dashboard — project cards scroll reveal

**User Story:** As an authenticated user, I want the project cards below the fold to reveal as I scroll, so that the grid feels alive rather than dumped on screen.

#### Acceptance Criteria

1. WHEN the project cards grid is rendered with at least one project, THE Dashboard SHALL wrap the grid in a `<Reveal targets="children">` component.
2. WHEN the projects list is empty (empty-state block), THE Dashboard SHALL wrap the empty-state container in a `<Rise>` component instead of `<Reveal>`.
3. WHEN projects are loading (skeleton state), THE Dashboard SHALL not apply Rise or Reveal to the skeletons.

---

### Requirement 5: Projects page — card grid scroll reveal

**User Story:** As a user browsing the Projects page, I want the project cards to animate in as I scroll, so that the list feels dynamic.

#### Acceptance Criteria

1. WHEN the `Projects_Page` renders one or more linked project cards, THE Projects_Page SHALL wrap the card grid in a `<Reveal targets="children">` component.
2. WHEN the Projects_Page renders the empty-state block, THE Projects_Page SHALL wrap it in a `<Rise>` component.
3. WHEN the Projects_Page renders loading skeletons, THE Projects_Page SHALL not apply any animation wrapper to the skeleton elements.

---

### Requirement 6: Health dashboard — KPI strip entrance

**User Story:** As a user opening the Health & Burn page, I want the KPI stat strip to animate in, so that loading the numbers feels intentional rather than a sudden pop.

#### Acceptance Criteria

1. WHEN the `Health_Dashboard` component finishes loading (i.e. `loading` state becomes `false`) and scores are present, THE Health_Dashboard SHALL reveal the KPI strip with a `<Rise>` component controlled by a `show` prop tied to `!loading`.
2. IF the `Health_Dashboard` is in the error state, THEN THE Health_Dashboard SHALL not animate the error message; it SHALL appear immediately.
3. WHEN `loading` is `true`, THE Health_Dashboard SHALL render the existing skeleton placeholders without animation wrappers.

---

### Requirement 7: Health dashboard — table rows entrance

**User Story:** As a user viewing the Health & Burn table, I want table rows to animate in after data loads, so that the transition from skeleton to live data is smooth.

#### Acceptance Criteria

1. WHEN the `Health_Dashboard` transitions from loading to a populated table, THE Health_Dashboard SHALL wrap the `<TableBody>` content in a `<Rise>` component controlled by a `show` prop tied to `!loading && scores.length > 0`.
2. THE Health_Dashboard SHALL not animate individual rows independently; the TableBody as a unit is sufficient.

---

### Requirement 8: Health dashboard — Sheet drawer entrance

**User Story:** As a user clicking a table row, I want the detail Sheet drawer to animate its inner content in on open, so that the panel entrance feels polished.

#### Acceptance Criteria

1. WHEN the `HealthDrawer` Sheet content becomes visible (`score !== null`), THE HealthDrawer SHALL wrap the inner content block in a `<Rise>` component.
2. WHEN the Sheet closes, THE HealthDrawer SHALL not apply a leave animation to the inner content (Radix Sheet provides its own exit transition; double-animating causes jank).

---

### Requirement 9: Notifications page — list item entrance

**User Story:** As a user visiting the Notifications page, I want notification items to animate in, so that the list feels intentional rather than a static dump.

#### Acceptance Criteria

1. WHEN the `Notifications` component renders GitHub activity items, THE Notifications_Page SHALL wrap the items list container in a `<Rise>` component.
2. WHEN the `Notifications` component renders org invite items, THE Notifications_Page SHALL wrap the invite list container in a `<Rise>` component.
3. THE Notifications_Page SHALL apply a single Rise to each list container, not to individual items, to keep the animation simple and performant.

---

### Requirement 10: Onboarding — step content transition

**User Story:** As a new user going through the onboarding flow, I want each step's content to animate in when the step changes, so that forward and backward navigation feels fluid.

#### Acceptance Criteria

1. WHEN the `Onboarding` component renders a step panel, THE Onboarding_Flow SHALL wrap each step's content block in a `<Rise>` component keyed to the current step number.
2. WHEN the user navigates to a different step, THE Onboarding_Flow SHALL unmount the old step content and mount the new step content so Rise triggers naturally on the new mount.
3. THE Onboarding_Flow SHALL not animate the step indicator row or the navigation footer; only the step content block is animated.

---

### Requirement 11: Morph on save/submit controls

**User Story:** As a user, I want buttons that confirm an action (e.g. "Sync", "Send invite") to briefly morph their label to a confirmation state, so that I receive immediate feedback without a toast.

#### Acceptance Criteria

1. WHEN the "Sync" button in `Projects_Page` is clicked, THE Projects_Page SHALL use a `<Morph>` component to transition the button label from "Sync" to "Synced" for 1 500 ms then revert.
2. WHEN the "Send invite" button in `Onboarding_Flow` is in the `isInviting` state, THE Onboarding_Flow SHALL use a `<Morph>` component to display "Sending…" and revert to "Send invite" when `isInviting` returns to `false`.
3. THE System SHALL not use `<Morph>` on buttons that already use a spinner or icon-swap for loading state (e.g. the Loader2 spinner on Import in Projects_Page is sufficient and SHALL remain unchanged).

---

### Requirement 12: Respect prefers-reduced-motion

**User Story:** As a user who has enabled reduced-motion in their OS, I want all cube-motion animations to be suppressed, so that I am not harmed by motion I have opted out of.

#### Acceptance Criteria

1. THE System SHALL verify that cube-motion respects the `prefers-reduced-motion: reduce` media query natively (per library documentation) and SHALL document this in the design.
2. IF cube-motion does not natively suppress motion for `prefers-reduced-motion`, THEN THE System SHALL wrap all `<Rise>`, `<Reveal>`, and `<Morph>` usage in a hook that reads `window.matchMedia('(prefers-reduced-motion: reduce)')` and skips or bypasses the animation component.
3. THE existing `motion-reduce:transition-none` Tailwind class on `ScoreBar` in `health.tsx` SHALL be preserved and is unaffected by this requirement.
