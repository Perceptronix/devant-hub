-- ============================================================
-- DevANT — Realtime publication + invite-accept linking
-- Run this in Supabase SQL Editor.
-- ============================================================

-- 1) Enable Supabase Realtime on shared collaboration tables.
--    `add table` is idempotent-ish: it errors if already added, so we wrap.
do $$
declare
  t text;
begin
  for t in select unnest(array[
    'tasks','messages','projects','org_members','notifications',
    'commits','deployments','pull_requests','issues','project_team_members'
  ]) loop
    begin
      execute format('alter publication supabase_realtime add table public.%I', t);
    exception when duplicate_object then null;
    end;
  end loop;
end $$;

-- Make REPLICA IDENTITY FULL so DELETE/UPDATE payloads include old row data
alter table public.tasks    replica identity full;
alter table public.messages replica identity full;

-- 2) Atomic invite-accept RPC: marks org_members row accepted,
--    fills profile fields, AND links project_team_members.linked_user_id
--    so the new member shows up in every project's GitHub team list and
--    can be assigned tasks immediately.
create or replace function public.accept_org_invite(
  _token         text,
  _display_name  text,
  _github_login  text,
  _avatar_url    text
) returns table(org_id uuid, org_slug text, org_name text)
language plpgsql
security definer
set search_path = public
as $$
declare
  _row record;
begin
  if auth.uid() is null then
    raise exception 'Not authenticated';
  end if;

  -- Find the pending invite by token
  select om.id, om.org_id, om.invited_email, om.status
    into _row
  from public.org_members om
  where om.invite_token = _token
  limit 1;

  if not found then
    raise exception 'Invite not found';
  end if;

  if _row.status = 'accepted' then
    -- idempotent: just return org info
    return query
      select o.id, o.slug, o.name
      from public.organizations o
      where o.id = _row.org_id;
    return;
  end if;

  -- Update the membership row
  update public.org_members
     set status       = 'accepted',
         user_id      = auth.uid(),
         joined_at    = now(),
         display_name = coalesce(_display_name, display_name),
         github_login = coalesce(_github_login, github_login),
         avatar_url   = coalesce(_avatar_url,   avatar_url)
   where id = _row.id;

  -- Link project_team_members rows for this org's projects whose
  -- github_login matches the new member.
  if _github_login is not null and length(_github_login) > 0 then
    update public.project_team_members ptm
       set linked_user_id = auth.uid()
      from public.projects p
     where ptm.project_id = p.id
       and p.org_id       = _row.org_id
       and lower(ptm.github_login) = lower(_github_login)
       and ptm.linked_user_id is null;
  end if;

  return query
    select o.id, o.slug, o.name
    from public.organizations o
    where o.id = _row.org_id;
end
$$;

grant execute on function public.accept_org_invite(text, text, text, text) to authenticated;
