-- ============================================================
-- Uni Life — migration 004
-- Turns the (previously unused) notifications table into a real
-- feature. Server-side triggers write notifications so RLS can stay
-- owner-only; the client subscribes via Realtime.
--
-- Notified events (deliberately few, to avoid spam; self-actions
-- never notify):
--   * someone joins your group
--   * someone comments on your memory / in your project
--   * someone reacts to your memory
--   * a task in a shared project is completed
-- Run in the Supabase SQL editor after 003.
-- ============================================================

create or replace function public.actor_name()
returns text language sql stable security definer set search_path = public as $$
  select coalesce((select full_name from public.profiles where id = auth.uid()), 'Someone');
$$;

-- ---------- comments ----------
create or replace function public.notify_on_comment()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'memory' then
    insert into public.notifications (user_id, kind, title, body, target_type, target_id)
    select m.owner_id, 'comment',
           public.actor_name() || ' commented on your memory',
           left(new.body, 140), 'memory', new.target_id
    from public.memories m
    where m.id = new.target_id and m.owner_id <> new.owner_id;
  elsif new.target_type = 'project' then
    insert into public.notifications (user_id, kind, title, body, target_type, target_id)
    select pm.user_id, 'comment',
           public.actor_name() || ' commented in ' || coalesce(p.name, 'a project'),
           left(new.body, 140), 'project', new.target_id
    from public.project_members pm
    join public.projects p on p.id = pm.project_id
    where pm.project_id = new.target_id and pm.user_id <> new.owner_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ---------- reactions (memories only) ----------
create or replace function public.notify_on_reaction()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.target_type = 'memory' then
    insert into public.notifications (user_id, kind, title, body, target_type, target_id)
    select m.owner_id, 'reaction',
           public.actor_name() || ' reacted ' || new.emoji || ' to your memory',
           null, 'memory', new.target_id
    from public.memories m
    where m.id = new.target_id and m.owner_id <> new.owner_id;
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_reaction on public.reactions;
create trigger trg_notify_reaction after insert on public.reactions
  for each row execute function public.notify_on_reaction();

-- ---------- group joins ----------
create or replace function public.notify_on_group_join()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.notifications (user_id, kind, title, body, target_type, target_id)
  select g.owner_id, 'group_join',
         coalesce((select full_name from public.profiles where id = new.user_id), 'Someone')
           || ' joined ' || g.name,
         null, 'group', new.group_id
  from public.groups g
  where g.id = new.group_id and g.owner_id <> new.user_id;
  return new;
end $$;

drop trigger if exists trg_notify_group_join on public.group_members;
create trigger trg_notify_group_join after insert on public.group_members
  for each row execute function public.notify_on_group_join();

-- ---------- project task completed ----------
create or replace function public.notify_on_task_done()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status = 'completed' and old.status is distinct from 'completed' then
    insert into public.notifications (user_id, kind, title, body, target_type, target_id)
    select pm.user_id, 'task_done',
           public.actor_name() || ' completed "' || new.title || '"',
           null, 'project', new.project_id
    from public.project_members pm
    where pm.project_id = new.project_id
      and pm.user_id is distinct from auth.uid();
  end if;
  return new;
end $$;

drop trigger if exists trg_notify_task_done on public.project_tasks;
create trigger trg_notify_task_done after update on public.project_tasks
  for each row execute function public.notify_on_task_done();

-- ---------- realtime ----------
-- Client subscribes to INSERTs on its own notifications.
do $$
begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null;
end $$;
