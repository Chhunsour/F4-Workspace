<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useAssignmentsStore } from '@/stores/assignments'
import { useSubjectsStore } from '@/stores/subjects'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import ProgressBar from '@/components/ui/ProgressBar.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import LoadError from '@/components/ui/LoadError.vue'
import Skeleton from '@/components/ui/Skeleton.vue'
import AssignmentRow from '@/components/assignments/AssignmentRow.vue'
import AssignmentEditor from '@/components/assignments/AssignmentEditor.vue'
import type { Assignment } from '@/types'
import { useI18n } from '@/composables/useI18n'

const store = useAssignmentsStore()
const subjects = useSubjectsStore()
const route = useRoute()
const router = useRouter()
const { t } = useI18n()

const editorOpen = ref(false)
const editing = ref<Assignment | null>(null)
const newSubject = ref<string | null>(null)

const { error, loading, load } = useLoad(async () => {
  await Promise.all([store.fetch(), subjects.fetch()])
  if (route.query.new === '1') openNew()
  else if (route.query.id) openById(String(route.query.id))
})

watch(() => route.query.new, (n) => { if (n === '1') openNew() })
watch(() => route.query.id, (id) => { if (id && store.loaded) openById(String(id)) })

function openNew() {
  editing.value = null
  newSubject.value = route.query.subject ? String(route.query.subject) : null
  editorOpen.value = true
  if (route.query.new) router.replace({ query: { ...route.query, new: undefined, subject: undefined } })
}
function openEdit(a: Assignment) { editing.value = a; editorOpen.value = true }
// Deep link from calendar/dashboard: /assignments?id=… opens that assignment.
function openById(id: string) {
  const a = store.items.find(x => x.id === id)
  if (a) openEdit(a)
  router.replace({ query: { ...route.query, id: undefined } })
}

// Grouped by when it's due, not by workflow — that's what students scan for.
// Status still lives on each row (checkbox + Doing chip + editor).
const SECTIONS = [
  { key: 'overdue', label: 'Overdue' },
  { key: 'today',   label: 'Today' },
  { key: 'soon',    label: 'Due soon' },
  { key: 'later',   label: 'Later' },
  { key: 'done',    label: 'Done' },
] as const
type SectionKey = typeof SECTIONS[number]['key']

// Sidebar quick views + in-page tiles: /assignments?f=…
const FILTER_TO_SECTIONS: Record<string, SectionKey[]> = {
  'overdue':  ['overdue'],
  'today':    ['today'],
  'soon':     ['soon'],
  'due-soon': ['overdue', 'today', 'soon'], // legacy sidebar link
  'done':     ['done'],
}
const activeF = computed(() => String(route.query.f ?? ''))
const activeSections = computed<SectionKey[]>(() =>
  FILTER_TO_SECTIONS[activeF.value] ?? SECTIONS.map(x => x.key))

function setFilter(f: string) {
  router.replace({ query: { ...route.query, f: f || undefined } })
}

const grouped = computed(() => {
  const now = new Date()
  const endToday = new Date(); endToday.setHours(23, 59, 59, 999)
  const soonCutoff = new Date(); soonCutoff.setDate(soonCutoff.getDate() + 7); soonCutoff.setHours(23, 59, 59, 999)
  const g: Record<SectionKey, Assignment[]> = { overdue: [], today: [], soon: [], later: [], done: [] }
  const dueOf = (a: Assignment) => a.due_date ? new Date(`${a.due_date}T${a.due_time ?? '23:59'}:00`) : null
  const sorted = [...store.filtered].sort((a, b) => (a.due_date ?? '9999') .localeCompare(b.due_date ?? '9999'))
  for (const a of sorted) {
    if (a.status === 'completed') { g.done.push(a); continue }
    const due = dueOf(a)
    if (!due) g.later.push(a)
    else if (due < now) g.overdue.push(a)
    else if (due <= endToday) g.today.push(a)
    else if (due <= soonCutoff) g.soon.push(a)
    else g.later.push(a)
  }
  return g
})

// Tile row = at-a-glance summary AND the quick filter (active tile highlighted).
const counts = computed(() => {
  const g = grouped.value
  return {
    all: g.overdue.length + g.today.length + g.soon.length + g.later.length,
    overdue: g.overdue.length,
    today: g.today.length,
    soon: g.soon.length,
    done: g.done.length,
  }
})
const TILES = [
  { f: '',        key: 'all',     label: 'All',      accent: 'text-brand-700 dark:text-brand-300',        dot: 'bg-brand-500' },
  { f: 'overdue', key: 'overdue', label: 'Overdue',  accent: 'text-red-600 dark:text-red-300',           dot: 'bg-red-500' },
  { f: 'today',   key: 'today',   label: 'Today',    accent: 'text-brand-700 dark:text-brand-300',        dot: 'bg-brand-500' },
  { f: 'soon',    key: 'soon',    label: 'Due soon', accent: 'text-tangerine-600 dark:text-tangerine-300', dot: 'bg-tangerine-500' },
  { f: 'done',    key: 'done',    label: 'Done',     accent: 'text-grass-600 dark:text-grass-300',        dot: 'bg-grass-500' },
] as const

const doneTotal = computed(() => counts.value.done)
const totalAll = computed(() => counts.value.all + counts.value.done)
const donePct = computed(() => totalAll.value ? Math.round(doneTotal.value / totalAll.value * 100) : 0)

const subjectOptions = computed(() => [{ value: '', label: t('All subjects') }, ...subjects.items.map(s => ({ value: s.id, label: s.name }))])
const visibleSections = computed(() => SECTIONS.filter(c => activeSections.value.includes(c.key) && grouped.value[c.key].length))
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-5">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="t-page">{{ t('Tasks') }}</h2>
        <p class="text-sm text-night-500 dark:text-night-300">
          {{ store.overdueCount ? t('{count} overdue · ', { count: store.overdueCount }) : '' }}{{ t('{count} done this week', { count: store.completedThisWeek }) }}
        </p>
      </div>
      <Button @click="openNew"><Icon name="plus" :size="16" /> {{ t('New task') }}</Button>
    </div>

    <LoadError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="space-y-2">
      <Skeleton v-for="i in 4" :key="i" height="h-20" rounded="rounded-xl" />
    </div>

    <EmptyState v-else-if="store.items.length === 0" icon="check" :title="t('No tasks yet')"
                :body="t('Add your first one to start tracking deadlines.')">
      <Button @click="openNew"><Icon name="plus" :size="16" /> {{ t('New task') }}</Button>
    </EmptyState>

    <template v-else>
      <!-- Momentum: how much of everything is done -->
      <div v-if="totalAll" class="hero-surface p-5 flex items-center gap-5">
        <div class="shrink-0 text-center w-16">
          <div class="text-3xl font-bold tabular-nums leading-none text-brand-700 dark:text-brand-300">{{ donePct }}<span class="text-base text-night-500 dark:text-night-300">%</span></div>
          <div class="t-section mt-1">{{ t('Done') }}</div>
        </div>
        <div class="flex-1 min-w-0">
          <div class="flex items-center justify-between text-xs text-night-600 dark:text-night-100 mb-2">
            <span class="font-medium">{{ t('{count} done this week', { count: store.completedThisWeek }) }}</span>
            <span class="tabular-nums font-semibold">{{ doneTotal }} / {{ totalAll }}</span>
          </div>
          <ProgressBar :value="donePct" glow />
        </div>
      </div>

      <!-- Filter tiles: summary + one-tap quick views. Active = brand tint. -->
      <div class="grid grid-cols-3 sm:grid-cols-5 gap-2.5">
        <button v-for="tile in TILES" :key="tile.key" type="button"
                @click="setFilter(tile.f)"
                :aria-pressed="activeF === tile.f"
                :class="['relative text-left px-3 py-2.5 rounded-xl border transition-all duration-150',
                         activeF === tile.f
                           ? 'border-brand-500 bg-brand-500/12 dark:bg-brand-400/18 -translate-y-0.5 shadow-brand'
                           : 'border-[var(--card-border)] bg-[var(--card-bg-soft)] hover:border-brand-300 hover:-translate-y-0.5 dark:hover:border-brand-400/40']">
          <div class="flex items-center gap-1.5">
            <span :class="['h-1.5 w-1.5 rounded-full', tile.dot]" />
            <span class="t-section">{{ t(tile.label) }}</span>
          </div>
          <div :class="['mt-1 text-2xl font-bold tabular-nums leading-none', counts[tile.key] ? tile.accent : 'text-night-400 dark:text-night-300']">
            {{ counts[tile.key] }}
          </div>
        </button>
      </div>

      <div class="flex flex-col gap-2 sm:flex-row">
        <Input v-model="store.filter.q" :placeholder="t('Search tasks…')" class="sm:flex-1" />
        <Select v-model="store.filter.subject" :options="subjectOptions" class="sm:w-56" />
      </div>

      <div v-if="visibleSections.length" class="space-y-7">
        <section v-for="col in visibleSections" :key="col.key">
          <div class="flex items-center gap-2.5 mb-2.5">
            <h3 :class="['t-section flex items-center gap-2',
                         col.key === 'overdue' && '!text-red-600 dark:!text-red-300',
                         col.key === 'soon' && '!text-tangerine-600 dark:!text-tangerine-300',
                         col.key === 'done' && '!text-grass-600 dark:!text-grass-300']">
              <span v-if="col.key === 'today'" class="inline-block h-1.5 w-1.5 rounded-full bg-brand-500 shadow-[0_0_6px_rgba(91,123,212,0.7)]" />
              {{ t(col.label) }}
            </h3>
            <span class="count-pill">{{ grouped[col.key].length }}</span>
          </div>
          <TransitionGroup name="task" tag="div" class="relative space-y-2">
            <AssignmentRow v-for="a in grouped[col.key]" :key="a.id" :item="a" @edit="openEdit" />
          </TransitionGroup>
        </section>
      </div>

      <!-- Filter applied but nothing matches it -->
      <EmptyState v-else icon="check"
                  :title="t('All clear')"
                  :body="t('Nothing here right now.')">
        <Button variant="ghost" @click="setFilter('')">{{ t('Show all tasks') }}</Button>
      </EmptyState>
    </template>

    <AssignmentEditor v-model:open="editorOpen" :editing="editing" :default-subject="newSubject" />
  </div>
</template>

<style scoped>
/* Smooth add / remove / reorder of task rows within a section. */
.task-move,
.task-enter-active,
.task-leave-active { transition: opacity 0.28s ease, transform 0.28s cubic-bezier(0.22,1,0.36,1); }
.task-enter-from { opacity: 0; transform: translateY(-6px); }
.task-leave-to   { opacity: 0; transform: translateX(8px); }
.task-leave-active { position: absolute; width: 100%; }
@media (prefers-reduced-motion: reduce) {
  .task-move, .task-enter-active, .task-leave-active { transition: none; }
}
</style>
