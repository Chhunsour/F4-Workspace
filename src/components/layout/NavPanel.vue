<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { RouterLink, useRoute } from 'vue-router'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { useAuthStore } from '@/stores/auth'
import { useSubjectsStore } from '@/stores/subjects'
import { useScheduleStore } from '@/stores/schedule'
import { useAssignmentsStore } from '@/stores/assignments'
import { useStudyStore } from '@/stores/study'
import { useProjectsStore } from '@/stores/projects'

const route = useRoute()
const auth = useAuthStore()
const subjects = useSubjectsStore()
const schedule = useScheduleStore()
const assignments = useAssignmentsStore()
const study = useStudyStore()
const projects = useProjectsStore()

const q = ref('')

onMounted(() => {
  // All fetches are cached (loaded flag) — cheap if a page already pulled them.
  Promise.allSettled([
    subjects.fetch(), schedule.fetch(), assignments.fetch(), study.fetch(), projects.fetch(),
  ])
})

const isActive = (to: string) => (to === '/' ? route.path === '/' : route.path.startsWith(to))

const openAssignments = computed(() => assignments.items.filter(a => a.status !== 'completed').length)
const activeProjects   = computed(() => projects.items.filter(p => p.status === 'active').length)
const todayClasses     = computed(() => schedule.byWeekday(new Date().getDay()).length)
const dueSoon          = computed(() => assignments.upcoming.length)

const workspace = computed(() => [
  { to: '/',          label: 'Dashboard', icon: 'dashboard' },
  { to: '/schedule',  label: 'Schedule',  icon: 'schedule' },
  { to: '/calendar',  label: 'Calendar',  icon: 'calendar' },
  { to: '/projects',  label: 'Projects',  icon: 'projects', count: activeProjects.value || undefined },
  { to: '/groups',    label: 'Groups',    icon: 'groups' },
])
const personal = computed(() => [
  { to: '/assignments', label: 'Assignments', icon: 'assignments', count: openAssignments.value || undefined },
  { to: '/study',       label: 'Study',       icon: 'study' },
  { to: '/notes',       label: 'Notes',       icon: 'notes' },
  { to: '/memories',    label: 'Memories',    icon: 'memories' },
])

const subjectCount = (id: string) => schedule.items.filter(c => c.subject_id === id).length
const filteredSubjects = computed(() => {
  const term = q.value.trim().toLowerCase()
  const list = subjects.items
  return term ? list.filter(s => (s.name + ' ' + (s.code ?? '')).toLowerCase().includes(term)) : list
})
</script>

<template>
  <aside class="hidden lg:flex glass-panel w-[300px] shrink-0 flex-col overflow-hidden">
    <!-- Profile -->
    <RouterLink to="/profile"
      class="flex items-center gap-3 px-4 pt-4 pb-3 group">
      <Avatar :src="auth.avatarPublicUrl" :name="auth.displayName" size="lg" class="ring-2 ring-white/50 dark:ring-white/10" />
      <div class="min-w-0 flex-1">
        <div class="flex items-center gap-1 font-semibold truncate text-night-900 dark:text-white">
          {{ auth.displayName }}
          <Icon name="chevron_right" :size="14" class="text-night-400 rotate-90 transition-transform group-hover:translate-y-0.5" />
        </div>
        <div class="text-xs text-night-500 dark:text-night-300 truncate">{{ auth.email }}</div>
      </div>
    </RouterLink>

    <div class="mx-4 divider" />

    <div class="flex-1 overflow-y-auto px-3 py-3 space-y-5">
      <!-- Workspace -->
      <div>
        <p class="t-section px-2 mb-1.5">Workspace</p>
        <RouterLink v-for="it in workspace" :key="it.to" :to="it.to"
          :class="['nav-item', isActive(it.to) && 'nav-item-active']">
          <Icon :name="it.icon" :size="18" class="shrink-0 opacity-80" />
          <span class="flex-1 truncate">{{ it.label }}</span>
          <span v-if="it.count" class="count-pill">{{ it.count }}</span>
        </RouterLink>
      </div>

      <!-- Personal -->
      <div>
        <p class="t-section px-2 mb-1.5">Personal</p>
        <RouterLink v-for="it in personal" :key="it.to" :to="it.to"
          :class="['nav-item', isActive(it.to) && 'nav-item-active']">
          <Icon :name="it.icon" :size="18" class="shrink-0 opacity-80" />
          <span class="flex-1 truncate">{{ it.label }}</span>
          <span v-if="it.count" class="count-pill">{{ it.count }}</span>
        </RouterLink>
      </div>

      <!-- This week (live status) -->
      <div>
        <p class="t-section px-2 mb-1.5">This Week</p>
        <RouterLink to="/schedule" class="nav-item">
          <span class="grid h-6 w-6 place-items-center rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-300 shrink-0"><Icon name="clock" :size="14" /></span>
          <span class="flex-1 truncate">Today's classes</span>
          <span class="count-pill">{{ todayClasses }}</span>
        </RouterLink>
        <RouterLink to="/assignments" class="nav-item">
          <span class="grid h-6 w-6 place-items-center rounded-lg bg-accent-300/20 text-accent-700 dark:text-accent-300 shrink-0"><Icon name="assignments" :size="14" /></span>
          <span class="flex-1 truncate">Due soon</span>
          <span class="count-pill">{{ dueSoon }}</span>
        </RouterLink>
        <RouterLink to="/study" class="nav-item">
          <span class="grid h-6 w-6 place-items-center rounded-lg bg-brand-500/15 text-brand-600 dark:text-brand-300 shrink-0"><Icon name="fire" :size="14" /></span>
          <span class="flex-1 truncate">Study streak</span>
          <span class="count-pill">{{ study.streakDays }}d</span>
        </RouterLink>
      </div>

      <!-- Subjects (documents-tree analog) -->
      <div>
        <p class="t-section px-2 mb-1.5">Subjects</p>
        <label class="relative block mb-2">
          <Icon name="search" :size="15" class="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-night-400" />
          <input v-model="q" placeholder="Search subjects…"
                 class="input-base !min-h-0 !py-2 !pl-9 text-[13px]" />
        </label>
        <RouterLink v-for="s in filteredSubjects" :key="s.id" to="/schedule" class="nav-item !py-1.5">
          <span class="h-2.5 w-2.5 rounded-[4px] shrink-0" :style="{ background: s.color }" />
          <span class="flex-1 truncate">{{ s.name }}</span>
          <span class="count-pill">{{ subjectCount(s.id) }}</span>
        </RouterLink>
        <p v-if="filteredSubjects.length === 0" class="px-2 py-1.5 text-xs text-night-400">No subjects found.</p>
      </div>
    </div>
  </aside>
</template>
