<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useLoad } from '@/composables/useLoad'
import { useAssignmentsStore } from '@/stores/assignments'
import { useSubjectsStore } from '@/stores/subjects'
import Card from '@/components/ui/Card.vue'
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

const store = useAssignmentsStore()
const subjects = useSubjectsStore()
const route = useRoute()
const router = useRouter()

const editorOpen = ref(false)
const editing = ref<Assignment | null>(null)

const { error, loading, load } = useLoad(async () => {
  await Promise.all([store.fetch(), subjects.fetch()])
  if (route.query.new === '1') openNew()
})

watch(() => route.query.new, (n) => { if (n === '1') openNew() })

function openNew() {
  editing.value = null; editorOpen.value = true
  if (route.query.new) router.replace({ query: { ...route.query, new: undefined } })
}
function openEdit(a: Assignment) { editing.value = a; editorOpen.value = true }

// Student-simple grouping: To Do / Doing / Done. Legacy 'review' rows fold into Doing.
const SECTIONS = [
  { key: 'todo',        label: 'To Do' },
  { key: 'in_progress', label: 'Doing' },
  { key: 'completed',   label: 'Done'  },
] as const
const grouped = computed(() => {
  const g: Record<string, Assignment[]> = { todo: [], in_progress: [], completed: [] }
  for (const a of store.filtered) g[a.status === 'review' ? 'in_progress' : a.status]?.push(a)
  return g
})

const subjectOptions = computed(() => [{ value: '', label: 'All subjects' }, ...subjects.items.map(s => ({ value: s.id, label: s.name }))])
</script>

<template>
  <div class="max-w-5xl mx-auto space-y-6">
    <div class="flex items-center justify-between flex-wrap gap-3">
      <div>
        <h2 class="text-2xl font-semibold">Assignments</h2>
        <p class="text-sm text-night-500">
          {{ store.items.length }} total · {{ store.overdueCount }} overdue · {{ store.completedThisWeek }} done this week
        </p>
      </div>
      <Button @click="openNew"><Icon name="plus" :size="16" /> New assignment</Button>
    </div>

    <LoadError v-if="error" :message="error" @retry="load" />
    <div v-else-if="loading" class="space-y-2">
      <Skeleton v-for="i in 4" :key="i" height="h-20" rounded="rounded-xl" />
    </div>
    <template v-else>

    <Card padded class="!p-3">
      <div class="grid gap-2 md:grid-cols-4">
        <Input v-model="store.filter.q" placeholder="Search title or description…" />
        <Select v-model="store.filter.subject" :options="subjectOptions" />
        <Select v-model="store.filter.priority as any" :options="[
          { value: '', label: 'Any priority' },
          { value: 'low', label: 'Low' },{ value: 'normal', label: 'Normal' },
          { value: 'high', label: 'High' },{ value: 'urgent', label: 'Urgent' },
        ]" />
        <Select v-model="store.filter.status as any" :options="[
          { value: '', label: 'Any status' },
          { value: 'todo', label: 'To Do' },{ value: 'in_progress', label: 'Doing' },
          { value: 'completed', label: 'Done' },
        ]" />
      </div>
    </Card>

    <EmptyState v-if="store.items.length === 0" icon="check" title="No assignments yet"
                body="Add your first one to start tracking deadlines.">
      <Button @click="openNew"><Icon name="plus" :size="16" /> New assignment</Button>
    </EmptyState>

    <div v-else class="space-y-8">
      <section v-for="col in SECTIONS" :key="col.key">
        <template v-if="grouped[col.key].length || col.key === 'todo'">
          <div class="flex items-center gap-3 mb-2">
            <h3 class="text-sm font-semibold text-night-500 uppercase tracking-wide">{{ col.label }}</h3>
            <span class="chip">{{ grouped[col.key].length }}</span>
          </div>
          <div v-if="grouped[col.key].length" class="space-y-2">
            <AssignmentRow v-for="a in grouped[col.key]" :key="a.id" :item="a" @edit="openEdit" />
          </div>
          <div v-else class="text-xs text-night-400 italic px-4 py-2">nothing here</div>
        </template>
      </section>
    </div>

    </template>

    <AssignmentEditor v-model:open="editorOpen" :editing="editing" />
  </div>
</template>
