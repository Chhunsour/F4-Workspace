<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useAssignmentsStore } from '@/stores/assignments'
import { useSubjectsStore } from '@/stores/subjects'
import Card from '@/components/ui/Card.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import EmptyState from '@/components/ui/EmptyState.vue'
import AssignmentRow from '@/components/assignments/AssignmentRow.vue'
import AssignmentEditor from '@/components/assignments/AssignmentEditor.vue'
import type { Assignment } from '@/types'
import { STATUS_LABELS } from '@/types'

const store = useAssignmentsStore()
const subjects = useSubjectsStore()
const route = useRoute()
const router = useRouter()

const editorOpen = ref(false)
const editing = ref<Assignment | null>(null)

onMounted(async () => {
  await Promise.all([store.fetch(), subjects.fetch()])
  if (route.query.new === '1') openNew()
})

watch(() => route.query.new, (n) => { if (n === '1') openNew() })

function openNew() {
  editing.value = null; editorOpen.value = true
  if (route.query.new) router.replace({ query: { ...route.query, new: undefined } })
}
function openEdit(a: Assignment) { editing.value = a; editorOpen.value = true }

const grouped = computed(() => {
  const g: Record<string, Assignment[]> = { todo: [], in_progress: [], review: [], completed: [] }
  for (const a of store.filtered) g[a.status]?.push(a)
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
          { value: 'todo', label: 'To Do' },{ value: 'in_progress', label: 'In Progress' },
          { value: 'review', label: 'Review' },{ value: 'completed', label: 'Completed' },
        ]" />
      </div>
    </Card>

    <EmptyState v-if="store.items.length === 0" icon="check" title="No assignments yet"
                body="Add your first one to start tracking deadlines.">
      <Button @click="openNew"><Icon name="plus" :size="16" /> New assignment</Button>
    </EmptyState>

    <div v-else class="space-y-8">
      <section v-for="col in (['todo','in_progress','review','completed'] as const)" :key="col">
        <div class="flex items-center gap-3 mb-2">
          <h3 class="text-sm font-semibold text-night-500 uppercase tracking-wide">
            {{ STATUS_LABELS[col].label }}
          </h3>
          <span class="chip">{{ grouped[col].length }}</span>
        </div>
        <div v-if="grouped[col].length" class="space-y-2">
          <AssignmentRow v-for="a in grouped[col]" :key="a.id" :item="a" @edit="openEdit" />
        </div>
        <div v-else class="text-xs text-night-400 italic px-4 py-2">nothing here</div>
      </section>
    </div>

    <AssignmentEditor v-model:open="editorOpen" :editing="editing" />
  </div>
</template>
