# Requirements Document

## Introduction

Several data-fetching surfaces in the DevANT dashboard currently show plain text placeholders ("Loading…", "Loading commits…", "Loading team…") or nothing at all while async data is being fetched. This feature replaces every inadequate loading placeholder with shape-matched skeleton UI built from the existing `Skeleton` component, and adds missing `loading` state tracking where none exists. The goal is a consistent, polished perceived-performance experience across all dashboard views, without introducing any new dependencies.

Surfaces already handled correctly (projects list, dashboard project grid, health page, project messaging, project settings disconnect button, settings mutation buttons, onboarding slug check) are explicitly out of scope.

## Glossary

- **Dashboard**: The DevANT React 19 single-page application.
- **Skeleton**: The `Skeleton` component at `src/components/ui/skeleton.tsx` — an `animate-pulse` div accepting a `className` prop.
- **Loading state**: A boolean React state variable initialised to `true` and set to `false` in the `finally` block of a data-fetch effect.
- **Empty state**: UI shown only when `!loading && data.length === 0`.
- **Shape-matched skeleton**: A skeleton whose dimensions and layout visually approximate the real content that will replace it.
- **Commits page**: `src/routes/projects.$projectId.commits.index.tsx`
- **Pulls page**: `src/routes/projects.$projectId.pulls.tsx`
- **Deployments page**: `src/routes/projects.$projectId.deployments.tsx`
- **Team page**: `src/routes/projects.$projectId.team.tsx`
- **Project Overview page**: `src/routes/projects.$projectId.index.tsx`
- **Notifications page**: `src/routes/notifications.tsx`
- **Settings page**: `src/routes/settings.tsx`
- **Project Settings page**: `src/routes/projects.$projectId.settings.tsx`
- **Sync button**: The "Sync now" button in Project Settings that calls `emitSync()`.
- **StatCard**: The `src/components/StatCard.tsx` component used for the 4 stat tiles on Project Overview.

---

## Requirements

### Requirement 1: Commits Page Skeleton

**User Story:** As a developer, I want to see a skeleton table while commits are loading, so that the page feels responsive and I know data is on its way.

#### Acceptance Criteria

1. WHILE the Commits page `loading` state is `true`, THE Dashboard SHALL render 6 skeleton table rows in place of the commits table, each row containing 6 skeleton cells matching the SHA, Author, Message, Branch, Changes, and When columns.
2. WHEN the Commits page `loading` state transitions to `false` and `rows.length === 0`, THE Dashboard SHALL render the "No commits." empty-state message.
3. WHEN the Commits page `loading` state transitions to `false` and `rows.length > 0`, THE Dashboard SHALL render the real commits table and remove all skeleton rows.
4. THE Commits page SHALL initialise `loading` to `false` and set it to `true` only after both `user` and `project` are available, matching the existing pattern.

### Requirement 2: Pull Requests Page Skeleton

**User Story:** As a developer, I want to see skeleton PR cards while pull requests are loading, so that the layout is stable before data arrives.

#### Acceptance Criteria

1. WHILE the Pulls page `loading` state is `true` AND `pulls.length === 0`, THE Dashboard SHALL render 4 skeleton list items styled to match the PR card layout (icon placeholder, title line, meta line).
2. WHEN the Pulls page `loading` state is `false` AND `pulls.length === 0`, THE Dashboard SHALL render the "Nothing here." empty-state message.
3. WHEN the Pulls page `loading` state is `false` AND `pulls.length > 0`, THE Dashboard SHALL render the real PR cards and remove all skeleton items.
4. THE Pulls page SHALL NOT display skeleton items when `pulls.length > 0`, so that stale data from a previous render is not obscured on refresh.

### Requirement 3: Deployments Page Skeleton

**User Story:** As a developer, I want to see skeleton cards and list items while deployments are loading, so that the page structure is visible immediately.

#### Acceptance Criteria

1. WHILE the Deployments page `loading` state is `true`, THE Dashboard SHALL render 3 skeleton environment summary cards replacing the Production, Staging, and Preview tiles.
2. WHILE the Deployments page `loading` state is `true`, THE Dashboard SHALL render 3 skeleton deployment list items below the env summary cards.
3. WHEN the Deployments page `loading` state is `false` AND `items.length === 0`, THE Dashboard SHALL render the "No deployments." empty-state message and remove all skeleton items.
4. WHEN the Deployments page `loading` state is `false` AND `items.length > 0`, THE Dashboard SHALL render the real env summary cards and deployment list items and remove all skeleton items.

### Requirement 4: Team Page Skeleton

**User Story:** As a developer, I want to see skeleton member cards in each team section while the team roster is loading, so that the Owner / Collaborators / Contributors structure is visible immediately.

#### Acceptance Criteria

1. WHILE the Team page `loading` state is `true` AND `members.length === 0`, THE Dashboard SHALL render a skeleton placeholder in the Owner section.
2. WHILE the Team page `loading` state is `true` AND `members.length === 0`, THE Dashboard SHALL render 2 skeleton member cards in the Collaborators section grid.
3. WHILE the Team page `loading` state is `true` AND `members.length === 0`, THE Dashboard SHALL render 3 skeleton member cards in the Contributors section grid.
4. WHEN the Team page `loading` state is `false`, THE Dashboard SHALL remove all skeleton member cards regardless of `members.length`.
5. THE Team page `loading` state SHALL be initialised to `true` before the first fetch begins, matching the existing `setLoading(true)` call.

### Requirement 5: Project Overview Page Skeleton

**User Story:** As a developer, I want to see skeleton stat cards and a skeleton info panel while the project overview is loading, so that zeros never flash before real data arrives.

#### Acceptance Criteria

1. WHILE the Project Overview page `loading` state is `true`, THE Dashboard SHALL render 4 skeleton stat card placeholders in the 2×2 / 1×4 grid instead of the real `StatCard` components.
2. WHILE the Project Overview page `loading` state is `true`, THE Dashboard SHALL render a skeleton info panel placeholder instead of the glass info card.
3. WHEN the Project Overview page `loading` state transitions to `false`, THE Dashboard SHALL render the real `StatCard` components and the real info panel.
4. THE Project Overview page `loading` state SHALL be initialised to `true` so that no zero-value stats are ever rendered before data arrives.

### Requirement 6: Notifications Page Loading State

**User Story:** As a user, I want to see skeleton notification items while my notifications are loading, so that the page does not appear empty on first visit.

#### Acceptance Criteria

1. THE Notifications page SHALL declare a `loading` boolean state variable initialised to `true`.
2. THE Notifications page SHALL set `loading` to `false` in the `finally` block of the GitHub notifications fetch effect.
3. WHILE the Notifications page `loading` state is `true`, THE Dashboard SHALL render 4 skeleton notification list items.
4. WHEN the Notifications page `loading` state is `false` AND `items.length === 0` AND `invites.length === 0` AND the user is authenticated, THE Dashboard SHALL render the "No notifications yet." empty-state message.
5. WHEN the Notifications page `loading` state is `false` AND `items.length > 0`, THE Dashboard SHALL render the real notification list items and remove all skeleton items.

### Requirement 7: Settings Page — Departments and Members Skeletons

**User Story:** As a user, I want to see skeleton rows while departments and members are loading after I select an organisation, so that the lists do not flash empty before populating.

#### Acceptance Criteria

1. THE Settings page organisation-data fetch effect SHALL set a `loadingOrgData` boolean state to `true` before the Supabase queries execute and to `false` in the `finally` block.
2. WHILE `loadingOrgData` is `true` AND `selectedOrg` is non-null, THE Dashboard SHALL render 3 skeleton rows in the Departments list area.
3. WHILE `loadingOrgData` is `true` AND `selectedOrg` is non-null, THE Dashboard SHALL render 3 skeleton rows in the Members list area.
4. WHEN `loadingOrgData` is `false` AND `departments.length === 0`, THE Dashboard SHALL render the "No departments yet" empty-state text.
5. WHEN `loadingOrgData` is `false` AND `members.length === 0`, THE Dashboard SHALL render the "No members yet" empty-state text.

### Requirement 8: Project Settings — Sync Button Loading State

**User Story:** As a developer, I want the "Sync now" button to show a loading state while a sync is in progress, so that I receive clear feedback that the action was received.

#### Acceptance Criteria

1. THE Project Settings page SHALL declare a `syncing` boolean state variable initialised to `false`.
2. WHEN the Sync button is clicked, THE Project Settings page SHALL set `syncing` to `true`, call `emitSync(project.id)`, and set `syncing` to `false` after a 500 ms timeout.
3. WHILE `syncing` is `true`, THE Dashboard SHALL render the Sync button in a disabled state with a `Loader2` spinner and "Syncing…" label.
4. WHEN `syncing` is `false`, THE Dashboard SHALL render the Sync button enabled with the `RefreshCw` icon and "Sync now" label.

### Requirement 9: Skeleton Shape Fidelity

**User Story:** As a user, I want skeleton placeholders to visually approximate the real content they replace, so that the loading experience feels intentional rather than generic.

#### Acceptance Criteria

1. THE Dashboard SHALL use the existing `Skeleton` component from `@/components/ui/skeleton` for all new loading placeholders.
2. THE Dashboard SHALL NOT introduce any new npm dependencies to implement loading states.
3. WHEN rendering skeleton table rows, THE Dashboard SHALL match the column count and approximate column widths of the real table.
4. WHEN rendering skeleton card placeholders, THE Dashboard SHALL match the height, padding, and structural sections of the real cards they replace.
