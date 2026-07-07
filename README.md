# Uni Life

A private student life management app for us and the crew. Vue 3 + TypeScript + Vite + Tailwind + Pinia + Vue Router + Supabase.

## What's inside

- **Auth** — sign in / sign up / forgot / reset. Profile with avatar upload.
- **Dashboard** — greeting, next-class countdown, today's classes, upcoming assignments, project deadlines, study streak, semester progress, quick notes, recent memories, "what are we suffering from today" card.
- **Schedule** — weekly timetable with today highlighted, live "on now" / "next up" indicators, editable classes. Mobile: day-pill swipeable view. Desktop: 7-column grid.
- **Assignments** — status kanban list (To Do → In Progress → Review → Completed), priority, due-date countdown, overdue indicator, subject/priority/status filters, "check off" pop animation.
- **Projects** — list + detail with a 4-column kanban, checklists, links, members, activity comments. Group-shared or solo.
- **Study** — timer with pause/resume, focus mode (fullscreen distraction-free view at `/focus`), sessions history, streak, weekly goal, favorite subject.
- **Notes** — auto-saving Google-Keep-style notes with pins, colors, tags, and search.
- **Calendar** — month / week / agenda views combining classes, assignments, and project deadlines.
- **Memories** — photo gallery with albums, timeline, per-memory detail with reactions and comments. Auto-compressed to WebP before upload.
- **Groups** — create + invite by 8-char code, shared projects and memories.
- **Fun** — semester progress bar, achievements strip on Profile, subtle "suffering" subject card, streak badges.
- **Theme** — light / dark / system, remembered across sessions.

## Prerequisites

- Node.js 18+
- A Supabase project (free tier is fine).

## Setup

```bash
cd uni-life
cp .env.example .env
# fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase project
npm install
npm run dev
```

Open http://localhost:5173.

### Supabase setup

1. Create a new Supabase project.
2. In the SQL editor, run:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_defaults.sql`
   - `supabase/migrations/003_fixes_security_and_join.sql` — **required**: fixes join-by-code (RPC), scopes comment/reaction read access, hardens the seed RPC, adds `profiles.weekly_goal_minutes`
3. The first migration also creates two public storage buckets: `avatars` and `memories`.
4. In **Authentication → Providers** enable **Email**. Turn off "Confirm email" for a smoother demo if you want.
5. In **Authentication → URL Configuration**, add your dev URL to **Site URL** and **Redirect URLs** (so password reset works).

The seed migration installs the Batch 22 evening timetable (Cisco Network II, Postgres DB Design, Modern Frontend, DSA, Python Web Dev) on first sign-in via `seed_defaults_for(uid)`, called by the auth store after sign-in / sign-up.

## Scripts

```bash
npm run dev         # start dev server
npm run build       # type-check + production build
npm run preview     # preview production build
npm run type-check  # just vue-tsc
```

## Project structure

```
src/
├── main.ts               # bootstraps theme + auth, then mounts router
├── App.vue               # top-level router-view + toast/confirm hosts
├── style.css             # Tailwind + design-system utilities
├── router/               # routes + auth guards
├── stores/               # Pinia stores (auth, theme, feature stores)
├── composables/          # useToast, useConfirm, useCountdown
├── lib/                  # supabase client + utils (date, image compression)
├── types/                # Database + domain types
├── components/
│   ├── layout/           # AppShell, Sidebar, TopBar, MobileBottomNav
│   ├── ui/               # design-system primitives
│   ├── shared/           # CommentThread etc.
│   ├── dashboard/        # dashboard widgets
│   ├── schedule/ ...     # per-feature components
└── views/                # route-level views
supabase/migrations/      # SQL schema + seed
```

## Design system notes

- Colors: `brand.*` (modern blue), `accent.*` (warm yellow), `night.*` (deep navy/gray for dark mode), `surface.*` (light backgrounds).
- Typography: `Google Sans` where available, falls back to `Inter` (loaded from Google Fonts).
- Spacing: cards use `rounded-2xl` and `shadow-card`/`shadow-cardH`. Hover interactions upgrade shadow, don't recolor.
- Motion: `slideUp`, `fadeIn`, `pop`, `checkmark` keyframes are declared in `tailwind.config.js`. Page transitions live in `style.css`.
- Everything supports light and dark. Dark mode is class-based (`html.dark`) and applied pre-mount to avoid the flash.

## Security

- Row Level Security is enabled on every table in `001_initial_schema.sql`.
- Private tables (assignments, class_schedules, study_sessions, notes, notifications) are strictly `owner_id = auth.uid()`.
- Shared tables (projects, memories, subjects, groups, project_tasks, comments, reactions) are gated through `is_project_member()` / `is_group_member()` `SECURITY DEFINER` helpers to avoid RLS recursion.
- Storage: each user can only write under a folder named with their own `uid` in `avatars/` and `memories/`. Reads are public (so images can render without signed URLs). Move to signed URLs later if you need stricter privacy.

## Things deliberately kept lazy

- Notifications are stored in the `notifications` table but not surfaced in the UI. Wire them to a bell in the top bar when needed.
- Realtime is not subscribed anywhere by default (kept for you to add per-feature to control the free tier's message quota).
- Attendance streak = study streak; there's no separate "class attended" toggle yet. Add a `class_attendance` table if you want that later.
- Kanban drag-and-drop is arrow-based (← / →); a real DnD lib is easy to swap in, but the arrows work on mobile and don't add a dependency.

Everything else you asked for is wired to real CRUD.
