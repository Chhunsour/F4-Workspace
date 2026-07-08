-- ============================================================
-- 006 academic_events
--   One-time academic events: exams, final exams, presentations.
--   Weekly recurring classes stay in class_schedules (untouched) so
--   existing timetables keep working. Also adds an optional `teacher`
--   column to class_schedules.
-- ============================================================

-- Per-class teacher (optional). Existing rows get NULL.
alter table public.class_schedules add column if not exists teacher text;

create table if not exists public.academic_events (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  type         text not null check (type in ('exam','final_exam','presentation')),
  title        text,
  subject_id   uuid references public.subjects(id) on delete set null,
  project_id   uuid references public.projects(id) on delete set null,
  event_date   date not null,
  start_time   time,
  end_time     time,
  room         text,
  seat         text,
  team_members uuid[] not null default '{}',
  notes        text,
  reminder_at  timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index if not exists idx_academic_events_owner on public.academic_events(owner_id);
create index if not exists idx_academic_events_date  on public.academic_events(owner_id, event_date);

create trigger trg_academic_events_updated before update on public.academic_events
  for each row execute function public.set_updated_at();

-- RLS: private to the owner, same shape as class_schedules.
alter table public.academic_events enable row level security;
drop policy if exists "academic_events_rw" on public.academic_events;
create policy "academic_events_rw"
  on public.academic_events for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
