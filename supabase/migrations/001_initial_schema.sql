-- ============================================================
-- Uni Life — initial schema
-- Run this in your Supabase SQL editor as the first migration.
-- ============================================================

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ---------- helpers ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end $$;

-- ============================================================
-- profiles
-- 1:1 with auth.users; created via trigger on auth.users insert.
-- ============================================================
create table if not exists public.profiles (
  id             uuid primary key references auth.users(id) on delete cascade,
  full_name      text,
  university_id  text,
  major          text,
  year           int,
  bio            text,
  avatar_url     text,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create trigger trg_profiles_updated
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create profile row on signup.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''));
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================
-- groups + members  (must exist before objects that reference group_id)
-- ============================================================
create table if not exists public.groups (
  id           uuid primary key default uuid_generate_v4(),
  name         text not null,
  description  text,
  join_code    text unique not null default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_groups_owner on public.groups(owner_id);
create trigger trg_groups_updated before update on public.groups
  for each row execute function public.set_updated_at();

create table if not exists public.group_members (
  group_id   uuid not null references public.groups(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  role       text not null default 'member' check (role in ('owner','admin','member')),
  joined_at  timestamptz not null default now(),
  primary key (group_id, user_id)
);
create index if not exists idx_group_members_user on public.group_members(user_id);

-- ============================================================
-- subjects  (personal or group-shared)
-- ============================================================
create table if not exists public.subjects (
  id            uuid primary key default uuid_generate_v4(),
  owner_id      uuid not null references public.profiles(id) on delete cascade,
  group_id      uuid references public.groups(id) on delete set null,
  name          text not null,
  code          text,
  lecturer      text,
  color         text not null default '#3a68ff',
  icon          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists idx_subjects_owner on public.subjects(owner_id);
create index if not exists idx_subjects_group on public.subjects(group_id);
create trigger trg_subjects_updated before update on public.subjects
  for each row execute function public.set_updated_at();

-- ============================================================
-- class_schedules  (weekly)
-- weekday: 0=Sun ... 6=Sat
-- ============================================================
create table if not exists public.class_schedules (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete set null,
  weekday      int not null check (weekday between 0 and 6),
  start_time   time not null,
  end_time     time not null,
  room         text,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_class_schedules_owner  on public.class_schedules(owner_id);
create index if not exists idx_class_schedules_weekday on public.class_schedules(owner_id, weekday);
create trigger trg_class_schedules_updated before update on public.class_schedules
  for each row execute function public.set_updated_at();

-- ============================================================
-- assignments
-- ============================================================
create table if not exists public.assignments (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete set null,
  title        text not null,
  description  text,
  due_date     date,
  due_time     time,
  priority     text not null default 'normal' check (priority in ('low','normal','high','urgent')),
  status       text not null default 'todo'   check (status in ('todo','in_progress','review','completed')),
  progress     int not null default 0 check (progress between 0 and 100),
  completed_at timestamptz,
  attachments  jsonb not null default '[]'::jsonb,
  notes        text,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_assignments_owner on public.assignments(owner_id);
create index if not exists idx_assignments_due   on public.assignments(owner_id, due_date);
create index if not exists idx_assignments_status on public.assignments(owner_id, status);
create trigger trg_assignments_updated before update on public.assignments
  for each row execute function public.set_updated_at();

-- ============================================================
-- projects
-- ============================================================
create table if not exists public.projects (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  group_id     uuid references public.groups(id) on delete set null,
  subject_id   uuid references public.subjects(id) on delete set null,
  name         text not null,
  description  text,
  color        text default '#3a68ff',
  deadline     date,
  status       text not null default 'active' check (status in ('active','on_hold','completed','archived')),
  progress     int not null default 0 check (progress between 0 and 100),
  links        jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_projects_owner on public.projects(owner_id);
create index if not exists idx_projects_group on public.projects(group_id);
create trigger trg_projects_updated before update on public.projects
  for each row execute function public.set_updated_at();

create table if not exists public.project_members (
  project_id  uuid not null references public.projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  role        text not null default 'member' check (role in ('owner','editor','member','viewer')),
  joined_at   timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists idx_project_members_user on public.project_members(user_id);

create table if not exists public.project_tasks (
  id           uuid primary key default uuid_generate_v4(),
  project_id   uuid not null references public.projects(id) on delete cascade,
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  assignee_id  uuid references public.profiles(id) on delete set null,
  title        text not null,
  description  text,
  status       text not null default 'todo' check (status in ('todo','in_progress','review','completed')),
  position     int not null default 0,
  due_date     date,
  checklist    jsonb not null default '[]'::jsonb,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_project_tasks_project on public.project_tasks(project_id);
create index if not exists idx_project_tasks_status  on public.project_tasks(project_id, status, position);
create trigger trg_project_tasks_updated before update on public.project_tasks
  for each row execute function public.set_updated_at();

-- ============================================================
-- memories + images
-- ============================================================
create table if not exists public.memories (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  group_id     uuid references public.groups(id) on delete set null,
  subject_id   uuid references public.subjects(id) on delete set null,
  title        text,
  caption      text,
  event_date   date,
  album        text,
  tagged_users uuid[] not null default '{}',
  is_favorite  boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_memories_owner on public.memories(owner_id, event_date desc);
create index if not exists idx_memories_group on public.memories(group_id, event_date desc);
create index if not exists idx_memories_album on public.memories(owner_id, album);
create trigger trg_memories_updated before update on public.memories
  for each row execute function public.set_updated_at();

create table if not exists public.memory_images (
  id           uuid primary key default uuid_generate_v4(),
  memory_id    uuid not null references public.memories(id) on delete cascade,
  storage_path text not null,
  width        int,
  height       int,
  size_bytes   int,
  position     int not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists idx_memory_images_memory on public.memory_images(memory_id, position);

-- ============================================================
-- comments (polymorphic: assignment | project | project_task | memory | note)
-- ============================================================
create table if not exists public.comments (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  target_type  text not null check (target_type in ('assignment','project','project_task','memory','note')),
  target_id    uuid not null,
  body         text not null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_comments_target on public.comments(target_type, target_id, created_at);
create trigger trg_comments_updated before update on public.comments
  for each row execute function public.set_updated_at();

-- ============================================================
-- reactions (target polymorphic; one emoji per user per target)
-- ============================================================
create table if not exists public.reactions (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  target_type  text not null check (target_type in ('memory','comment','project_task','assignment')),
  target_id    uuid not null,
  emoji        text not null,
  created_at   timestamptz not null default now(),
  unique (owner_id, target_type, target_id, emoji)
);
create index if not exists idx_reactions_target on public.reactions(target_type, target_id);

-- ============================================================
-- study_sessions
-- ============================================================
create table if not exists public.study_sessions (
  id             uuid primary key default uuid_generate_v4(),
  owner_id       uuid not null references public.profiles(id) on delete cascade,
  subject_id     uuid references public.subjects(id) on delete set null,
  topic          text,
  notes          text,
  started_at     timestamptz not null default now(),
  ended_at       timestamptz,
  duration_seconds int not null default 0,
  is_focus_mode  boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index if not exists idx_study_sessions_owner on public.study_sessions(owner_id, started_at desc);
create trigger trg_study_sessions_updated before update on public.study_sessions
  for each row execute function public.set_updated_at();

-- ============================================================
-- notes
-- ============================================================
create table if not exists public.notes (
  id           uuid primary key default uuid_generate_v4(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  subject_id   uuid references public.subjects(id) on delete set null,
  project_id   uuid references public.projects(id) on delete set null,
  title        text,
  body         text not null default '',
  color        text default '#ffffff',
  tags         text[] not null default '{}',
  is_pinned    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists idx_notes_owner   on public.notes(owner_id, is_pinned desc, updated_at desc);
create index if not exists idx_notes_project on public.notes(project_id);
create index if not exists idx_notes_search  on public.notes using gin (to_tsvector('simple', coalesce(title,'') || ' ' || coalesce(body,'')));
create trigger trg_notes_updated before update on public.notes
  for each row execute function public.set_updated_at();

-- ============================================================
-- notifications
-- ============================================================
create table if not exists public.notifications (
  id           uuid primary key default uuid_generate_v4(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  kind         text not null,
  title        text not null,
  body         text,
  target_type  text,
  target_id    uuid,
  is_read      boolean not null default false,
  created_at   timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, is_read, created_at desc);

-- ============================================================
-- membership helper (SECURITY DEFINER avoids RLS recursion)
-- ============================================================
create or replace function public.is_group_member(gid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.group_members where group_id = gid and user_id = uid
  );
$$;

create or replace function public.is_project_member(pid uuid, uid uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.project_members where project_id = pid and user_id = uid
  ) or exists (
    select 1 from public.projects p
    where p.id = pid
      and (p.owner_id = uid
           or (p.group_id is not null and public.is_group_member(p.group_id, uid)))
  );
$$;

-- ============================================================
-- Enable RLS
-- ============================================================
alter table public.profiles         enable row level security;
alter table public.subjects         enable row level security;
alter table public.class_schedules  enable row level security;
alter table public.assignments      enable row level security;
alter table public.projects         enable row level security;
alter table public.project_members  enable row level security;
alter table public.project_tasks    enable row level security;
alter table public.memories         enable row level security;
alter table public.memory_images    enable row level security;
alter table public.comments         enable row level security;
alter table public.reactions        enable row level security;
alter table public.study_sessions   enable row level security;
alter table public.notes            enable row level security;
alter table public.groups           enable row level security;
alter table public.group_members    enable row level security;
alter table public.notifications    enable row level security;

-- ============================================================
-- Policies
-- ============================================================

-- profiles: everyone signed in can read basic profile, only owner writes
drop policy if exists "profiles_read"   on public.profiles;
drop policy if exists "profiles_update" on public.profiles;
drop policy if exists "profiles_insert" on public.profiles;

create policy "profiles_read"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_insert"
  on public.profiles for insert
  to authenticated
  with check (id = auth.uid());

create policy "profiles_update"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

-- subjects: owner or same group
drop policy if exists "subjects_rw" on public.subjects;
create policy "subjects_rw"
  on public.subjects for all
  to authenticated
  using (owner_id = auth.uid()
         or (group_id is not null and public.is_group_member(group_id, auth.uid())))
  with check (owner_id = auth.uid());

-- class_schedules: private
drop policy if exists "class_schedules_rw" on public.class_schedules;
create policy "class_schedules_rw"
  on public.class_schedules for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- assignments: private
drop policy if exists "assignments_rw" on public.assignments;
create policy "assignments_rw"
  on public.assignments for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- projects: owner OR project member OR same group
drop policy if exists "projects_read"   on public.projects;
drop policy if exists "projects_insert" on public.projects;
drop policy if exists "projects_update" on public.projects;
drop policy if exists "projects_delete" on public.projects;

create policy "projects_read"
  on public.projects for select
  to authenticated
  using (owner_id = auth.uid()
         or public.is_project_member(id, auth.uid())
         or (group_id is not null and public.is_group_member(group_id, auth.uid())));

create policy "projects_insert"
  on public.projects for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy "projects_update"
  on public.projects for update
  to authenticated
  using (owner_id = auth.uid() or public.is_project_member(id, auth.uid()))
  with check (owner_id = auth.uid() or public.is_project_member(id, auth.uid()));

create policy "projects_delete"
  on public.projects for delete
  to authenticated
  using (owner_id = auth.uid());

-- project_members: readable to any member, owner manages
drop policy if exists "project_members_read"   on public.project_members;
drop policy if exists "project_members_write"  on public.project_members;

create policy "project_members_read"
  on public.project_members for select
  to authenticated
  using (public.is_project_member(project_id, auth.uid()));

create policy "project_members_write"
  on public.project_members for all
  to authenticated
  using (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()))
  with check (exists (select 1 from public.projects p where p.id = project_id and p.owner_id = auth.uid()));

-- project_tasks: any project member
drop policy if exists "project_tasks_rw" on public.project_tasks;
create policy "project_tasks_rw"
  on public.project_tasks for all
  to authenticated
  using (public.is_project_member(project_id, auth.uid()))
  with check (public.is_project_member(project_id, auth.uid()));

-- memories: owner OR group member (if shared)
drop policy if exists "memories_read"   on public.memories;
drop policy if exists "memories_write"  on public.memories;
create policy "memories_read"
  on public.memories for select
  to authenticated
  using (owner_id = auth.uid()
         or (group_id is not null and public.is_group_member(group_id, auth.uid())));
create policy "memories_write"
  on public.memories for all
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

-- memory_images: piggyback on parent memory
drop policy if exists "memory_images_read"  on public.memory_images;
drop policy if exists "memory_images_write" on public.memory_images;
create policy "memory_images_read"
  on public.memory_images for select
  to authenticated
  using (exists (
    select 1 from public.memories m
    where m.id = memory_id
      and (m.owner_id = auth.uid()
           or (m.group_id is not null and public.is_group_member(m.group_id, auth.uid())))
  ));
create policy "memory_images_write"
  on public.memory_images for all
  to authenticated
  using (exists (select 1 from public.memories m where m.id = memory_id and m.owner_id = auth.uid()))
  with check (exists (select 1 from public.memories m where m.id = memory_id and m.owner_id = auth.uid()));

-- comments + reactions: readable by anyone who can read the target; writable by author
drop policy if exists "comments_read"  on public.comments;
drop policy if exists "comments_write" on public.comments;
create policy "comments_read"  on public.comments for select to authenticated using (true);
create policy "comments_write" on public.comments for all    to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "reactions_read"  on public.reactions;
drop policy if exists "reactions_write" on public.reactions;
create policy "reactions_read"  on public.reactions for select to authenticated using (true);
create policy "reactions_write" on public.reactions for all    to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- study_sessions + notes: private
drop policy if exists "study_sessions_rw" on public.study_sessions;
create policy "study_sessions_rw" on public.study_sessions for all
  to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "notes_rw" on public.notes;
create policy "notes_rw" on public.notes for all
  to authenticated using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- groups: members can read; only owner updates/deletes; any authed user can insert
drop policy if exists "groups_read"   on public.groups;
drop policy if exists "groups_insert" on public.groups;
drop policy if exists "groups_update" on public.groups;
drop policy if exists "groups_delete" on public.groups;

create policy "groups_read"   on public.groups for select to authenticated
  using (owner_id = auth.uid() or public.is_group_member(id, auth.uid()));
create policy "groups_insert" on public.groups for insert to authenticated
  with check (owner_id = auth.uid());
create policy "groups_update" on public.groups for update to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "groups_delete" on public.groups for delete to authenticated
  using (owner_id = auth.uid());

-- group_members: members can read; the joining user can insert themselves; owner can remove
drop policy if exists "group_members_read"    on public.group_members;
drop policy if exists "group_members_insert"  on public.group_members;
drop policy if exists "group_members_delete"  on public.group_members;

create policy "group_members_read" on public.group_members for select to authenticated
  using (public.is_group_member(group_id, auth.uid())
         or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy "group_members_insert" on public.group_members for insert to authenticated
  with check (user_id = auth.uid()
              or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));
create policy "group_members_delete" on public.group_members for delete to authenticated
  using (user_id = auth.uid()
         or exists (select 1 from public.groups g where g.id = group_id and g.owner_id = auth.uid()));

-- notifications: owner only
drop policy if exists "notifications_rw" on public.notifications;
create policy "notifications_rw" on public.notifications for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ============================================================
-- Storage buckets (avatars + memories)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('avatars',  'avatars',  true)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public)
values ('memories', 'memories', true)
on conflict (id) do nothing;

-- Storage policies: authenticated user can write to a folder named with their uid.
drop policy if exists "avatars_read"   on storage.objects;
drop policy if exists "avatars_write"  on storage.objects;
drop policy if exists "memories_read"  on storage.objects;
drop policy if exists "memories_write" on storage.objects;

create policy "avatars_read"
  on storage.objects for select
  to public
  using (bucket_id = 'avatars');

create policy "avatars_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'avatars' and (storage.foldername(name))[1] = auth.uid()::text);

create policy "memories_read"
  on storage.objects for select
  to public
  using (bucket_id = 'memories');

create policy "memories_write"
  on storage.objects for all
  to authenticated
  using (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text)
  with check (bucket_id = 'memories' and (storage.foldername(name))[1] = auth.uid()::text);
