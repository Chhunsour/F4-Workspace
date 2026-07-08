<script setup lang="ts">
import { computed, ref } from 'vue'
import { useAssignmentsStore } from '@/stores/assignments'
import { useSubjectsStore } from '@/stores/subjects'
import { fmtDate, fmtTime, dueLabel, classNames } from '@/lib/utils'
import { PRIORITY_LABELS } from '@/types'
import Badge from '@/components/ui/Badge.vue'
import Icon from '@/components/ui/Icon.vue'
import { useNow } from '@/composables/useCountdown'
import type { Assignment } from '@/types'

const props = defineProps<{ item: Assignment }>()
const emit = defineEmits<{ (e: 'edit', a: Assignment): void }>()

const store = useAssignmentsStore()
const subjects = useSubjectsStore()
const now = useNow()

const due = computed(() => {
  if (!props.item.due_date) return null
  return new Date(`${props.item.due_date}T${props.item.due_time ?? '23:59'}:00`)
})
const isOverdue = computed(() => props.item.status !== 'completed' && due.value && due.value < now.value)
const dueSoon = computed(() => {
  if (!due.value || props.item.status === 'completed' || isOverdue.value) return false
  const soonCutoff = new Date(); soonCutoff.setDate(soonCutoff.getDate() + 3)
  return due.value <= soonCutoff
})
const subject = computed(() => subjects.byId(props.item.subject_id))

const flash = ref(false)
async function toggle() {
  if (props.item.status !== 'completed') flash.value = true
  await store.toggleComplete(props.item.id)
  if (flash.value) setTimeout(() => flash.value = false, 500)
}
</script>

<template>
  <div :class="classNames(
    'card card-hover p-4 flex items-start gap-3 transition-all',
    props.item.status === 'completed' && 'opacity-70',
    isOverdue && '!border-red-400/60 dark:!border-red-500/40',
    dueSoon && '!border-tangerine-400/50 dark:!border-tangerine-500/45',
    flash && 'just-done',
  )">
    <!-- Subject color accent bar on the left edge -->
    <span v-if="subject" aria-hidden class="-my-4 -ml-4 w-1 shrink-0 rounded-l-2xl" :style="{ background: subject.color }" />

    <!-- 44px tap target around the visual circle -->
    <button class="-m-2.5 grid h-11 w-11 shrink-0 place-items-center" @click="toggle" aria-label="Toggle done">
      <span :class="classNames(
        'h-6 w-6 rounded-full border-2 transition-all grid place-items-center',
        props.item.status === 'completed'
          ? 'bg-grass-500 border-grass-500 text-white shadow-[0_0_12px_rgba(16,185,129,0.55)]'
          : 'border-night-300 dark:border-night-400 hover:border-brand-500 hover:bg-brand-500/10 hover:scale-110',
        flash && 'animate-springIn'
      )">
        <Icon v-if="props.item.status === 'completed'" name="check" :size="14" />
      </span>
    </button>

    <button type="button" class="flex-1 min-w-0 text-left" @click="emit('edit', props.item)">
      <div :class="['text-[15px] font-semibold text-night-900 dark:text-white', props.item.status === 'completed' && 'line-through opacity-70']">{{ props.item.title }}</div>
      <div v-if="props.item.description" class="text-sm text-night-600 dark:text-night-100 line-clamp-2 mt-0.5">{{ props.item.description }}</div>
      <div class="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <Badge v-if="subject"
               :dot="subject.color"
               :tone="'bg-night-100 text-night-700 dark:bg-white/[0.06] dark:text-night-100'">
          {{ subject.name }}
        </Badge>
        <span v-if="props.item.status === 'in_progress' || props.item.status === 'review'" class="chip-brand">Doing</span>
        <Badge v-if="props.item.priority !== 'normal'" :tone="PRIORITY_LABELS[props.item.priority].tone">{{ PRIORITY_LABELS[props.item.priority].label }}</Badge>
        <span v-if="due && isOverdue" class="chip-danger">
          <Icon name="clock" :size="12" />
          {{ fmtDate(props.item.due_date!, { month:'short', day:'numeric' }) }}<span v-if="props.item.due_time"> {{ fmtTime(props.item.due_time) }}</span>
          <span v-if="props.item.status !== 'completed'"> · {{ dueLabel(due, now) }}</span>
        </span>
        <span v-else-if="due && dueSoon" class="chip-warn">
          <Icon name="clock" :size="12" />
          {{ fmtDate(props.item.due_date!, { month:'short', day:'numeric' }) }}<span v-if="props.item.due_time"> {{ fmtTime(props.item.due_time) }}</span>
          <span v-if="props.item.status !== 'completed'"> · {{ dueLabel(due, now) }}</span>
        </span>
        <Badge v-else-if="due"
               tone="bg-night-100 text-night-700 dark:bg-white/[0.06] dark:text-night-100">
          <Icon name="clock" :size="12" />
          {{ fmtDate(props.item.due_date!, { month:'short', day:'numeric' }) }}
          <span v-if="props.item.due_time"> {{ fmtTime(props.item.due_time) }}</span>
          <span v-if="props.item.status !== 'completed'"> · {{ dueLabel(due, now) }}</span>
        </Badge>
      </div>
    </button>
  </div>
</template>
