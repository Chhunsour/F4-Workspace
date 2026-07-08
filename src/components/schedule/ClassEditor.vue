<script setup lang="ts">
import { reactive, watch, computed } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import Select from '@/components/ui/Select.vue'
import Button from '@/components/ui/Button.vue'
import { useScheduleStore } from '@/stores/schedule'
import { useSubjectsStore } from '@/stores/subjects'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { WEEKDAY_LONG } from '@/lib/utils'
import type { ClassSchedule } from '@/types'
import { useI18n } from '@/composables/useI18n'

const props = defineProps<{ open: boolean; editing?: ClassSchedule | null; defaultWeekday?: number }>()
const emit  = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const schedule = useScheduleStore()
const subjects = useSubjectsStore()
const toast = useToast()
const confirm = useConfirm()
const { t } = useI18n()

const form = reactive({
  subject_id: null as string | null,
  weekday: props.defaultWeekday ?? new Date().getDay(),
  start_time: '17:30',
  end_time: '19:00',
  room: '',
  notes: '',
})
const loading = computed(() => false)

watch(() => [props.open, props.editing, props.defaultWeekday], () => {
  if (props.editing) {
    Object.assign(form, {
      subject_id: props.editing.subject_id,
      weekday:    props.editing.weekday,
      start_time: props.editing.start_time.slice(0,5),
      end_time:   props.editing.end_time.slice(0,5),
      room:       props.editing.room ?? '',
      notes:      props.editing.notes ?? '',
    })
  } else {
    Object.assign(form, {
      subject_id: null, weekday: props.defaultWeekday ?? new Date().getDay(),
      start_time: '17:30', end_time: '19:00', room: '', notes: '',
    })
  }
}, { immediate: true })

const dayOptions = computed(() => WEEKDAY_LONG.map((label, i) => ({ value: String(i), label: t(label) })))
const subjectOptions = computed(() => subjects.items.map(s => ({ value: s.id, label: `${s.code ?? '—'} · ${s.name}` })))

async function save() {
  try {
    if (props.editing) {
      await schedule.update(props.editing.id, {
        subject_id: form.subject_id, weekday: Number(form.weekday),
        start_time: form.start_time, end_time: form.end_time,
        room: form.room || null, notes: form.notes || null,
      })
      toast.success(t('Class updated'))
    } else {
      await schedule.create({
        subject_id: form.subject_id, weekday: Number(form.weekday),
        start_time: form.start_time, end_time: form.end_time,
        room: form.room || null, notes: form.notes || null,
      })
      toast.success(t('Class added'))
    }
    emit('update:open', false)
  } catch (e: any) {
    toast.error(t('Could not save'), e?.message)
  }
}

async function remove() {
  if (!props.editing) return
  const ok = await confirm.ask({ title: t('Delete class?'), body: t('This will remove it from your weekly schedule.'), destructive: true, confirmLabel: t('Delete') })
  if (!ok) return
  await schedule.remove(props.editing.id)
  toast.success(t('Class removed'))
  emit('update:open', false)
}
</script>

<template>
  <Modal :open="props.open" @update:open="v => emit('update:open', v)" :title="props.editing ? t('Edit class') : t('Add class')">
    <form class="space-y-4" @submit.prevent="save">
      <Select v-model="form.subject_id" :options="subjectOptions" :label="t('Subject')" :placeholder="t('Pick a subject')" />
      <Select v-model="form.weekday as any" :options="dayOptions" :label="t('Day of week')" />
      <div class="grid grid-cols-2 gap-3">
        <Input v-model="form.start_time" type="time" :label="t('Start')" required />
        <Input v-model="form.end_time"   type="time" :label="t('End')"   required />
      </div>
      <Input v-model="form.room" :label="t('Room')" placeholder="e.g. 401" />
      <Input v-model="form.notes" :label="t('Notes')" :placeholder="t('Optional')" />
    </form>
    <template #footer>
      <Button v-if="props.editing" variant="danger" size="sm" @click="remove">{{ t('Delete') }}</Button>
      <div class="flex-1" />
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">{{ t('Cancel') }}</Button>
      <Button size="sm" :loading="loading" @click="save">{{ props.editing ? t('Save') : t('Add class') }}</Button>
    </template>
  </Modal>
</template>
