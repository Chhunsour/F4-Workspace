<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { useAuthStore } from '@/stores/auth'
import { useScheduleStore } from '@/stores/schedule'
import { useAssignmentsStore } from '@/stores/assignments'
import { useProjectsStore } from '@/stores/projects'
import { useMemoriesStore } from '@/stores/memories'
import { useStudyStore } from '@/stores/study'
import { useNotesStore } from '@/stores/notes'

import QuickActions from '@/components/dashboard/QuickActions.vue'
import NextClassCard from '@/components/dashboard/NextClassCard.vue'
import TodayClasses from '@/components/dashboard/TodayClasses.vue'
import UpcomingAssignments from '@/components/dashboard/UpcomingAssignments.vue'
import ProjectDeadlines from '@/components/dashboard/ProjectDeadlines.vue'
import StudyStreak from '@/components/dashboard/StudyStreak.vue'
import RecentMemories from '@/components/dashboard/RecentMemories.vue'
import QuickNotes from '@/components/dashboard/QuickNotes.vue'
import SufferingCard from '@/components/dashboard/SufferingCard.vue'
import SemesterProgress from '@/components/dashboard/SemesterProgress.vue'

const auth = useAuthStore()

const stores = {
  schedule: useScheduleStore(),
  assignments: useAssignmentsStore(),
  projects: useProjectsStore(),
  memories: useMemoriesStore(),
  study: useStudyStore(),
  notes: useNotesStore(),
}

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 5)  return 'Still up?'
  if (h < 12) return 'Good morning'
  if (h < 17) return 'Good afternoon'
  if (h < 21) return 'Good evening'
  return 'Late night grind'
})
const today = computed(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month:'long', day:'numeric' }))

// Subtle rotating student status — deterministic per day so it doesn't flicker.
const STATUS_LINES = [
  'Database assignment pretending it doesn\'t exist.',
  'You survived Monday. Impressive.',
  'One more class before freedom.',
  'Your deadline is getting emotionally closer.',
  'Current academic strategy: somehow make it work.',
  'Running on coffee and optimism.',
  'The slides will not read themselves. Allegedly.',
  'Today\'s vibe: quietly competent.',
]
const funnyStatus = computed(() => {
  const d = new Date()
  const seed = d.getFullYear() * 366 + (d.getMonth() * 31 + d.getDate())
  return STATUS_LINES[seed % STATUS_LINES.length]
})

onMounted(async () => {
  // Fetch everything in parallel; failures are silent per-store.
  await Promise.allSettled([
    stores.schedule.fetch(),
    stores.assignments.fetch(),
    stores.projects.fetch(),
    stores.memories.fetch(),
    stores.study.fetch(),
    stores.notes.fetch(),
  ])
})
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-6">
    <header>
      <p class="text-[11px] font-semibold uppercase tracking-[0.08em] text-night-400 dark:text-night-300">{{ today }}</p>
      <h1 class="mt-1 text-2xl sm:text-3xl font-semibold tracking-tight">
        {{ greeting }}, <span class="text-brand-600 dark:text-brand-300">{{ auth.firstName }}</span>
      </h1>
      <p class="mt-1 text-sm text-night-500 dark:text-night-400">{{ funnyStatus }}</p>
    </header>

    <QuickActions />

    <div class="grid gap-5 lg:grid-cols-3">
      <div class="lg:col-span-2 space-y-5">
        <NextClassCard />
        <TodayClasses />
        <UpcomingAssignments />
        <ProjectDeadlines />
      </div>
      <div class="space-y-5">
        <StudyStreak />
        <SemesterProgress />
        <QuickNotes />
        <SufferingCard />
      </div>
    </div>

    <RecentMemories />
  </div>
</template>
