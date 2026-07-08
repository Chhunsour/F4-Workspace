<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useScheduleStore } from '@/stores/schedule'
import { useAssignmentsStore } from '@/stores/assignments'
import { useProjectsStore } from '@/stores/projects'
import { useSubjectsStore } from '@/stores/subjects'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import LoadError from '@/components/ui/LoadError.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import { fmtDate, localIso, WEEKDAY_LONG, startOfMonth, startOfWeek } from '@/lib/utils'
import { useI18n } from '@/composables/useI18n'

type View = 'month' | 'week' | 'agenda'

const schedule = useScheduleStore()
const assignments = useAssignmentsStore()
const projects = useProjectsStore()
const subjects = useSubjectsStore()
const { t } = useI18n()

const view = ref<View>('month')
const cursor = ref(new Date())

const { error, loading, load } = useLoad(() =>
  Promise.all([schedule.fetch(), assignments.fetch(), projects.fetch(), subjects.fetch()]))

interface Ev { date: Date; label: string; color: string; kind: 'class'|'assignment'|'project'; sub?: string; to: string }

function eventsForDate(d: Date): Ev[] {
  const iso = localIso(d)
  const out: Ev[] = []
  // classes on this weekday
  for (const c of schedule.byWeekday(d.getDay())) {
    const s = subjects.byId(c.subject_id)
    out.push({ date: d, label: `${(c.start_time||'').slice(0,5)} ${s?.name ?? t('Class')}`, color: s?.color ?? '#3a68ff', kind: 'class', sub: c.room ?? '', to: '/schedule' })
  }
  for (const a of assignments.items) {
    if (a.due_date === iso) {
      const s = subjects.byId(a.subject_id)
      out.push({ date: d, label: a.title, color: s?.color ?? '#ef4444', kind: 'assignment', to: `/assignments?id=${a.id}` })
    }
  }
  for (const p of projects.items) {
    if (p.deadline === iso) out.push({ date: d, label: t('{title} due', { title: p.name }), color: p.color ?? '#8b5cf6', kind: 'project', to: `/projects/${p.id}` })
  }
  return out
}

// ---- mobile: day strip + selected-day list ----
const selectedDay = ref(new Date())
const dayStrip = computed(() => {
  const start = new Date(); start.setHours(0,0,0,0)
  return Array.from({ length: 14 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i)
    return d
  })
})
const selectedDayEvents = computed(() => eventsForDate(selectedDay.value))
const isSelected = (d: Date) => localIso(d) === localIso(selectedDay.value)

const monthGrid = computed(() => {
  const first = startOfMonth(cursor.value)
  const gridStart = new Date(first); gridStart.setDate(first.getDate() - first.getDay())
  const cells: { date: Date; inMonth: boolean; events: Ev[] }[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart); d.setDate(gridStart.getDate() + i)
    cells.push({ date: d, inMonth: d.getMonth() === cursor.value.getMonth(), events: eventsForDate(d) })
  }
  return cells
})

const weekGrid = computed(() => {
  const start = startOfWeek(cursor.value)
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(start); d.setDate(start.getDate() + i)
    return { date: d, events: eventsForDate(d) }
  })
})

const agenda = computed(() => {
  const arr: { date: Date; events: Ev[] }[] = []
  const start = new Date(); start.setHours(0,0,0,0)
  for (let i = 0; i < 30; i++) {
    const d = new Date(start); d.setDate(start.getDate() + i)
    const events = eventsForDate(d)
    if (events.length) arr.push({ date: d, events })
  }
  return arr
})

const monthLabel = computed(() => cursor.value.toLocaleDateString(undefined, { month:'long', year:'numeric' }))
const isToday = (d: Date) => new Date().toDateString() === d.toDateString()

function shift(mult: number) {
  const d = new Date(cursor.value)
  if (view.value === 'month') d.setMonth(d.getMonth() + mult)
  else if (view.value === 'week') d.setDate(d.getDate() + 7 * mult)
  else d.setDate(d.getDate() + mult)
  cursor.value = d
}
function jumpToday() { cursor.value = new Date() }
</script>

<template>
  <div class="max-w-6xl mx-auto space-y-4">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-2xl font-semibold">{{ monthLabel }}</h2>
        <p class="text-sm text-night-500">{{ t('Classes, assignments, project deadlines — all in one view.') }}</p>
      </div>
      <!-- view switch + paging: desktop only; mobile gets the day strip below -->
      <div class="hidden sm:flex items-center gap-2">
        <div class="tile p-0.5 flex text-sm">
          <button v-for="v in ['month','week','agenda']" :key="v"
                  @click="view = v as View"
                  :class="['px-3 py-1.5 rounded-lg capitalize transition-colors',
                           view === v ? 'bg-brand-600 text-white' : 'text-night-700 dark:text-night-100']">
            {{ t(v) }}
          </button>
        </div>
        <Button variant="secondary" size="sm" @click="shift(-1)"><Icon name="chevron_left" :size="16" /></Button>
        <Button variant="secondary" size="sm" @click="jumpToday">{{ t('Today') }}</Button>
        <Button variant="secondary" size="sm" @click="shift(1)"><Icon name="chevron_right" :size="16" /></Button>
      </div>
    </div>

    <LoadError v-if="error" :message="error" @retry="load" />
    <Skeleton v-else-if="loading" height="h-96" rounded="rounded-xl" />

    <template v-else>

    <!-- ============ Mobile: day strip + selected-day timeline ============ -->
    <div class="sm:hidden space-y-3">
      <div class="-mx-1 flex gap-1.5 overflow-x-auto px-1 pb-1">
        <button v-for="d in dayStrip" :key="d.toISOString()"
                :class="['flex flex-none flex-col items-center rounded-xl border px-3.5 py-1.5 transition-colors',
                         isSelected(d)
                           ? 'border-brand-600 bg-brand-600 text-white'
                           : isToday(d)
                             ? 'border-brand-400/60 tile text-brand-600 dark:text-brand-300'
                             : 'tile border-transparent text-night-600 dark:text-night-200']"
                @click="selectedDay = d">
          <span class="text-[10px] font-medium uppercase tracking-wide opacity-70">{{ WEEKDAY_LONG[d.getDay()].slice(0,3) }}</span>
          <span class="text-sm font-semibold tabular-nums">{{ d.getDate() }}</span>
        </button>
      </div>

      <Card padded class="!p-4">
        <div class="t-section mb-2">{{ fmtDate(selectedDay, { weekday:'long', month:'long', day:'numeric' }) }}</div>
        <ul v-if="selectedDayEvents.length" class="space-y-1.5">
          <li v-for="(e, i) in selectedDayEvents" :key="i">
            <RouterLink :to="e.to" class="tile tile-hover flex items-center gap-2.5 px-3 py-2.5 text-sm">
              <span class="h-2.5 w-2.5 rounded-full shrink-0" :style="{ background: e.color }" />
              <span class="flex-1 truncate text-night-900 dark:text-night-50">{{ e.label }}</span>
              <span v-if="e.sub" class="text-xs text-night-500 shrink-0">{{ e.sub }}</span>
              <Icon name="chevron_right" :size="14" class="text-night-400 shrink-0" />
            </RouterLink>
          </li>
        </ul>
        <p v-else class="text-sm text-night-500 dark:text-night-300 py-4 text-center">{{ t('Nothing on this day.') }}</p>
      </Card>
    </div>

    <!-- ============ Desktop views ============ -->
    <!-- month -->
    <Card v-if="view === 'month'" padded class="!p-3 hidden sm:block">
      <div class="grid grid-cols-7 gap-1 text-[11px] text-night-500 uppercase tracking-wide mb-1">
        <div v-for="d in WEEKDAY_LONG" :key="d" class="text-center py-1">{{ t(d).slice(0,3) }}</div>
      </div>
      <div class="grid grid-cols-7 gap-1">
        <div v-for="cell in monthGrid" :key="cell.date.toISOString()"
             :class="['min-h-[92px] rounded-lg border p-1.5 transition-colors',
                      cell.inMonth ? 'bg-white dark:bg-night-800' : 'bg-night-50/60 dark:bg-night-900/50 text-night-400',
                      isToday(cell.date) ? 'border-brand-400 ring-2 ring-brand-200 dark:ring-brand-900' : 'border-surface-border dark:border-night-700']">
          <div class="text-[11px] font-medium">{{ cell.date.getDate() }}</div>
          <ul class="mt-1 space-y-0.5">
            <li v-for="(e, i) in cell.events.slice(0,3)" :key="i">
              <RouterLink :to="e.to"
                          class="block text-[10px] px-1.5 py-0.5 rounded truncate text-white hover:opacity-85 transition-opacity"
                          :style="{ background: e.color }" :title="e.label">
                {{ e.label }}
              </RouterLink>
            </li>
            <li v-if="cell.events.length > 3" class="text-[10px] text-night-500">+{{ cell.events.length - 3 }} {{ t('more') }}</li>
          </ul>
        </div>
      </div>
    </Card>

    <!-- week -->
    <div v-else-if="view === 'week'" class="hidden sm:grid grid-cols-7 gap-3">
      <div v-for="w in weekGrid" :key="w.date.toISOString()"
           :class="['card p-3 min-h-[300px]', isToday(w.date) && 'ring-2 ring-brand-400']">
        <div class="mb-2">
          <div class="text-[11px] uppercase tracking-wide text-night-500">{{ t(WEEKDAY_LONG[w.date.getDay()]).slice(0,3) }}</div>
          <div class="font-semibold">{{ w.date.getDate() }}</div>
        </div>
        <ul class="space-y-1.5">
          <li v-for="(e, i) in w.events" :key="i">
            <RouterLink :to="e.to"
                        class="block rounded-lg px-2 py-1.5 text-xs text-white hover:opacity-85 transition-opacity"
                        :style="{ background: e.color }">
              {{ e.label }}
            </RouterLink>
          </li>
        </ul>
      </div>
    </div>

    <!-- agenda -->
    <Card v-else padded class="!p-4 hidden sm:block">
      <ul v-if="agenda.length" class="divide-y" style="border-color: var(--glass-hair)">
        <li v-for="day in agenda" :key="day.date.toISOString()" class="py-3">
          <div class="text-xs uppercase tracking-wide text-night-500 mb-2">{{ fmtDate(day.date, { weekday:'long', month:'long', day:'numeric' }) }}</div>
          <ul class="space-y-1.5">
            <li v-for="(e, i) in day.events" :key="i">
              <RouterLink :to="e.to" class="flex items-center gap-2 text-sm rounded-lg px-1.5 py-1 -mx-1.5 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                <span class="h-2 w-2 rounded-full shrink-0" :style="{ background: e.color }" />
                <span class="capitalize text-[10px] chip">{{ t(e.kind) }}</span>
                <span class="flex-1 truncate">{{ e.label }}</span>
                <span v-if="e.sub" class="text-xs text-night-500">{{ e.sub }}</span>
              </RouterLink>
            </li>
          </ul>
        </li>
      </ul>
      <p v-else class="text-sm text-night-500">{{ t('Nothing on the calendar for the next 30 days.') }}</p>
    </Card>

    </template>
  </div>
</template>
