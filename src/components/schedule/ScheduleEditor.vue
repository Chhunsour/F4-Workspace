<script setup lang="ts">
// One Add flow for everything on the timetable. Step 1 (new only): pick a type.
// Step 2: the matching form. Classes write to class_schedules (recurring);
// exams / finals / presentations write to academic_events (one-time).
import { reactive, ref, watch, computed } from 'vue'
import Modal from '@/components/ui/Modal.vue'
import Input from '@/components/ui/Input.vue'
import DateField from '@/components/ui/DateField.vue'
import Select from '@/components/ui/Select.vue'
import Textarea from '@/components/ui/Textarea.vue'
import Button from '@/components/ui/Button.vue'
import Icon from '@/components/ui/Icon.vue'
import Avatar from '@/components/ui/Avatar.vue'
import { useScheduleStore } from '@/stores/schedule'
import { useAcademicEventsStore } from '@/stores/academicEvents'
import { useSubjectsStore } from '@/stores/subjects'
import { useProjectsStore } from '@/stores/projects'
import { useAuthStore } from '@/stores/auth'
import { useToast } from '@/composables/useToast'
import { useConfirm } from '@/composables/useConfirm'
import { WEEKDAY_LONG, todayIso } from '@/lib/utils'
import { EVENT_TYPE_META, REMINDER_OPTIONS } from '@/types'
import type { ClassSchedule, AcademicEvent, AcademicEventType } from '@/types'
import { useI18n } from '@/composables/useI18n'
import { supabase, publicUrl } from '@/lib/supabase'

type EditorType = 'class' | AcademicEventType

const props = defineProps<{
  open: boolean
  editingClass?: ClassSchedule | null
  editingEvent?: AcademicEvent | null
  defaultWeekday?: number
  defaultDate?: string
}>()
const emit = defineEmits<{ (e: 'update:open', v: boolean): void }>()

const schedule = useScheduleStore()
const events = useAcademicEventsStore()
const subjects = useSubjectsStore()
const projects = useProjectsStore()
const auth = useAuthStore()
const toast = useToast()
const confirm = useConfirm()
const { t } = useI18n()

const type = ref<EditorType | null>(null)
const saving = ref(false)
const reminder = ref<string>('')      // '' | '1d' | '3d' | '1w' | 'custom'
const reminderDate = ref('')
const profiles = ref<{ id: string; full_name: string | null; avatar_url: string | null }[]>([])

const form = reactive({
  subject_id: null as string | null,
  project_id: null as string | null,
  weekday: new Date().getDay(),
  title: '',
  event_date: todayIso(),
  start_time: '17:30',
  end_time: '19:00',
  room: '',
  teacher: '',
  seat: '',
  notes: '',
  team_members: [] as string[],
})

const isEditing = computed(() => !!(props.editingClass || props.editingEvent))
const isEvent = computed(() => type.value === 'exam' || type.value === 'final_exam' || type.value === 'presentation')

const TYPE_CARDS: { type: EditorType; label: string; icon: string; color: string }[] = [
  { type: 'class',        label: 'Class',        icon: 'schedule',                    color: '#5B7BD4' },
  { type: 'exam',         label: 'Exam',         icon: EVENT_TYPE_META.exam.icon,         color: EVENT_TYPE_META.exam.color },
  { type: 'final_exam',   label: 'Final Exam',   icon: EVENT_TYPE_META.final_exam.icon,   color: EVENT_TYPE_META.final_exam.color },
  { type: 'presentation', label: 'Presentation', icon: EVENT_TYPE_META.presentation.icon, color: EVENT_TYPE_META.presentation.color },
]

function resetForm() {
  Object.assign(form, {
    subject_id: null, project_id: null,
    weekday: props.defaultWeekday ?? new Date().getDay(),
    title: '', event_date: props.defaultDate || todayIso(),
    start_time: '17:30', end_time: '19:00',
    room: '', teacher: '', seat: '', notes: '', team_members: [] as string[],
  })
  reminder.value = ''
  reminderDate.value = ''
}

watch(() => [props.open, props.editingClass, props.editingEvent], () => {
  if (!props.open) return
  if (props.editingClass) {
    type.value = 'class'
    const c = props.editingClass
    Object.assign(form, {
      subject_id: c.subject_id, weekday: c.weekday,
      start_time: c.start_time.slice(0, 5), end_time: c.end_time.slice(0, 5),
      room: c.room ?? '', teacher: c.teacher ?? '', notes: c.notes ?? '',
    })
  } else if (props.editingEvent) {
    const e = props.editingEvent
    type.value = e.type
    Object.assign(form, {
      subject_id: e.subject_id, project_id: e.project_id, title: e.title ?? '',
      event_date: e.event_date, start_time: (e.start_time ?? '').slice(0, 5),
      end_time: (e.end_time ?? '').slice(0, 5), room: e.room ?? '', seat: e.seat ?? '',
      notes: e.notes ?? '', team_members: e.team_members ?? [],
    })
    reminder.value = e.reminder_at ? 'custom' : ''
    reminderDate.value = e.reminder_at ? e.reminder_at.slice(0, 10) : ''
  } else {
    type.value = null          // show the type picker
    resetForm()
  }
}, { immediate: true })

// Load profiles once (for presentation team tagging).
watch(() => props.open, async (open) => {
  if (!open || profiles.value.length) return
  const { data } = await supabase.from('profiles').select('id, full_name, avatar_url').order('full_name').limit(40)
  profiles.value = (data ?? []) as any
}, { immediate: true })

const dayOptions = computed(() => WEEKDAY_LONG.map((label, i) => ({ value: String(i), label: t(label) })))
const subjectOptions = computed(() => subjects.items.map(s => ({ value: s.id, label: s.name })))
const projectOptions = computed(() => [{ value: '', label: t('No project') }, ...projects.items.map(p => ({ value: p.id, label: p.name }))])
const reminderOptions = computed(() => [
  ...REMINDER_OPTIONS.map(o => ({ value: o.value, label: t(o.label) })),
  { value: 'custom', label: t('Custom date') },
])

// Clean team list: real names, no duplicates, not yourself.
const teamPeople = computed(() => {
  const seen = new Set<string>()
  const out: typeof profiles.value = []
  for (const p of profiles.value) {
    if (p.id === auth.userId) continue
    const name = (p.full_name ?? '').trim()
    if (!name || seen.has(name.toLowerCase())) continue
    seen.add(name.toLowerCase())
    out.push(p)
  }
  return out
})
const avatarUrl = (p: { avatar_url: string | null }) => (p.avatar_url ? publicUrl('avatars', p.avatar_url) : null)

const modalTitle = computed(() => {
  if (!type.value) return t('Add to schedule')
  const map: Record<EditorType, string> = {
    class: isEditing.value ? t('Edit class') : t('Add class'),
    exam: isEditing.value ? t('Edit exam') : t('New exam'),
    final_exam: isEditing.value ? t('Edit final exam') : t('New final exam'),
    presentation: isEditing.value ? t('Edit presentation') : t('New presentation'),
  }
  return map[type.value]
})

function computeReminderAt(): string | null {
  if (reminder.value === '') return null
  if (reminder.value === 'custom') {
    return reminderDate.value ? new Date(reminderDate.value + 'T09:00:00').toISOString() : null
  }
  const opt = REMINDER_OPTIONS.find(o => o.value === reminder.value)
  if (!opt?.days || !form.event_date) return null
  const at = new Date(`${form.event_date}T${form.start_time || '09:00'}:00`)
  at.setDate(at.getDate() - opt.days)
  return at.toISOString()
}

async function save() {
  if (!type.value) return
  saving.value = true
  try {
    if (type.value === 'class') {
      const payload = {
        subject_id: form.subject_id, weekday: Number(form.weekday),
        start_time: form.start_time, end_time: form.end_time,
        room: form.room || null, teacher: form.teacher || null, notes: form.notes || null,
      }
      if (props.editingClass) { await schedule.update(props.editingClass.id, payload); toast.success(t('Class updated')) }
      else { await schedule.create(payload); toast.success(t('Class added')) }
    } else {
      const payload = {
        type: type.value as AcademicEventType,
        title: form.title.trim() || null,
        subject_id: form.subject_id,
        project_id: type.value === 'presentation' ? (form.project_id || null) : null,
        event_date: form.event_date,
        start_time: form.start_time || null,
        end_time: form.end_time || null,
        room: form.room || null,
        seat: type.value === 'final_exam' ? (form.seat || null) : null,
        team_members: type.value === 'presentation' ? form.team_members : [],
        notes: form.notes || null,
        reminder_at: computeReminderAt(),
      }
      if (props.editingEvent) { await events.update(props.editingEvent.id, payload); toast.success(t('Saved')) }
      else { await events.create(payload); toast.success(t('Added')) }
    }
    emit('update:open', false)
  } catch (e: any) {
    toast.error(t('Could not save'), e?.message)
  } finally {
    saving.value = false
  }
}

async function remove() {
  const ok = await confirm.ask({ title: t('Delete this?'), destructive: true, confirmLabel: t('Delete') })
  if (!ok) return
  if (props.editingClass) await schedule.remove(props.editingClass.id)
  else if (props.editingEvent) await events.remove(props.editingEvent.id)
  toast.success(t('Deleted'))
  emit('update:open', false)
}
</script>

<template>
  <Modal :open="props.open" @update:open="v => emit('update:open', v)" :title="modalTitle">
    <!-- Step 1: choose what you're adding -->
    <div v-if="!type" class="space-y-3">
      <p class="t-label">{{ t('What are you adding?') }}</p>
      <div class="grid grid-cols-2 gap-3">
        <button v-for="c in TYPE_CARDS" :key="c.type" type="button" @click="type = c.type"
                class="group flex flex-col items-center gap-2 rounded-2xl border-2 border-surface-border p-4 text-center transition-all hover:-translate-y-0.5 dark:border-night-700"
                :style="{ '--tc': c.color }"
                @mouseenter="() => {}">
          <span class="grid h-11 w-11 place-items-center rounded-xl transition-colors"
                :style="{ background: c.color + '1f', color: c.color }">
            <Icon :name="c.icon" :size="22" />
          </span>
          <span class="text-sm font-semibold text-night-900 dark:text-white">{{ t(c.label) }}</span>
        </button>
      </div>
    </div>

    <!-- Step 2: the type-specific form -->
    <form v-else class="space-y-4" @submit.prevent="save">
      <!-- Type chip / change -->
      <div class="flex items-center gap-2">
        <span class="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide"
              :style="{ background: (type === 'class' ? '#5B7BD4' : EVENT_TYPE_META[type as AcademicEventType].color) + '1f',
                        color: type === 'class' ? '#5B7BD4' : EVENT_TYPE_META[type as AcademicEventType].color }">
          {{ type === 'class' ? t('Class') : t(EVENT_TYPE_META[type as AcademicEventType].label) }}
        </span>
        <button v-if="!isEditing" type="button" class="link text-xs" @click="type = null">{{ t('Change type') }}</button>
      </div>

      <!-- CLASS -->
      <template v-if="type === 'class'">
        <Select v-model="form.subject_id" :options="subjectOptions" :label="t('Subject')" :placeholder="t('Pick a subject')" />
        <Select v-model="form.weekday as any" :options="dayOptions" :label="t('Day of week')" />
        <div class="grid grid-cols-2 gap-3">
          <DateField v-model="form.start_time" type="time" label="Start" required />
          <DateField v-model="form.end_time" type="time" label="End" required />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <Input v-model="form.room" :label="t('Room')" placeholder="e.g. 401" />
          <Input v-model="form.teacher" :label="t('Teacher')" :placeholder="t('Optional')" />
        </div>
        <Input v-model="form.notes" :label="t('Notes')" :placeholder="t('Optional')" />
      </template>

      <!-- EXAM / FINAL EXAM / PRESENTATION -->
      <template v-else>
        <Input v-if="type === 'presentation'" v-model="form.title" :label="t('Presentation title')" :placeholder="t('e.g. Gym Database Presentation')" />
        <Select v-model="form.subject_id" :options="subjectOptions" :label="t('Subject')" :placeholder="t('Pick a subject')" />
        <Input v-if="type !== 'presentation'" v-model="form.title" :label="type === 'final_exam' ? t('Final exam title') : t('Exam title')" :placeholder="t('Optional')" />
        <Select v-if="type === 'presentation'" v-model="form.project_id as any" :options="projectOptions" :label="t('Project')" :placeholder="t('No project')" />

        <DateField v-model="form.event_date" type="date" label="Date" required />
        <div class="grid grid-cols-2 gap-3">
          <DateField v-model="form.start_time" type="time" label="Start" />
          <DateField v-model="form.end_time" type="time" label="End" />
        </div>
        <div class="grid grid-cols-2 gap-3">
          <Input v-model="form.room" :label="t('Room')" placeholder="e.g. 101" />
          <Input v-if="type === 'final_exam'" v-model="form.seat" :label="t('Seat number')" :placeholder="t('Optional')" />
        </div>

        <!-- Presentation team -->
        <div v-if="type === 'presentation' && teamPeople.length" class="space-y-2">
          <p class="t-label">{{ t('Team members') }}</p>
          <div class="flex max-h-28 flex-wrap gap-2 overflow-y-auto pr-1">
            <label v-for="p in teamPeople" :key="p.id"
                   :class="['flex items-center gap-2 rounded-full border py-1 pl-1 pr-3 cursor-pointer transition-all',
                            form.team_members.includes(p.id)
                              ? 'border-brand-500 bg-brand-500/10'
                              : 'border-surface-border dark:border-night-700 hover:border-brand-400/60']">
              <input v-model="form.team_members" type="checkbox" :value="p.id" class="sr-only" />
              <Avatar :src="avatarUrl(p)" :name="p.full_name" size="sm" />
              <span class="text-[13px] font-medium text-night-700 dark:text-night-100">{{ p.full_name }}</span>
            </label>
          </div>
        </div>

        <Textarea v-model="form.notes" :label="t('Notes')" :rows="2" :placeholder="t('Optional')" />

        <!-- Reminder -->
        <div class="grid gap-3" :class="reminder === 'custom' ? 'grid-cols-2' : 'grid-cols-1'">
          <Select v-model="reminder" :options="reminderOptions" :label="t('Reminder')" />
          <DateField v-if="reminder === 'custom'" v-model="reminderDate" type="date" label="Remind me on" />
        </div>
      </template>
    </form>

    <template #footer>
      <Button v-if="isEditing" variant="danger" size="sm" @click="remove">{{ t('Delete') }}</Button>
      <div class="flex-1" />
      <Button variant="ghost" size="sm" @click="emit('update:open', false)">{{ t('Cancel') }}</Button>
      <Button v-if="type" size="sm" :loading="saving" @click="save">{{ isEditing ? t('Save') : t('Add') }}</Button>
    </template>
  </Modal>
</template>
