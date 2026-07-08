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

// Sidebar quick views: /assignments?f=overdue|due-soon|done
const FILTER_TO_SECTIONS: Record<string, SectionKey[]> = {
  'overdue':  ['overdue'],
  'due-soon': ['overdue', 'today', 'soon'],
  'done':     ['done'],
}
const activeSections = computed<SectionKey[]>(() =>
  FILTER_TO_SECTIONS[String(route.query.f ?? '')] ?? SECTIONS.map(x => x.key))

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
  g.done = g.done.slice(0, 10)
  return g
})

const subjectOptions = computed(() => [{ value: '', label: t('All subjects') }, ...subjects.items.map(s => ({ value: s.id, label: s.name }))])
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-2xl font-semibold">{{ t('Tasks') }}</h2>
        <p class="text-sm text-night-500">
          {{ store.overdueCount ? t('{count} overdue · ', { count: store.overdueCount }) : '' }}{{ t('{count} done this week', { count: store.completedThisWeek }) }}
        </p>
      </div>
      <Button @click="openNew"><Icon name="plus" :size="16" /> {{ t('New task') }}</Button>
    </div>

    <LoadError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="space-y-2">
      <Skeleton v-for="i in 4" :key="i" height="h-20" rounded="rounded-xl" />
    </div>
    <template v-else>

    <div class="flex flex-col gap-2 sm:flex-row">
      <Input v-model="store.filter.q" :placeholder="t('Search tasks…')" class="sm:flex-1" />
      <Select v-model="store.filter.subject" :options="subjectOptions" class="sm:w-56" />
    </div>

    <EmptyState v-if="store.items.length === 0" icon="check" :title="t('No tasks yet')"
                :body="t('Add your first one to start tracking deadlines.')">
      <Button @click="openNew"><Icon name="plus" :size="16" /> {{ t('New task') }}</Button>
    </EmptyState>

    <div v-else class="space-y-8">
      <section v-for="col in SECTIONS.filter(c => activeSections.includes(c.key))" :key="col.key">
        <template v-if="grouped[col.key].length || col.key === 'today'">
          <div class="flex items-center gap-3 mb-2">
            <h3 :class="['text-sm font-semibold uppercase tracking-wide',
                         col.key === 'overdue' ? 'text-red-500' : 'text-night-500']">{{ t(col.label) }}</h3>
            <span class="chip">{{ grouped[col.key].length }}</span>
            <span v-if="col.key === 'overdue' && grouped.overdue.length" class="text-xs text-night-400">
              {{ grouped.overdue.length === 1 ? t('This one needs attention.') : t('These need attention.') }}
            </span>
          </div>
          <div v-if="grouped[col.key].length" class="space-y-2">
            <AssignmentRow v-for="a in grouped[col.key]" :key="a.id" :item="a" @edit="openEdit" />
          </div>
          <div v-else class="text-xs text-night-400 italic px-4 py-2">{{ t('Nothing due today.') }}</div>
        </template>
      </section>
    </div>

    </template>

    <AssignmentEditor v-model:open="editorOpen" :editing="editing" :default-subject="newSubject" />
  </div>
</template>
