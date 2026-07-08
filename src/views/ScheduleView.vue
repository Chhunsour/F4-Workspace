<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useScheduleStore, classDateForToday } from '@/stores/schedule'
import { useAcademicEventsStore } from '@/stores/academicEvents'
import { useSubjectsStore } from '@/stores/subjects'
import { useAssignmentsStore } from '@/stores/assignments'
import { useNotesStore } from '@/stores/notes'
import { useProjectsStore } from '@/stores/projects'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadError from '@/components/ui/LoadError.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import ScheduleEditor from '@/components/schedule/ScheduleEditor.vue'
import ClassDetail from '@/components/schedule/ClassDetail.vue'
import AcademicEventDetail from '@/components/schedule/AcademicEventDetail.vue'
import { useLoad } from '@/composables/useLoad'
import ClassCard from '@/components/schedule/ClassCard.vue'
import AcademicEventCard from '@/components/schedule/AcademicEventCard.vue'
import { fmtDate, fmtTime, humanCountdown, initials, localIso, daysBetween, WEEKDAY_LABELS, WEEKDAY_LONG } from '@/lib/utils'
import { EVENT_TYPE_META } from '@/types'
import type { ClassSchedule, AcademicEvent } from '@/types'
import { useI18n } from '@/composables/useI18n'

const route = useRoute()
const router = useRouter()
const schedule = useScheduleStore()
const events = useAcademicEventsStore()
const subjects = useSubjectsStore()
const assignmentsStore = useAssignmentsStore()
const notesStore = useNotesStore()
const projectsStore = useProjectsStore()
const { t } = useI18n()

const editorOpen = ref(false)
const editingClass = ref<ClassSchedule | null>(null)
const editingEvent = ref<AcademicEvent | null>(null)
const dayForNew = ref<number | undefined>(undefined)
const dateForNew = ref<string | undefined>(undefined)
const detailOpen = ref(false)
const detailItem = ref<ClassSchedule | null>(null)
const eventDetailOpen = ref(false)
const eventDetailItem = ref<AcademicEvent | null>(null)

// Ticks every 30s so the now-line, "Now" badges and countdown stay honest.
const now = ref(new Date())
let timer: number | undefined

onMounted(() => {
  timer = window.setInterval(() => { now.value = new Date() }, 30_000)
  if (route.query.new === '1') consumeNewQuery()
})
watch(() => route.query.new, n => { if (n === '1') consumeNewQuery() })
// Deep link from Calendar/Home: /schedule?event=<id> opens that event.
watch(() => [route.query.event, events.loaded], () => {
  const id = route.query.event
  if (id && events.loaded) {
    const e = events.items.find(x => x.id === String(id))
    if (e) openEventDetail(e)
    router.replace({ query: { ...route.query, event: undefined } })
  }
})
function consumeNewQuery() {
  openNew(activeDay.value)
  router.replace({ query: { ...route.query, new: undefined } })
}
onBeforeUnmount(() => window.clearInterval(timer))

const { error, loading, load } = useLoad(() => Promise.all([
  schedule.fetch(), events.fetch(), subjects.fetch(), assignmentsStore.fetch(), notesStore.fetch(), projectsStore.fetch(),
]))

// Concrete-date helpers for one-time events overlaid on the week grid.
const eventsOnDate = (date: Date) => events.byDate(localIso(date))
function eventDaysLeft(e: AcademicEvent) {
  const n = daysBetween(new Date(), new Date(e.event_date + 'T00:00:00'))
  return n <= 0 ? t('Today') : n === 1 ? t('Tomorrow') : t('{days} days left', { days: n })
}
const upcoming = computed(() => events.upcoming.slice(0, 6))

// ---- week (Mon → Sun; weekOffset pages through weeks) ----
const todayNum = computed(() => now.value.getDay())
const weekOffset = ref(0)
// "today" styling and the now-line only apply while viewing the current week
const isToday = (d: number) => weekOffset.value === 0 && d === todayNum.value

const days = computed(() => {
  const monday = new Date(now.value)
  monday.setHours(0, 0, 0, 0)
  monday.setDate(monday.getDate() - ((monday.getDay() + 6) % 7) + weekOffset.value * 7)
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

// Grid range hugs the actual classes + this week's dated events (floored/ceiled
// to the hour), min 3h tall.
const range = computed(() => {
  let min = Infinity, max = -Infinity
  for (const c of schedule.items) {
    min = Math.min(min, toMin(c.start_time))
    max = Math.max(max, toMin(c.end_time))
  }
  for (const d of days.value) {
    for (const e of eventsOnDate(d.date)) {
      if (!e.start_time) continue
      min = Math.min(min, toMin(e.start_time))
      max = Math.max(max, toMin(e.end_time ?? e.start_time) + (e.end_time ? 0 : 60))
    }
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
// Dated event positioned in a day column (default 1h when no end time).
function eventBlockStyle(e: AcademicEvent) {
  const span = range.value.end - range.value.start
  const s = toMin(e.start_time!)
  const en = e.end_time ? toMin(e.end_time) : s + 60
  return { top: pct(s), height: `calc(${((en - s) / span) * 100}% - 2px)` }
}
function fmtHour(m: number) {
  const d = new Date(); d.setHours(m / 60, 0, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric' })
}

const nowMin = computed(() => now.value.getHours() * 60 + now.value.getMinutes())
const nowInRange = computed(() => nowMin.value >= range.value.start && nowMin.value <= range.value.end)
const isLive = (c: ClassSchedule) =>
  weekOffset.value === 0 &&
  c.weekday === todayNum.value && nowMin.value >= toMin(c.start_time) && nowMin.value < toMin(c.end_time)

// ---- next class ----
const next = computed(() => {
  const c = schedule.nextClassAt(now.value)
  if (!c) return null
  const { start } = classDateForToday(c, now.value)
  return { c, subject: subjects.byId(c.subject_id), start }
})

// How far into a currently-running class we are, 0–100 (drives the hero progress bar).
function liveProgress(c: ClassSchedule) {
  const s = toMin(c.start_time), e = toMin(c.end_time)
  return Math.min(100, Math.max(0, ((nowMin.value - s) / (e - s)) * 100))
}

// Week-at-a-glance: total recurring classes + weekly contact hours.
const weekStats = computed(() => {
  let minutes = 0
  for (const c of schedule.items) minutes += toMin(c.end_time) - toMin(c.start_time)
  return { count: schedule.items.length, hours: Math.round((minutes / 60) * 10) / 10 }
})

const gridEl = ref<HTMLElement | null>(null)
function goToday() {
  weekOffset.value = 0
  activeDay.value = todayNum.value
  gridEl.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

// Concrete date for the mobile day currently shown (this week).
const activeDate = computed(() => days.value.find(d => d.weekday === activeDay.value)?.date ?? now.value)

function openNew(d: number, date?: string) {
  editingClass.value = null
  editingEvent.value = null
  dayForNew.value = d
  dateForNew.value = date
  editorOpen.value = true
}
function openDetail(c: ClassSchedule) {
  detailItem.value = c
  detailOpen.value = true
}
function openEventDetail(e: AcademicEvent) {
  eventDetailItem.value = e
  eventDetailOpen.value = true
}
function openEdit(c: ClassSchedule) {
  detailOpen.value = false
  editingEvent.value = null
  editingClass.value = c
  editorOpen.value = true
}
function openEditEvent(e: AcademicEvent) {
  eventDetailOpen.value = false
  editingClass.value = null
  editingEvent.value = e
  editorOpen.value = true
}
</script>

<template>
  <div class="mx-auto max-w-7xl space-y-4">
    <!-- Header -->
    <header class="flex flex-wrap items-end justify-between gap-3">
      <div>
        <h2 class="t-page">{{ t('Weekly Schedule') }}</h2>
        <p class="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-night-600 dark:text-night-200">
          <span>Batch 22 · Evening shift · Term Mar 16 – Jun 26, 2026</span>
          <span v-if="weekStats.count" class="chip-brand !py-0.5">
            <Icon name="schedule" :size="12" />
            {{ weekStats.count }} {{ weekStats.count === 1 ? t('class') : t('classes') }} · {{ weekStats.hours }}h
          </span>
        </p>
      </div>
      <div class="flex items-center gap-2">
        <span class="mr-1 hidden text-sm tabular-nums text-night-500 dark:text-night-300 sm:block">{{ weekRange }}</span>
        <Button variant="secondary" size="sm" :aria-label="t('Previous Week')" @click="weekOffset--"><Icon name="chevron_left" :size="16" /></Button>
        <Button variant="secondary" size="sm" @click="goToday">{{ t('Today') }}</Button>
        <Button variant="secondary" size="sm" :aria-label="t('Next Week')" @click="weekOffset++"><Icon name="chevron_right" :size="16" /></Button>
        <Button size="sm" @click="openNew(activeDay)"><Icon name="plus" :size="16" /> {{ t('Add') }}</Button>
      </div>
    </header>

    <LoadError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="space-y-3">
      <Skeleton height="h-14" rounded="rounded-xl" />
      <Skeleton height="h-96" rounded="rounded-xl" />
    </div>
    <template v-else>

    <!-- Next class hero -->
    <div v-if="next" class="card relative overflow-hidden !rounded-2xl p-4 sm:p-5">
      <!-- subject-color wash + soft aura, layered over the glass surface -->
      <span aria-hidden="true" class="pointer-events-none absolute inset-0"
            :style="{ background: `linear-gradient(115deg, ${(next.subject?.color ?? '#5B7BD4')}22, transparent 55%)` }" />
      <span aria-hidden="true" class="pointer-events-none absolute -right-16 -top-16 h-48 w-48 rounded-full opacity-25 blur-3xl"
            :style="{ background: next.subject?.color ?? '#5B7BD4' }" />
      <div class="relative flex items-center gap-4">
        <!-- subject glyph -->
        <div class="grid h-14 w-14 shrink-0 place-items-center rounded-2xl text-lg font-bold text-white shadow-sm"
             :style="{ background: next.subject?.color ?? '#5B7BD4' }">
          {{ initials(next.subject?.name) }}
        </div>
        <div class="min-w-0 flex-1">
          <div class="flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-night-400 dark:text-night-300">
            <span v-if="isLive(next.c)" class="inline-flex items-center gap-1 text-red-500">
              <span class="h-1.5 w-1.5 animate-livePulse rounded-full bg-red-500" /> {{ t('Live now') }}
            </span>
            <span v-else>{{ t('Next class') }}</span>
          </div>
          <div class="mt-0.5 truncate text-lg font-semibold text-night-900 dark:text-night-50">
            {{ next.subject?.name ?? t('Unnamed subject') }}
          </div>
          <div class="mt-0.5 truncate text-sm text-night-500 dark:text-night-300">
            {{ t(WEEKDAY_LONG[next.c.weekday]) }} · {{ fmtTime(next.c.start_time) }} – {{ fmtTime(next.c.end_time) }}<template v-if="next.c.room"> · {{ t('Room {room}', { room: next.c.room }) }}</template>
          </div>
        </div>
        <div class="shrink-0 text-right">
          <template v-if="isLive(next.c)">
            <div class="text-2xl font-bold tabular-nums text-night-900 dark:text-night-50">{{ Math.round(liveProgress(next.c)) }}%</div>
            <div class="text-[11px] text-night-400 dark:text-night-300">{{ t('done') }}</div>
          </template>
          <template v-else>
            <div class="text-2xl font-bold tabular-nums text-night-900 dark:text-night-50">{{ humanCountdown(next.start, now) }}</div>
            <div class="text-[11px] text-night-400 dark:text-night-300">{{ t('to go') }}</div>
          </template>
        </div>
      </div>
      <!-- live progress bar -->
      <div v-if="isLive(next.c)" class="relative mt-4 h-1.5 overflow-hidden rounded-full bg-night-900/10 dark:bg-white/10">
        <span class="absolute inset-y-0 left-0 rounded-full transition-[width] duration-500"
              :style="{ width: liveProgress(next.c) + '%', background: next.subject?.color ?? '#5B7BD4' }" />
      </div>
    </div>

    <!-- Upcoming academic events (compact) -->
    <section v-if="upcoming.length" class="card p-4">
      <div class="mb-2.5 flex items-center justify-between">
        <h3 class="t-section">{{ t('Upcoming') }}</h3>
        <RouterLink to="/calendar" class="link text-xs">{{ t('Calendar') }}</RouterLink>
      </div>
      <ul class="divide-y divide-surface-border dark:divide-night-700">
        <li v-for="e in upcoming" :key="e.id">
          <button type="button" class="flex w-full items-center gap-3 py-2 text-left" @click="openEventDetail(e)">
            <span class="h-8 w-1 shrink-0 rounded-full" :style="{ background: EVENT_TYPE_META[e.type].color }" />
            <div class="min-w-0 flex-1">
              <div class="text-[10px] font-bold uppercase tracking-wide" :style="{ color: EVENT_TYPE_META[e.type].color }">{{ t(EVENT_TYPE_META[e.type].label) }}</div>
              <div class="truncate text-sm font-medium text-night-900 dark:text-white">
                {{ e.title || subjects.byId(e.subject_id)?.name || t(EVENT_TYPE_META[e.type].label) }}
              </div>
            </div>
            <div class="shrink-0 text-right">
              <div class="text-xs font-semibold tabular-nums text-night-700 dark:text-night-100">{{ eventDaysLeft(e) }}</div>
              <div class="text-[11px] text-night-500 dark:text-night-300">{{ fmtDate(e.event_date, { month: 'short', day: 'numeric' }) }}</div>
            </div>
          </button>
        </li>
      </ul>
    </section>

    <!-- Mobile: day tabs + stacked list -->
    <div class="lg:hidden">
      <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-2" role="tablist" aria-label="Day of week">
        <button v-for="d in days" :key="d.weekday"
                role="tab" :aria-selected="d.weekday === activeDay"
                :class="['flex flex-none flex-col items-center rounded-xl border px-3.5 py-1.5 transition-all duration-200',
                         d.weekday === activeDay
                           ? 'border-brand-500 bg-brand-600 text-white shadow-brand -translate-y-0.5'
                           : isToday(d.weekday)
                             ? 'border-brand-300 bg-white text-brand-700 font-semibold dark:border-brand-500/45 dark:bg-white/[0.06] dark:text-brand-300'
                             : 'border-surface-border bg-white text-night-600 hover:border-brand-300 hover:bg-brand-50 dark:border-night-700 dark:bg-white/[0.04] dark:text-night-100']"
                @click="activeDay = d.weekday">
          <span class="text-[10px] font-semibold uppercase tracking-wide opacity-80">{{ d.label }}</span>
          <span class="text-sm font-bold tabular-nums">{{ d.date.getDate() }}</span>
        </button>
      </div>

      <Card :padded="false" class="mt-1 overflow-hidden">
        <div class="flex items-center justify-between border-b border-[var(--card-border)] px-4 py-3">
          <h3 class="font-semibold text-night-900 dark:text-white">
            {{ WEEKDAY_LONG[activeDay] }}
            <span v-if="isToday(activeDay)" class="chip-brand ml-1.5 !py-0.5 !text-[10px] uppercase tracking-wide">{{ t('Today') }}</span>
          </h3>
          <button class="link text-sm font-medium" @click="openNew(activeDay)">+ {{ t('Add') }}</button>
        </div>
        <EmptyState v-if="schedule.byWeekday(activeDay).length === 0 && eventsOnDate(activeDate).length === 0"
                    icon="schedule" :title="t('Nothing scheduled')"
                    :body="t('Free day — enjoy it, or add something above.')" />
        <ul v-else class="divide-y divide-surface-border dark:divide-night-700">
          <li v-for="e in eventsOnDate(activeDate)" :key="e.id" class="p-1.5">
            <AcademicEventCard variant="row" :event="e" :subject="subjects.byId(e.subject_id)" @click="openEventDetail(e)" />
          </li>
          <li v-for="c in schedule.byWeekday(activeDay)" :key="c.id">
            <ClassCard variant="row" :item="c" :subject="subjects.byId(c.subject_id)"
                       :live="isLive(c)" @click="openDetail(c)" />
          </li>
        </ul>
      </Card>
    </div>

    <!-- Desktop: time-grid timetable -->
    <div ref="gridEl" class="card hidden overflow-hidden lg:block">
      <!-- Day headers -->
      <div class="grid grid-cols-[3.5rem_repeat(7,minmax(0,1fr))] border-b border-[var(--card-border)]">
        <div />
        <div v-for="d in days" :key="d.weekday"
             class="group border-l border-[var(--card-border)] py-2.5 text-center">
          <div :class="['text-[11px] font-bold uppercase tracking-wider',
                        isToday(d.weekday) ? 'text-brand-600 dark:text-brand-300' : 'text-night-500 dark:text-night-200']">
            {{ d.label }}
          </div>
          <div class="mt-1 flex items-center justify-center gap-1">
            <span :class="['flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold tabular-nums transition-all',
                           isToday(d.weekday) ? 'bg-brand-600 text-white shadow-[0_6px_16px_-6px_rgba(91,123,212,0.65)]' : 'text-night-800 dark:text-white']">
              {{ d.date.getDate() }}
            </span>
            <button class="flex h-6 w-6 items-center justify-center rounded-md text-night-400 opacity-0 transition-opacity hover:bg-night-100 hover:text-night-600 group-hover:opacity-100 dark:hover:bg-night-700 dark:hover:text-night-100"
                    :aria-label="t('Add class on {day}', { day: t(WEEKDAY_LONG[d.weekday]) })"
                    @click="openNew(d.weekday)">
              <Icon name="plus" :size="14" />
            </button>
          </div>
          <div class="mt-0.5 text-[10px] font-medium text-night-400 dark:text-night-300">
            {{ schedule.byWeekday(d.weekday).length
                ? schedule.byWeekday(d.weekday).length + (schedule.byWeekday(d.weekday).length === 1 ? ' ' + t('class') : ' ' + t('classes'))
                : '—' }}
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
               :class="['relative border-l border-[var(--card-border)]',
                        isToday(d.weekday) && 'bg-brand-500/[0.04] dark:bg-brand-400/[0.06]']">
            <div v-if="schedule.byWeekday(d.weekday).length === 0"
                 class="pointer-events-none absolute inset-x-2 top-1/2 flex -translate-y-1/2 flex-col items-center gap-1 text-center text-night-300 dark:text-night-500">
              <Icon :name="d.weekday === 0 || d.weekday === 6 ? 'heart' : 'schedule'" :size="18" class="opacity-60" />
              <span class="text-[11px] italic">{{ d.weekday === 0 || d.weekday === 6 ? t('Free day') : t('No class') }}</span>
            </div>

            <ClassCard v-for="c in schedule.byWeekday(d.weekday)" :key="c.id"
                       class="absolute inset-x-1.5" :style="blockStyle(c)"
                       :item="c" :subject="subjects.byId(c.subject_id)"
                       :live="isLive(c)" @click="openDetail(c)" />

            <!-- One-time events overlaid on their date -->
            <template v-for="e in eventsOnDate(d.date)" :key="e.id">
              <AcademicEventCard v-if="e.start_time" class="absolute inset-x-1.5 z-10" :style="eventBlockStyle(e)"
                                 :event="e" :subject="subjects.byId(e.subject_id)" @click="openEventDetail(e)" />
              <button v-else type="button" class="absolute inset-x-1.5 top-1 z-10 rounded-md px-1.5 py-0.5 text-left text-[10px] font-bold uppercase tracking-wide"
                      :style="{ background: EVENT_TYPE_META[e.type].color + '22', color: EVENT_TYPE_META[e.type].color }"
                      @click="openEventDetail(e)">{{ t(EVENT_TYPE_META[e.type].label) }}</button>
            </template>

            <!-- Now line — brand color with soft glow -->
            <div v-if="isToday(d.weekday) && nowInRange"
                 class="pointer-events-none absolute inset-x-0 z-20 flex items-center"
                 :style="{ top: pct(nowMin) }">
              <span class="-ml-1 h-2 w-2 rounded-full bg-brand-500 shadow-[0_0_10px_rgba(91,123,212,0.85)] animate-livePulse" />
              <span class="h-px flex-1 bg-brand-500/70" />
            </div>
          </div>
        </div>
      </div>
    </div>

    </template>

    <ClassDetail v-model:open="detailOpen" :item="detailItem" @edit="openEdit" />
    <AcademicEventDetail v-model:open="eventDetailOpen" :item="eventDetailItem" @edit="openEditEvent" />
    <ScheduleEditor
      v-model:open="editorOpen"
      :editing-class="editingClass"
      :editing-event="editingEvent"
      :default-weekday="dayForNew"
      :default-date="dateForNew"
    />
  </div>
</template>
