-- 2026-05-08: Backfill projects.org_id and populate project_team_members
-- Run in Supabase SQL editor or psql connected to your DB. This file is idempotent.

-- 1) Check which projects are missing org_id
-- SELECT id, github_repo_owner, org_id FROM projects WHERE org_id IS NULL LIMIT 100;

-- 2) Backfill projects.org_id by matching orgs.github_org_login to projects.github_repo_owner
BEGIN;

UPDATE projects
SET org_id = organizations.id
FROM organizations
WHERE projects.org_id IS NULL
  AND organizations.github_org_login IS NOT NULL
  AND lower(organizations.github_org_login) = lower(projects.github_repo_owner);

-- 3) Insert missing project_team_members for projects that now belong to an org
--    This links accepted org_members into project_team_members if not already present.
-- Note: some schemas do not have `created_at` on `project_team_members`.
-- Insert without `created_at` to be compatible with your DB.
INSERT INTO project_team_members (project_id, linked_user_id, github_login, name, avatar_url)
SELECT p.id, om.user_id, om.github_login, COALESCE(om.display_name, om.github_login), om.avatar_url
FROM projects p
JOIN org_members om ON om.org_id = p.org_id
WHERE p.org_id IS NOT NULL
  AND om.status = 'accepted'
  AND NOT EXISTS (
    SELECT 1 FROM project_team_members ptm
    WHERE ptm.project_id = p.id AND ptm.linked_user_id = om.user_id
  );

COMMIT;

-- 4) Optional sanity checks (run after migration):
-- SELECT count(*) FROM projects WHERE org_id IS NULL;
-- SELECT p.id, p.github_repo_owner, p.org_id, o.github_org_login
-- FROM projects p LEFT JOIN organizations o ON o.id = p.org_id
-- WHERE p.id = '<SAMPLE_PROJECT_ID>';

-- 5) Notes:
-- - This script is idempotent: running it multiple times will not create duplicate project_team_members
--   due to the NOT EXISTS guard.
-- - If you prefer not to populate `project_team_members`, you can skip step (3). The app now
--   reads accepted `org_members` for projects with `org_id` (Tasks/Team pages use `org_members`).
-- - If your `org_members` table is missing `display_name`, `github_login`, or `avatar_url` for
--   some rows (older invites), consider backfilling them from your users table or external source
--   before running step (3) so project_team_members gets reasonable display values.
