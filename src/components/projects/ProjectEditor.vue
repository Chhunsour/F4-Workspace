<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import Button from '@/components/ui/Button.vue'
import { useProjectsStore } from '@/stores/projects'
import { useSubjectsStore } from '@/stores/subjects'
import { useGroupsStore } from '@/stores/groups'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { SUBJECT_COLOR_PALETTE } from '@/types'
import type { Project } from '@/types'

const props = defineProps<{ open: boolean; editing?: Project | null }>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const store = useProjectsStore()
const subjects = useSubjectsStore()
const groups = useGroupsStore()
const toast = useToast()
const confirm = useConfirm()

const form = reactive({
  name: '', description: '', subject_id: null as string | null, group_id: null as string | null,
  color: SUBJECT_COLOR_PALETTE[0], deadline: '' as string, status: 'active' as Project['status'],
})
const err = reactive<Record<string,string>>({})

watch(() => [props.open, props.editing], () => {
  if (props.editing) {
    Object.assign(form, {
      name: props.editing.name, description: props.editing.description ?? '',
      subject_id: props.editing.subject_id, group_id: props.editing.group_id,
      color: props.editing.color ?? SUBJECT_COLOR_PALETTE[0],
      deadline: props.editing.deadline ?? '', status: props.editing.status,
    })
  } else {
    Object.assign(form, { name: '', description: '', subject_id: null, group_id: null,
      color: SUBJECT_COLOR_PALETTE[0], deadline: '', status: 'active' })
  }
  for (const k of Object.keys(err)) delete err[k]
}, { immediate: true })

const subjectOptions = computed(() => subjects.items.map(s => ({ value: s.id, label: s.name })))
const groupOptions = computed(() => groups.items.map(g => ({ value: g.id, label: g.name })))

async function save() {
  for (const k of Object.keys(err)) delete err[k]
  if (!form.name.trim()) err.name = 'Name required'
  if (Object.keys(err).length) return
  try {
    const payload = {
      name: form.name.trim(), description: form.description || null,
      subject_id: form.subject_id, group_id: form.group_id,
      color: form.color, deadline: form.deadline || null, status: form.status,
    }
    if (props.editing) {
      await store.update(props.editing.id, payload)
      toast.success('Project updated')
    } else {
      await store.create(payload as any)
      toast.success('Project created')
    }
    emit('update:open', false)
  } catch (e: any) { toast.error('Could not save', e?.message) }
}

async function remove() {
  if (!props.editing) return
  const ok = await confirm.ask({ title: 'Delete project?', body: 'All tasks and comments will be removed.', destructive: true, confirmLabel: 'Delete' })
  if (!ok) return
  await store.remove(props.editing.id)
  toast.success('Project deleted')
  emit('update:open', false)
}
</script>

<template>
  <Modal :open="props.open" @update:open="v => emit('update:open', v)" :title="props.editing ? 'Edit project' : 'New project'" wide>
    <form class="space-y-4" @submit.prevent="save">
      <Input v-model="form.name" label="Project name" placeholder="e.g. Cinema booking website" :error="err.name" required />
      <Textarea v-model="form.description" label="Description" placeholder="What is this project about?" />
      <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <Select v-model="form.subject_id" :options="subjectOptions" label="Subject" placeholder="No subject" />
        <Select v-model="form.group_id" :options="groupOptions" label="Group" placeholder="Personal / no group" />
        <Input v-model="form.deadline" type="date" label="Deadline" />
        <Select v-model="form.status as any" label="Status" :options="[
          { value: 'active', label: 'Active' },{ value: 'on_hold', label: 'On hold' },
          { value: 'completed', label: 'Completed' },{ value: 'archived', label: 'Archived' },
        ]" />
      </div>
      <div>
        <label class="block text-sm font-medium text-night-700 dark:text-night-100 mb-1.5">Color</label>
        <div class="flex flex-wrap gap-2">
          <button v-for="c in ['#3a68ff','#22c55e','#ec4899','#f59a06','#8b5cf6','#0ea5e9','#ef4444','#14b8a6']" :key="c" type="button"
            class="h-8 w-8 rounded-lg border-2 border-white shadow-soft ring-offset-1"
            :class="form.color === c ? 'ring-2 ring-night-900 dark:ring-white' : ''"
            :style="{ background: c }" @click="form.color = c" />
        </div>
      </div>
    </form>
    <template #footer>
      <Button v-if="props.editing" variant="danger" size="sm" @click="remove">Delete</Button>
      <div class="flex-1" />
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">Cancel</Button>
      <Button size="sm" @click="save">{{ props.editing ? 'Save' : 'Create project' }}</Button>
    </template>
  </Modal>
</template>
