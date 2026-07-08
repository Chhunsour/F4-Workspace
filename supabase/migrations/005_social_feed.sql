-- ============================================================
-- Uni Life — social feed extensions (Memory page redesign)
-- One shared friend-group feed: every authenticated member sees every post.
-- Apply in the Supabase SQL editor after 004.
-- ============================================================

-- ---------- 1. One shared feed: relax memory read to any member ----------
-- Posts stay editable/deletable by their owner only (memories_write unchanged);
-- reading is opened to the whole signed-in friend group.
drop policy if exists "memories_read" on public.memories;
create policy "memories_read"
  on public.memories for select
  to authenticated
  using (true);

drop policy if exists "memory_images_read" on public.memory_images;
create policy "memory_images_read"
  on public.memory_images for select
  to authenticated
  using (true);
-- memory_images_write stays owner-only (piggybacks on parent memory).

-- ---------- 2. Comment replies (threading) ----------
alter table public.comments
  add column if not exists parent_id uuid references public.comments(id) on delete cascade;
create index if not exists idx_comments_parent on public.comments(parent_id, created_at);

-- ---------- 3. Feeling / status chip on a post (optional) ----------
alter table public.memories
  add column if not exists mood text;

-- ---------- 4. Per-viewer saved posts ----------
-- (memories.is_favorite is owner-only; saving *someone else's* post needs this.)
create table if not exists public.saved_memories (
  user_id    uuid not null references public.profiles(id) on delete cascade,
  memory_id  uuid not null references public.memories(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, memory_id)
);
create index if not exists idx_saved_memories_user on public.saved_memories(user_id, created_at desc);

alter table public.saved_memories enable row level security;
drop policy if exists "saved_memories_rw" on public.saved_memories;
create policy "saved_memories_rw" on public.saved_memories for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());
