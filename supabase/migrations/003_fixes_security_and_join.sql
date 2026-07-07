-- ============================================================
-- Uni Life — migration 003
-- Fixes from the July 2026 audit:
--   1. Join-group-by-code was broken: groups_read RLS only lets
--      owners/members see a group row, so a non-member could never
--      look one up by code. A SECURITY DEFINER RPC does the lookup
--      + membership insert server-side without widening read access.
--   2. seed_defaults_for could be called with ANY uid. Now guarded.
--   3. comments/reactions were readable by every authenticated user
--      (`using (true)`). Now scoped to people who can see the target.
--   4. profiles.weekly_goal_minutes so the study goal survives reload.
-- Run in the Supabase SQL editor after 001 and 002.
-- ============================================================

-- ---------- 1. join group by code ----------
create or replace function public.join_group_by_code(code text)
returns public.groups
language plpgsql
security definer
set search_path = public as $$
declare
  g public.groups;
begin
  if auth.uid() is null then
    raise exception 'Not signed in';
  end if;
  select * into g from public.groups
  where join_code = upper(trim(code));
  if g.id is null then
    raise exception 'No group found for that code';
  end if;
  insert into public.group_members (group_id, user_id, role)
  values (g.id, auth.uid(), 'member')
  on conflict (group_id, user_id) do nothing;
  return g;
end $$;

revoke all on function public.join_group_by_code(text) from public, anon;
grant execute on function public.join_group_by_code(text) to authenticated;

-- ---------- 2. harden seed_defaults_for ----------
-- Same body as 002, plus: you can only seed your own account.
create or replace function public.seed_defaults_for(uid uuid)
returns void
language plpgsql
security definer
set search_path = public as $$
declare
  s_stcn202 uuid;
  s_stdd202 uuid;
  s_stbw202 uuid;
  s_stds202 uuid;
  s_stpw202 uuid;
begin
  if uid is distinct from auth.uid() then
    raise exception 'Can only seed your own account';
  end if;

  if not exists (select 1 from public.subjects where owner_id=uid and code='STCN202') then
    insert into public.subjects (owner_id, name, code, lecturer, color)
    values (uid, 'Cisco Computer Network II', 'STCN202', 'Mr. EN Leang E', '#3a68ff');
  end if;
  select id into s_stcn202 from public.subjects where owner_id=uid and code='STCN202' limit 1;

  if not exists (select 1 from public.subjects where owner_id=uid and code='STDD202') then
    insert into public.subjects (owner_id, name, code, lecturer, color)
    values (uid, 'Database Design with PostgreSQL', 'STDD202', 'Mrs. LONG Chenda', '#22c55e');
  end if;
  select id into s_stdd202 from public.subjects where owner_id=uid and code='STDD202' limit 1;

  if not exists (select 1 from public.subjects where owner_id=uid and code='STBW202') then
    insert into public.subjects (owner_id, name, code, lecturer, color)
    values (uid, 'Modern Frontend Web Development', 'STBW202', 'Mrs. KRY Saven', '#ec4899');
  end if;
  select id into s_stbw202 from public.subjects where owner_id=uid and code='STBW202' limit 1;

  if not exists (select 1 from public.subjects where owner_id=uid and code='STDS202') then
    insert into public.subjects (owner_id, name, code, lecturer, color)
    values (uid, 'Data Structure and Algorithms', 'STDS202', 'Mr. KIM Sothy', '#f59a06');
  end if;
  select id into s_stds202 from public.subjects where owner_id=uid and code='STDS202' limit 1;

  if not exists (select 1 from public.subjects where owner_id=uid and code='STPW202') then
    insert into public.subjects (owner_id, name, code, lecturer, color)
    values (uid, 'Python in Web Development', 'STPW202', 'Mr. SVAY Chumkongkear', '#8b5cf6');
  end if;
  select id into s_stpw202 from public.subjects where owner_id=uid and code='STPW202' limit 1;

  if not exists (select 1 from public.class_schedules where owner_id = uid) then
    insert into public.class_schedules (owner_id, subject_id, weekday, start_time, end_time, room) values
      (uid, s_stcn202, 1, '17:30', '19:00', '401'),
      (uid, s_stcn202, 1, '19:10', '20:40', '401'),
      (uid, s_stdd202, 2, '17:30', '19:00', '101'),
      (uid, s_stdd202, 2, '19:10', '20:40', '101'),
      (uid, s_stbw202, 3, '17:30', '19:00', '401'),
      (uid, s_stbw202, 3, '19:10', '20:40', '101'),
      (uid, s_stds202, 4, '17:30', '19:00', '401'),
      (uid, s_stds202, 4, '19:10', '20:40', '101'),
      (uid, s_stpw202, 5, '17:30', '19:00', '101'),
      (uid, s_stpw202, 5, '19:10', '20:40', '203');
  end if;
end $$;

-- ---------- 3. scope comments + reactions to target access ----------
-- Who can see the thing a comment/reaction is attached to?
create or replace function public.can_access_target(t_type text, t_id uuid, uid uuid)
returns boolean
language plpgsql
stable
security definer
set search_path = public as $$
begin
  return case t_type
    when 'project' then
      public.is_project_member(t_id, uid)
    when 'project_task' then
      exists (select 1 from public.project_tasks pt
              where pt.id = t_id and public.is_project_member(pt.project_id, uid))
    when 'memory' then
      exists (select 1 from public.memories m
              where m.id = t_id
                and (m.owner_id = uid
                     or (m.group_id is not null and public.is_group_member(m.group_id, uid))))
    when 'assignment' then
      exists (select 1 from public.assignments a where a.id = t_id and a.owner_id = uid)
    when 'note' then
      exists (select 1 from public.notes n where n.id = t_id and n.owner_id = uid)
    when 'comment' then
      exists (select 1 from public.comments c
              where c.id = t_id and public.can_access_target(c.target_type, c.target_id, uid))
    else false
  end;
end $$;

drop policy if exists "comments_read"  on public.comments;
drop policy if exists "comments_write" on public.comments;
create policy "comments_read" on public.comments for select to authenticated
  using (owner_id = auth.uid()
         or public.can_access_target(target_type, target_id, auth.uid()));
create policy "comments_write" on public.comments for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
              and public.can_access_target(target_type, target_id, auth.uid()));

drop policy if exists "reactions_read"  on public.reactions;
drop policy if exists "reactions_write" on public.reactions;
create policy "reactions_read" on public.reactions for select to authenticated
  using (owner_id = auth.uid()
         or public.can_access_target(target_type, target_id, auth.uid()));
create policy "reactions_write" on public.reactions for all to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid()
              and public.can_access_target(target_type, target_id, auth.uid()));

-- ---------- 4. persistent weekly study goal ----------
alter table public.profiles
  add column if not exists weekly_goal_minutes int not null default 600;

-- NOTE (reviewed, deliberately unchanged): the avatars/memories storage
-- buckets stay public-read. Making them private requires signed URLs
-- throughout the client; URLs are UUID-based and unguessable, which is
-- an accepted tradeoff for this private friend-group app for now.
