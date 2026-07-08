<script setup lang="ts">
// ONE sidebar. Dark glass, always.
// Closed  = 64px, icons only (the "preview" rail).
// Open    = 288px, same panel wider — profile at top, icons w/ labels,
//           contextual sub-nav, subjects list, tools + settings at bottom.
// No separate rail + context panel; this is the single navigation system.
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import ThemeToggle from '@/components/ui/ThemeToggle.vue'
import NotificationBell from './NotificationBell.vue'
import { useAuthStore } from '@/stores/auth'
import { useSubjectsStore } from '@/stores/subjects'
import { useScheduleStore } from '@/stores/schedule'
import { useAssignmentsStore } from '@/stores/assignments'
import { useProjectsStore } from '@/stores/projects'
import { useSidebar } from '@/composables/useSidebar'
import { useI18n } from '@/composables/useI18n'

const route = useRoute()
const auth = useAuthStore()
const subjects = useSubjectsStore()
const schedule = useScheduleStore()
const assignments = useAssignmentsStore()
const projects = useProjectsStore()
const sidebar = useSidebar()
const { t } = useI18n()

onMounted(() => {
  Promise.allSettled([subjects.fetch(), schedule.fetch(), assignments.fetch(), projects.fetch()])
})

const primary = [
  { to: '/',            label: 'Home',     icon: 'dashboard' },
  { to: '/schedule',    label: 'Schedule', icon: 'schedule' },
  { to: '/assignments', label: 'Tasks',    icon: 'assignments' },
  { to: '/projects',    label: 'Projects', icon: 'projects' },
  { to: '/study',       label: 'Study',    icon: 'study' },
  { to: '/memory',      label: 'Memory',   icon: 'memories' },
  { to: '/groups',      label: 'Groups',   icon: 'groups' },
]
const tools = [
  { to: '/calendar', label: 'Calendar', icon: 'calendar' },
  { to: '/notes',    label: 'Notes',    icon: 'notes' },
]

const isActive = (to: string) =>
  to === '/' ? route.path === '/' : route.path.startsWith(to)

// Click on the active module = toggle the sidebar. Click on another module = navigate.
function onPrimary(to: string, e: MouseEvent) {
  if (isActive(to)) { e.preventDefault(); sidebar.toggle() }
}

// ---- module-aware content shown only when open ----
const mod = computed(() => {
  const p = route.path
  if (p.startsWith('/schedule'))    return 'schedule'
  if (p.startsWith('/assignments')) return 'assignments'
  if (p.startsWith('/projects'))    return 'projects'
  if (p.startsWith('/study') || p.startsWith('/focus')) return 'study'
  if (p.startsWith('/notes'))       return 'notes'
  if (p.startsWith('/memory'))      return 'memories'
  if (p.startsWith('/groups'))      return 'groups'
  if (p.startsWith('/calendar'))    return 'calendar'
  return 'home'
})

interface CtxItem { label: string; icon: string; to: string; count?: number }
const openAssignments = computed(() => assignments.items.filter(a => a.status !== 'completed').length)
const activeProjects  = computed(() => projects.items.filter(p => p.status === 'active').length)

const context = computed<{ title: string; items: CtxItem[] } | null>(() => {
  switch (mod.value) {
    case 'schedule': return { title: 'Schedule', items: [
      { label: 'My week',   icon: 'schedule', to: '/schedule' },
      { label: 'Add class', icon: 'plus',     to: '/schedule?new=1' },
    ]}
    case 'assignments': return { title: 'Tasks', items: [
      { label: 'All tasks',  icon: 'assignments', to: '/assignments', count: openAssignments.value || undefined },
      { label: 'Due soon',   icon: 'clock',       to: '/assignments?f=due-soon', count: assignments.upcoming.length || undefined },
      { label: 'New task',   icon: 'plus',        to: '/assignments?new=1' },
    ]}
    case 'projects': return { title: 'Projects', items: [
      { label: 'All projects', icon: 'projects', to: '/projects', count: activeProjects.value || undefined },
      { label: 'New project',  icon: 'plus',     to: '/projects?new=1' },
    ]}
    case 'memories': return { title: 'Memory', items: [
      { label: 'Feed',       icon: 'memories', to: '/memory' },
      { label: 'Favorites',  icon: 'heart',    to: '/memory?fav=1' },
      { label: 'Add memory', icon: 'plus',     to: '/memory?new=1' },
    ]}
    case 'notes': return { title: 'Notes', items: [
      { label: 'All notes', icon: 'notes', to: '/notes' },
      { label: 'New note',  icon: 'plus',  to: '/notes?new=1' },
    ]}
    default: return null
  }
})

// Subjects list — academic modules only.
const academic = computed(() => ['home', 'schedule', 'assignments', 'study', 'notes', 'calendar'].includes(mod.value))
const q = ref('')
const subjectCount = (id: string) => schedule.items.filter(c => c.subject_id === id).length
const filteredSubjects = computed(() => {
  const term = q.value.trim().toLowerCase()
  return term ? subjects.items.filter(s => (s.name + ' ' + (s.code ?? '')).toLowerCase().includes(term)) : subjects.items
})
</script>

<template>
  <aside
    :class="[
      'glass-rail hidden lg:flex flex-col shrink-0 h-[calc(100dvh-2rem)] overflow-hidden',
      'transition-[width] duration-[240ms] ease-smooth motion-reduce:transition-none',
      sidebar.open.value ? 'w-[288px]' : 'w-16'
    ]"
    :aria-label="t('Navigation')"
  >
    <!-- Header -->
    <div v-if="!sidebar.open.value" class="flex flex-col items-center gap-1.5 p-2">
      <RouterLink to="/" class="rail-item !h-11 !w-11" :aria-label="t('Home')">
        <span class="grid h-7 w-7 place-items-center rounded-lg bg-brand-600 text-white font-bold text-sm">U</span>
      </RouterLink>
      <span class="h-px w-6 bg-white/10" />
    </div>
    <div v-else class="flex items-center gap-1.5 px-3 pt-3 pb-2.5">
      <RouterLink to="/profile" class="flex min-w-0 flex-1 items-center gap-2.5 group">
        <Avatar :src="auth.avatarPublicUrl" :name="auth.displayName" size="md" class="ring-1 ring-white/15" />
        <div class="min-w-0 flex-1 leading-tight">
          <div class="text-[13px] font-semibold truncate text-white group-hover:text-brand-300 transition-colors">{{ auth.displayName }}</div>
          <div class="text-[11px] text-white/50 truncate">{{ auth.email }}</div>
        </div>
      </RouterLink>
      <NotificationBell />
      <button
        class="grid h-7 w-7 shrink-0 place-items-center rounded-lg text-white/60 hover:text-white hover:bg-white/10 transition-colors"
        :aria-label="t('Collapse sidebar')" :title="t('Collapse sidebar')" @click="sidebar.close()">
        <Icon name="chevron_left" :size="15" />
      </button>
    </div>

    <div v-if="sidebar.open.value" class="mx-3 border-t border-white/10" />

    <!-- Primary + contextual + subjects -->
    <div :class="['flex-1 min-h-0 overflow-y-auto', sidebar.open.value ? 'p-2.5 space-y-4' : 'flex flex-col items-center gap-1 p-2']">
      <div>
        <p v-if="sidebar.open.value" class="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/40 px-2 mb-1">{{ t('Overview') }}</p>
        <template v-for="it in primary" :key="it.to">
          <!-- OPEN: full row -->
          <RouterLink v-if="sidebar.open.value" :to="it.to" @click="onPrimary(it.to, $event)"
            :class="['sb-row', isActive(it.to) && 'sb-row-active']"
            :aria-current="isActive(it.to) ? 'page' : undefined">
            <Icon :name="it.icon" :size="16" class="shrink-0 opacity-80" />
            <span class="text-[13px] truncate flex-1">{{ t(it.label) }}</span>
          </RouterLink>
          <!-- CLOSED: icon-only with tooltip (like the original rail) -->
          <RouterLink v-else :to="it.to" @click="onPrimary(it.to, $event)"
            :class="['rail-item group/rail', isActive(it.to) && 'rail-item-active']"
            :aria-label="t(it.label)" :aria-current="isActive(it.to) ? 'page' : undefined">
            <Icon :name="it.icon" :size="20" />
            <span v-if="isActive(it.to)"
                  class="absolute -right-0.5 top-1/2 -translate-y-1/2 h-1.5 w-1.5 rounded-full bg-brand-400" />
            <span class="pointer-events-none absolute left-[calc(100%+12px)] z-50 whitespace-nowrap rounded-lg
                         bg-night-900/90 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg backdrop-blur
                         transition-opacity duration-150 group-hover/rail:opacity-100 dark:bg-black/70">
              {{ t(it.label) }}
            </span>
          </RouterLink>
        </template>
      </div>

      <!-- Contextual sub-nav for the current module (open only) -->
      <div v-if="sidebar.open.value && context">
        <p class="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/40 px-2 mb-1">{{ t(context.title) }}</p>
        <RouterLink v-for="it in context.items" :key="'ctx-' + it.to" :to="it.to"
                    :class="['sb-row', route.fullPath === it.to && 'sb-row-active']">
          <Icon :name="it.icon" :size="16" class="shrink-0 opacity-80" />
          <span class="text-[13px] truncate flex-1">{{ t(it.label) }}</span>
          <span v-if="it.count" class="sb-pill">{{ it.count }}</span>
        </RouterLink>
      </div>

      <!-- Subjects (open + academic only) -->
      <div v-if="sidebar.open.value && academic">
        <p class="text-[11px] font-semibold uppercase tracking-[0.09em] text-white/40 px-2 mb-1">{{ t('Subjects') }}</p>
        <label class="relative block mb-1.5 mx-1">
          <Icon name="search" :size="14" class="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-white/40" />
          <input v-model="q" :placeholder="t('Search subjects…')"
                 class="w-full bg-white/5 border border-white/10 rounded-lg pl-8 pr-2.5 py-1.5 text-[12.5px] text-white placeholder:text-white/40 focus:outline-none focus:border-white/25 focus:bg-white/[0.07] transition-colors"
                 :aria-label="t('Search subjects')" />
        </label>
        <RouterLink v-for="s in filteredSubjects" :key="s.id" :to="`/subjects/${s.id}`"
                    :title="s.name"
                    :class="['sb-row !py-[5px]', route.path === `/subjects/${s.id}` && 'sb-row-active']">
          <span class="h-2 w-2 rounded-[3px] shrink-0" :style="{ background: s.color }" />
          <span class="flex-1 truncate text-[12.5px]">{{ s.name }}</span>
          <span class="sb-pill">{{ subjectCount(s.id) }}</span>
        </RouterLink>
        <p v-if="filteredSubjects.length === 0" class="px-2 py-1.5 text-xs text-white/40">{{ t('No subjects found.') }}</p>
      </div>
    </div>

    <!-- Footer: tools + theme + settings, in matching row/icon layouts -->
    <div :class="['border-t border-white/10', sidebar.open.value ? 'p-2 space-y-0.5' : 'flex flex-col items-center gap-1 p-2']">
      <template v-if="sidebar.open.value">
        <RouterLink v-for="tool in tools" :key="tool.to" :to="tool.to"
                    :class="['sb-row', isActive(tool.to) && 'sb-row-active']">
          <Icon :name="tool.icon" :size="16" class="shrink-0 opacity-80" />
          <span class="text-[13px] truncate flex-1">{{ t(tool.label) }}</span>
        </RouterLink>
        <div class="sb-row cursor-default">
          <ThemeToggle bare class="!w-4 !h-4 shrink-0 opacity-80" />
          <span class="text-[13px] truncate flex-1">{{ t('Theme') }}</span>
        </div>
        <RouterLink to="/settings" :class="['sb-row', route.path === '/settings' && 'sb-row-active']">
          <Icon name="settings" :size="16" class="shrink-0 opacity-80" />
          <span class="text-[13px] truncate flex-1">{{ t('Settings') }}</span>
        </RouterLink>
      </template>
      <template v-else>
        <RouterLink v-for="tool in tools" :key="tool.to" :to="tool.to"
                    :class="['rail-item group/rail', isActive(tool.to) && 'rail-item-active']"
                    :aria-label="t(tool.label)">
          <Icon :name="tool.icon" :size="20" />
          <span class="pointer-events-none absolute left-[calc(100%+12px)] z-50 whitespace-nowrap rounded-lg
                       bg-night-900/90 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg backdrop-blur
                       transition-opacity duration-150 group-hover/rail:opacity-100 dark:bg-black/70">{{ t(tool.label) }}</span>
        </RouterLink>
        <span class="h-px w-6 bg-white/10" />
        <div class="rail-item"><ThemeToggle bare /></div>
        <RouterLink to="/settings" class="rail-item group/rail" :class="route.path === '/settings' && 'rail-item-active'" :aria-label="t('Settings')">
          <Icon name="settings" :size="20" />
          <span class="pointer-events-none absolute left-[calc(100%+12px)] z-50 whitespace-nowrap rounded-lg
                       bg-night-900/90 px-2.5 py-1 text-xs font-medium text-white opacity-0 shadow-lg backdrop-blur
                       transition-opacity duration-150 group-hover/rail:opacity-100 dark:bg-black/70">{{ t('Settings') }}</span>
        </RouterLink>
      </template>
    </div>
  </aside>
</template>

<style scoped>
/* Rows used in the OPEN state (labels beside icons, dark glass background). */
.sb-row {
  @apply relative flex items-center gap-2.5 rounded-lg px-2.5 py-[7px] text-white/70 transition-colors;
}
.sb-row:hover { background: rgba(255,255,255,0.06); color: #fff; }
.sb-row-active {
  background: rgba(255,255,255,0.10);
  color: #fff;
}
.sb-row-active::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  height: 1rem;
  width: 3px;
  transform: translateY(-50%);
  border-radius: 9999px;
  background: theme('colors.brand.400');
}
.sb-pill {
  @apply inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-md text-[10.5px] font-semibold tabular-nums;
  background: rgba(255,255,255,0.08);
  color: rgba(255,255,255,0.65);
}
</style>
