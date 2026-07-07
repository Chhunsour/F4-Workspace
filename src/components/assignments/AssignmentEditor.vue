<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import Button from '@/components/ui/Button.vue'
import { useAssignmentsStore } from '@/stores/assignments'
import { useSubjectsStore } from '@/stores/subjects'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import type { Assignment } from '@/types'

const props = defineProps<{ open: boolean; editing?: Assignment | null }>()
const emit  = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const store = useAssignmentsStore()
const subjects = useSubjectsStore()
const toast = useToast()
const confirm = useConfirm()

const form = reactive({
  title: '', description: '', subject_id: null as string | null,
  due_date: '' as string, due_time: '' as string,
  priority: 'normal' as Assignment['priority'],
  status:   'todo'   as Assignment['status'],
  progress: 0, notes: '',
})
const err = reactive<Record<string,string>>({})
const loading = computed(() => false)

watch(() => [props.open, props.editing], () => {
  if (props.editing) {
    Object.assign(form, {
      title: props.editing.title,
      description: props.editing.description ?? '',
      subject_id:  props.editing.subject_id,
      due_date:    props.editing.due_date ?? '',
      due_time:    (props.editing.due_time ?? '').slice(0,5),
      priority:    props.editing.priority,
      status:      props.editing.status,
      progress:    props.editing.progress,
      notes:       props.editing.notes ?? '',
    })
  } else {
    Object.assign(form, { title: '', description: '', subject_id: null, due_date: '', due_time: '', priority: 'normal', status: 'todo', progress: 0, notes: '' })
  }
  for (const k of Object.keys(err)) delete err[k]
}, { immediate: true })

const subjectOptions = computed(() => subjects.items.map(s => ({ value: s.id, label: s.name })))

async function save() {
  for (const k of Object.keys(err)) delete err[k]
  if (!form.title.trim()) err.title = 'Title required'
  if (Object.keys(err).length) return
  try {
    const payload = {
      title: form.title.trim(),
      description: form.description || null,
      subject_id: form.subject_id,
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      priority: form.priority,
      status: form.status,
      progress: Number(form.progress),
      notes: form.notes || null,
    }
    if (props.editing) {
      await store.update(props.editing.id, payload)
      toast.success('Assignment updated')
    } else {
      await store.create(payload as any)
      toast.success('Assignment added')
    }
    emit('update:open', false)
  } catch (e: any) { toast.error('Could not save', e?.message) }
}

async function remove() {
  if (!props.editing) return
  const ok = await confirm.ask({ title: 'Delete assignment?', destructive: true, confirmLabel: 'Delete' })
  if (!ok) return
  await store.remove(props.editing.id)
  toast.success('Deleted')
  emit('update:open', false)
}
</script>

<template>
  <Modal :open="props.open" wide @update:open="v => emit('update:open', v)" :title="props.editing ? 'Edit assignment' : 'New assignment'">
    <form class="space-y-4" @submit.prevent="save">
      <Input v-model="form.title" label="Title" placeholder="e.g. ER diagram for Amazon-style store" required :error="err.title" />
      <Textarea v-model="form.description" label="Description" :rows="3" placeholder="What needs to be done?" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select v-model="form.subject_id" :options="subjectOptions" label="Subject" placeholder="No subject" />
        <Select v-model="form.priority as any" label="Priority" :options="[
          { value: 'low', label: 'Low' },{ value: 'normal', label: 'Normal' },
          { value: 'high', label: 'High' },{ value: 'urgent', label: 'Urgent' },
        ]" />
        <Input v-model="form.due_date" type="date" label="Due date" />
        <Input v-model="form.due_time" type="time" label="Due time" />
        <Select v-model="form.status as any" label="Status" :options="[
          { value: 'todo', label: 'To Do' },{ value: 'in_progress', label: 'In Progress' },
          { value: 'review', label: 'Review' },{ value: 'completed', label: 'Completed' },
        ]" />
        <Input v-model="form.progress as any" type="number" min="0" max="100" step="5" label="Progress %" />
      </div>
      <Textarea v-model="form.notes" label="Notes" :rows="2" />
    </form>
    <template #footer>
      <Button v-if="props.editing" variant="danger" size="sm" @click="remove">Delete</Button>
      <div class="flex-1" />
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
      <Button size="sm" :loading="loading" @click="save">{{ props.editing ? 'Save' : 'Create' }}</Button>
    </template>
  </Modal>
</template>
