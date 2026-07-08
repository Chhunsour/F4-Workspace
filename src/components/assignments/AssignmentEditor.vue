<script setup lang="ts">
import { reactive, ref, watch, computed } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Select from '@/components/ui/Select.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import { useAssignmentsStore } from '@/stores/assignments'
import { useSubjectsStore } from '@/stores/subjects'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import type { Assignment } from '@/types'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{ open: boolean; editing?: Assignment | null; defaultSubject?: string | null }>()
const emit  = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const store = useAssignmentsStore()
const subjects = useSubjectsStore()
const toast = useToast()
const confirm = useConfirm()
const { t } = useI18n()

// Quick Add is the default: title + subject + due. Everything else folds away.
const form = reactive({
  title: '', description: '', subject_id: null as string | null,
  due_date: '' as string, due_time: '' as string,
  priority: 'normal' as Assignment['priority'],
  status:   'todo'   as Assignment['status'],
  notes: '',
})
const moreOpen = ref(false)
const err = reactive<Record<string,string>>({})
const saving = ref(false)

watch(() => [props.open, props.editing], () => {
  if (props.editing) {
    Object.assign(form, {
      title: props.editing.title,
      description: props.editing.description ?? '',
      subject_id:  props.editing.subject_id,
      due_date:    props.editing.due_date ?? '',
      due_time:    (props.editing.due_time ?? '').slice(0,5),
      priority:    props.editing.priority,
      // 'review' is folded into Doing in the UI
      status:      props.editing.status === 'review' ? 'in_progress' : props.editing.status,
      notes:       props.editing.notes ?? '',
    })
    // Show the fold when the item actually uses those fields
    moreOpen.value = !!(props.editing.description || props.editing.notes || props.editing.priority !== 'normal' || props.editing.status !== 'todo')
  } else {
    Object.assign(form, { title: '', description: '', subject_id: props.defaultSubject ?? null, due_date: '', due_time: '', priority: 'normal', status: 'todo', notes: '' })
    moreOpen.value = false
  }
  for (const k of Object.keys(err)) delete err[k]
}, { immediate: true })

const subjectOptions = computed(() => subjects.items.map(s => ({ value: s.id, label: s.name })))

async function save() {
  for (const k of Object.keys(err)) delete err[k]
  if (!form.title.trim()) err.title = t('Title required')
  if (Object.keys(err).length) return
  saving.value = true
  try {
    const payload: Partial<Assignment> = {
      title: form.title.trim(),
      description: form.description || null,
      subject_id: form.subject_id,
      due_date: form.due_date || null,
      due_time: form.due_time || null,
      priority: form.priority,
      status: form.status,
      notes: form.notes || null,
    }
    if (form.status === 'completed') payload.progress = 100
    if (props.editing) {
      await store.update(props.editing.id, payload)
      toast.success(t('Task updated'))
    } else {
      await store.create(payload as any)
      toast.success(t('Task added'))
    }
    emit('update:open', false)
  } catch (e: any) { toast.error(t('Could not save'), e?.message) }
  finally { saving.value = false }
}

async function remove() {
  if (!props.editing) return
  const ok = await confirm.ask({ title: t('Delete task?'), destructive: true, confirmLabel: t('Delete') })
  if (!ok) return
  await store.remove(props.editing.id)
  toast.success(t('Deleted'))
  emit('update:open', false)
}
</script>

<template>
  <Modal :open="props.open" @update:open="v => emit('update:open', v)" :title="props.editing ? t('Edit task') : t('New task')">
    <form class="space-y-4" @submit.prevent="save">
      <Input v-model="form.title" :label="t('What do you need to do?')" placeholder="e.g. ER diagram for the gym database" required :error="err.title" />
      <Select v-model="form.subject_id" :options="subjectOptions" :label="t('Subject')" :placeholder="t('No subject')" />
      <div class="grid grid-cols-2 gap-3">
        <Input v-model="form.due_date" type="date" :label="t('When is it due?')" />
        <Input v-model="form.due_time" type="time" :label="t('Time')" />
      </div>

      <button type="button"
              class="flex items-center gap-1.5 text-sm font-medium text-night-500 dark:text-night-300 hover:text-night-900 dark:hover:text-white transition-colors"
              @click="moreOpen = !moreOpen">
        <Icon name="chevron_right" :size="14" :class="['transition-transform', moreOpen && 'rotate-90']" />
        {{ t('More options') }}
      </button>

      <div v-if="moreOpen" class="space-y-3">
        <Select v-model="form.status as any" :label="t('Status')" :options="[
          { value: 'todo', label: t('To Do') },
          { value: 'in_progress', label: t('Doing') },
          { value: 'completed', label: t('Done') },
        ]" />
        <Textarea v-model="form.description" :label="t('Description')" :rows="3" :placeholder="t('Anything extra worth remembering')" />
        <Select v-model="form.priority as any" :label="t('Priority')" :options="[
          { value: 'low', label: t('Low') },{ value: 'normal', label: t('Normal') },
          { value: 'high', label: t('High') },{ value: 'urgent', label: t('Urgent') },
        ]" />
        <Textarea v-model="form.notes" :label="t('Notes')" :rows="2" />
      </div>
    </form>
    <template #footer>
      <Button v-if="props.editing" variant="danger" size="sm" @click="remove">{{ t('Delete') }}</Button>
      <div class="flex-1" />
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">{{ t('Cancel') }}</Button>
      <Button size="sm" :loading="saving" @click="save">{{ props.editing ? t('Save') : t('Create task') }}</Button>
    </template>
  </Modal>
</template>
