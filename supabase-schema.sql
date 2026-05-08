-- DevANT schema. Run this in your external Supabase SQL editor.
-- All tables have RLS enabled; policies scope access via org_members membership.

create extension if not exists "pgcrypto";

-- ----------------- Organizations -----------------
create table if not exists public.organizations (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  avatar_url text,
  github_org_login text,
  owner_id uuid references auth.users(id) on delete set null,
  created_at timestamptz default now()
);
alter table public.organizations enable row level security;

create table if not exists public.org_members (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('owner','admin','member')) default 'member',
  joined_at timestamptz default now(),
  unique(org_id, user_id)
);
alter table public.org_members enable row level security;

-- Helper: is user a member of org?
create or replace function public.is_org_member(_org uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.org_members where org_id = _org and user_id = _user);
$$;

-- Helper: is user a member of the project's organization, or the project creator?
create or replace function public.is_project_member(_project uuid, _user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists(
    select 1
    from public.projects p
    where p.id = _project and (
      p.created_by = _user or
      (p.org_id is not null and public.is_org_member(p.org_id, _user))
    )
  );
$$;

drop policy if exists "members read org" on public.organizations;
create policy "members read org" on public.organizations
  for select using (public.is_org_member(id, auth.uid()) or owner_id = auth.uid());
drop policy if exists "owner manages org" on public.organizations;
create policy "owner manages org" on public.organizations
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "self read membership" on public.org_members;
create policy "self read membership" on public.org_members
  for select using (user_id = auth.uid() or public.is_org_member(org_id, auth.uid()));

-- ----------------- Departments -----------------
create table if not exists public.departments (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  name text not null,
  description text,
  color text,
  icon text,
  created_at timestamptz default now()
);
alter table public.departments enable row level security;
drop policy if exists "org members read depts" on public.departments;
create policy "org members read depts" on public.departments
  for select using (public.is_org_member(org_id, auth.uid()));

create table if not exists public.dept_members (
  id uuid primary key default gen_random_uuid(),
  dept_id uuid references public.departments(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  role text check (role in ('lead','member')) default 'member',
  unique(dept_id, user_id)
);
alter table public.dept_members enable row level security;

-- ----------------- Projects -----------------
create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  org_id uuid references public.organizations(id) on delete cascade,
  dept_id uuid references public.departments(id),
  name text not null,
  description text,
  github_repo_owner text not null,
  github_repo_name text not null,
  github_repo_id bigint,
  default_branch text default 'main',
  is_private boolean default false,
  webhook_id bigint,
  webhook_secret text,
  last_synced_at timestamptz,
  created_by uuid references auth.users(id),
  created_at timestamptz default now()
);
alter table public.projects enable row level security;
drop policy if exists "org members read projects" on public.projects;
create policy "org members read projects" on public.projects
  for select using (public.is_org_member(org_id, auth.uid()));

-- Allow users to create personal imported projects and read their own projects.
drop policy if exists "users insert projects" on public.projects;
create policy "users insert projects" on public.projects
  for insert with check (created_by = auth.uid());

drop policy if exists "users read own projects" on public.projects;
create policy "users read own projects" on public.projects
  for select using (created_by = auth.uid() or public.is_org_member(org_id, auth.uid()));

drop policy if exists "users manage own projects" on public.projects;
create policy "users manage own projects" on public.projects
  for all using (created_by = auth.uid()) with check (created_by = auth.uid());

-- ----------------- Project team members (from GitHub) -----------------
create table if not exists public.project_team_members (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  github_login text not null,
  github_user_id bigint,
  avatar_url text,
  name text,
  role text check (role in ('owner','collaborator','contributor')) not null,
  contributions_count integer default 0,
  lines_added integer default 0,
  lines_removed integer default 0,
  linked_user_id uuid references auth.users(id),
  unique(project_id, github_login)
);
alter table public.project_team_members enable row level security;
drop policy if exists "project members read team members" on public.project_team_members;
create policy "project members read team members" on public.project_team_members
  for select using (public.is_project_member(project_id, auth.uid()));

-- ----------------- Commits -----------------
create table if not exists public.commits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  sha text not null,
  message text,
  author_name text,
  author_email text,
  author_github_login text,
  authored_at timestamptz,
  committed_at timestamptz,
  additions integer default 0,
  deletions integer default 0,
  files_changed integer default 0,
  patch_data jsonb,
  ai_summary text,
  ai_tags text[],
  parents jsonb,
  url text,
  unique(project_id, sha)
);
alter table public.commits enable row level security;

-- ----------------- Deployments -----------------
create table if not exists public.deployments (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  github_deployment_id bigint,
  environment text,
  sha text,
  ref text,
  task text,
  status text,
  description text,
  creator_login text,
  created_at timestamptz,
  updated_at timestamptz,
  deployment_url text,
  unique(project_id, github_deployment_id)
);
alter table public.deployments enable row level security;

-- ----------------- Pull Requests -----------------
create table if not exists public.pull_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  github_pr_number integer not null,
  title text,
  body text,
  state text,
  author_login text,
  head_sha text,
  base_branch text,
  head_branch text,
  additions integer default 0,
  deletions integer default 0,
  changed_files integer default 0,
  merged_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  labels jsonb,
  reviewers jsonb,
  unique(project_id, github_pr_number)
);
alter table public.pull_requests enable row level security;

-- ----------------- Issues -----------------
create table if not exists public.issues (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  github_issue_number integer not null,
  title text,
  body text,
  state text,
  author_login text,
  assignees jsonb,
  labels jsonb,
  milestone text,
  closed_at timestamptz,
  created_at timestamptz,
  updated_at timestamptz,
  unique(project_id, github_issue_number)
);
alter table public.issues enable row level security;

-- ----------------- Tasks (internal) -----------------
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  created_by uuid references auth.users(id),
  assigned_to uuid references auth.users(id),
  title text not null,
  description text,
  status text check (status in ('todo','in_progress','in_review','done')) default 'todo',
  priority text check (priority in ('low','medium','high','critical')) default 'medium',
  due_date date,
  linked_commit_sha text,
  linked_pr_number integer,
  linked_issue_number integer,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);
alter table public.tasks enable row level security;
drop policy if exists "project members read tasks" on public.tasks;
create policy "project members read tasks" on public.tasks
  for select using (public.is_project_member(project_id, auth.uid()));
drop policy if exists "project members write tasks" on public.tasks;
create policy "project members write tasks" on public.tasks
  for all using (public.is_project_member(project_id, auth.uid())) with check (public.is_project_member(project_id, auth.uid()));

create table if not exists public.task_permissions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  user_id uuid references auth.users(id),
  can_assign boolean default false,
  can_create boolean default false,
  can_edit boolean default false,
  granted_by uuid references auth.users(id),
  unique(project_id, user_id)
);
alter table public.task_permissions enable row level security;

-- ----------------- Messages (per project chat) -----------------
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  sender_id uuid references auth.users(id),
  content text not null,
  message_type text default 'text',
  reply_to uuid references public.messages(id),
  created_at timestamptz default now()
);
alter table public.messages enable row level security;
drop policy if exists "project members read messages" on public.messages;
create policy "project members read messages" on public.messages
  for select using (public.is_project_member(project_id, auth.uid()));
drop policy if exists "project members insert messages" on public.messages;
create policy "project members insert messages" on public.messages
  for insert with check (sender_id = auth.uid() and public.is_project_member(project_id, auth.uid()));

-- ----------------- Notifications -----------------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  type text not null,
  title text,
  body text,
  data jsonb,
  read boolean default false,
  created_at timestamptz default now()
);
alter table public.notifications enable row level security;
drop policy if exists "self read notifications" on public.notifications;
create policy "self read notifications" on public.notifications
  for select using (user_id = auth.uid());
drop policy if exists "self update notifications" on public.notifications;
create policy "self update notifications" on public.notifications
  for update using (user_id = auth.uid());

-- ----------------- DORA cache -----------------
create table if not exists public.dora_metrics (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id) on delete cascade,
  period_start date,
  period_end date,
  deployment_frequency numeric,
  lead_time_hours numeric,
  change_failure_rate numeric,
  mean_time_to_restore_hours numeric,
  computed_at timestamptz default now(),
  unique(project_id, period_start, period_end)
);
alter table public.dora_metrics enable row level security;

-- ----------------- Webhook events log -----------------
create table if not exists public.webhook_events (
  id uuid primary key default gen_random_uuid(),
  project_id uuid references public.projects(id),
  event_type text,
  delivery_id text,
  payload jsonb,
  processed boolean default false,
  received_at timestamptz default now()
);
alter table public.webhook_events enable row level security;

-- Generic project-scoped read policy template — re-create for each table that needs it.
-- Example for commits:
drop policy if exists "org members read commits" on public.commits;
create policy "org members read commits" on public.commits for select
  using (exists (
    select 1 from public.projects p
    where p.id = commits.project_id and public.is_org_member(p.org_id, auth.uid())
  ));
-- Apply same shape to deployments, pull_requests, issues, tasks, messages, project_team_members, dora_metrics.
