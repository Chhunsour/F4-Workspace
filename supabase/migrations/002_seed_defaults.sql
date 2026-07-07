-- ============================================================
-- Uni Life — per-user seed helper
-- Call this function once per user to install the default subjects
-- + weekly class schedule. Safe to re-run (upserts by subject code).
-- ============================================================

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
  -- Insert each subject only if this user doesn't already have that code.
  -- (There is no unique(owner_id, code) constraint, so `on conflict` can't dedupe —
  --  guard with NOT EXISTS instead, otherwise re-running duplicates every subject.)
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

  -- weekly schedule: two study periods (17:30-19:00, 19:10-20:40) same subject Mon-Fri.
  -- only insert if user has no schedule yet.
  if not exists (select 1 from public.class_schedules where owner_id = uid) then
    -- Monday
    insert into public.class_schedules (owner_id, subject_id, weekday, start_time, end_time, room) values
      (uid, s_stcn202, 1, '17:30', '19:00', '401'),
      (uid, s_stcn202, 1, '19:10', '20:40', '401'),
    -- Tuesday
      (uid, s_stdd202, 2, '17:30', '19:00', '101'),
      (uid, s_stdd202, 2, '19:10', '20:40', '101'),
    -- Wednesday
      (uid, s_stbw202, 3, '17:30', '19:00', '401'),
      (uid, s_stbw202, 3, '19:10', '20:40', '101'),
    -- Thursday
      (uid, s_stds202, 4, '17:30', '19:00', '401'),
      (uid, s_stds202, 4, '19:10', '20:40', '101'),
    -- Friday
      (uid, s_stpw202, 5, '17:30', '19:00', '101'),
      (uid, s_stpw202, 5, '19:10', '20:40', '203');
  end if;
end $$;

grant execute on function public.seed_defaults_for(uuid) to authenticated;
