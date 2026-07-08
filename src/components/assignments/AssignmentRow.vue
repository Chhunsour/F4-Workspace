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

const flash = ref(false)
async function toggle() {
  if (props.item.status !== 'completed') flash.value = true
  await store.toggleComplete(props.item.id)
  if (flash.value) setTimeout(() => flash.value = false, 500)
}
</script>

<template>
  <div :class="classNames(
    'card p-4 flex items-start gap-3 transition-all',
    props.item.status === 'completed' && 'opacity-70',
    isOverdue && 'ring-1 ring-red-300 dark:ring-red-500/40',
  )">
    <!-- 44px tap target around the 24px visual circle -->
    <button class="-m-2.5 grid h-11 w-11 shrink-0 place-items-center" @click="toggle" aria-label="Toggle done">
      <span :class="classNames(
        'h-6 w-6 rounded-full border-2 transition-all grid place-items-center',
        props.item.status === 'completed'
          ? 'bg-emerald-500 border-emerald-500 text-white'
          : 'border-night-300 dark:border-night-500 hover:border-brand-500',
        flash && 'animate-pop'
      )">
        <Icon v-if="props.item.status === 'completed'" name="check" :size="14" />
      </span>
    </button>

    <button type="button" class="flex-1 min-w-0 text-left" @click="emit('edit', props.item)">
      <div :class="['font-medium', props.item.status === 'completed' && 'line-through']">{{ props.item.title }}</div>
      <div v-if="props.item.description" class="text-sm text-night-500 line-clamp-2 mt-0.5">{{ props.item.description }}</div>
      <div class="mt-2 flex flex-wrap items-center gap-1.5 text-xs">
        <Badge v-if="subjects.byId(props.item.subject_id)"
               :dot="subjects.byId(props.item.subject_id)!.color"
               :tone="'bg-night-100 text-night-700 dark:bg-night-700 dark:text-night-100'">
          {{ subjects.byId(props.item.subject_id)!.name }}
        </Badge>
        <Badge v-if="props.item.status === 'in_progress' || props.item.status === 'review'"
               tone="bg-brand-100 text-brand-700 dark:bg-brand-900/40 dark:text-brand-200">Doing</Badge>
        <Badge v-if="props.item.priority !== 'normal'" :tone="PRIORITY_LABELS[props.item.priority].tone">{{ PRIORITY_LABELS[props.item.priority].label }}</Badge>
        <Badge v-if="due"
               :tone="isOverdue
                        ? 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-200'
                        : 'bg-night-100 text-night-700 dark:bg-night-700 dark:text-night-100'">
          <Icon name="clock" :size="12" />
          {{ fmtDate(props.item.due_date!, { month:'short', day:'numeric' }) }}
          <span v-if="props.item.due_time"> {{ fmtTime(props.item.due_time) }}</span>
          <span v-if="props.item.status !== 'completed'"> · {{ dueLabel(due, now) }}</span>
        </Badge>
      </div>
    </button>
  </div>
</template>
