<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useScheduleStore, classDateForToday } from '@/stores/schedule'
import { useSubjectsStore } from '@/stores/subjects'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import ClassEditor from '@/components/schedule/ClassEditor.vue'
import ClassCard from '@/components/schedule/ClassCard.vue'
import { fmtDate, fmtTime, humanCountdown, WEEKDAY_LABELS, WEEKDAY_LONG } from '@/lib/utils'
import type { ClassSchedule } from '@/types'

const schedule = useScheduleStore()
const subjects = useSubjectsStore()

const editorOpen = ref(false)
const editing = ref<ClassSchedule | null>(null)
const dayForNew = ref<number | undefined>(undefined)

// Ticks every 30s so the now-line, "Now" badges and countdown stay honest.
const now = ref(new Date())
let timer: number | undefined

onMounted(async () => {
  timer = window.setInterval(() => { now.value = new Date() }, 30_000)
  await Promise.all([schedule.fetch(), subjects.fetch()])
})
onBeforeUnmount(() => window.clearInterval(timer))

// ---- week (Mon → Sun, with real dates for the current week) ----
const todayNum = computed(() => now.value.getDay())
const isToday = (d: number) => d === todayNum.value

const days = computed(() => {
  const monday = new Date(now.value)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7))
  return [1, 2, 3, 4, 5, 6, 0].map((weekday, i) => {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    return { weekday, date, label: WEEKDAY_LABELS[weekday] }
  })
})
const weekRange = computed(() =>
  `${fmtDate(days.value[0].date, { month: 'short', day: 'numeric' })} – ${fmtDate(days.value[6].date, { month: 'short', day: 'numeric', year: 'numeric' })}`
)

const activeDay = ref(new Date().getDay())

// ---- time grid ----
const HOUR_PX = 96
const toMin = (t: string) => { const [h, m] = t.split(':').map(Number); return h * 60 + m }

// Grid range hugs the actual classes (floored/ceiled to the hour), min 3h tall.
const range = computed(() => {
  let min = Infinity, max = -Infinity
  for (const c of schedule.items) {
    min = Math.min(min, toMin(c.start_time))
    max = Math.max(max, toMin(c.end_time))
  }
  if (!Number.isFinite(min)) { min = 17 * 60; max = 21 * 60 }
  const start = Math.floor(min / 60) * 60
  return { start, end: Math.max(Math.ceil(max / 60) * 60, start + 180) }
})
const hourMarks = computed(() => {
  const marks: number[] = []
  for (let m = range.value.start; m <= range.value.end; m += 60) marks.push(m)
  return marks
})
const bodyHeight = computed(() => `${((range.value.end - range.value.start) / 60) * HOUR_PX}px`)
const pct = (m: number) => `${((m - range.value.start) / (range.value.end - range.value.start)) * 100}%`

function blockStyle(c: ClassSchedule) {
  const span = range.value.end - range.value.start
  return {
    top: pct(toMin(c.start_time)),
    height: `calc(${((toMin(c.end_time) - toMin(c.start_time)) / span) * 100}% - 2px)`,
  }
}
function fmtHour(m: number) {
  const d = new Date(); d.setHours(m / 60, 0, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric' })
}

const nowMin = computed(() => now.value.getHours() * 60 + now.value.getMinutes())
const nowInRange = computed(() => nowMin.value >= range.value.start && nowMin.value <= range.value.end)
const isLive = (c: ClassSchedule) =>
  c.weekday === todayNum.value && nowMin.value >= toMin(c.start_time) && nowMin.value < toMin(c.end_time)

// ---- next class (time-aware, unlike the cached store getter) ----
const next = computed(() => {
  let c: ClassSchedule | null =
    schedule.byWeekday(todayNum.value).find(x => toMin(x.end_time) > nowMin.value) ?? null
  for (let d = 1; d <= 7 && !c; d++) {
    c = schedule.byWeekday((todayNum.value + d) % 7)[0] ?? null
  }
  if (!c) return null
  const { start } = classDateForToday(c, now.value)
  return { c, subject: subjects.byId(c.subject_id), start }
})

const gridEl = ref<HTMLElement | null>(null)
function goToday() {
  activeDay.value = todayNum.value
  gridEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

function openNew(d: number) {
  editing.value = null
  dayForNew.value = d
  editorOpen.value = true
}
function openEdit(c: ClassSchedule) {
  editing.value = c
  editorOpen.value = true
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-4">
    <!-- Header -->
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="text-2xl font-semibold tracking-tight">Weekly Schedule</h2>
        <p class="mt-0.5 text-sm text-night-500 dark:text-night-300">
          Batch 22 · Evening shift · Term Mar 16 – Jun 26, 2026
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="mr-1 hidden text-sm tabular-nums text-night-500 dark:text-night-300 sm:block">{{ weekRange }}</span>
        <Button variant="secondary" size="sm" @click="goToday">Today</Button>
        <Button size="sm" @click="openNew(activeDay)"><Icon name="plus" :size="16" /> Add class</Button>
      </div>
    </header>

    <!-- Next class strip -->
    <div v-if="next"
         class="flex items-center gap-3 rounded-xl border border-surface-border bg-white px-4 py-2.5 shadow-soft dark:border-night-700 dark:bg-night-800">
      <span class="h-8 w-1 shrink-0 rounded-full" :style="{ background: next.subject?.color ?? '#3a68ff' }" />
      <div class="min-w-0 flex-1 text-sm">
        <span class="mr-2 text-[11px] font-semibold uppercase tracking-wider text-night-400 dark:text-night-300">Next class</span>
        <span class="font-medium text-night-900 dark:text-night-50">{{ next.subject?.name ?? 'Unnamed subject' }}</span>
        <span class="text-night-500 dark:text-night-300">
          · {{ WEEKDAY_LONG[next.c.weekday] }} {{ fmtTime(next.c.start_time) }}<template v-if="next.c.room"> · Room {{ next.c.room }}</template>
        </span>
      </div>
      <span class="shrink-0 rounded-full bg-accent-100 px-2.5 py-1 text-xs font-semibold text-accent-700 dark:bg-accent-300/15 dark:text-accent-300">
        in {{ humanCountdown(next.start, now) }}
      </span>
    </div>

    <!-- Mobile: day tabs + stacked list -->
    <div class="lg:hidden">
      <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Day of week">
        <button v-for="d in days" :key="d.weekday"
                role="tab" :aria-selected="d.weekday === activeDay"
                :class="['flex flex-none flex-col items-center rounded-xl border px-3.5 py-1.5 transition-colors',
                         d.weekday === activeDay
                           ? 'border-brand-600 bg-brand-600 text-white'
                           : isToday(d.weekday)
                             ? 'border-brand-300 bg-white text-brand-600 dark:border-brand-500/50 dark:bg-night-800 dark:text-brand-300'
                             : 'border-surface-border bg-white text-night-600 dark:border-night-700 dark:bg-night-800 dark:text-night-200']"
                @click="activeDay = d.weekday">
          <span class="text-[10px] font-medium uppercase tracking-wide opacity-70">{{ d.label }}</span>
          <span class="text-sm font-semibold tabular-nums">{{ d.date.getDate() }}</span>
        </button>
      </div>

      <Card :padded="false" class="mt-1 overflow-hidden">
        <div class="flex items-center justify-between border-b border-surface-border px-4 py-3 dark:border-night-700">
          <h3 class="font-semibold">
            {{ WEEKDAY_LONG[activeDay] }}
            <span v-if="isToday(activeDay)"
                  class="ml-1.5 rounded-full bg-accent-300 px-2 py-0.5 align-middle text-[10px] font-bold uppercase tracking-wide text-night-900">Today</span>
          </h3>
          <button class="link text-sm font-medium" @click="openNew(activeDay)">+ Add</button>
        </div>
        <EmptyState v-if="schedule.byWeekday(activeDay).length === 0" icon="schedule" title="No classes"
                    body="Free day — enjoy it, or add a class above." />
        <ul v-else class="divide-y divide-surface-border dark:divide-night-700">
          <li v-for="c in schedule.byWeekday(activeDay)" :key="c.id">
            <ClassCard variant="row" :item="c" :subject="subjects.byId(c.subject_id)"
                       :live="isLive(c)" @click="openEdit(c)" />
          </li>
        </ul>
      </Card>
    </div>

    <!-- Desktop: time-grid timetable -->
    <div ref="gridEl" class="card hidden overflow-hidden lg:block">
      <!-- Day headers -->
      <div class="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-surface-border dark:border-night-700">
        <div />
        <div v-for="d in days" :key="d.weekday"
             class="group border-l border-surface-border py-2.5 text-center dark:border-night-700">
          <div :class="['text-[11px] font-semibold uppercase tracking-wider',
                        isToday(d.weekday) ? 'text-brand-600 dark:text-brand-300' : 'text-night-400 dark:text-night-300']">
            {{ d.label }}
          </div>
          <div class="mt-1 flex items-center justify-center gap-1">
            <span :class="['flex h-7 w-7 items-center justify-center rounded-full text-sm font-semibold tabular-nums',
                           isToday(d.weekday) ? 'bg-brand-600 text-white' : 'text-night-700 dark:text-night-100']">
              {{ d.date.getDate() }}
            </span>
            <button class="flex h-6 w-6 items-center justify-center rounded-md text-night-400 opacity-0 transition-opacity hover:bg-night-100 hover:text-night-600 group-hover:opacity-100 dark:hover:bg-night-700 dark:hover:text-night-100"
                    :aria-label="`Add class on ${WEEKDAY_LONG[d.weekday]}`"
                    @click="openNew(d.weekday)">
              <Icon name="plus" :size="14" />
            </button>
          </div>
        </div>
      </div>

      <!-- Body -->
      <div class="relative" :style="{ height: bodyHeight }">
        <!-- Hour lines -->
        <div aria-hidden="true" class="absolute inset-y-0 left-14 right-0">
          <div v-for="m in hourMarks.slice(1, -1)" :key="m"
               class="absolute inset-x-0 border-t border-surface-border/70 dark:border-night-700/60"
               :style="{ top: pct(m) }" />
        </div>

        <div class="relative grid h-full grid-cols-[3.5rem_repeat(7,minmax(0,1fr))]">
          <!-- Time gutter -->
          <div class="relative" aria-hidden="true">
            <span v-for="m in hourMarks" :key="m"
                  class="absolute right-2 -translate-y-1/2 text-[11px] tabular-nums text-night-400 dark:text-night-300"
                  :style="{ top: pct(m) }">
              {{ fmtHour(m) }}
            </span>
          </div>

          <!-- Day columns -->
          <div v-for="d in days" :key="d.weekday"
               :class="['relative border-l border-surface-border dark:border-night-700',
                        isToday(d.weekday) && 'bg-brand-50/50 dark:bg-brand-900/10']">
            <div v-if="schedule.byWeekday(d.weekday).length === 0"
                 class="pointer-events-none absolute inset-x-2 top-1/2 -translate-y-1/2 text-center text-[11px] italic text-night-300 dark:text-night-500">
              No class
            </div>

            <ClassCard v-for="c in schedule.byWeekday(d.weekday)" :key="c.id"
                       class="absolute inset-x-1.5" :style="blockStyle(c)"
                       :item="c" :subject="subjects.byId(c.subject_id)"
                       :live="isLive(c)" @click="openEdit(c)" />

            <!-- Now line -->
            <div v-if="isToday(d.weekday) && nowInRange"
                 class="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                 :style="{ top: pct(nowMin) }">
              <span class="-ml-1 h-2 w-2 rounded-full bg-red-500" />
              <span class="h-px flex-1 bg-red-500" />
            </div>
          </div>
        </div>
      </div>
    </div>

    <ClassEditor v-model:open="editorOpen" :editing="editing" :default-weekday="dayForNew" />
  </div>
</template>
