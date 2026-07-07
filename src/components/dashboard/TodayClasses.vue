<script setup lang="ts">
import { computed } from 'vue'
import { useScheduleStore, classDateForToday } from '@/stores/schedule'
import { useSubjectsStore } from '@/stores/subjects'
import { useNow } from '@/composables/useCountdown'
import { fmtTime, humanCountdown } from '@/lib/utils'
import Card from '@/components/ui/Card.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import { RouterLink } from 'vue-router'

const schedule = useScheduleStore()
const subjects = useSubjectsStore()
const now = useNow()

const today = computed(() => schedule.byWeekday(now.value.getDay()))

function subject(id: string | null) {
  return subjects.byId(id)
}

function windowLabel(c: any) {
  const { start, end } = classDateForToday(c, now.value)
  const nowT = now.value.getTime()
  if (nowT < start.getTime()) return { tone: 'chip', text: `in ${humanCountdown(start, now.value)}` }
  if (nowT >= start.getTime() && nowT < end.getTime()) return { tone: 'live', text: `on now · ends ${fmtTime(c.end_time)}` }
  return { tone: 'done', text: 'done' }
}
</script>

<template>
  <Card>
    <div class="flex items-center justify-between mb-4">
      <div>
        <h3 class="font-semibold">Today's classes</h3>
        <p class="text-xs text-night-500">{{ today.length }} scheduled</p>
      </div>
      <RouterLink to="/schedule" class="text-xs link">Full schedule →</RouterLink>
    </div>

    <EmptyState v-if="today.length === 0" icon="schedule" title="No class today"
      body="Enjoy the day — or get ahead on assignments." />

    <ul v-else class="divide-y divide-surface-border dark:divide-night-700">
      <li v-for="c in today" :key="c.id" class="flex items-center gap-3 py-2.5 first:pt-0 last:pb-0">
        <span class="h-9 w-1 rounded-full" :style="{ background: subject(c.subject_id)?.color ?? '#3a68ff' }" />
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">{{ subject(c.subject_id)?.name ?? 'Unnamed subject' }}</div>
          <div class="text-xs text-night-500 truncate tabular-nums">
            {{ fmtTime(c.start_time) }} – {{ fmtTime(c.end_time) }}<span v-if="c.room"> · Room {{ c.room }}</span>
            <span v-if="subject(c.subject_id)?.lecturer"> · {{ subject(c.subject_id)?.lecturer }}</span>
          </div>
        </div>
        <span :class="[
          'text-[11px] px-2 py-1 rounded-full whitespace-nowrap',
          windowLabel(c).tone === 'live'
            ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200'
            : windowLabel(c).tone === 'done'
              ? 'bg-night-100 text-night-500 dark:bg-night-700 dark:text-night-300'
              : 'bg-brand-50 text-brand-700 dark:bg-brand-900/30 dark:text-brand-200'
        ]">{{ windowLabel(c).text }}</span>
      </li>
    </ul>
  </Card>
</template>
