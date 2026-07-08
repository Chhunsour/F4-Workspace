<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useNow } from '@/composables/useCountdown'
import { usePeopleStore } from '@/stores/people'
import { useProjectsStore } from '@/stores/projects'
import { useMemoriesStore } from '@/stores/memories'
import { useSubjectsStore } from '@/stores/subjects'
import { useStudyStore } from '@/stores/study'
import { useAuthStore } from '@/stores/auth'
import Avatar from '@/components/ui/Avatar.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadError from '@/components/ui/LoadError.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { publicUrl, supabase } from '@/lib/supabase'
import { fmtDate, timeAgo } from '@/lib/utils'
import type { Profile, Project } from '@/types'
import { useI18n } from '@/composables/useI18n'

const route = useRoute()
const now = useNow()
const { t } = useI18n()

const people = usePeopleStore()
const projects = useProjectsStore()
const mem = useMemoriesStore()
const subjects = useSubjectsStore()
const study = useStudyStore()
const auth = useAuthStore()

type Filter = 'everyone' | 'online' | 'studying' | 'project'
const search = ref('')
const filter = ref<Filter>('everyone')
const layout = ref<'grid' | 'list'>('grid')
const selectedId = ref<string | null>(null)

// Activity signals we're allowed to see: memory posts + memory comments only
// (never private assignments/notes/study). Keyed by author id.
const memComments = ref<{ owner_id: string; created_at: string }[]>([])
const projectMembers = ref<Record<string, string[]>>({})

const { error, loading, load } = useLoad(async () => {
  await Promise.all([people.fetch(), projects.fetch(), mem.fetch(), subjects.fetch(), study.fetch()])
  await loadExtra()
})

watch(() => route.query.f, f => {
  filter.value = f === 'online' || f === 'recent' ? 'online' : f === 'studying' ? 'studying' : f === 'project' ? 'project' : 'everyone'
}, { immediate: true })

async function loadExtra() {
  const [{ data: cm }, { data: pm }] = await Promise.all([
    supabase.from('comments').select('owner_id, created_at').eq('target_type', 'memory').order('created_at', { ascending: false }).limit(80),
    projects.items.length
      ? supabase.from('project_members').select('project_id, user_id').in('project_id', projects.items.map(p => p.id))
      : Promise.resolve({ data: [] as { project_id: string; user_id: string }[] }),
  ])
  memComments.value = (cm ?? []) as { owner_id: string; created_at: string }[]
  const map: Record<string, string[]> = {}
  for (const row of (pm ?? []) as { project_id: string; user_id: string }[]) (map[row.project_id] ??= []).push(row.user_id)
  projectMembers.value = map
}

// ---- helpers ----
const isMe = (id: string) => id === auth.userId
function avatarUrl(p: Profile | null | undefined) { return p?.avatar_url ? publicUrl('avatars', p.avatar_url) : null }
function firstName(p: Profile | null | undefined) { return p?.full_name?.split(' ')[0] || t('Friend') }
function memoriesOf(id: string) { return mem.items.filter(m => m.owner_id === id) }
function projectsOf(id: string) { return projects.items.filter(p => p.owner_id === id || (projectMembers.value[p.id]?.includes(id))) }

function lastActiveMs(id: string): number | null {
  let best: number | null = null
  for (const m of mem.items) if (m.owner_id === id) best = Math.max(best ?? 0, new Date(m.created_at).getTime())
  for (const c of memComments.value) if (c.owner_id === id) best = Math.max(best ?? 0, new Date(c.created_at).getTime())
  return best
}

interface Status { kind: 'studying' | 'online' | 'recent' | 'offline'; text: string; dot: string }
function statusOf(p: Profile): Status {
  if (isMe(p.id) && study.active) {
    const subj = subjects.byId(study.active.subjectId ?? '')
    return { kind: 'studying', text: t('Studying {subject}', { subject: subj?.name || study.active.topic || t('now') }), dot: 'bg-brand-500' }
  }
  const la = lastActiveMs(p.id)
  if (la == null) return { kind: 'offline', text: t('Offline'), dot: 'bg-night-300 dark:bg-night-500' }
  const mins = (now.value.getTime() - la) / 60000
  if (mins < 10) return { kind: 'online', text: t('Active now'), dot: 'bg-emerald-500' }
  return { kind: 'recent', text: t('Active {ago}', { ago: timeAgo(new Date(la), now.value) }), dot: 'bg-night-300 dark:bg-night-500' }
}

// ---- summary (compact, real data only) ----
const summary = computed(() => {
  const startOfDay = new Date(now.value); startOfDay.setHours(0, 0, 0, 0)
  const activeToday = people.items.filter(p => { const la = lastActiveMs(p.id); return la != null && la >= startOfDay.getTime() }).length
  return {
    members: people.items.length,
    activeToday,
    studyingNow: study.active ? 1 : 0, // only your own session is visible (study is private)
    activeProjects: projects.items.filter(p => p.status === 'active').length,
  }
})

// ---- active now ----
const activeNow = computed(() =>
  people.items
    .map(p => ({ p, s: statusOf(p) }))
    .filter(x => x.s.kind === 'studying' || x.s.kind === 'online')
    .sort((a, b) => (lastActiveMs(b.p.id) ?? 0) - (lastActiveMs(a.p.id) ?? 0))
)

// ---- members grid (search + filter) ----
const filteredMembers = computed(() => {
  const q = search.value.trim().toLowerCase()
  return people.items.filter(p => {
    if (q && !(`${p.full_name ?? ''} ${p.major ?? ''} ${p.year ? 'year ' + p.year : ''}`.toLowerCase().includes(q))) return false
    if (filter.value === 'online') { const k = statusOf(p).kind; return k === 'online' || k === 'studying' }
    if (filter.value === 'studying') return isMe(p.id) && !!study.active
    if (filter.value === 'project') return projectsOf(p.id).length > 0
    return true
  })
})
const filters: { key: Filter; label: string }[] = [
  { key: 'everyone', label: 'Everyone' },
  { key: 'online', label: 'Online' },
  { key: 'studying', label: 'Studying' },
  { key: 'project', label: 'Project members' },
]

// ---- activity feed (memory posts + memory comments only) ----
interface Activity { id: string; who: string; text: string; at: number; to?: string }
const activityFeed = computed<Activity[]>(() => {
  const out: Activity[] = []
  for (const m of mem.items) {
    const n = mem.imagesByMemory[m.id]?.length ?? 0
    out.push({
      id: 'm-' + m.id, who: m.owner_id, at: new Date(m.created_at).getTime(), to: `/memories/${m.id}`,
      text: n > 1 ? t('added {count} photos', { count: n }) : m.caption ? t('shared a moment') : t('added a photo'),
    })
  }
  memComments.value.forEach((c, i) => out.push({ id: 'c-' + i, who: c.owner_id, at: new Date(c.created_at).getTime(), text: t('commented on a memory') }))
  return out.sort((a, b) => b.at - a.at).slice(0, 15)
})

// ---- team projects ----
const teamProjects = computed(() =>
  [...projects.items]
    .filter(p => p.status !== 'archived')
    .sort((a, b) => (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1) || (a.deadline ?? '9999').localeCompare(b.deadline ?? '9999'))
    .slice(0, 6)
)
function projectPeople(p: Project) {
  const ids = new Set<string>([p.owner_id, ...(projectMembers.value[p.id] ?? [])])
  return [...ids].map(id => people.byId(id)).filter((x): x is Profile => !!x).slice(0, 4)
}

// ---- team memories (image-first) ----
const teamMemories = computed(() => mem.items.filter(m => (mem.imagesByMemory[m.id]?.length ?? 0) > 0).slice(0, 5))

// ---- member panel ----
const selected = computed(() => (selectedId.value ? people.byId(selectedId.value) : null))
const selectedProjects = computed(() => (selected.value ? projectsOf(selected.value.id) : []))
const selectedMemories = computed(() => (selected.value ? memoriesOf(selected.value.id) : []))
const selectedActivity = computed<Activity[]>(() => (selected.value ? activityFeed.value.filter(a => a.who === selected.value!.id) : []))
function openMember(id: string) { selectedId.value = id }
</script>

<template>
  <div class="mx-auto max-w-6xl space-y-6">
    <!-- Header -->
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 class="t-page">{{ t('Team') }}</h1>
        <p class="mt-1 text-sm text-night-500 dark:text-night-300">{{ t('Everyone in Team F4.') }}</p>
      </div>
      <div class="flex items-center gap-2">
        <div class="relative">
          <Icon name="search" :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-night-400" />
          <input v-model="search" :placeholder="t('Search members…')"
                 class="input-base !w-44 !min-h-0 !py-2 !pl-9 !text-sm sm:!w-56" :aria-label="t('Search members')" />
        </div>
        <div class="hidden items-center rounded-lg border border-[var(--glass-hair)] p-0.5 sm:flex">
          <button :class="['grid h-8 w-8 place-items-center rounded-md transition-colors', layout === 'grid' ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300' : 'text-night-500 hover:text-night-800 dark:text-night-300']"
                  :aria-label="t('Grid view')" @click="layout = 'grid'"><Icon name="dashboard" :size="16" /></button>
          <button :class="['grid h-8 w-8 place-items-center rounded-md transition-colors', layout === 'list' ? 'bg-brand-500/15 text-brand-600 dark:text-brand-300' : 'text-night-500 hover:text-night-800 dark:text-night-300']"
                  :aria-label="t('List view')" @click="layout = 'list'"><Icon name="notes" :size="16" /></button>
        </div>
      </div>
    </header>

    <LoadError v-if="error" :message="error" @retry="load" />

    <template v-else>
      <!-- Compact summary -->
      <div v-if="loading" class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Skeleton v-for="i in 4" :key="i" height="h-16" rounded="rounded-xl" />
      </div>
      <div v-else class="grid grid-cols-2 gap-2.5 sm:grid-cols-4">
        <div class="tile flex items-center gap-3 px-3.5 py-3">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="team" :size="18" /></span>
          <span><span class="block text-lg font-semibold leading-none tabular-nums">{{ summary.members }}</span><span class="text-xs text-night-500 dark:text-night-300">{{ t('Members') }}</span></span>
        </div>
        <div class="tile flex items-center gap-3 px-3.5 py-3">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-emerald-500/12 text-emerald-600 dark:text-emerald-400"><Icon name="bell" :size="18" /></span>
          <span><span class="block text-lg font-semibold leading-none tabular-nums">{{ summary.activeToday }}</span><span class="text-xs text-night-500 dark:text-night-300">{{ t('Active today') }}</span></span>
        </div>
        <div class="tile flex items-center gap-3 px-3.5 py-3">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-brand-500/12 text-brand-600 dark:text-brand-300"><Icon name="study" :size="18" /></span>
          <span><span class="block text-lg font-semibold leading-none tabular-nums">{{ summary.studyingNow }}</span><span class="text-xs text-night-500 dark:text-night-300">{{ t('Studying now') }}</span></span>
        </div>
        <div class="tile flex items-center gap-3 px-3.5 py-3">
          <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-accent-400/15 text-accent-600 dark:text-accent-300"><Icon name="projects" :size="18" /></span>
          <span><span class="block text-lg font-semibold leading-none tabular-nums">{{ summary.activeProjects }}</span><span class="text-xs text-night-500 dark:text-night-300">{{ t('Active projects') }}</span></span>
        </div>
      </div>

      <!-- Active now -->
      <section v-if="!loading && activeNow.length">
        <h2 class="t-section mb-2">{{ t('Active now') }}</h2>
        <div class="-mx-1 flex gap-2.5 overflow-x-auto px-1 pb-1">
          <button v-for="{ p, s } in activeNow" :key="p.id" type="button"
                  class="flex w-40 flex-none items-center gap-2.5 rounded-xl border border-[var(--glass-hair)] bg-[var(--solid-surface)] p-2.5 text-left transition-shadow hover:shadow-card"
                  @click="openMember(p.id)">
            <span class="relative shrink-0">
              <Avatar :src="avatarUrl(p)" :name="p.full_name" size="md" />
              <span :class="['absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full ring-2 ring-white dark:ring-night-900', s.dot]" />
            </span>
            <span class="min-w-0">
              <span class="block truncate text-sm font-semibold">{{ firstName(p) }}</span>
              <span class="block truncate text-[11px] text-night-500 dark:text-night-300">{{ s.text }}</span>
            </span>
          </button>
        </div>
      </section>

      <!-- Main grid: members + projects (left) · activity + memories (right) -->
      <div class="grid gap-6 lg:grid-cols-3">
        <div class="space-y-6 lg:col-span-2">
          <!-- All members -->
          <section>
            <div class="mb-3 flex items-center justify-between gap-2">
              <h2 class="t-section">{{ t('All members') }}</h2>
              <div class="flex gap-1.5 overflow-x-auto">
                <button v-for="f in filters" :key="f.key" type="button"
                        :class="['flex-none rounded-full px-3 py-1 text-xs font-medium transition-colors',
                                 filter === f.key ? 'bg-brand-600 text-white' : 'bg-white/55 text-night-600 hover:bg-white/80 dark:bg-white/[0.06] dark:text-night-200']"
                        @click="filter = f.key">{{ t(f.label) }}</button>
              </div>
            </div>

            <div v-if="loading" class="grid gap-3 sm:grid-cols-2">
              <Skeleton v-for="i in 4" :key="i" height="h-40" rounded="rounded-2xl" />
            </div>

            <EmptyState v-else-if="!filteredMembers.length" icon="team" :title="t('No members found')"
                        :body="t('Try a different search or filter.')" />

            <div v-else :class="layout === 'grid' ? 'grid gap-3 sm:grid-cols-2' : 'space-y-2.5'">
              <article v-for="p in filteredMembers" :key="p.id"
                       class="group rounded-2xl border border-[var(--glass-hair)] bg-[var(--solid-surface)] p-4 shadow-card transition-all hover:-translate-y-0.5 hover:border-brand-300/60 hover:shadow-cardH">
                <div class="flex items-start gap-3">
                  <button type="button" class="relative shrink-0" @click="openMember(p.id)">
                    <Avatar :src="avatarUrl(p)" :name="p.full_name" size="lg" />
                    <span :class="['absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full ring-2 ring-[var(--solid-surface)]', statusOf(p).dot]" />
                  </button>
                  <div class="min-w-0 flex-1">
                    <button type="button" class="block max-w-full truncate text-left font-semibold text-night-900 hover:text-brand-600 dark:text-white dark:hover:text-brand-300" @click="openMember(p.id)">
                      {{ p.full_name || t('A friend') }}<span v-if="isMe(p.id)" class="ml-1.5 rounded bg-brand-500/15 px-1.5 py-0.5 align-middle text-[10px] font-semibold text-brand-600 dark:text-brand-300">{{ t('You') }}</span>
                    </button>
                    <p class="truncate text-xs text-night-500 dark:text-night-300">
                      {{ p.major || t('Team F4') }}<span v-if="p.year"> · {{ t('Year {n}', { n: p.year }) }}</span>
                    </p>
                    <p class="mt-1 flex items-center gap-1.5 text-xs">
                      <span :class="['h-2 w-2 rounded-full', statusOf(p).dot]" />
                      <span class="truncate text-night-600 dark:text-night-200">{{ statusOf(p).text }}</span>
                    </p>
                  </div>
                </div>
                <p v-if="p.bio" class="mt-3 line-clamp-2 text-[13px] leading-relaxed text-night-600 dark:text-night-200">{{ p.bio }}</p>
                <div class="mt-3 flex items-center justify-between">
                  <span class="text-xs text-night-500 dark:text-night-300">
                    {{ t('{count} projects', { count: projectsOf(p.id).length }) }} · {{ t('{count} memories', { count: memoriesOf(p.id).length }) }}
                  </span>
                  <button class="link text-xs font-medium" @click="openMember(p.id)">{{ t('View profile') }}</button>
                </div>
              </article>
            </div>
          </section>

          <!-- Team projects -->
          <section v-if="!loading && teamProjects.length">
            <h2 class="t-section mb-3">{{ t('Team projects') }}</h2>
            <div class="space-y-2.5">
              <RouterLink v-for="p in teamProjects" :key="p.id" :to="`/projects/${p.id}`"
                          class="block rounded-2xl border border-[var(--glass-hair)] bg-[var(--solid-surface)] p-4 shadow-card transition-shadow hover:shadow-cardH">
                <div class="flex items-center gap-3">
                  <span class="h-9 w-1.5 shrink-0 rounded-full" :style="{ background: p.color ?? '#5B7BD4' }" />
                  <div class="min-w-0 flex-1">
                    <div class="flex items-center gap-2">
                      <span class="truncate font-semibold">{{ p.name }}</span>
                      <span v-if="p.deadline" class="shrink-0 text-xs text-night-500 dark:text-night-300">· {{ t('Due {date}', { date: fmtDate(p.deadline, { month: 'short', day: 'numeric' }) }) }}</span>
                    </div>
                    <div class="mt-2 flex items-center gap-3">
                      <ProgressBar :value="p.progress" height="h-1.5" class="flex-1" :color="p.color ?? '#5B7BD4'" />
                      <span class="shrink-0 text-xs font-medium tabular-nums text-night-600 dark:text-night-200">{{ p.progress }}%</span>
                    </div>
                  </div>
                  <div class="flex shrink-0 -space-x-2">
                    <Avatar v-for="mp in projectPeople(p)" :key="mp.id" :src="avatarUrl(mp)" :name="mp.full_name" size="sm" class="ring-2 ring-[var(--solid-surface)]" />
                  </div>
                </div>
              </RouterLink>
            </div>
          </section>
        </div>

        <!-- Right column -->
        <div class="space-y-6">
          <!-- What everyone is doing -->
          <section class="card p-4">
            <h2 class="t-section mb-3">{{ t('What everyone is doing') }}</h2>
            <div v-if="loading" class="space-y-3"><Skeleton v-for="i in 5" :key="i" height="h-8" rounded="rounded-lg" /></div>
            <p v-else-if="!activityFeed.length" class="text-sm text-night-500 dark:text-night-300">{{ t('Nothing new yet.') }}</p>
            <ul v-else class="space-y-3">
              <li v-for="a in activityFeed" :key="a.id" class="flex items-start gap-2.5">
                <button class="shrink-0" @click="openMember(a.who)"><Avatar :src="avatarUrl(people.byId(a.who))" :name="people.byId(a.who)?.full_name" size="sm" /></button>
                <div class="min-w-0 flex-1 text-[13px] leading-snug">
                  <RouterLink v-if="a.to" :to="a.to" class="text-night-700 dark:text-night-100">
                    <button class="font-semibold hover:underline" @click.prevent="openMember(a.who)">{{ firstName(people.byId(a.who)) }}</button>
                    {{ ' ' }}{{ a.text }}
                  </RouterLink>
                  <span v-else class="text-night-700 dark:text-night-100">
                    <button class="font-semibold hover:underline" @click="openMember(a.who)">{{ firstName(people.byId(a.who)) }}</button>
                    {{ ' ' }}{{ a.text }}
                  </span>
                  <div class="text-[11px] text-night-400 dark:text-night-300">{{ timeAgo(new Date(a.at), now) }}</div>
                </div>
              </li>
            </ul>
          </section>

          <!-- Recent team memories (image-first) -->
          <section v-if="!loading && teamMemories.length" class="card p-4">
            <h2 class="t-section mb-3">{{ t('Recent team memories') }}</h2>
            <div class="space-y-2.5">
              <RouterLink v-for="(m, i) in teamMemories" :key="m.id" :to="`/memories/${m.id}`"
                          :class="['group block overflow-hidden rounded-xl bg-night-100 dark:bg-night-800', i === 0 ? '' : 'flex items-center gap-3']">
                <img v-if="mem.thumbnailUrl(m.id)" :src="mem.thumbnailUrl(m.id)!" alt="" loading="lazy"
                     :class="i === 0 ? 'aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-[1.03]' : 'h-14 w-14 shrink-0 object-cover'" />
                <div :class="i === 0 ? 'flex items-center gap-2 p-2.5' : 'min-w-0 flex-1 pr-2'">
                  <Avatar v-if="i === 0" :src="avatarUrl(people.byId(m.owner_id))" :name="people.byId(m.owner_id)?.full_name" size="sm" />
                  <div class="min-w-0">
                    <div class="truncate text-xs font-medium">{{ m.caption || m.title || t('a moment') }}</div>
                    <div class="text-[11px] text-night-500 dark:text-night-300">{{ firstName(people.byId(m.owner_id)) }} · {{ timeAgo(new Date(m.created_at), now) }}</div>
                  </div>
                </div>
              </RouterLink>
            </div>
          </section>
        </div>
      </div>
    </template>

    <!-- Member profile slide-over -->
    <teleport to="body">
      <transition name="fade">
        <div v-if="selected" class="fixed inset-0 z-[80] flex justify-end bg-night-950/40 backdrop-blur-sm" @click.self="selectedId = null">
          <aside class="flex h-full w-full max-w-md flex-col overflow-y-auto bg-[var(--solid-surface)] shadow-pop">
            <div class="sticky top-0 z-10 flex items-center justify-end border-b border-[var(--glass-hair)] bg-[var(--solid-surface)] px-4 py-2.5">
              <button class="grid h-9 w-9 place-items-center rounded-full text-night-500 hover:bg-white/60 dark:hover:bg-white/[0.08]" :aria-label="t('Close')" @click="selectedId = null"><Icon name="close" :size="18" /></button>
            </div>
            <div v-if="selected" class="p-5">
              <!-- header -->
              <div class="flex items-center gap-4">
                <span class="relative shrink-0">
                  <Avatar :src="avatarUrl(selected)" :name="selected.full_name" size="xl" />
                  <span :class="['absolute bottom-1 right-1 h-4 w-4 rounded-full ring-2 ring-[var(--solid-surface)]', statusOf(selected).dot]" />
                </span>
                <div class="min-w-0">
                  <h3 class="truncate text-xl font-semibold">{{ selected.full_name || t('A friend') }}</h3>
                  <p class="truncate text-sm text-night-500 dark:text-night-300">{{ selected.major || t('Team F4') }}<span v-if="selected.year"> · {{ t('Year {n}', { n: selected.year }) }}</span></p>
                  <p class="mt-1 flex items-center gap-1.5 text-sm"><span :class="['h-2 w-2 rounded-full', statusOf(selected).dot]" /><span class="text-night-600 dark:text-night-200">{{ statusOf(selected).text }}</span></p>
                </div>
              </div>
              <p v-if="selected.bio" class="mt-4 text-sm leading-relaxed text-night-700 dark:text-night-100">{{ selected.bio }}</p>

              <!-- currently (self study only — private for others) -->
              <div v-if="isMe(selected.id) && study.active" class="mt-5 rounded-2xl border border-brand-500/20 bg-brand-500/[0.06] p-4">
                <p class="t-section !text-brand-600 dark:!text-brand-300">{{ t('Currently') }}</p>
                <p class="mt-1 font-semibold">{{ t('Studying {subject}', { subject: subjects.byId(study.active.subjectId ?? '')?.name || study.active.topic || t('now') }) }}</p>
              </div>

              <!-- projects -->
              <div v-if="selectedProjects.length" class="mt-6">
                <p class="t-section mb-2">{{ t('Projects') }}</p>
                <div class="space-y-2">
                  <RouterLink v-for="p in selectedProjects" :key="p.id" :to="`/projects/${p.id}`" class="flex items-center gap-3 rounded-xl border border-[var(--glass-hair)] p-2.5 hover:bg-white/50 dark:hover:bg-white/[0.05]" @click="selectedId = null">
                    <span class="h-7 w-1.5 shrink-0 rounded-full" :style="{ background: p.color ?? '#5B7BD4' }" />
                    <span class="min-w-0 flex-1 truncate text-sm font-medium">{{ p.name }}</span>
                    <span class="shrink-0 text-xs tabular-nums text-night-500 dark:text-night-300">{{ p.progress }}%</span>
                  </RouterLink>
                </div>
              </div>

              <!-- memories -->
              <div v-if="selectedMemories.length" class="mt-6">
                <p class="t-section mb-2">{{ t('Memories') }}</p>
                <div class="grid grid-cols-3 gap-1.5">
                  <RouterLink v-for="m in selectedMemories.slice(0, 6)" :key="m.id" :to="`/memories/${m.id}`" class="aspect-square overflow-hidden rounded-lg bg-night-100 dark:bg-night-800" @click="selectedId = null">
                    <img v-if="mem.thumbnailUrl(m.id)" :src="mem.thumbnailUrl(m.id)!" alt="" loading="lazy" class="h-full w-full object-cover" />
                    <span v-else class="grid h-full place-items-center text-night-300"><Icon name="memories" :size="20" /></span>
                  </RouterLink>
                </div>
              </div>

              <!-- activity -->
              <div v-if="selectedActivity.length" class="mt-6">
                <p class="t-section mb-2">{{ t('Activity') }}</p>
                <ul class="space-y-2.5">
                  <li v-for="a in selectedActivity" :key="a.id" class="text-[13px] text-night-600 dark:text-night-200">
                    {{ a.text }} <span class="text-night-400 dark:text-night-300">· {{ timeAgo(new Date(a.at), now) }}</span>
                  </li>
                </ul>
              </div>

              <div class="mt-6">
                <Button as="a" :href="`/memory?person=${selected.id}`" variant="secondary" size="sm" class="w-full" @click="selectedId = null"><Icon name="memories" :size="15" /> {{ t('Their memories') }}</Button>
              </div>
            </div>
          </aside>
        </div>
      </transition>
    </teleport>
  </div>
</template>
