<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import { useProjectsStore } from '@/stores/projects'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { nanoid } from '@/lib/utils'
import type { ProjectTask } from '@/types'

const props = defineProps<{ open: boolean; projectId: string; editing?: ProjectTask | null; defaultStatus?: ProjectTask['status'] }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const store = useProjectsStore()
const toast = useToast()
const confirm = useConfirm()

const form = reactive({
  title: '', description: '', status: 'todo' as ProjectTask['status'], due_date: '',
  checklist: [] as { id: string; text: string; done: boolean }[],
  newItem: '',
})
watch(() => [props.open, props.editing, props.defaultStatus], () => {
  if (props.editing) {
    Object.assign(form, {
      title: props.editing.title, description: props.editing.description ?? '',
      status: props.editing.status, due_date: props.editing.due_date ?? '',
      checklist: JSON.parse(JSON.stringify(props.editing.checklist ?? [])),
      newItem: '',
    })
  } else {
    Object.assign(form, { title: '', description: '', status: props.defaultStatus ?? 'todo', due_date: '', checklist: [], newItem: '' })
  }
}, { immediate: true })

function addChecklistItem() {
  if (!form.newItem.trim()) return
  form.checklist.push({ id: nanoid(6), text: form.newItem.trim(), done: false })
  form.newItem = ''
}
function removeChecklistItem(id: string) {
  form.checklist = form.checklist.filter(c => c.id !== id)
}

async function save() {
  if (!form.title.trim()) return
  const payload = {
    title: form.title.trim(), description: form.description || null,
    status: form.status, due_date: form.due_date || null,
    checklist: form.checklist,
  } as Partial<ProjectTask>
  try {
    if (props.editing) {
      await store.updateTask(props.editing.id, payload)
      toast.success('Task updated')
    } else {
      await store.addTask(props.projectId, payload as any)
      toast.success('Task added')
    }
    emit('update:open', false)
  } catch (e: any) { toast.error('Could not save', e?.message) }
}
async function remove() {
  if (!props.editing) return
  const ok = await confirm.ask({ title: 'Delete task?', destructive: true, confirmLabel: 'Delete' })
  if (!ok) return
  await store.removeTask(props.editing.id)
  toast.success('Task deleted')
  emit('update:open', false)
}
</script>

<template>
  <Modal :open="props.open" @update:open="v => emit('update:open', v)" :title="props.editing ? 'Edit task' : 'New task'">
    <form class="space-y-4" @submit.prevent="save">
      <Input v-model="form.title" label="Title" placeholder="What needs to happen?" required />
      <Textarea v-model="form.description" label="Description" :rows="3" />
      <div class="grid grid-cols-2 gap-3">
        <Select v-model="form.status as any" label="Status" :options="[
          { value: 'todo', label: 'To Do' },{ value: 'in_progress', label: 'In Progress' },
          { value: 'review', label: 'Review' },{ value: 'completed', label: 'Completed' },
        ]" />
        <Input v-model="form.due_date" type="date" label="Due date" />
      </div>
      <div>
        <label class="block text-sm font-medium text-night-700 dark:text-night-100 mb-1.5">Checklist</label>
        <ul class="space-y-1.5 mb-2">
          <li v-for="c in form.checklist" :key="c.id" class="flex items-center gap-2">
            <input type="checkbox" v-model="c.done" class="h-4 w-4 rounded" />
            <input v-model="c.text" class="input-base flex-1 !py-1.5" />
            <button type="button" class="text-night-400 hover:text-red-500" @click="removeChecklistItem(c.id)"><Icon name="trash" :size="14" /></button>
          </li>
        </ul>
        <div class="flex gap-2">
          <Input v-model="form.newItem" placeholder="Add checklist item…" @keydown.enter.prevent="addChecklistItem" />
          <Button type="button" variant="secondary" size="sm" @click="addChecklistItem">Add</Button>
        </div>
      </div>
    </form>
    <template #footer>
      <Button v-if="props.editing" variant="danger" size="sm" @click="remove">Delete</Button>
      <div class="flex-1" />
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
      <Button size="sm" @click="save">{{ props.editing ? 'Save' : 'Add task' }}</Button>
    </template>
  </Modal>
</template>
