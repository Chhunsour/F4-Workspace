<div align="center">

# 🎓 F4-Workspace
### Student Life & Academic Productivity Management App

<p align="center">
  <sub>Developed by <strong>Seng Chhunsour</strong></sub>
</p>

[![Author: Seng Chhunsour](https://img.shields.io/badge/Author-Seng%20Chhunsour-FF5A1F?style=flat-square&logo=github&logoColor=white)](https://github.com/Chhunsour)
[![Vue 3](https://img.shields.io/badge/Vue-3.5-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.6-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-5.4-646CFF?style=flat-square&logo=vite&logoColor=white)](https://vitejs.dev/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38B2AC?style=flat-square&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)
[![Supabase](https://img.shields.io/badge/Supabase-Database%20%26%20Auth-3ECF8E?style=flat-square&logo=supabase&logoColor=white)](https://supabase.com/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg?style=flat-square)](LICENSE)

</div>

---

A private student life management and collaborative academic productivity platform built with **Vue 3, TypeScript, Vite, Tailwind CSS, Pinia, Vue Router, and Supabase**.

## ✨ What's Inside

- **Auth** — Sign in / sign up / forgot / reset password flows. User profiles with custom avatar image upload.
- **Dashboard** — Live greeting, next-class countdown, today's schedule, upcoming assignments, project milestones, study streak, semester progress bar, quick notes, and recent memories.
- **Schedule** — Weekly timetable with today highlighted, live "on now" / "next up" indicators, editable classes. Mobile swipeable day-pills and responsive desktop 7-column grid.
- **Assignments** — Kanban status pipeline (`To Do` → `In Progress` → `Review` → `Completed`), priority badges, due-date countdowns, overdue indicators, filter tags, and satisfying completion animations.
- **Projects** — Group and solo project spaces with 4-column kanbans, task checklists, reference links, member avatars, and activity comments.
- **Study Mode** — Built-in study timer with pause/resume, distraction-free focus mode (`/focus`), session history tracking, streak counters, and weekly goal milestones.
- **Smart Notes** — Auto-saving notes with color codes, pin favorites, categorization tags, and fast client-side search.
- **Calendar** — Unified Month, Week, and Agenda views synchronizing classes, assignments, and deadlines into a single timeline.
- **Memories Gallery** — Photo albums, campus timeline, interactive reactions, and comments with automatic client-side WebP compression before cloud upload.
- **Groups & Collaboration** — Instant group creation and 8-character invitation codes for shared projects and shared memories.
- **Theme Support** — Full dark and light modes with class-based persistence (`html.dark`) and zero flash-of-unstyled-content.

## 🛠️ Prerequisites

- **Node.js** 18+
- **Supabase project** (free tier is fully supported)

## 🚀 Setup & Installation

```bash
# Clone the repository
git clone https://github.com/Chhunsour/F4-Workspace.git
cd F4-Workspace

# Copy environment variables
cp .env.example .env
# Fill in VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY from your Supabase dashboard

# Install dependencies and start local dev server
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

### 🗄️ Supabase Configuration

1. Create a new Supabase project.
2. In the **SQL Editor**, execute in order:
   - `supabase/migrations/001_initial_schema.sql`
   - `supabase/migrations/002_seed_defaults.sql`
   - `supabase/migrations/003_fixes_security_and_join.sql` *(Required: fixes join-by-code RPC, scopes comment/reaction access, hardens security policies, and adds weekly goal tracking).*
3. Verify the two public storage buckets are created: `avatars` and `memories`.
4. In **Authentication → Providers**, enable **Email**.
5. In **Authentication → URL Configuration**, add your application URL to **Site URL** and **Redirect URLs** for password resets.

## 📦 Scripts

```bash
npm run dev         # start Vite development server
npm run build       # type-check with vue-tsc + bundle production build
npm run preview     # preview production build locally
npm run type-check  # standalone TypeScript type-checking
```

## 📂 Project Structure

```
src/
├── main.ts               # bootstraps theme + auth, mounts router
├── App.vue               # root shell with toast and modal hosts
├── style.css             # Tailwind imports & transition keyframes
├── router/               # route declarations and navigation guards
├── stores/               # Pinia state stores (auth, theme, features)
├── composables/          # useToast, useConfirm, useCountdown
├── lib/                  # Supabase client & utilities (date, image compression)
├── types/                # TypeScript database schema & domain types
├── components/
│   ├── layout/           # AppShell, Sidebar, TopBar, MobileBottomNav
│   ├── ui/               # reusable UI primitives & buttons
│   ├── shared/           # CommentThread and collaborative elements
│   ├── dashboard/        # interactive dashboard widgets
│   └── schedule/         # timetable and calendar components
└── views/                # routed application screens
supabase/migrations/      # PostgreSQL migrations & seed data
```

## 🔒 Security Architecture

- **Row Level Security (RLS)** is enabled on all tables in `001_initial_schema.sql`.
- Private tables (assignments, schedules, study sessions, notes) are strictly scoped with `owner_id = auth.uid()`.
- Shared tables (projects, memories, groups, tasks, comments) utilize `SECURITY DEFINER` helpers (`is_project_member()`, `is_group_member()`) preventing recursive RLS queries.
- Storage policies restrict user write permissions to folders matching their authenticated `uid`.

---

## 👤 Author & Developer

**Developed by Seng Chhunsour**
- **GitHub:** [@Chhunsour](https://github.com/Chhunsour)
- **Repository:** [https://github.com/Chhunsour/F4-Workspace](https://github.com/Chhunsour/F4-Workspace)

---

## 📄 License

This project is open-source under the MIT License.
