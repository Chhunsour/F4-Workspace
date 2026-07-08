<script setup lang="ts">
import { onMounted, computed } from 'vue'
import { RouterLink } from 'vue-router'
import { useAuthStore } from '@/stores/auth'
import { useScheduleStore, classDateForToday } from '@/stores/schedule'
import { useAssignmentsStore } from '@/stores/assignments'
import { useProjectsStore } from '@/stores/projects'
import { useMemoriesStore } from '@/stores/memories'
import { useSubjectsStore } from '@/stores/subjects'
import { useNow } from '@/composables/useCountdown'
import { fmtTime } from '@/lib/utils'
import { useI18n } from '@/composables/useI18n'

import NextClassCard from '@/components/dashboard/NextClassCard.vue'
import NeedsAttention from '@/components/dashboard/NeedsAttention.vue'
import FriendActivity from '@/components/dashboard/FriendActivity.vue'
import ThrowbackCard from '@/components/dashboard/ThrowbackCard.vue'

const auth = useAuthStore()
const now = useNow()
const { t } = useI18n()

const stores = {
  schedule: useScheduleStore(),
  assignments: useAssignmentsStore(),
  projects: useProjectsStore(),
  memories: useMemoriesStore(),
  subjects: useSubjectsStore(),
}

const greeting = computed(() => {
  const h = new Date().getHours()
  if (h < 5)  return t('Still up?')
  if (h < 12) return t('Good morning')
  if (h < 17) return t('Good afternoon')
  if (h < 21) return t('Good evening')
  return t('Late night grind')
})
const todayLabel = computed(() => new Date().toLocaleDateString(undefined, { weekday: 'long', month:'long', day:'numeric' }))

// One honest line about today, from real data — not a random joke.
const statusLine = computed(() => {
  const overdue = stores.assignments.overdueCount
  if (overdue) return overdue === 1 ? t('One task needs attention.') : t('{count} tasks need attention.', { count: overdue })
  const today = stores.schedule.byWeekday(new Date().getDay())
  if (today.length) {
    if (today.every(c => classDateForToday(c, now.value).end <= now.value)) return t('Classes are done for today.')
    return today.length === 1 ? t('1 class today. You got this.') : t('{count} classes today. You got this.', { count: today.length })
  }
  return t('No classes today — a good day to get ahead.')
})

// ---- Today: one simple timeline of classes + tasks due, in time order ----
interface TimelineItem { time: string; label: string; sub: string; color: string; to: string; state: 'done' | 'live' | 'later' }

const timeline = computed<TimelineItem[]>(() => {
  const items: TimelineItem[] = []
  for (const c of stores.schedule.byWeekday(now.value.getDay())) {
    const s = stores.subjects.byId(c.subject_id)
    const { start, end } = classDateForToday(c, now.value)
    items.push({
      time: c.start_time,
      label: s?.name ?? t('Class'),
      sub: c.room ? t('Room {room}', { room: c.room }) : '',
      color: s?.color ?? '#5B7BD4',
      to: s ? `/subjects/${s.id}` : '/schedule',
      state: end <= now.value ? 'done' : start <= now.value ? 'live' : 'later',
    })
  }
  const todayIso = new Date().toLocaleDateString('sv') // YYYY-MM-DD, local
  for (const a of stores.assignments.items) {
    if (a.status === 'completed' || a.due_date !== todayIso) continue
    items.push({
      time: a.due_time ?? '23:59',
      label: t('{title} due', { title: a.title }),
      sub: stores.subjects.byId(a.subject_id)?.name ?? '',
      color: '#ef4444',
      to: `/assignments?id=${a.id}`,
      state: 'later',
    })
  }
  return items.sort((a, b) => a.time.localeCompare(b.time))
})

onMounted(async () => {
  // Fetch everything in parallel; failures are silent per-store.
  await Promise.allSettled([
    stores.schedule.fetch(),
    stores.assignments.fetch(),
    stores.projects.fetch(),
    stores.memories.fetch(),
    stores.subjects.fetch(),
  ])
})
</script>

<template>
  <div class="max-w-7xl mx-auto space-y-8">
    <header>
      <p class="t-eyebrow flex items-center gap-2">
        <span class="inline-block h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_8px_rgba(91,123,212,0.7)]" />
        {{ todayLabel }}
      </p>
      <h1 class="mt-2 t-page">
        {{ greeting }},
        <span class="bg-gradient-to-r from-brand-600 to-brand-500 dark:from-brand-300 dark:to-brand-200 bg-clip-text text-transparent">
          {{ auth.firstName }}
        </span>
      </h1>
      <p class="mt-1.5 text-[15px] text-night-600 dark:text-night-100">{{ statusLine }}</p>
    </header>

    <!-- Now / Next hero -->
    <NextClassCard />

    <div class="grid gap-8 lg:grid-cols-3 lg:gap-10">
      <div class="space-y-8 lg:col-span-2">
        <!-- Today timeline — subject-colored dots + live pulse for current -->
        <section v-if="timeline.length">
          <h2 class="t-section mb-3">{{ t('Today') }}</h2>
          <ol class="relative ml-1.5 space-y-4 border-l border-surface-border pl-5 dark:border-night-700">
            <li v-for="(it, i) in timeline" :key="i" class="relative">
              <!-- Subject dot with a ring highlight for the current item -->
              <span aria-hidden
                    :class="['absolute -left-[27px] top-1 grid place-items-center h-3.5 w-3.5 rounded-full',
                             it.state === 'done' && 'opacity-40',
                             it.state === 'live' && 'ring-2 ring-brand-500/50 ring-offset-2 ring-offset-transparent']">
                <span class="h-2.5 w-2.5 rounded-full"
                      :style="{ background: it.color, boxShadow: it.state === 'live' ? '0 0 12px ' + it.color : undefined }" />
              </span>
              <RouterLink :to="it.to" class="group flex items-baseline gap-3 rounded-lg -mx-2 px-2 py-1 transition-colors hover:bg-brand-500/5 dark:hover:bg-brand-400/8">
                <span class="w-16 shrink-0 text-xs tabular-nums font-semibold text-night-600 dark:text-night-200">{{ fmtTime(it.time) }}</span>
                <span :class="['min-w-0 flex-1 truncate text-sm font-medium transition-colors group-hover:text-brand-700 dark:group-hover:text-brand-200',
                               it.state === 'done' ? 'text-night-400 line-through dark:text-night-300' : 'text-night-900 dark:text-white']">
                  {{ it.label }}
                </span>
                <span v-if="it.state === 'live'" class="chip-live shrink-0">{{ t('now') }}</span>
                <span v-else-if="it.sub" class="shrink-0 text-xs text-night-500 dark:text-night-200">{{ it.sub }}</span>
              </RouterLink>
            </li>
          </ol>
        </section>

        <NeedsAttention />
      </div>

      <div class="space-y-8">
        <FriendActivity />
        <ThrowbackCard />
      </div>
    </div>
  </div>
</template>
