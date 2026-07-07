<script setup lang="ts">
import { computed } from 'vue'
import { useScheduleStore, classDateForToday } from '@/stores/schedule'
import { useSubjectsStore } from '@/stores/subjects'
import { useNow } from '@/composables/useCountdown'
import { humanCountdown, fmtTime, WEEKDAY_LONG } from '@/lib/utils'
import { WEEKDAY_LABELS } from '@/types'

const schedule = useScheduleStore()
const subjects = useSubjectsStore()
const now = useNow()

const next = computed(() => schedule.nextClass)

const info = computed(() => {
  const n = next.value; if (!n) return null
  const sub = subjects.byId(n.subject_id)
  const now_ = now.value
  const day = new Date(now_)
  const delta = (n.weekday - day.getDay() + 7) % 7
  day.setDate(day.getDate() + delta)
  const [sh, sm] = n.start_time.split(':').map(Number)
  const start = new Date(day); start.setHours(sh, sm, 0, 0)
  const [eh, em] = n.end_time.split(':').map(Number)
  const end   = new Date(day); end.setHours(eh, em, 0, 0)
  const started = now_.getTime() >= start.getTime() && now_.getTime() < end.getTime()
  return {
    subject: sub, class: n, start, end, started,
    countdown: started ? `${humanCountdown(end, now_)} left` : `in ${humanCountdown(start, now_)}`,
    dayLabel: delta === 0 ? 'Today' : delta === 1 ? 'Tomorrow' : WEEKDAY_LONG[n.weekday],
  }
})
</script>

<template>
  <div class="card flex items-center gap-4 p-5">
    <span class="h-12 w-1.5 shrink-0 rounded-full" :style="{ background: info?.subject?.color ?? '#3a68ff' }" />
    <div class="min-w-0 flex-1">
      <p class="text-[11px] font-semibold uppercase tracking-wider text-night-400 dark:text-night-300">
        {{ info?.started ? 'On now' : 'Next class' }}
      </p>
      <template v-if="info">
        <h3 class="mt-0.5 truncate text-lg font-semibold text-night-900 dark:text-night-50">
          {{ info.subject?.name ?? 'Unnamed subject' }}
        </h3>
        <p class="truncate text-sm text-night-500 dark:text-night-300">
          {{ info.dayLabel }} · {{ fmtTime(info.class.start_time) }} – {{ fmtTime(info.class.end_time) }}<span v-if="info.class.room"> · Room {{ info.class.room }}</span>
        </p>
      </template>
      <p v-else class="mt-0.5 text-sm text-night-500 dark:text-night-300">
        Nothing scheduled yet — add your classes in the schedule.
      </p>
    </div>
    <span v-if="info"
          :class="['inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold',
                   info.started
                     ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
                     : 'bg-accent-100 text-accent-700 dark:bg-accent-300/15 dark:text-accent-300']">
      <span v-if="info.started" class="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
      {{ info.countdown }}
    </span>
  </div>
</template>
